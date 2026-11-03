'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import {
  ArrowLeft,
  ArrowDown,
  History,
  RotateCcw,
  Loader2,
  Edit3,
  MessageSquarePlus,
  MoreVertical,
  Send,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import useProfile from '@/hooks/useProfile';
import { useMessageThreadScroll } from '@/hooks/useMessageThreadScroll';
import { mergeThreadMessages, MESSAGE_MAX_LENGTH, MESSAGE_PAGE_SIZE } from '@/libs/messageThread';
import { formatAppDateTime, formatAppTime } from '@/libs/dateFormat';
import { queryKeys } from '@/libs/queryKeys';
import type {
  ConversationThreadMessage as ThreadMessage,
  MessageContact as ConversationContact,
  MessagesCenterApiResponse,
  MessagesCenterQueryParams,
  OutgoingMessage,
} from '@/types/messages';

const buildMessagesCenterUrl = ({
  context,
  isAdminSearchEnabled,
  orderId,
  page = 1,
  participantId,
  searchTerm = '',
  before,
}: MessagesCenterQueryParams) => {
  const query = new URLSearchParams();

  if (participantId) query.set('participantId', participantId);
  if (orderId) query.set('orderId', orderId);
  if (context) query.set('context', context);
  if (before) query.set('before', before);
  if (isAdminSearchEnabled && searchTerm.trim()) {
    query.set('search', searchTerm.trim());
    query.set('page', String(page));
    query.set('limit', '10');
  }

  return `/api/messages${query.toString() ? `?${query.toString()}` : ''}`;
};

const fetchMessagesCenter = async (
  params: MessagesCenterQueryParams,
  signal?: AbortSignal
): Promise<MessagesCenterApiResponse> => {
  const response = await fetch(buildMessagesCenterUrl(params), { cache: 'no-store', signal });
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(json?.error || 'Failed to load messages');
  }

  return json as MessagesCenterApiResponse;
};

const formatDate = (dateInput?: string | null) => {
  return formatAppTime(dateInput, '');
};

const formatShortDate = (dateInput?: string | null) => {
  return formatAppDateTime(dateInput, '');
};

const getInitials = (name?: string | null) => {
  if (!name) return 'M';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const getContactId = (contact?: ConversationContact | null) =>
  contact?._id || contact?.userId || '';

const messagesShellHeightClass = 'min-h-[72vh] lg:h-full lg:min-h-0';
const messagesSectionClass =
  'relative mx-auto mt-8 h-auto min-h-[calc(100vh-8rem)] w-full max-w-full overflow-hidden px-0 lg:h-[calc(100dvh-10rem)] lg:min-h-[620px]';
const messagesShellClass = `${messagesShellHeightClass} flex w-full max-w-full flex-col items-stretch gap-5 overflow-hidden lg:flex-row xl:gap-6`;
const messagesSidebarClass =
  'flex h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden border-border/70 bg-background/90 backdrop-blur lg:w-[24rem] lg:shrink-0 xl:w-[34rem]';
const messagesThreadCardClass =
  'h-full w-full max-w-full min-w-0 overflow-hidden border-border/70 bg-background/90 backdrop-blur lg:flex-1';

const MessagesLoadingSkeleton = () => (
  <section className={messagesSectionClass}>
    <div className={messagesShellClass}>
      <Card className={messagesSidebarClass}>
        <CardHeader className='space-y-4 border-b border-border/60 pb-4'>
          <div className='flex items-start justify-between gap-4'>
            <div className='space-y-3'>
              <Skeleton className='h-8 w-44' />
              <Skeleton className='h-4 w-80 max-w-full' />
              <Skeleton className='h-4 w-64 max-w-full' />
            </div>
            <Skeleton className='h-10 w-24 rounded-full' />
          </div>
          <div className='grid grid-cols-3 gap-3'>
            <Skeleton className='h-24 rounded-2xl' />
            <Skeleton className='h-24 rounded-2xl' />
            <Skeleton className='h-24 rounded-2xl' />
          </div>
        </CardHeader>
        <CardContent className='flex min-h-0 flex-1 flex-col gap-5 p-4'>
          <div className='space-y-3'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-20 rounded-2xl' />
            <div className='flex gap-2 overflow-hidden'>
              <Skeleton className='h-20 min-w-48 rounded-2xl' />
              <Skeleton className='h-20 min-w-48 rounded-2xl' />
            </div>
          </div>
          <Separator />
          <div className='space-y-3'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-20 rounded-2xl' />
            <Skeleton className='h-20 rounded-2xl' />
            <Skeleton className='h-20 rounded-2xl' />
          </div>
        </CardContent>
      </Card>

      <Card className={messagesThreadCardClass}>
        <div className='flex h-full min-h-[72vh] min-w-0 flex-col lg:min-h-0'>
          <CardHeader className='border-b border-border/60 pb-4'>
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-12 w-12 rounded-full' />
                <div className='space-y-2'>
                  <Skeleton className='h-6 w-48' />
                  <Skeleton className='h-4 w-36' />
                </div>
              </div>
              <Skeleton className='h-8 w-8 rounded-full' />
            </div>
          </CardHeader>
          <div className='min-h-0 flex-1 space-y-4 overflow-hidden p-4 sm:p-6'>
            <Skeleton className='ml-auto h-24 w-[42%] min-w-64 rounded-3xl' />
            <Skeleton className='h-24 w-[46%] min-w-64 rounded-3xl' />
            <Skeleton className='ml-auto h-28 w-[55%] min-w-72 rounded-3xl' />
          </div>
          <div className='border-t border-border/60 p-4 sm:p-5'>
            <Skeleton className='h-16 rounded-3xl' />
          </div>
        </div>
      </Card>
    </div>
  </section>
);

type MessagesCenterProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

const MessagesCenterContent = ({
  title,
  description,
  backHref = '/my-orders',
  backLabel = 'Back',
}: MessagesCenterProps) => {
  const params = useParams<{ participantId?: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profileData, loading: profileLoading } = useProfile();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<OutgoingMessage[]>([]);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [activeContactSearch, setActiveContactSearch] = useState('');
  const [extraContacts, setExtraContacts] = useState<ConversationContact[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactHasMore, setContactHasMore] = useState(false);
  const [contactLoadingMore, setContactLoadingMore] = useState(false);
  const contactSearchVersion = useRef(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const sendingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const routeParticipantId = params?.participantId;
  const queryParticipantId = searchParams.get('participantId');
  const participantId = routeParticipantId || queryParticipantId;
  const orderId = searchParams.get('orderId');
  const contextParam = searchParams.get('context');
  const context =
    contextParam === 'direct' || contextParam === 'order' || contextParam === 'restaurant'
      ? contextParam
      : null;
  const currentUserId = profileData?._id;
  const isAdminSearchEnabled = profileData?.role === 'admin';

  const centerQueryParams = useMemo(
    () => ({
      context: context || '',
      orderId: orderId || '',
      participantId: participantId || '',
      search: isAdminSearchEnabled ? activeContactSearch.trim() : '',
      viewerId: currentUserId,
    }),
    [activeContactSearch, context, isAdminSearchEnabled, orderId, participantId, currentUserId]
  );

  const {
    data: threadPages,
    dataUpdatedAt,
    error: messagesError,
    isFetching,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    enabled: !profileLoading && Boolean(profileData?._id),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchMessagesCenter(
        {
          before: pageParam,
          context,
          isAdminSearchEnabled,
          orderId,
          page: 1,
          participantId,
          searchTerm: activeContactSearch,
        },
        signal
      ),
    queryKey: queryKeys.messages.center(centerQueryParams),
    getNextPageParam: (lastPage) =>
      lastPage.selectedConversation?.hasOlderMessages
        ? lastPage.selectedConversation.olderCursor
        : undefined,
    placeholderData: (previous, previousQuery) => {
      const previousParams = previousQuery?.queryKey[2] as typeof centerQueryParams | undefined;
      return previousParams &&
        previousParams.viewerId === currentUserId &&
        previousParams.participantId === centerQueryParams.participantId &&
        previousParams.orderId === centerQueryParams.orderId &&
        previousParams.context === centerQueryParams.context
        ? previous
        : undefined;
    },
    refetchInterval: 5000,
  });

  const data = threadPages?.pages[0];
  const selectedThread = data?.selectedConversation;
  const loading = profileLoading || (!data && isLoading);
  const refreshing = Boolean(data && isFetching);
  const error =
    messagesError instanceof Error
      ? messagesError.message
      : messagesError
        ? 'Failed to load messages'
        : null;

  useEffect(() => {
    if (!isAdminSearchEnabled) {
      setContactSearch('');
      setActiveContactSearch('');
      setContactHasMore(false);
      setContactPage(1);
      return;
    }

    const debounceId = window.setTimeout(() => {
      setActiveContactSearch(contactSearch);
    }, 300);

    return () => {
      window.clearTimeout(debounceId);
    };
  }, [contactSearch, isAdminSearchEnabled]);

  useEffect(() => {
    contactSearchVersion.current += 1;
    setExtraContacts([]);
    setContactPage(1);
    setContactLoadingMore(false);
  }, [activeContactSearch, context, isAdminSearchEnabled, orderId, participantId]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setContactHasMore(Boolean(data.contactHasMore));
    setContactPage((currentPage) => Math.max(currentPage, Number(data.contactPage) || 1));
  }, [data]);

  const serverPages = useMemo(
    () => threadPages?.pages.map((page) => page.selectedConversation?.messages || []) || [],
    [threadPages]
  );
  useEffect(() => {
    const serverMessages = serverPages.flat();
    setOptimisticMessages((previous) =>
      previous.filter(
        (outgoing) =>
          !serverMessages.some(
            (message) =>
              message._id === outgoing._id ||
              (outgoing.clientMessageId && message.clientMessageId === outgoing.clientMessageId)
          )
      )
    );
  }, [serverPages]);
  const visibleMessages = useMemo(
    () => mergeThreadMessages(serverPages, optimisticMessages),
    [serverPages, optimisticMessages]
  );
  const {
    containerRef: scrollContainerRef,
    onScroll,
    hasNewMessages,
    scrollToLatest,
    rememberOlderPosition,
    cancelOlderPosition,
    visibleUnreadIds,
    documentVisible,
  } = useMessageThreadScroll(visibleMessages, threadPages?.pages.length || 0);
  const acknowledgedIds = useRef(new Set<string>());
  const pendingRead = useRef(false);
  useEffect(() => {
    const conversationId = selectedThread?.conversation?._id;
    const messageIds = visibleUnreadIds
      .filter((id) => !acknowledgedIds.current.has(id))
      .slice(0, MESSAGE_PAGE_SIZE);
    if (!conversationId || !documentVisible || !messageIds.length || pendingRead.current) return;
    pendingRead.current = true;
    void (async () => {
      try {
        const response = await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark-seen', conversationId, messageIds }),
        });
        if (!response.ok) return;
        messageIds.forEach((id) => acknowledgedIds.current.add(id));
        await queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      } catch {
        /* Polling retries receipts without interrupting the conversation. */
      } finally {
        pendingRead.current = false;
      }
    })();
  }, [
    selectedThread?.conversation?._id,
    visibleUnreadIds,
    documentVisible,
    dataUpdatedAt,
    queryClient,
  ]);

  const visibleContacts = useMemo(() => {
    const contacts = [...(data?.contactSuggestions || []), ...extraContacts];
    const seenContacts = new Set<string>();

    return contacts.filter((contact) => {
      const key = getContactId(contact) || contact.href;

      if (seenContacts.has(key)) {
        return false;
      }

      seenContacts.add(key);
      return true;
    });
  }, [data?.contactSuggestions, extraContacts]);

  const refreshMessages = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
  }, [queryClient]);

  const handleLoadMoreContacts = async () => {
    if (!isAdminSearchEnabled || !contactHasMore || contactLoadingMore) {
      return;
    }

    const searchVersion = contactSearchVersion.current;
    try {
      setContactLoadingMore(true);
      const nextPage = contactPage + 1;
      const nextData = await queryClient.fetchQuery({
        queryFn: ({ signal }) =>
          fetchMessagesCenter(
            {
              context,
              isAdminSearchEnabled,
              orderId,
              page: nextPage,
              participantId,
              searchTerm: activeContactSearch,
            },
            signal
          ),
        queryKey: queryKeys.messages.centerPage({
          ...centerQueryParams,
          page: nextPage,
        }),
      });

      if (!mountedRef.current || searchVersion !== contactSearchVersion.current) return;
      setExtraContacts((currentContacts) => [
        ...currentContacts,
        ...(nextData.contactSuggestions || []),
      ]);
      setContactHasMore(Boolean(nextData.contactHasMore));
      setContactPage(Number(nextData.contactPage) || nextPage);
    } catch (error) {
      if (mountedRef.current && searchVersion === contactSearchVersion.current)
        sonnerToast.error(error instanceof Error ? error.message : 'Failed to load contacts');
    } finally {
      if (mountedRef.current && searchVersion === contactSearchVersion.current)
        setContactLoadingMore(false);
    }
  };

  const handleLoadOlder = async () => {
    if (!hasNextPage || isFetching) return;
    rememberOlderPosition();
    try {
      const previousPageCount = threadPages?.pages.length || 0;
      const result = await fetchNextPage({ cancelRefetch: false });
      if (result.isError) throw new Error('Could not load older messages. Please try again.');
      if ((result.data?.pages.length || 0) <= previousPageCount) cancelOlderPosition();
    } catch {
      cancelOlderPosition();
      if (mountedRef.current) sonnerToast.error('Could not load older messages. Please try again.');
    }
  };

  const handleSendMessage = async (retryMessage?: OutgoingMessage) => {
    if (!selectedThread?.contact || !currentUserId || sendingRef.current) {
      return;
    }

    const recipientUserId = getContactId(selectedThread.contact);
    if (!recipientUserId) {
      sonnerToast.error('Missing message recipient');
      return;
    }

    const body = retryMessage?.body || draft.trim();
    if (!body || body.length > MESSAGE_MAX_LENGTH) {
      return;
    }

    const clientMessageId = retryMessage?.clientMessageId || crypto.randomUUID();
    const tempId = retryMessage?._id || `temp-${clientMessageId}`;
    const optimisticMessage: OutgoingMessage = {
      _id: tempId,
      senderUserId: currentUserId,
      recipientUserId,
      body,
      deliveredAt: null,
      seenAt: null,
      editedAt: null,
      deletedFor: [],
      createdAt: retryMessage?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientMessageId,
      sendState: 'sending',
    };

    if (!retryMessage) setDraft('');
    sendingRef.current = true;
    setSending(true);
    setOptimisticMessages((prev) => [
      ...prev.filter((message) => message._id !== tempId),
      optimisticMessage,
    ]);
    scrollToLatest();

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId,
          text: body,
          clientMessageId,
          orderId: selectedThread.orderId || orderId || null,
          context: selectedThread.contextType,
        }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to send message');
      }
      if (!json?.message?._id) throw new Error('Unable to confirm delivery. Retry this message.');

      if (mountedRef.current)
        setOptimisticMessages((prev) =>
          prev.map((message) => (message._id === tempId ? json.message : message))
        );
      void refreshMessages();
    } catch (sendError) {
      if (mountedRef.current) {
        setOptimisticMessages((prev) =>
          prev.map((message) =>
            message._id === tempId ? { ...message, sendState: 'failed' } : message
          )
        );
        sonnerToast.error(
          sendError instanceof Error ? sendError.message : 'Failed to send message'
        );
      }
    } finally {
      sendingRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  };

  const handleEditMessage = async (message: ThreadMessage) => {
    if (sendingRef.current) return;
    setEditingMessageId(message._id);
    setDraft(message.body);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedThread?.conversation?._id) {
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-message',
          conversationId: selectedThread.conversation._id,
          messageId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      await refreshMessages();
    } catch (deleteError) {
      console.error(deleteError);
      sonnerToast.error('Failed to delete message');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedThread?.conversation?._id || !editingMessageId || sendingRef.current) {
      return;
    }

    const body = draft.trim();
    if (!body || body.length > MESSAGE_MAX_LENGTH) {
      return;
    }

    sendingRef.current = true;
    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit-message',
          conversationId: selectedThread.conversation._id,
          messageId: editingMessageId,
          text: body,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update message');
      }

      if (mountedRef.current) {
        setDraft('');
        setEditingMessageId(null);
      }
      await refreshMessages();
    } catch (editError) {
      console.error(editError);
      if (mountedRef.current) sonnerToast.error('Failed to edit message');
    } finally {
      sendingRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  };

  const handleHideConversation = async () => {
    if (!selectedThread?.conversation?._id) {
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hide-conversation',
          conversationId: selectedThread.conversation._id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to hide conversation');
      }

      setDraft('');
      setEditingMessageId(null);
      await refreshMessages();
      if (mountedRef.current) router.push('/messages');
    } catch (hideError) {
      console.error(hideError);
      sonnerToast.error('Failed to hide conversation');
    }
  };

  const activeContact = selectedThread?.contact || null;
  const activeConversation = selectedThread?.conversation || null;
  const hasSelectedContact = Boolean(activeContact);
  const totalConversations = data?.conversations.length || 0;
  const activeUnread =
    selectedThread?.messages.filter(
      (message) => message.recipientUserId === currentUserId && !message.seenAt
    ).length || 0;
  const selectedConversationLabel = activeConversation
    ? activeConversation.contextType === 'direct'
      ? 'Direct staff conversation'
      : `Order thread ${activeConversation.orderId?.slice(-6) || ''}`
    : selectedThread?.contextType === 'direct'
      ? 'Direct staff conversation'
      : selectedThread?.contextType === 'order'
        ? `Order thread ${selectedThread.orderId?.slice(-6) || ''}`
        : 'Conversation';
  if (loading) {
    return <MessagesLoadingSkeleton />;
  }

  return (
    <section className={messagesSectionClass}>
      <div className={messagesShellClass}>
        <Card className={messagesSidebarClass}>
          <CardHeader className='space-y-3 border-b border-border/60 bg-linear-to-br from-foreground/5 to-transparent pb-3'>
            <div className='flex items-start justify-between gap-4'>
              <div className='flex min-w-0 items-start gap-3'>
                <Link
                  href={backHref}
                  className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted'
                  aria-label={backLabel}
                >
                  <ArrowLeft className='h-4 w-4' />
                </Link>
                <div className='min-w-0'>
                  <CardTitle className='text-xl font-semibold tracking-tight'>{title}</CardTitle>
                  <p className='mt-1 text-sm leading-snug text-muted-foreground'>{description}</p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm' asChild className='rounded-full'>
                  <Link href='/messages/settings' className='gap-2'>
                    <Settings className='h-4 w-4' />
                    Settings
                  </Link>
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => void refreshMessages()}
                  disabled={refreshing}
                  className='rounded-full'
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className='grid grid-cols-3 gap-2 text-sm'>
              <div className='rounded-2xl border border-border/60 bg-background px-3 py-2'>
                <p className='text-muted-foreground text-xs uppercase tracking-[0.2em]'>Unread</p>
                <p className='mt-1 text-2xl font-bold'>{data?.unreadCount || 0}</p>
              </div>
              <div className='rounded-2xl border border-border/60 bg-background px-3 py-2'>
                <p className='text-muted-foreground text-xs uppercase tracking-[0.2em]'>Threads</p>
                <p className='mt-1 text-2xl font-bold'>{totalConversations}</p>
              </div>
              <div className='rounded-2xl border border-border/60 bg-background px-3 py-2'>
                <p className='text-muted-foreground text-xs uppercase tracking-[0.2em]'>Open</p>
                <p className='mt-1 text-2xl font-bold'>{activeUnread}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className='flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4'>
            <div className='shrink-0'>
              <div className='mb-2 flex items-center justify-between'>
                <h2 className='text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
                  {isAdminSearchEnabled ? 'Search users' : 'Quick contacts'}
                </h2>
                <MessageSquarePlus className='h-4 w-4 text-muted-foreground' />
              </div>
              {isAdminSearchEnabled && (
                <div className='mb-3 rounded-2xl border border-border/60 bg-background p-2'>
                  <div className='relative'>
                    <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      value={contactSearch}
                      onChange={(event) => setContactSearch(event.target.value)}
                      autoComplete='off'
                      placeholder='Search users by name or email'
                      className='h-11 rounded-2xl pl-10'
                    />
                  </div>
                  <p className='mt-1 px-1 text-xs text-muted-foreground'>
                    Search all users, then load more results in pages of 10.
                  </p>
                </div>
              )}

              <div className='space-y-2'>
                <div className='flex max-w-full min-w-0 gap-2 overflow-x-auto pb-1'>
                  {visibleContacts.slice(0, 8).map((contact) => (
                    <Link
                      key={`${getContactId(contact)}-${contact.href}`}
                      href={contact.href}
                      scroll={false}
                      className='flex w-[180px] shrink-0 items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 px-3 py-3 transition-colors hover:border-primary/40 hover:bg-muted'
                    >
                      <Avatar className='h-10 w-10 border border-border/60'>
                        <AvatarImage src={contact.image || undefined} alt={contact.name} />
                        <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                      </Avatar>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-medium'>{contact.name}</p>
                        <p className='truncate text-xs text-muted-foreground'>{contact.role}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {isAdminSearchEnabled && contactHasMore && (
                  <div className='flex justify-center pt-1'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='rounded-full px-4'
                      onClick={handleLoadMoreContacts}
                      disabled={contactLoadingMore}
                    >
                      {contactLoadingMore ? 'Loading...' : 'Load more'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Separator className='shrink-0' />

            <div className='flex min-h-[220px] flex-1 flex-col space-y-2 overflow-hidden'>
              <h2 className='text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
                Inbox
              </h2>
              <div className='min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto pr-1'>
                {(data?.conversations || []).length === 0 ? (
                  <div className='rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground'>
                    No conversations yet. Pick a contact to start the first thread.
                  </div>
                ) : (
                  (data?.conversations || []).map((conversation) => {
                    const contact = conversation.contact;
                    return (
                      <Link
                        key={conversation._id}
                        href={contact?.href || '/messages'}
                        scroll={false}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors hover:border-primary/40 hover:bg-muted/40 ${
                          selectedThread?.conversation?._id === conversation._id
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/60 bg-background'
                        }`}
                      >
                        <Avatar className='h-11 w-11 border border-border/60'>
                          <AvatarImage
                            src={contact?.image || undefined}
                            alt={contact?.name || 'Contact'}
                          />
                          <AvatarFallback>{getInitials(contact?.name)}</AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center justify-between gap-2'>
                            <p className='truncate font-medium'>
                              {contact?.name || 'Conversation'}
                            </p>
                            <span className='text-[11px] text-muted-foreground'>
                              {formatDate(conversation.lastMessageAt)}
                            </span>
                          </div>
                          <p className='mt-1 truncate text-sm text-muted-foreground'>
                            {conversation.lastMessageText || 'No messages yet'}
                          </p>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge className='rounded-full px-2 py-0.5'>
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={messagesThreadCardClass}>
          <div className='flex h-full min-h-[72vh] min-w-0 flex-col lg:min-h-0'>
            {hasSelectedContact ? (
              <>
                <CardHeader className='border-b border-border/60 bg-linear-to-br from-foreground/5 to-transparent pb-4'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                      <Link
                        href='/messages'
                        scroll={false}
                        className='inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border/60 px-3 text-sm font-medium transition-colors hover:bg-muted'
                        aria-label='Back to inbox'
                      >
                        <ArrowLeft className='h-4 w-4' />
                        <span>Back</span>
                      </Link>
                      <Avatar className='h-12 w-12 border border-border/60'>
                        <AvatarImage
                          src={activeContact?.image || undefined}
                          alt={activeContact?.name || ''}
                        />
                        <AvatarFallback>{getInitials(activeContact?.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className='flex items-center gap-2'>
                          <CardTitle className='text-xl'>
                            {activeContact?.name || 'Conversation'}
                          </CardTitle>
                          <Badge variant='secondary' className='rounded-full'>
                            {activeContact?.role || selectedThread?.contextType || 'user'}
                          </Badge>
                        </div>
                        <p className='mt-1 text-sm text-muted-foreground'>
                          {selectedConversationLabel}
                        </p>
                      </div>
                    </div>

                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <button
                        type='button'
                        data-slot='button'
                        className='inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-red-500 shadow-none transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40'
                        aria-label={`Delete conversation with ${activeContact?.name || 'this person'}`}
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className='h-5 w-5' />
                      </button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the conversation with{' '}
                            {activeContact?.name || 'this person'} from your inbox. It will not
                            delete it for the other participant.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className='bg-red-600 text-white hover:bg-red-700'
                            onClick={() => {
                              setDeleteDialogOpen(false);
                              void handleHideConversation();
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>

                <div
                  ref={scrollContainerRef}
                  role='region'
                  aria-label='Conversation messages'
                  onScroll={onScroll}
                  className='min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto [overflow-anchor:none] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent)] p-4 sm:p-6'
                >
                  {hasNextPage && (
                    <div className='flex justify-center'>
                      <Button
                        variant='ghost'
                        size='sm'
                        disabled={isFetching}
                        onClick={() => void handleLoadOlder()}
                      >
                        {isFetchingNextPage ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <History className='h-4 w-4' />
                        )}
                        {isFetchingNextPage ? 'Loading older messages...' : 'Load older messages'}
                      </Button>
                    </div>
                  )}
                  {visibleMessages.length === 0 ? (
                    <div className='flex h-full min-h-112 flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-muted/20 px-6 text-center'>
                      <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary'>
                        <MessageSquarePlus className='h-7 w-7' />
                      </div>
                      <h3 className='text-lg font-semibold'>Start the conversation</h3>
                      <p className='mt-2 max-w-md text-sm text-muted-foreground'>
                        {activeConversation
                          ? 'Send a short update, ask about the order, or coordinate the delivery in this thread.'
                          : `No previous messages yet. Send the first message to ${activeContact?.name || 'this person'}.`}
                      </p>
                    </div>
                  ) : (
                    visibleMessages.map((message) => {
                      const isOwnMessage = message.senderUserId === currentUserId;
                      const statusLabel = isOwnMessage
                        ? message.sendState === 'sending'
                          ? 'Sending...'
                          : message.sendState === 'failed'
                            ? 'Not sent'
                            : message.seenAt
                              ? 'Seen'
                              : message.deliveredAt
                                ? 'Delivered'
                                : 'Sent'
                        : null;

                      return (
                        <div
                          key={message._id}
                          data-message-id={message._id}
                          data-unseen-id={
                            !isOwnMessage && !message.seenAt ? message._id : undefined
                          }
                          className={`group flex w-full min-w-0 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`min-w-0 max-w-[min(82%,48rem)] overflow-visible rounded-3xl border px-4 py-3 shadow-sm transition-all ${
                              isOwnMessage
                                ? 'border-primary/20 bg-primary text-primary-foreground'
                                : 'border-border/70 bg-background'
                            } ${message.sendState === 'sending' ? 'opacity-70' : ''}`}
                          >
                            <div className='flex min-w-0 items-start justify-between gap-4'>
                              <p className='min-w-0 flex-1 whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed'>
                                {message.body}
                              </p>
                              {isOwnMessage && !message.sendState && (
                                <div className='relative flex items-center gap-1'>
                                  <button
                                    type='button'
                                    data-slot='button'
                                    onClick={() =>
                                      setMessageMenuId((current) =>
                                        current === message._id ? null : message._id
                                      )
                                    }
                                    className='inline-flex h-7 w-7 items-center justify-center rounded-full border-0 bg-transparent p-0 opacity-0 shadow-none transition-opacity hover:bg-background/20 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40'
                                    aria-label='Message actions'
                                  >
                                    <MoreVertical className='h-4 w-4' />
                                  </button>
                                  {messageMenuId === message._id && (
                                    <div className='absolute right-0 top-8 z-50 w-40 rounded-2xl border border-border/70 bg-background p-1 text-foreground shadow-xl'>
                                      <button
                                        type='button'
                                        data-slot='button'
                                        onClick={() => {
                                          setMessageMenuId(null);
                                          handleEditMessage(message);
                                        }}
                                        className='flex w-full items-center justify-start gap-2 rounded-xl border-0 bg-transparent px-3 py-2 text-left text-sm font-medium shadow-none hover:bg-muted'
                                      >
                                        <Edit3 className='h-4 w-4' />
                                        Edit
                                      </button>
                                      <button
                                        type='button'
                                        data-slot='button'
                                        onClick={() => {
                                          setMessageMenuId(null);
                                          void handleDeleteMessage(message._id);
                                        }}
                                        className='flex w-full cursor-pointer items-center justify-start gap-2 rounded-xl border-0 bg-transparent px-3 py-2 text-left text-sm font-medium text-red-600 shadow-none hover:bg-red-50 dark:hover:bg-red-950/40'
                                      >
                                        <Trash2 className='h-4 w-4' />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div
                              className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] ${isOwnMessage ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
                            >
                              <span>{formatShortDate(message.createdAt)}</span>
                              {message.editedAt && (
                                <span className='inline-flex rounded-full bg-background/20 px-2 py-0.5'>
                                  Edited
                                </span>
                              )}
                              {statusLabel && (
                                <span className='inline-flex rounded-full bg-background/20 px-2 py-0.5'>
                                  {statusLabel}
                                </span>
                              )}
                              {message.sendState === 'failed' && (
                                <button
                                  type='button'
                                  data-slot='button'
                                  disabled={sending}
                                  title='Retry message'
                                  aria-label='Retry message'
                                  onClick={() => void handleSendMessage(message)}
                                  className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-inherit focus-visible:outline-2 disabled:opacity-50'
                                >
                                  <RotateCcw className='h-4 w-4' />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {hasNewMessages && (
                  <div className='flex justify-center py-2'>
                    <Button size='sm' variant='secondary' onClick={scrollToLatest}>
                      <ArrowDown className='h-4 w-4' /> New messages
                    </Button>
                  </div>
                )}
                <div className='border-t border-border/60 bg-linear-to-t from-foreground/5 to-transparent p-4 sm:p-5'>
                  {editingMessageId && (
                    <div className='mb-3 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm'>
                      <div>
                        <p className='font-medium'>Editing message</p>
                        <p className='text-xs text-muted-foreground'>
                          Fix the typo, then save your update.
                        </p>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        disabled={sending}
                        aria-label='Cancel editing'
                        onClick={() => {
                          setEditingMessageId(null);
                          setDraft('');
                        }}
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </div>
                  )}

                  <div className='relative max-w-full min-w-0 overflow-hidden rounded-3xl border border-border/70 bg-background transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20'>
                    <Textarea
                      value={draft}
                      aria-label='Message'
                      maxLength={MESSAGE_MAX_LENGTH}
                      disabled={Boolean(editingMessageId && sending)}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={
                        activeConversation
                          ? 'Write a message...'
                          : `Message ${activeContact?.name || 'this person'}...`
                      }
                      wrap='soft'
                      className='block field-sizing-fixed max-h-40 min-h-16 w-full max-w-full min-w-0 resize-none overflow-x-hidden overflow-y-auto wrap-anywhere border-0 bg-transparent py-4 pl-4 pr-20 shadow-none [overflow-wrap:anywhere] [word-break:break-word] focus-visible:ring-0'
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          if (event.repeat) return;
                          if (editingMessageId) {
                            void handleSaveEdit();
                          } else {
                            void handleSendMessage();
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (editingMessageId) {
                          void handleSaveEdit();
                        } else {
                          void handleSendMessage();
                        }
                      }}
                      disabled={sending || !draft.trim()}
                      size='icon'
                      className='absolute bottom-3 right-3 h-10 w-10 rounded-full'
                      aria-label={editingMessageId ? 'Save message' : 'Send message'}
                    >
                      {editingMessageId ? (
                        <Edit3 className='h-4 w-4' />
                      ) : (
                        <Send className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className='flex h-full min-h-[72vh] flex-col items-center justify-center px-8 text-center'>
                <div className='mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary'>
                  <MessageSquarePlus className='h-8 w-8' />
                </div>
                <h2 className='text-2xl font-semibold tracking-tight'>
                  Pick a conversation to start messaging
                </h2>
                <p className='mt-3 max-w-xl text-sm text-muted-foreground'>
                  {visibleContacts.length
                    ? 'Choose a restaurant owner, courier, or admin from the left panel. Only approved role combinations can chat here.'
                    : 'You do not have any available contacts yet. Once you place an order or get assigned to one, conversations will appear here.'}
                </p>

                <div className='mt-8 flex flex-wrap justify-center gap-3'>
                  {visibleContacts.slice(0, 4).map((contact) => (
                    <Button
                      key={`${getContactId(contact)}-${contact.href}`}
                      asChild
                      variant='outline'
                      className='rounded-full'
                    >
                      <Link href={contact.href} scroll={false}>
                        {contact.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {error && (
        <div className='mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'>
          {error}
        </div>
      )}
    </section>
  );
};

export default function MessagesCenter(props: MessagesCenterProps) {
  const params = useParams<{ participantId?: string }>();
  const search = useSearchParams();
  const { data: profile } = useProfile();
  const identity = JSON.stringify([
    profile?._id,
    params?.participantId || search.get('participantId'),
    search.get('orderId'),
    search.get('context'),
  ]);
  // Local drafts, pending sends, and dialogs never belong to the next recipient/account.
  return <MessagesCenterContent key={identity} {...props} />;
}
