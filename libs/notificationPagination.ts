import { z } from 'zod';
import type { NotificationFilters } from '@/types/notifications';

export const notificationStatusSchema = z.enum(['all', 'unread', 'read']);
export const notificationCategorySchema = z.enum([
  'all',
  'orders',
  'delivery',
  'support',
  'restaurants',
  'inventory',
]);
const cursorSchema = z.object({
  recipientId: z.string().regex(/^[a-f\d]{24}$/i),
  id: z.string().regex(/^[a-f\d]{24}$/i),
  createdAt: z.string().datetime(),
  status: notificationStatusSchema,
  category: notificationCategorySchema,
});

export function readNotificationCursor(value: string) {
  if (value.length > 512 || !/^[\w-]+$/.test(value)) return null;
  try {
    const parsed = cursorSchema.safeParse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createNotificationCursor(
  recipientId: string,
  item: { _id: { toString(): string }; createdAt: Date | string },
  filters: NotificationFilters
) {
  return Buffer.from(
    JSON.stringify({
      recipientId,
      id: item._id.toString(),
      createdAt: new Date(item.createdAt).toISOString(),
      ...filters,
    })
  ).toString('base64url');
}
