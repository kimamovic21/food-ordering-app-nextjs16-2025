import mongoose from 'mongoose';
import { Conversation } from '@/models/conversation';
import { Message } from '@/models/message';
import { createMongoMemoryTestServer } from '../utils/mongoMemoryServer';

const identity = vi.hoisted(() => ({
  sender: '507f1f77bcf86cd799439011',
  recipient: '507f1f77bcf86cd799439012',
}));
vi.mock('@/libs/authOptions', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => ({ user: { email: 'admin@example.com' } })),
}));
vi.mock('@/models/user', () => ({
  User: {
    findOne: () => ({
      select: () => ({ lean: async () => ({ _id: identity.sender, role: 'admin' }) }),
    }),
  },
}));
vi.mock('@/libs/messageEvents', () => ({ emitMessageEvent: vi.fn() }));
vi.mock('@/libs/messages', async () => {
  const { Conversation } = await import('@/models/conversation');
  return {
    isValidObjectId: (id: string) => /^[a-f0-9]{24}$/.test(id),
    buildConversationSummary: async () => [],
    resolveMessageContacts: async () => [],
    searchAdminMessageContacts: vi.fn(),
    resolveConversationContext: async () => ({
      conversation: await Conversation.findOne({ participantKey: 'test-direct' }).lean(),
      participantIds: [identity.sender, identity.recipient],
      participantKey: 'test-direct',
      contextType: 'direct',
      recipient: { _id: identity.recipient },
    }),
  };
});

describe('message persistence with isolated MongoDB', () => {
  let database: Awaited<ReturnType<typeof createMongoMemoryTestServer>>;
  beforeAll(async () => {
    database = await createMongoMemoryTestServer();
    vi.stubEnv('MONGODB_URL', database.uri);
    await Conversation.init();
    await Message.init();
  }, 60000);
  beforeEach(async () => {
    await Message.deleteMany({});
    await Conversation.deleteMany({});
  });
  afterAll(async () => {
    await database?.stop();
    vi.unstubAllEnvs();
  });

  it('stores exactly one conversation and message when identical first sends race', async () => {
    const { POST } = await import('@/app/api/messages/route');
    const send = () =>
      POST(
        new Request('http://localhost/api/messages', {
          method: 'POST',
          body: JSON.stringify({
            recipientUserId: identity.recipient,
            text: 'Hello',
            clientMessageId: 'a9c9c32e-a23d-43f5-8ed4-6a3c8eddb4a2',
          }),
        })
      );
    const responses = await Promise.all([send(), send(), send()]);
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    expect(new Set(bodies.map((body) => body.message._id)).size).toBe(1);
    expect(await Conversation.countDocuments()).toBe(1);
    expect(await Message.countDocuments()).toBe(1);
    expect((await Conversation.findOne())?.lastMessageText).toBe('Hello');
  });

  it('keeps legacy messages without retry ids valid and pages equal timestamps without gaps', async () => {
    const conversation = await Conversation.create({
      participantKey: 'test-direct',
      participantUserIds: [identity.sender, identity.recipient],
      contextType: 'direct',
    });
    const time = new Date('2026-10-30T10:00:00Z');
    await Message.insertMany(
      Array.from({ length: 103 }, (_, index) => ({
        _id: new mongoose.Types.ObjectId(),
        conversationId: conversation._id,
        senderUserId: identity.sender,
        recipientUserId: identity.recipient,
        body: `Message ${index}`,
        createdAt: time,
        updatedAt: time,
      }))
    );
    const { GET } = await import('@/app/api/messages/route');
    const seen = new Set<string>();
    let cursor: string | null = null;
    const sizes: number[] = [];
    do {
      const response = await GET(
        new Request(
          `http://localhost/api/messages?participantId=${identity.recipient}${cursor ? `&before=${cursor}` : ''}`
        )
      );
      expect(response.status).toBe(200);
      const thread = (await response.json()).selectedConversation;
      sizes.push(thread.messages.length);
      for (const message of thread.messages) {
        expect(seen.has(message._id)).toBe(false);
        seen.add(message._id);
      }
      cursor = thread.olderCursor;
    } while (cursor);
    expect(sizes).toEqual([50, 50, 3]);
    expect(seen.size).toBe(103);
  });
});
