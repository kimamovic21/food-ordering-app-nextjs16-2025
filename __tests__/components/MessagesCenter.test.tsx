// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MessagesCenter from '@/components/shared/MessagesCenter';
import type { ConversationThreadMessage, MessagesCenterApiResponse } from '@/types/messages';

vi.mock('@/components/shared/SonnerToastComponent', () => ({ sonnerToast: { error: vi.fn() } }));

const navigationMock = vi.hoisted(() => ({
  params: {} as { participantId?: string },
  push: vi.fn(),
  searchParams: new URLSearchParams('participantId=recipient-1&context=direct'),
}));

vi.mock('next/navigation', () => ({
  useParams: () => navigationMock.params,
  useRouter: () => ({
    push: navigationMock.push,
  }),
  useSearchParams: () => navigationMock.searchParams,
}));

vi.mock('@/hooks/useProfile', () => ({
  default: () => ({
    data: {
      _id: 'current-user-1',
      role: 'admin',
    },
    loading: false,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const MessagesCenterTestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return MessagesCenterTestWrapper;
};

describe('MessagesCenter', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    navigationMock.params = {};
    navigationMock.push.mockClear();
    navigationMock.searchParams = new URLSearchParams('participantId=recipient-1&context=direct');
  });

  it('loads and renders an inline conversation through TanStack Query', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.startsWith('/api/messages')) {
        return Response.json({
          conversations: [],
          unreadCount: 0,
          contactSuggestions: [
            {
              _id: 'recipient-1',
              href: '/messages?participantId=recipient-1&context=direct',
              name: 'John Courier',
              role: 'courier',
            },
          ],
          contactPage: 1,
          contactHasMore: false,
          selectedConversation: {
            conversation: null,
            contact: {
              _id: 'recipient-1',
              href: '/messages?participantId=recipient-1&context=direct',
              name: 'John Courier',
              role: 'courier',
            },
            contextType: 'direct',
            messages: [],
            orderId: null,
          },
        });
      }

      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MessagesCenter title='Messages' description='Open approved conversations.' />, {
      wrapper: createWrapper(),
    });

    expect((await screen.findAllByText('John Courier')).length).toBeGreaterThan(0);
    expect(screen.getByText('Start the conversation')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/messages?participantId=recipient-1&context=direct',
        { cache: 'no-store', signal: expect.any(AbortSignal) }
      );
    });
  });

  const message = (
    id: string,
    body: string,
    senderUserId = 'current-user-1'
  ): ConversationThreadMessage => ({
    _id: id,
    body,
    senderUserId,
    recipientUserId: senderUserId === 'current-user-1' ? 'recipient-1' : 'current-user-1',
    deletedFor: [],
    createdAt: '2026-10-30T10:00:00Z',
    updatedAt: '2026-10-30T10:00:00Z',
  });
  const responseData = (messages: ConversationThreadMessage[] = []): MessagesCenterApiResponse => ({
    conversations: [],
    unreadCount: 0,
    contactSuggestions: [],
    selectedConversation: {
      conversation: {
        _id: 'conversation-1',
        participantIds: ['current-user-1', 'recipient-1'],
        participantKey: 'direct',
        contextType: 'direct',
        lastMessageText: '',
        unreadCount: 0,
        contact: null,
      },
      contact: {
        _id: 'recipient-1',
        userId: 'recipient-1',
        name: 'John Courier',
        role: 'courier',
        href: '/messages?participantId=recipient-1',
        contextType: 'direct',
      },
      messages,
      contextType: 'direct',
      hasOlderMessages: false,
      olderCursor: null,
    },
  });

  it('keeps a newer draft after failure and retries with the original message id', async () => {
    const user = userEvent.setup();
    let fail!: (response: Response) => void;
    const firstRequest = new Promise<Response>((resolve) => {
      fail = resolve;
    });
    const sends: Record<string, string>[] = [];
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        sends.push(body);
        if (sends.length === 1) return firstRequest;
        return Response.json({
          message: { ...message('saved', body.text), clientMessageId: body.clientMessageId },
        });
      }
      return Response.json(responseData());
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MessagesCenter title='Messages' description='Conversations' />, {
      wrapper: createWrapper(),
    });
    const input = await screen.findByRole('textbox', { name: 'Message' });
    await user.type(input, 'First message');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByText('Sending...')).toBeInTheDocument();
    await user.type(input, 'Next draft');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(sends).toHaveLength(1);
    await act(async () => {
      fail(Response.json({ error: 'Connection lost' }, { status: 503 }));
    });
    expect(await screen.findByText('Not sent')).toBeInTheDocument();
    expect(input).toHaveValue('Next draft');
    await user.click(screen.getByRole('button', { name: 'Retry message' }));
    await screen.findByText('Sent');
    expect(sends).toHaveLength(2);
    expect(sends[1].clientMessageId).toBe(sends[0].clientMessageId);
    expect(sends[1].text).toBe('First message');
    expect(input).toHaveValue('Next draft');
    expect(screen.getAllByText('First message')).toHaveLength(1);
  });

  it('loads older history only after clicking and retains current messages', async () => {
    const data = responseData([message('new', 'Latest message')]);
    data.selectedConversation!.hasOlderMessages = true;
    data.selectedConversation!.olderCursor = 'older-cursor';
    const fetchMock = vi.fn(async (url: RequestInfo | URL) =>
      Response.json(
        String(url).includes('before=') ? responseData([message('old', 'Older message')]) : data
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<MessagesCenter title='Messages' description='Conversations' />, {
      wrapper: createWrapper(),
    });
    await screen.findByText('Latest message');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Load older messages' }));
    expect(await screen.findByText('Older message')).toBeInTheDocument();
    expect(screen.getByText('Latest message')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load older messages' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toContain('before=older-cursor');
  });

  it('does not retain the previous recipient, messages, or draft while switching threads', async () => {
    let resolveNext!: (response: Response) => void;
    const next = new Promise<Response>((resolve) => {
      resolveNext = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) =>
        String(url).includes('recipient-2')
          ? next
          : Response.json(responseData([message('old', 'Private first thread')]))
      )
    );
    const view = render(<MessagesCenter title='Messages' description='Conversations' />, {
      wrapper: createWrapper(),
    });
    const input = await screen.findByRole('textbox', { name: 'Message' });
    fireEvent.change(input, { target: { value: 'Unsent first draft' } });
    navigationMock.searchParams = new URLSearchParams('participantId=recipient-2&context=direct');
    view.rerender(<MessagesCenter title='Messages' description='Conversations' />);
    expect(screen.queryByText('Private first thread')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument();
    const data = responseData();
    data.selectedConversation!.contact = {
      ...data.selectedConversation!.contact!,
      _id: 'recipient-2',
      userId: 'recipient-2',
      name: 'Next Courier',
    };
    await act(async () => {
      resolveNext(Response.json(data));
    });
    expect(await screen.findByRole('textbox', { name: 'Message' })).toHaveValue('');
    expect(screen.getByText('Next Courier')).toBeInTheDocument();
  });

  it('does not send when Enter is used for composition or held down', async () => {
    const fetchMock = vi.fn(async () => Response.json(responseData()));
    vi.stubGlobal('fetch', fetchMock);
    render(<MessagesCenter title='Messages' description='Conversations' />, {
      wrapper: createWrapper(),
    });
    const input = await screen.findByRole('textbox', { name: 'Message' });
    fireEvent.change(input, { target: { value: 'Text being composed' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', repeat: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(input).toHaveAttribute('maxlength', '4000');
    expect(input).toHaveValue('Text being composed');
  });

  it('does not mark offscreen or hidden-tab messages as seen', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const fetchMock = vi.fn(async () =>
      Response.json(responseData([message('incoming', 'Not yet read', 'recipient-1')]))
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<MessagesCenter title='Messages' description='Conversations' />, {
      wrapper: createWrapper(),
    });
    await screen.findByText('Not yet read');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retains the contact search and composer while same-thread search refreshes', async () => {
    const pending = new Promise<Response>(() => {});
    const fetchMock = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('search=')
        ? pending
        : Response.json(responseData([message('old', 'Existing thread')]))
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<MessagesCenter title='Messages' description='Conversations' />, {
      wrapper: createWrapper(),
    });
    const composer = await screen.findByRole('textbox', { name: 'Message' });
    fireEvent.change(composer, { target: { value: 'Keep this draft' } });
    const search = screen.getByPlaceholderText(/search.*contacts|search.*name|search.*user/i);
    search.focus();
    fireEvent.change(search, { target: { value: 'courier' } });
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('search=courier'))).toBe(
        true
      )
    );
    expect(search).toHaveFocus();
    expect(composer).toHaveValue('Keep this draft');
    expect(screen.getByText('Existing thread')).toBeInTheDocument();
  });

  it('acknowledges visible incoming messages without marking the entire history', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.dataset.unseenId === 'visible')
        return { top: 150, bottom: 190, height: 40 } as DOMRect;
      if (this.dataset.unseenId === 'offscreen')
        return { top: 400, bottom: 440, height: 40 } as DOMRect;
      return { top: 100, bottom: 300, height: 200 } as DOMRect;
    });
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') return Response.json({ success: true });
      return Response.json(
        responseData([
          message('visible', 'Read me', 'recipient-1'),
          message('offscreen', 'Later', 'recipient-1'),
        ])
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MessagesCenter title='Messages' description='Conversations' />, {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true)
    );
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')![1]!;
    expect(JSON.parse(String(patch.body))).toEqual({
      action: 'mark-seen',
      conversationId: 'conversation-1',
      messageIds: ['visible'],
    });
  });
});
