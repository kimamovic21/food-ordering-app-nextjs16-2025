import { createMessageCursor, readMessageCursor } from '@/libs/messagePagination';
import { mergeThreadMessages } from '@/libs/messageThread';
import type { ConversationThreadMessage } from '@/types/messages';

const message = (
  id: string,
  overrides: Partial<ConversationThreadMessage> = {}
): ConversationThreadMessage => ({
  _id: id,
  senderUserId: 'sender',
  recipientUserId: 'recipient',
  body: id,
  deletedFor: [],
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
  ...overrides,
});

describe('message history helpers', () => {
  it('round-trips a cursor including the conversation and tie-break id', () => {
    const conversationId = '507f1f77bcf86cd799439011';
    const item = message('507f1f77bcf86cd799439012');
    expect(readMessageCursor(createMessageCursor(conversationId, item))).toEqual({
      conversationId,
      id: item._id,
      createdAt: item.createdAt,
    });
  });
  it.each([
    '',
    'not-json',
    'x'.repeat(513),
    'a/b',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(
      JSON.stringify({ conversationId: 'invalid', id: 'invalid', createdAt: 'yesterday' })
    ).toString('base64url'),
  ])('rejects malformed cursor %s', (cursor) => {
    expect(readMessageCursor(cursor)).toBeNull();
  });
  it('deduplicates overlapping pages and lets the fresh page win after editing', () => {
    expect(
      mergeThreadMessages([
        [message('2', { body: 'edited' }), message('3')],
        [message('1'), message('2')],
      ]).map((m) => m.body)
    ).toEqual(['1', 'edited', '3']);
  });
  it('reconciles a failed optimistic send when polling finds its server receipt', () => {
    const result = mergeThreadMessages(
      [[message('real', { clientMessageId: 'same' })]],
      [{ ...message('temp', { clientMessageId: 'same' }), sendState: 'failed' }]
    );
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('real');
    expect(result[0].sendState).toBeUndefined();
  });
  it('keeps unrelated pending and failed sends visible', () => {
    const result = mergeThreadMessages(
      [[message('1')]],
      [
        { ...message('2'), sendState: 'sending' },
        { ...message('3'), sendState: 'failed' },
      ]
    );
    expect(result.map((m) => m.sendState)).toEqual([undefined, 'sending', 'failed']);
  });
});
