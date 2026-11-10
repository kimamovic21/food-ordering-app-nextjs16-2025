import type {
  AppNotification,
  NotificationCategory,
  NotificationFilters,
  NotificationReadOperation,
  NotificationType,
} from '@/types/notifications';

export const NOTIFICATION_PAGE_SIZE = 15;
export const NOTIFICATION_CATEGORIES: Record<
  NotificationCategory,
  { label: string; types: NotificationType[] }
> = {
  all: { label: 'All categories', types: [] },
  orders: {
    label: 'Orders',
    types: [
      'order_placed',
      'order_paid',
      'order_status_changed',
      'order_completed',
      'order_canceled',
      'order_refunded',
      'late_order',
    ],
  },
  delivery: { label: 'Courier assignments', types: ['courier_assigned'] },
  support: { label: 'Support', types: ['support_ticket'] },
  restaurants: { label: 'Restaurants', types: ['restaurant_available'] },
  inventory: { label: 'Inventory', types: ['inventory_alert'] },
};

export function applyNotificationRead(
  items: AppNotification[],
  operation: NotificationReadOperation | null
): AppNotification[] {
  if (!operation) return items;
  return items.map((item) => {
    const matches =
      operation.action === 'mark-all-read'
        ? Date.parse(item.createdAt) < Date.parse(operation.readBefore)
        : item._id === operation.notificationId;
    if (!matches) return item;
    const isRead = operation.action !== 'mark-unread';
    return { ...item, isRead, readAt: isRead ? item.readAt || new Date().toISOString() : null };
  });
}

export function matchesNotificationFilters(item: AppNotification, filters: NotificationFilters) {
  return (
    (filters.status === 'all' || item.isRead === (filters.status === 'read')) &&
    (filters.category === 'all' ||
      NOTIFICATION_CATEGORIES[filters.category].types.includes(item.type))
  );
}

export function mergeNotificationPages(pages: AppNotification[][]) {
  const items = new Map<string, AppNotification>();
  for (const page of [...pages].reverse()) for (const item of page) items.set(item._id, item);
  return [...items.values()].sort(
    (left, right) =>
      Date.parse(right.createdAt) - Date.parse(left.createdAt) || right._id.localeCompare(left._id)
  );
}
