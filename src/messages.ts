import { randomUUID } from 'node:crypto';
export interface InputMessage {
  readonly id: string;
  readonly source: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ProcessedMessage extends InputMessage {
  readonly processedAt: string;
  readonly notes: string;
}

export function createSampleMessage(): InputMessage {
  return {
    id: randomUUID(),
    source: 'research-cli',
    payload: {
      value: Math.random(),
      explanation: 'Sample message to validate the pipeline'
    },
    createdAt: new Date().toISOString()
  };
}
