import { processNextMessage } from '../pipeline';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  const processorId = process.env['PROCESSOR_ID'] ?? 'processor-script';
  const message = await processNextMessage(processorId);
  if (!message) {
    logger.warn('Nothing to process at this time');
    return;
  }
  logger.info('Processed message', message);
}

main().catch((error: unknown) => {
  const reason = error instanceof Error ? error : new Error(String(error));
  logger.error('Processing script failed', reason);
  process.exitCode = 1;
});
