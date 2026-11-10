import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authOptions } from '@/libs/authOptions';
import { User } from '@/models/user';
import { Notification } from '@/models/notification';
import { emitNotificationEvent } from '@/libs/notificationEvents';
import { NOTIFICATION_CATEGORIES } from '@/libs/notificationInbox';
import {
  createNotificationCursor,
  readNotificationCursor,
  notificationCategorySchema,
  notificationStatusSchema,
} from '@/libs/notificationPagination';
import type { NotificationCounts } from '@/types/notifications';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  });

const getCurrentUser = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return User.findOne({ email: session.user.email }).select('_id role').lean();
};

async function getCounts(recipientUserId: mongoose.Types.ObjectId): Promise<NotificationCounts> {
  const [counts] = await Notification.aggregate([
    { $match: { recipientUserId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
      },
    },
  ]);
  return {
    total: counts?.total || 0,
    unread: counts?.unread || 0,
    read: (counts?.total || 0) - (counts?.unread || 0),
  };
}

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(15),
  skip: z.coerce.number().int().min(0).max(100000).default(0),
  status: notificationStatusSchema.default('all'),
  category: notificationCategorySchema.default('all'),
  before: z.string().min(1).max(512).optional(),
});

export async function GET(request: Request) {
  // Bulk read uses this server-time boundary, not the browser clock or action completion time.
  const readBefore = new Date().toISOString();
  try {
    await mongoose.connect(process.env.MONGODB_URL as string);
    const user = await getCurrentUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    if (!params.status && params.unreadOnly === 'true') params.status = 'unread';
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) return json({ error: 'Invalid notification filters or pagination' }, 400);
    const { limit, skip, before, status, category } = parsed.data;
    const cursor = before ? readNotificationCursor(before) : null;
    if (
      before &&
      (!cursor ||
        skip ||
        cursor.recipientId !== String(user._id) ||
        cursor.status !== status ||
        cursor.category !== category)
    ) {
      return json({ error: 'Invalid notification cursor' }, 400);
    }
    const filter = {
      recipientUserId: user._id,
      ...(status !== 'all' ? { isRead: status === 'read' } : {}),
      ...(category !== 'all' ? { type: { $in: NOTIFICATION_CATEGORIES[category].types } } : {}),
      ...(cursor
        ? {
            $or: [
              { createdAt: { $lt: new Date(cursor.createdAt) } },
              { createdAt: new Date(cursor.createdAt), _id: { $lt: cursor.id } },
            ],
          }
        : {}),
    };
    const [rows, counts] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit + 1)
        .lean(),
      getCounts(user._id),
    ]);
    const hasMore = rows.length > limit;
    const notifications = rows.slice(0, limit);
    return json({
      notifications,
      unreadCount: counts.unread,
      counts,
      readBefore,
      hasMore,
      nextCursor: hasMore
        ? createNotificationCursor(String(user._id), notifications[notifications.length - 1], {
            status,
            category,
          })
        : null,
    });
  } catch (error) {
    console.error('Failed to load notifications', error);
    return json({ error: 'Failed to load notifications. Please try again.' }, 500);
  }
}

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const mutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('mark-read'), notificationId: objectId }),
  z.object({ action: z.literal('mark-unread'), notificationId: objectId }),
  z.object({ action: z.literal('mark-all-read'), readBefore: z.string().datetime().optional() }),
]);

export async function PATCH(request: Request) {
  const requestTime = new Date();
  try {
    await mongoose.connect(process.env.MONGODB_URL as string);
    const user = await getCurrentUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Invalid notification action or payload' }, 400);
    const operation = parsed.data;
    if (operation.action === 'mark-all-read') {
      const before = operation.readBefore ? new Date(operation.readBefore) : requestTime;
      if (before > requestTime)
        return json({ error: 'Read boundary cannot be in the future' }, 400);
      await Notification.updateMany(
        { recipientUserId: user._id, isRead: false, createdAt: { $lt: before } },
        { $set: { isRead: true, readAt: requestTime } }
      );
    } else {
      const updated = await Notification.findOneAndUpdate(
        { _id: operation.notificationId, recipientUserId: user._id },
        {
          $set: {
            isRead: operation.action === 'mark-read',
            readAt: operation.action === 'mark-read' ? requestTime : null,
          },
        },
        { new: true }
      ).lean();
      if (!updated) return json({ error: 'Notification not found' }, 404);
    }
    const counts = await getCounts(user._id);
    emitNotificationEvent({
      type: 'notifications-read',
      recipientUserId: String(user._id),
      unreadCount: counts.unread,
    });
    return json({ success: true, unreadCount: counts.unread, counts });
  } catch (error) {
    console.error('Failed to update notification read state', error);
    return json({ error: 'Could not update notifications. Please try again.' }, 500);
  }
}
