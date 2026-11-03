import type { ConversationThreadMessage, OutgoingMessage } from '@/types/messages';

export const MESSAGE_PAGE_SIZE = 50;
export const MESSAGE_MAX_LENGTH = 4000;

export function mergeThreadMessages(
  pages: ConversationThreadMessage[][],
  outgoing: OutgoingMessage[] = []
): OutgoingMessage[] {
  const messages = new Map<string, OutgoingMessage>();
  const clientIds = new Set<string>();
  // The newest page wins when an edit or page-boundary shift produces an overlap.
  for (const page of [...pages].reverse()) {
    for (const message of page) {
      messages.set(message._id, message);
      if (message.clientMessageId) clientIds.add(message.clientMessageId);
    }
  }
  for (const message of outgoing) {
    if (!messages.has(message._id) && !clientIds.has(message.clientMessageId || '')) {
      messages.set(message._id, message);
    }
  }
  return [...messages.values()].sort(
    (left, right) =>
      Date.parse(left.createdAt) - Date.parse(right.createdAt) || left._id.localeCompare(right._id)
  );
}
