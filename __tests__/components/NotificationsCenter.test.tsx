// @vitest-environment jsdom

import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import NotificationsCenter from '@/components/shared/NotificationsCenter';
import { NotificationsProvider, useNotifications } from '@/contexts/NotificationsContext';
import { queryKeys } from '@/libs/queryKeys';
import type { AppNotification, NotificationsApiResponse } from '@/types/notifications';

const mocks = vi.hoisted(() => ({
  email: 'customer@example.com',
  push: vi.fn(),
  sound: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'authenticated', data: { user: { email: mocks.email } } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/contexts/SoundSettingsContext', () => ({
  useSoundSettings: () => ({ playNotificationSound: mocks.sound }),
}));
vi.mock('@/components/shared/SonnerToastComponent', () => ({
  sonnerToast: { error: mocks.toast },
}));

const boundary = '2026-11-04T10:00:00.000Z';
const item = (id = 'first', overrides: Partial<AppNotification> = {}): AppNotification => ({
  _id: id,
  type: 'order_paid',
  title: 'Notification ' + id,
  message: 'Payment received',
  orderId: 'order-1',
  isRead: false,
  createdAt: '2026-11-04T09:00:00.000Z',
  ...overrides,
});
const page = (
  notifications = [item()],
  overrides: Partial<NotificationsApiResponse> = {}
): NotificationsApiResponse => ({
  notifications,
  counts: { total: 40, unread: 28, read: 12 },
  unreadCount: 28,
  readBefore: boundary,
  hasMore: false,
  nextCursor: null,
  ...overrides,
});
const deferred = () => {
  let resolve!: (value: Response) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

class EventSourceStub {
  static instances: EventSourceStub[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor() {
    EventSourceStub.instances.push(this);
  }
  emit() {
    this.onmessage?.(new MessageEvent('message', { data: '{"type":"notification-created"}' }));
  }
}

// A second consumer observes the exact shared state used by the notification bell.
function BellState() {
  const { notifications, unreadCount, isUpdatingReadState } = useNotifications();
  return (
    <output data-testid='bell-state'>
      {JSON.stringify({
        ids: notifications.map((row) => row._id),
        unreadCount,
        read: notifications.map((row) => row.isRead),
        pending: isUpdatingReadState,
      })}
    </output>
  );
}

let client: QueryClient;
let response: NotificationsApiResponse;
let patch: ReturnType<typeof deferred>;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
const urlUpdates = vi.fn();

function mount(searchParams = '', strict = false) {
  const tree = () => (
    <QueryClientProvider client={client}>
      <NuqsTestingAdapter searchParams={searchParams} hasMemory onUrlUpdate={urlUpdates}>
        <NotificationsProvider>
          <BellState />
          <NotificationsCenter
            title='Notifications'
            description='Recent account activity'
            backHref='/'
            backLabel='Back to home'
            role='user'
          />
        </NotificationsProvider>
      </NuqsTestingAdapter>
    </QueryClientProvider>
  );
  const result = render(strict ? <StrictMode>{tree()}</StrictMode> : tree());
  return { ...result, rerenderAccount: () => result.rerender(tree()) };
}

const bell = () => JSON.parse(screen.getByTestId('bell-state').textContent || '{}');
const patchCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');
const settle = async () => {
  await waitFor(() => expect(screen.getByLabelText('Refresh notifications')).toBeEnabled());
};

beforeEach(() => {
  mocks.email = 'customer@example.com';
  EventSourceStub.instances = [];
  vi.stubGlobal('EventSource', EventSourceStub);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  response = page();
  patch = deferred();
  fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
    if (init?.method === 'PATCH') return patch.promise;
    return Response.json(response);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

describe('notification inbox and shared bell state', () => {
  it('keeps summary and inbox refreshes connected after Strict Mode effect replay', async () => {
    mount('', true);
    await screen.findByText('Notification first');
    await settle();
    response = page([item('new', { createdAt: '2026-11-04T11:00:00.000Z' })]);
    act(() => EventSourceStub.instances.at(-1)?.emit());
    await screen.findByText('Notification new');
    await waitFor(() => expect(bell().ids).toEqual(['new']));
    expect(client.getQueryData(queryKeys.notifications.summary(mocks.email))).toBeDefined();
  });

  it('sounds for the first arrival after an empty inbox, but not initial loading', async () => {
    response = page([], { counts: { total: 0, unread: 0, read: 0 }, unreadCount: 0 });
    mount();
    await screen.findByText('No notifications yet');
    await settle();
    expect(mocks.sound).not.toHaveBeenCalled();
    response = page([item()], { counts: { total: 1, unread: 1, read: 0 }, unreadCount: 1 });
    act(() => EventSourceStub.instances[0].emit());
    await screen.findByText('Notification first');
    await waitFor(() => expect(mocks.sound).toHaveBeenCalledOnce());
    act(() => EventSourceStub.instances[0].emit());
    await settle();
    expect(mocks.sound).toHaveBeenCalledOnce();
  });

  it('does not play an arrival sound when an existing notification becomes unread', async () => {
    response = page([item('first', { isRead: true })]);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as unread' }));
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(bell().read).toEqual([false]);
    response = page([item()], { counts: { total: 40, unread: 29, read: 11 }, unreadCount: 29 });
    await act(async () =>
      patch.resolve(
        Response.json({ success: true, counts: response.counts, unreadCount: response.unreadCount })
      )
    );
    await waitFor(() => expect(bell().pending).toBe(false));
    expect(bell().unreadCount).toBe(29);
    expect(mocks.sound).not.toHaveBeenCalled();
  });

  it('uses global counts even when the loaded page contains only read notifications', async () => {
    response = page([item('first', { isRead: true })]);
    mount();
    await screen.findByText('Notification first');
    expect(screen.getByLabelText('Total notifications')).toHaveTextContent('40');
    expect(screen.getByLabelText('Unread notifications')).toHaveTextContent('28');
    expect(screen.getByLabelText('Read notifications')).toHaveTextContent('12');
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeEnabled();
    expect(bell().unreadCount).toBe(28);
  });

  it.each(['http', 'network'])('rolls back an optimistic read on a %s failure', async (failure) => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read', exact: true }));
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(bell().read).toEqual([true]);
    expect(screen.getByRole('button', { name: 'Mark as unread' })).toBeDisabled();
    await act(async () => {
      if (failure === 'http')
        patch.resolve(Response.json({ error: 'Update failed' }, { status: 500 }));
      else patch.reject(new Error('Connection interrupted'));
    });
    await waitFor(() => expect(bell().pending).toBe(false));
    expect(bell().read).toEqual([false]);
    expect(bell().unreadCount).toBe(28);
    expect(screen.getByRole('button', { name: 'Mark as read', exact: true })).toBeEnabled();
    expect(mocks.toast).toHaveBeenCalledOnce();
  });

  it('updates both consumers after success and blocks duplicate pending writes', async () => {
    mount();
    const button = await screen.findByRole('button', { name: 'Mark as read', exact: true });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    response = page([item('first', { isRead: true })], {
      counts: { total: 40, unread: 27, read: 13 },
      unreadCount: 27,
    });
    await act(async () =>
      patch.resolve(
        Response.json({ success: true, counts: response.counts, unreadCount: response.unreadCount })
      )
    );
    await waitFor(() => expect(bell().pending).toBe(false));
    expect(bell().read).toEqual([true]);
    expect(bell().unreadCount).toBe(27);
    expect(screen.getByLabelText('Unread notifications')).toHaveTextContent('27');
    expect(mocks.sound).not.toHaveBeenCalled();
  });

  it('leaves a new arrival unread during bulk marking and refreshes both queries over SSE', async () => {
    mount();
    await screen.findByText('Notification first');
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(JSON.parse(String(patchCalls()[0][1]?.body))).toEqual({
      action: 'mark-all-read',
      readBefore: boundary,
    });
    response = page([item('new', { createdAt: '2026-11-04T10:01:00.000Z' }), item()]);
    act(() => EventSourceStub.instances[0].emit());
    await screen.findByText('Notification new');
    await waitFor(() => expect(bell().ids).toEqual(['new', 'first']));
    expect(bell().read).toEqual([false, true]);
    response = page([response.notifications[0], item('first', { isRead: true })], {
      counts: { total: 41, unread: 1, read: 40 },
      unreadCount: 1,
    });
    await act(async () =>
      patch.resolve(Response.json({ success: true, counts: response.counts, unreadCount: 1 }))
    );
    await waitFor(() => expect(bell().pending).toBe(false));
    expect(bell().read).toEqual([false, true]);
    expect(screen.getByLabelText('Unread notifications')).toHaveTextContent('1');
    expect(mocks.sound).toHaveBeenCalledOnce();
  });

  it('keeps loaded older pages during refresh and deduplicates overlapping rows', async () => {
    fetchMock.mockImplementation(async (input) => {
      const older = new URL(String(input), 'http://localhost').searchParams.has('before');
      return Response.json(
        older
          ? page([
              item(),
              item('older', {
                createdAt: '2026-11-03T09:00:00.000Z',
              }),
            ])
          : page([item()], { hasMore: true, nextCursor: 'older-cursor' })
      );
    });
    mount();
    await screen.findByText('Notification first');
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByText('Notification older');
    await settle();
    fireEvent.click(screen.getByLabelText('Refresh notifications'));
    await settle();
    expect(screen.getAllByText('Notification first')).toHaveLength(1);
    expect(screen.getByText('Notification older')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes('before=older-cursor'))
    ).toHaveLength(2);
  });

  it('requests URL filters and keeps the filter control mounted while changing status', async () => {
    response = page([item('support', { type: 'support_ticket' })]);
    mount('?status=unread&category=support');
    await screen.findByText('Notification support');
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('status=unread&category=support'))
    ).toBe(true);
    const readButton = screen.getByRole('button', { name: 'Read', exact: true });
    readButton.focus();
    fireEvent.click(readButton);
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes('status=read&category=support'))
      ).toBe(true)
    );
    expect(readButton).toHaveFocus();
    expect(readButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Total notifications')).toHaveTextContent('40');
  });

  it('shows a recoverable error instead of a false empty inbox', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Service unavailable' }, { status: 503 }));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
    fetchMock.mockImplementation(async () => Response.json(page()));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Notification first');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens details without waiting for a slow read-state request', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'View details' }));
    expect(mocks.push).toHaveBeenCalledWith('/my-orders/order-1');
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    await act(async () => patch.resolve(Response.json({ error: 'Unavailable' }, { status: 503 })));
    await waitFor(() => expect(bell().pending).toBe(false));
  });

  it('does not apply a late mutation from a previous account to the next account', async () => {
    const view = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read', exact: true }));
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    mocks.email = 'second@example.com';
    response = page([item('second')], { counts: { total: 1, unread: 1, read: 0 }, unreadCount: 1 });
    view.rerenderAccount();
    expect(screen.queryByText('Notification first')).not.toBeInTheDocument();
    await screen.findByText('Notification second');
    expect(EventSourceStub.instances[0].close).toHaveBeenCalledOnce();
    await act(async () =>
      patch.resolve(
        Response.json({ success: true, counts: { total: 40, unread: 0, read: 40 }, unreadCount: 0 })
      )
    );
    await waitFor(() => expect(bell().pending).toBe(false));
    expect(bell().ids).toEqual(['second']);
    expect(bell().read).toEqual([false]);
    expect(bell().unreadCount).toBe(1);
    expect(
      client.getQueriesData({ queryKey: queryKeys.notifications.viewer('customer@example.com') })
    ).toEqual([]);
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.sound).not.toHaveBeenCalled();
  });
});
