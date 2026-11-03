import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const cursorSchema = z.object({
  conversationId: objectId,
  id: objectId,
  createdAt: z.string().datetime(),
});

export function readMessageCursor(cursor: string) {
  if (cursor.length > 512 || !/^[\w-]+$/.test(cursor)) return null;
  try {
    const result = cursorSchema.safeParse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    );
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function createMessageCursor(
  conversationId: string,
  message: { _id: { toString(): string }; createdAt: Date | string }
) {
  return Buffer.from(
    JSON.stringify({
      conversationId,
      id: message._id.toString(),
      createdAt: new Date(message.createdAt).toISOString(),
    })
  ).toString('base64url');
}
