import {
  applyNotificationRead,
  matchesNotificationFilters,
  mergeNotificationPages,
  NOTIFICATION_CATEGORIES,
} from '@/libs/notificationInbox';
import { readNotificationCursor } from '@/libs/notificationPagination';
import type { AppNotification } from '@/types/notifications';

const item = (id: string, changes: Partial<AppNotification> = {}): AppNotification => ({
  _id: id,
  type: 'order_paid',
  title: id,
  message: id,
  isRead: false,
  createdAt: '2020-01-01T00:00:00.000Z',
  ...changes,
});

describe('notification inbox helpers', () => {
  it('deduplicates overlapping pages and keeps the newest state', () => {
    const result = mergeNotificationPages([
      [item('3'), item('2', { isRead: true })],
      [item('2'), item('1')],
    ]);
    expect(result.map((row) => row._id)).toEqual(['3', '2', '1']);
    expect(result[1].isRead).toBe(true);
  });
  it('optimistically changes only the selected row without mutating query data', () => {
    const rows = [item('a'), item('b')];
    const changed = applyNotificationRead(rows, { action: 'mark-read', notificationId: 'a' });
    expect(changed.map((row) => row.isRead)).toEqual([true, false]);
    expect(rows[0].isRead).toBe(false);
    expect(
      applyNotificationRead(changed, { action: 'mark-unread', notificationId: 'a' })[0].readAt
    ).toBeNull();
  });
  it('does not optimistically read arrivals at or after the mark-all boundary', () => {
    const rows = [
      item('old', { createdAt: '2019-12-31T23:59:59Z' }),
      item('same'),
      item('new', { createdAt: '2020-01-01T00:00:01Z' }),
    ];
    expect(
      applyNotificationRead(rows, {
        action: 'mark-all-read',
        readBefore: '2020-01-01T00:00:00Z',
      }).map((row) => row.isRead)
    ).toEqual([true, false, false]);
  });
  it('applies read/category filters to optimistic rows', () => {
    expect(matchesNotificationFilters(item('a'), { status: 'unread', category: 'orders' })).toBe(
      true
    );
    expect(
      matchesNotificationFilters(item('a', { isRead: true }), {
        status: 'unread',
        category: 'orders',
      })
    ).toBe(false);
    expect(matchesNotificationFilters(item('a'), { status: 'all', category: 'support' })).toBe(
      false
    );
  });
  it('assigns each known category type once', () => {
    const types = Object.values(NOTIFICATION_CATEGORIES).flatMap((category) => category.types);
    expect(types).toHaveLength(11);
    expect(new Set(types).size).toBe(types.length);
  });
  it.each(['', 'invalid', 'x'.repeat(513), Buffer.from('{}').toString('base64url')])(
    'rejects malformed cursors',
    (cursor) => {
      expect(readNotificationCursor(cursor)).toBeNull();
    }
  );
});
