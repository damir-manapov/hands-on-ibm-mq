import { drainOutputQueue } from '../pipeline';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  const messages = await drainOutputQueue();
  if (messages.length === 0) {
    logger.info('No messages were found on the output queue');
    return;
  }
  logger.info(`Drained ${messages.length.toString()} message(s)`);
  for (const message of messages) {
    logger.info(`Message ${message.id}`, message);
  }
}

main().catch((error: unknown) => {
  const reason = error instanceof Error ? error : new Error(String(error));
  logger.error('Failed to read from the output queue', reason);
  process.exitCode = 1;
});
