import { describe, expect, it, vi } from 'vitest';
import { transformMessage } from '../src/transformer';
import type { InputMessage } from '../src/messages';

vi.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

const baseMessage: InputMessage = {
  id: 'abc',
  source: 'unit-test',
  payload: { foo: 'bar' },
  createdAt: '2023-12-31T23:59:59.000Z'
};

describe('transformMessage', () => {
  it('appends processor metadata to the message', () => {
    const result = transformMessage(baseMessage, {
      processorId: 'processor-1',
      appendNote: 'Validated payload'
    });

    expect(result.id).toBe(baseMessage.id);
    expect(result.notes).toContain('Validated payload');
    expect(result.notes).toContain('processor-1');
    expect(result.processedAt).toBe('2024-01-01T00:00:00.000Z');
  });
});
