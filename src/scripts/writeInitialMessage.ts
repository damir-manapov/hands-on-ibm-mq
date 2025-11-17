import { enqueueInitialMessage } from '../pipeline';
import { createSampleMessage } from '../messages';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  const message = createSampleMessage();
  await enqueueInitialMessage(message);
  logger.info('Seeded initial queue with a sample message');
}

main().catch((error: unknown) => {
  const reason = error instanceof Error ? error : new Error(String(error));
  logger.error('Failed to write initial message', reason);
  process.exitCode = 1;
});
