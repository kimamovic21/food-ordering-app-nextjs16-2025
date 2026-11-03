import { getServerSession } from 'next-auth/next';
import { Conversation } from '@/models/conversation';
import { Message } from '@/models/message';
import { User } from '@/models/user';
import { emitMessageEvent } from '@/libs/messageEvents';
import { resolveConversationContext } from '@/libs/messages';
import { createMessageCursor, readMessageCursor } from '@/libs/messagePagination';

vi.mock('server-only', () => ({}));
vi.mock('@/libs/authOptions', () => ({ authOptions: {} }));

vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn(),
    Types: {
      ObjectId: {
        isValid: vi.fn((value: string) => value !== 'invalid-id'),
      },
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/conversation', () => ({
  Conversation: {
    create: vi.fn(),
    updateOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('@/models/message', () => ({
  Message: {
    create: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn(),
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('@/libs/messageEvents', () => ({
  emitMessageEvent: vi.fn(),
}));

vi.mock('@/libs/messages', () => ({
  isValidObjectId: vi.fn((value: string) => Boolean(value && value !== 'invalid-id')),
  buildConversationSummary: vi.fn(async () => []),
  resolveMessageContacts: vi.fn(async () => []),
  searchAdminMessageContacts: vi.fn(async () => ({
    contacts: [],
    hasMore: false,
    page: 1,
    total: 0,
  })),
  resolveConversationContext: vi.fn(),
}));

const loadRoute = async () => await import('@/app/api/messages/route');

const mockCurrentUser = (user = { _id: 'user-1', name: 'User', role: 'user' }) => {
  vi.mocked(getServerSession).mockResolvedValueOnce({
    user: { email: 'user@example.com' },
  } as never);

  vi.mocked(User.findOne).mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(user),
    }),
  } as never);
};

describe('/api/messages route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/test';
  });

  it('returns 401 when session is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);

    const { GET } = await loadRoute();
    const res = await GET(new Request('http://localhost/api/messages'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('rejects empty message text before resolving a recipient', async () => {
    mockCurrentUser();

    const { POST } = await loadRoute();
    const res = await POST(
      new Request('http://localhost/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId: '507f1f77bcf86cd799439011',
          text: '   ',
        }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Message cannot be empty' });
    expect(resolveConversationContext).not.toHaveBeenCalled();
  });

  it('creates a new conversation and emits a message-created event', async () => {
    mockCurrentUser({ _id: 'sender-1', name: 'Sender', role: 'admin' });

    vi.mocked(resolveConversationContext).mockResolvedValueOnce({
      recipient: { _id: 'recipient-1', name: 'Recipient', role: 'courier', image: null },
      sender: { _id: 'sender-1', name: 'Sender', role: 'admin', image: null },
      conversation: null,
      contextType: 'direct',
      participantIds: ['sender-1', 'recipient-1'],
      participantKey: 'direct:recipient-1:sender-1',
      orderId: null,
      restaurantId: null,
    } as never);

    vi.mocked(Conversation.create).mockResolvedValueOnce({
      _id: 'conversation-1',
    } as never);
    vi.mocked(Conversation.updateOne).mockResolvedValueOnce({ acknowledged: true } as never);
    vi.mocked(Message.create).mockResolvedValueOnce({
      _id: 'message-1',
      senderUserId: { toString: () => 'sender-1' },
      recipientUserId: { toString: () => 'recipient-1' },
      body: 'Hello courier',
      deliveredAt: null,
      seenAt: null,
      editedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as never);
    vi.mocked(Message.countDocuments).mockResolvedValueOnce(1 as never);

    const { POST } = await loadRoute();
    const res = await POST(
      new Request('http://localhost/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId: '507f1f77bcf86cd799439011',
          text: ' Hello courier ',
        }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.conversationId).toBe('conversation-1');
    expect(body.message.body).toBe('Hello courier');
    expect(Conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        participantKey: 'direct:recipient-1:sender-1',
      })
    );
    expect(emitMessageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'message-created',
        conversationId: 'conversation-1',
        senderUserId: 'sender-1',
        recipientUserId: 'recipient-1',
        messageId: 'message-1',
        unreadCount: 1,
      })
    );
  });

  it('marks a conversation as seen only for the current recipient', async () => {
    mockCurrentUser({ _id: 'recipient-1', name: 'Recipient', role: 'courier' });

    vi.mocked(Conversation.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue({
        _id: 'conversation-1',
        participantUserIds: ['sender-1', 'recipient-1'],
      }),
    } as never);
    vi.mocked(Message.updateMany).mockResolvedValueOnce({ modifiedCount: 2 } as never);
    vi.mocked(Message.countDocuments).mockResolvedValueOnce(0 as never);

    const { PATCH } = await loadRoute();
    const res = await PATCH(
      new Request('http://localhost/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-seen',
          conversationId: '507f1f77bcf86cd799439011',
        }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, unreadCount: 0 });
    expect(Message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        recipientUserId: 'recipient-1',
        seenAt: null,
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          seenAt: expect.any(Date),
          deliveredAt: expect.any(Date),
        }),
      })
    );
  });

  const conversationId = '507f1f77bcf86cd799439011';
  const clientMessageId = 'a9c9c32e-a23d-43f5-8ed4-6a3c8eddb4a2';
  const conversation = {
    _id: conversationId,
    participantKey: 'direct:recipient-1:sender-1',
    participantUserIds: ['sender-1', 'recipient-1'],
    contextType: 'direct',
  };
  const savedMessage = {
    _id: '507f1f77bcf86cd799439012',
    conversationId,
    senderUserId: 'sender-1',
    recipientUserId: 'recipient-1',
    body: 'Hello',
    clientMessageId,
    createdAt: new Date('2026-10-30T10:00:00Z'),
  };
  const resolution = {
    conversation,
    recipient: { _id: 'recipient-1' },
    participantKey: conversation.participantKey,
    participantIds: conversation.participantUserIds,
    contextType: 'direct',
  };
  const post = (payload: Record<string, unknown>) =>
    new Request('http://localhost/api/messages', { method: 'POST', body: JSON.stringify(payload) });
  const mockThread = (messages: unknown[] = []) => {
    mockCurrentUser({ _id: 'sender-1', name: 'Sender', role: 'admin' });
    vi.mocked(resolveConversationContext).mockResolvedValue(resolution as never);
    vi.mocked(Conversation.find).mockReturnValue({
      sort: () => ({ lean: async () => [] }),
    } as never);
    const limit = vi.fn(() => ({ lean: async () => messages }));
    const sort = vi.fn(() => ({ limit }));
    vi.mocked(Message.find).mockReturnValue({ sort } as never);
    return { limit, sort };
  };

  it('returns the latest 50 messages chronologically with a stable cursor', async () => {
    const messages = Array.from({ length: 51 }, (_, i) => ({
      ...savedMessage,
      _id: (100 - i).toString(16).padStart(24, '0'),
    }));
    const { limit, sort } = mockThread(messages);
    const { GET } = await loadRoute();
    const response = await GET(
      new Request('http://localhost/api/messages?participantId=recipient-1')
    );
    const thread = (await response.json()).selectedConversation;
    expect(limit).toHaveBeenCalledWith(51);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(thread.messages).toHaveLength(50);
    expect(thread.messages[0]._id).toBe(messages[49]._id);
    expect(thread.messages[49]._id).toBe(messages[0]._id);
    expect(thread.hasOlderMessages).toBe(true);
    expect(readMessageCursor(thread.olderCursor)).toMatchObject({
      conversationId,
      id: messages[49]._id,
    });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(Message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: {
          $in: messages
            .slice(0, 50)
            .reverse()
            .map((m) => m._id),
        },
        recipientUserId: 'sender-1',
      }),
      expect.anything()
    );
  });

  it('bounds older messages by date and id and skips the inbox query', async () => {
    mockThread();
    const cursor = createMessageCursor(conversationId, savedMessage);
    const { GET } = await loadRoute();
    const response = await GET(
      new Request(`http://localhost/api/messages?participantId=recipient-1&before=${cursor}`)
    );
    expect(response.status).toBe(200);
    expect(Conversation.find).not.toHaveBeenCalled();
    expect(Message.find).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId,
        deletedFor: { $ne: 'sender-1' },
        $or: [
          { createdAt: { $lt: savedMessage.createdAt } },
          { createdAt: savedMessage.createdAt, _id: { $lt: savedMessage._id } },
        ],
      })
    );
    expect((await response.json()).selectedConversation).toMatchObject({
      messages: [],
      hasOlderMessages: false,
      olderCursor: null,
    });
  });

  it.each(['invalid', createMessageCursor('507f1f77bcf86cd799439099', savedMessage)])(
    'rejects invalid or cross-conversation cursors: %s',
    async (cursor) => {
      mockThread();
      const { GET } = await loadRoute();
      expect(
        (
          await GET(
            new Request(`http://localhost/api/messages?participantId=recipient-1&before=${cursor}`)
          )
        ).status
      ).toBe(400);
      expect(Message.find).not.toHaveBeenCalled();
    }
  );

  it('still rejects unauthorized recipients on history requests', async () => {
    mockThread();
    vi.mocked(resolveConversationContext).mockResolvedValueOnce({
      error: 'This conversation is not allowed',
    });
    const { GET } = await loadRoute();
    const cursor = createMessageCursor(conversationId, savedMessage);
    expect(
      (
        await GET(
          new Request(`http://localhost/api/messages?participantId=recipient-1&before=${cursor}`)
        )
      ).status
    ).toBe(400);
    expect(Message.find).not.toHaveBeenCalled();
  });

  it.each([{ text: 'x'.repeat(4001) }, { text: 'Hello', clientMessageId: 'not-a-uuid' }])(
    'validates message payload before writing',
    async (payload) => {
      mockCurrentUser();
      const { POST } = await loadRoute();
      expect((await POST(post({ recipientUserId: 'recipient-1', ...payload }))).status).toBe(400);
      expect(Message.create).not.toHaveBeenCalled();
      expect(resolveConversationContext).not.toHaveBeenCalled();
    }
  );

  it('returns 400 for malformed JSON', async () => {
    mockCurrentUser();
    const { POST } = await loadRoute();
    expect(
      (await POST(new Request('http://localhost/api/messages', { method: 'POST', body: '{' })))
        .status
    ).toBe(400);
  });

  it('replays a saved message without writing or emitting a duplicate', async () => {
    mockThread();
    vi.mocked(Message.findOne).mockResolvedValueOnce(savedMessage as never);
    const { POST } = await loadRoute();
    const response = await POST(
      post({ recipientUserId: 'recipient-1', text: 'Hello', clientMessageId })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).message._id).toBe(savedMessage._id);
    expect(Message.create).not.toHaveBeenCalled();
    expect(emitMessageEvent).not.toHaveBeenCalled();
    expect(Conversation.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [{ lastMessageAt: null }, { lastMessageAt: { $lt: savedMessage.createdAt } }],
      }),
      expect.anything()
    );
  });

  it('recovers from two identical sends racing on the unique index', async () => {
    mockThread();
    vi.mocked(Message.findOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(savedMessage as never);
    vi.mocked(Message.create).mockRejectedValueOnce({ code: 11000 });
    const { POST } = await loadRoute();
    const response = await POST(
      post({ recipientUserId: 'recipient-1', text: 'Hello', clientMessageId })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).message._id).toBe(savedMessage._id);
    expect(emitMessageEvent).not.toHaveBeenCalled();
  });

  it('recovers a concurrent first-conversation creation', async () => {
    mockThread();
    vi.mocked(resolveConversationContext).mockResolvedValueOnce({
      ...resolution,
      conversation: null,
    } as never);
    vi.mocked(Conversation.create).mockRejectedValueOnce({ code: 11000 });
    vi.mocked(Conversation.findOne).mockReturnValueOnce({
      lean: async () => conversation,
    } as never);
    vi.mocked(Message.findOne).mockResolvedValueOnce(null);
    vi.mocked(Message.create).mockResolvedValueOnce(savedMessage as never);
    const { POST } = await loadRoute();
    expect(
      (await POST(post({ recipientUserId: 'recipient-1', text: 'Hello', clientMessageId }))).status
    ).toBe(200);
  });

  it('rejects reusing an id for different content', async () => {
    mockThread();
    vi.mocked(Message.findOne).mockResolvedValueOnce(savedMessage as never);
    const { POST } = await loadRoute();
    expect(
      (await POST(post({ recipientUserId: 'recipient-1', text: 'Different', clientMessageId })))
        .status
    ).toBe(409);
    expect(Message.create).not.toHaveBeenCalled();
    expect(Conversation.updateOne).not.toHaveBeenCalled();
  });

  it('does not advance the inbox preview when persistence fails', async () => {
    mockThread();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(Message.create).mockRejectedValueOnce(new Error('database error'));
    const { POST } = await loadRoute();
    expect((await POST(post({ recipientUserId: 'recipient-1', text: 'Hello' }))).status).toBe(500);
    expect(Conversation.updateOne).not.toHaveBeenCalled();
    expect(emitMessageEvent).not.toHaveBeenCalled();
  });

  it('keeps a saved send successful if realtime refresh fails', async () => {
    mockThread();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(Message.create).mockResolvedValueOnce(savedMessage as never);
    vi.mocked(Conversation.updateOne).mockRejectedValueOnce(new Error('refresh error'));
    const { POST } = await loadRoute();
    expect((await POST(post({ recipientUserId: 'recipient-1', text: 'Hello' }))).status).toBe(200);
  });

  it('marks only the supplied loaded messages as read', async () => {
    mockThread();
    vi.mocked(Conversation.findOne).mockReturnValueOnce({
      lean: async () => conversation,
    } as never);
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request('http://localhost/api/messages', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'mark-seen',
          conversationId,
          messageIds: [savedMessage._id],
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(Message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $in: [savedMessage._id] },
        conversationId,
        recipientUserId: 'sender-1',
        deletedFor: { $ne: 'sender-1' },
      }),
      expect.anything()
    );
  });

  it.each([[], Array(51).fill('507f1f77bcf86cd799439012'), ['invalid-id']])(
    'rejects invalid read-receipt batches: %j',
    async (...args) => {
      mockThread();
      vi.mocked(Conversation.findOne).mockReturnValueOnce({
        lean: async () => conversation,
      } as never);
      const { PATCH } = await loadRoute();
      const response = await PATCH(
        new Request('http://localhost/api/messages', {
          method: 'PATCH',
          body: JSON.stringify({ action: 'mark-seen', conversationId, messageIds: args }),
        })
      );
      expect(response.status).toBe(400);
      expect(Message.updateMany).not.toHaveBeenCalled();
    }
  );
});
