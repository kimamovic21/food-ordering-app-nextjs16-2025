import type { EntityId, ISODateString } from '@/types/common';
import type { UserRole } from '@/types/user';

export type NotificationRole = Extract<UserRole, 'user' | 'admin' | 'courier'>;

export type NotificationType =
  | 'order_placed'
  | 'order_paid'
  | 'order_status_changed'
  | 'courier_assigned'
  | 'order_completed'
  | 'order_canceled'
  | 'order_refunded'
  | 'restaurant_available'
  | 'support_ticket'
  | 'late_order'
  | 'inventory_alert';

export type AppNotification = {
  _id: EntityId;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: EntityId | null;
  metadata?: {
    ticketId?: EntityId | null;
    [key: string]: unknown;
  } | null;
  isRead: boolean;
  readAt?: ISODateString | null;
  createdAt: ISODateString;
};

export type NotificationsApiResponse = {
  notifications: AppNotification[];
  unreadCount: number;
  counts: NotificationCounts;
  readBefore: ISODateString;
  hasMore: boolean;
  nextCursor: string | null;
};

export type NotificationCounts = { total: number; unread: number; read: number };
export type NotificationStatusFilter = 'all' | 'unread' | 'read';
export type NotificationCategory =
  'all' | 'orders' | 'delivery' | 'support' | 'restaurants' | 'inventory';
export type NotificationFilters = {
  status: NotificationStatusFilter;
  category: NotificationCategory;
};
export type NotificationReadOperation =
  | { action: 'mark-read' | 'mark-unread'; notificationId: EntityId }
  | { action: 'mark-all-read'; readBefore: ISODateString };
export type NotificationMutationResponse = {
  success: true;
  unreadCount: number;
  counts: NotificationCounts;
};

export type AppNotificationRealtimePayload = {
  type?: string;
  notificationId?: EntityId;
  notificationType?: NotificationType | string;
  orderId?: EntityId | null;
  title?: string;
  message?: string;
  unreadCount?: number;
  metadata?: Record<string, unknown> | null;
  isIncoming?: boolean;
};

export type NotificationRealtimeEvent = AppNotificationRealtimePayload & {
  type: 'notification-created' | 'notifications-read';
  recipientUserId: EntityId;
};

export type CreateNotificationInput<TObjectId = EntityId> = {
  recipientUserIds: Array<EntityId | TObjectId>;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: EntityId | TObjectId | null;
  metadata?: Record<string, unknown> | null;
};

export type CreatedNotification<TObjectId = EntityId> = {
  _id?: TObjectId;
  recipientUserId: TObjectId;
};
