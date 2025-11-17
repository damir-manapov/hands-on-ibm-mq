import mq from 'ibmmq';
import { loadMqConfig } from './config';
import type { InputMessage, ProcessedMessage } from './messages';
import { transformMessage } from './transformer';
import { withQueueManager, withQueue, putJson, getJson } from './mqClient';
import { logger } from './utils/logger';

const { MQC } = mq;

export async function enqueueInitialMessage(message: InputMessage): Promise<void> {
  const config = loadMqConfig();
  await withQueueManager(config, async (manager) => {
    await withQueue(
      manager,
      config.inputQueue,
      MQC.MQOO_OUTPUT | MQC.MQOO_FAIL_IF_QUIESCING,
      async (queue) => {
        await putJson(queue, message);
        logger.info(`Published message ${message.id} to ${config.inputQueue}`);
      }
    );
  });
}

export async function processNextMessage(processorId: string): Promise<ProcessedMessage | null> {
  const config = loadMqConfig();
  return withQueueManager(config, async (manager) => {
    const incoming = await withQueue(
      manager,
      config.inputQueue,
      MQC.MQOO_INPUT_AS_Q_DEF | MQC.MQOO_FAIL_IF_QUIESCING,
      async (queue) => {
        return getJson<InputMessage>(queue, config.waitIntervalMs);
      }
    );

    if (!incoming) {
      logger.warn('No messages available on the input queue');
      return null;
    }

    const processed = transformMessage(incoming, {
      processorId
    });

    await withQueue(
      manager,
      config.outputQueue,
      MQC.MQOO_OUTPUT | MQC.MQOO_FAIL_IF_QUIESCING,
      async (queue) => {
        await putJson(queue, processed);
      }
    );

    logger.info(`Processed message ${incoming.id} and forwarded to ${config.outputQueue}`);
    return processed;
  });
}

export async function drainOutputQueue(): Promise<ProcessedMessage[]> {
  const config = loadMqConfig();
  return withQueueManager(config, async (manager) => {
    const collected: ProcessedMessage[] = [];
    await withQueue(
      manager,
      config.outputQueue,
      MQC.MQOO_INPUT_AS_Q_DEF | MQC.MQOO_FAIL_IF_QUIESCING,
      async (queue) => {
        let message = await getJson<ProcessedMessage>(queue, config.waitIntervalMs);
        if (!message) {
          logger.info('No more messages detected on the output queue');
          return;
        }
        do {
          collected.push(message);
          logger.info(`Consumed message ${message.id} from ${config.outputQueue}`);
          message = await getJson<ProcessedMessage>(queue, config.waitIntervalMs);
        } while (message);
        logger.info('No more messages detected on the output queue');
      }
    );
    return collected;
  });
}
