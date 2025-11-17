import type { InputMessage, ProcessedMessage } from './messages';

export interface TransformationContext {
  readonly processorId: string;
  readonly appendNote?: string;
}

export function transformMessage(
  message: InputMessage,
  context: TransformationContext
): ProcessedMessage {
  const notes = context.appendNote ?? 'Enriched for downstream consumers';
  return {
    ...message,
    processedAt: new Date().toISOString(),
    notes: `${notes}; handled by ${context.processorId}`
  };
}
