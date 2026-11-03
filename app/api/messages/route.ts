import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/libs/authOptions';
import { Conversation } from '@/models/conversation';
import { Message } from '@/models/message';
import { User } from '@/models/user';
import {
  buildConversationSummary,
  isValidObjectId,
  resolveConversationContext,
  resolveMessageContacts,
  searchAdminMessageContacts,
} from '@/libs/messages';
import { emitMessageEvent } from '@/libs/messageEvents';
import { createMessageCursor, readMessageCursor } from '@/libs/messagePagination';
import { MESSAGE_MAX_LENGTH, MESSAGE_PAGE_SIZE } from '@/libs/messageThread';
import { z } from 'zod';

const privateJson = (body: unknown, init?: ResponseInit) =>
  Response.json(body, {
    ...init,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  });

const getCurrentUser = async () => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  return User.findOne({ email }).select('_id name image role restaurantId').lean();
};

const toIso = (date: Date | string | null | undefined) => {
  if (!date) {
    return null;
  }

  return new Date(date).toISOString();
};

export async function GET(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return privateJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const participantId = url.searchParams.get('participantId');
  const orderId = url.searchParams.get('orderId');
  const context = url.searchParams.get('context') as 'direct' | 'order' | 'restaurant' | null;
  const search = url.searchParams.get('search') || '';
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .catch(1)
    .parse(url.searchParams.get('page') || 1);
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .catch(10)
    .parse(url.searchParams.get('limit') || 10);
  const before = url.searchParams.get('before');
  const cursor = before ? readMessageCursor(before) : null;
  if (before && (!cursor || !participantId)) {
    return privateJson({ error: 'Invalid message cursor' }, { status: 400 });
  }

  const [conversationDocs, contactSuggestions] = before
    ? [[], []]
    : await Promise.all([
        Conversation.find({
          participantUserIds: currentUser._id,
          hiddenFor: { $ne: currentUser._id },
        })
          .sort({ lastMessageAt: -1, updatedAt: -1 })
          .lean(),
        currentUser.role === 'admin' && search.trim()
          ? searchAdminMessageContacts({
              currentUserId: currentUser._id,
              query: search,
              page,
              limit,
            })
          : resolveMessageContacts(currentUser as any),
      ]);

  const conversations = before
    ? []
    : await buildConversationSummary({
        currentUserId: currentUser._id,
        conversationDocs,
      });

  const unreadCount = conversations.reduce(
    (count, conversation) => count + conversation.unreadCount,
    0
  );

  if (!participantId) {
    const searchResult = Array.isArray(contactSuggestions)
      ? { contacts: contactSuggestions, hasMore: false, page, total: contactSuggestions.length }
      : contactSuggestions;

    return privateJson({
      conversations,
      unreadCount,
      contactSuggestions: searchResult.contacts,
      contactSearch: search,
      contactPage: searchResult.page,
      contactHasMore: searchResult.hasMore,
      contactTotal: searchResult.total,
      selectedConversation: null,
    });
  }

  const resolution = await resolveConversationContext({
    currentUser: currentUser as any,
    recipientUserId: participantId,
    orderId,
    context,
  });

  if ('error' in resolution) {
    return privateJson(
      {
        error: resolution.error,
        conversations,
        unreadCount,
        contactSuggestions: Array.isArray(contactSuggestions)
          ? contactSuggestions
          : contactSuggestions.contacts,
        contactSearch: search,
        contactPage: page,
        contactHasMore: Array.isArray(contactSuggestions) ? false : contactSuggestions.hasMore,
        contactTotal: Array.isArray(contactSuggestions)
          ? contactSuggestions.length
          : contactSuggestions.total,
        selectedConversation: null,
      },
      { status: 400 }
    );
  }

  const selectedConversation = resolution.conversation || null;
  if (cursor && cursor.conversationId !== selectedConversation?._id.toString()) {
    return privateJson({ error: 'Cursor does not belong to this conversation' }, { status: 400 });
  }

  if (!selectedConversation) {
    return privateJson({
      conversations,
      unreadCount,
      contactSuggestions: Array.isArray(contactSuggestions)
        ? contactSuggestions
        : contactSuggestions.contacts,
      contactPage: page,
      contactHasMore: Array.isArray(contactSuggestions) ? false : contactSuggestions.hasMore,
      selectedConversation: {
        conversation: null,
        contact: resolution.recipient,
        orderId: resolution.orderId,
        contextType: resolution.contextType,
        messages: [],
        hasOlderMessages: false,
        olderCursor: null,
      },
    });
  }

  const messageDocs = await Message.find({
    conversationId: selectedConversation._id,
    deletedFor: { $ne: currentUser._id },
    ...(cursor
      ? {
          $or: [
            { createdAt: { $lt: new Date(cursor.createdAt) } },
            { createdAt: new Date(cursor.createdAt), _id: { $lt: cursor.id } },
          ],
        }
      : {}),
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(MESSAGE_PAGE_SIZE + 1)
    .lean();
  const hasOlderMessages = messageDocs.length > MESSAGE_PAGE_SIZE;
  const pageMessages = messageDocs.slice(0, MESSAGE_PAGE_SIZE).reverse();
  const deliveredAt = new Date();
  await Message.updateMany(
    {
      _id: { $in: pageMessages.map((message) => message._id) },
      conversationId: selectedConversation._id,
      recipientUserId: currentUser._id,
      deliveredAt: null,
      deletedFor: { $ne: currentUser._id },
    },
    {
      $set: { deliveredAt },
    }
  );

  const messages = pageMessages.map((message) => ({
    _id: message._id.toString(),
    senderUserId: message.senderUserId.toString(),
    recipientUserId: message.recipientUserId.toString(),
    body: message.body,
    deliveredAt: toIso(
      message.deliveredAt ||
        (String(message.recipientUserId) === String(currentUser._id) ? deliveredAt : null)
    ),
    clientMessageId: message.clientMessageId,
    seenAt: toIso(message.seenAt),
    editedAt: toIso(message.editedAt),
    deletedFor: (message.deletedFor || []).map((id: mongoose.Types.ObjectId) => id.toString()),
    createdAt: toIso(message.createdAt) || new Date().toISOString(),
    updatedAt: toIso(message.updatedAt) || new Date().toISOString(),
  }));

  return privateJson({
    conversations,
    unreadCount,
    contactSuggestions: Array.isArray(contactSuggestions)
      ? contactSuggestions
      : contactSuggestions.contacts,
    contactSearch: search,
    contactPage: Array.isArray(contactSuggestions) ? page : contactSuggestions.page,
    contactHasMore: Array.isArray(contactSuggestions) ? false : contactSuggestions.hasMore,
    contactTotal: Array.isArray(contactSuggestions)
      ? contactSuggestions.length
      : contactSuggestions.total,
    selectedConversation: {
      conversation: {
        _id: selectedConversation._id.toString(),
        participantIds: (selectedConversation.participantUserIds || []).map(
          (id: mongoose.Types.ObjectId) => id.toString()
        ),
        participantKey: selectedConversation.participantKey,
        contextType: selectedConversation.contextType,
        orderId: selectedConversation.orderId ? selectedConversation.orderId.toString() : null,
        restaurantId: selectedConversation.restaurantId
          ? selectedConversation.restaurantId.toString()
          : null,
        lastMessageText: selectedConversation.lastMessageText || '',
        lastMessageAt: toIso(selectedConversation.lastMessageAt),
        lastMessageSenderId: selectedConversation.lastMessageSenderId
          ? selectedConversation.lastMessageSenderId.toString()
          : null,
      },
      contact: resolution.recipient,
      orderId: resolution.orderId,
      contextType: resolution.contextType,
      messages,
      hasOlderMessages,
      olderCursor:
        hasOlderMessages && pageMessages[0]
          ? createMessageCursor(selectedConversation._id.toString(), pageMessages[0])
          : null,
    },
  });
}

export async function POST(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return privateJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return privateJson({ error: 'Invalid message payload' }, { status: 400 });
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const recipientUserId = typeof body?.recipientUserId === 'string' ? body.recipientUserId : '';
  const orderId = typeof body?.orderId === 'string' ? body.orderId : null;
  const context = body?.context === 'order' || body?.context === 'restaurant' ? body.context : null;

  if (!text) {
    return privateJson({ error: 'Message cannot be empty' }, { status: 400 });
  }

  if (text.length > MESSAGE_MAX_LENGTH) {
    return privateJson(
      { error: `Message must be at most ${MESSAGE_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }
  const clientMessageId = body.clientMessageId;
  if (clientMessageId !== undefined && !z.string().uuid().safeParse(clientMessageId).success) {
    return privateJson({ error: 'Invalid message identifier' }, { status: 400 });
  }

  if (!recipientUserId || !isValidObjectId(recipientUserId)) {
    return privateJson({ error: 'Invalid recipient' }, { status: 400 });
  }

  const resolution = await resolveConversationContext({
    currentUser: currentUser as any,
    recipientUserId,
    orderId,
    context,
  });

  if ('error' in resolution) {
    return privateJson({ error: resolution.error }, { status: 403 });
  }

  const isDuplicateKey = (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

  try {
    let conversation = resolution.conversation;
    if (!conversation) {
      try {
        conversation = await Conversation.create({
          participantUserIds: resolution.participantIds,
          participantKey: resolution.participantKey,
          contextType: resolution.contextType,
          orderId: resolution.orderId || null,
          restaurantId: resolution.restaurantId || null,
          hiddenFor: [],
        });
      } catch (error) {
        if (!isDuplicateKey(error)) throw error;
        conversation = await Conversation.findOne({
          participantKey: resolution.participantKey,
        }).lean();
      }
    }
    if (!conversation) throw new Error('Conversation could not be created');

    const retryFilter = { senderUserId: currentUser._id, clientMessageId };
    let message = clientMessageId ? await Message.findOne(retryFilter) : null;
    let replayed = Boolean(message);
    if (!message) {
      try {
        message = await Message.create({
          conversationId: conversation._id,
          senderUserId: currentUser._id,
          recipientUserId: resolution.recipient._id,
          body: text,
          ...(clientMessageId ? { clientMessageId } : {}),
        });
      } catch (error) {
        if (!clientMessageId || !isDuplicateKey(error)) throw error;
        message = await Message.findOne(retryFilter);
        replayed = true;
        if (!message) throw error;
      }
    }
    if (
      replayed &&
      (String(message.conversationId) !== String(conversation._id) ||
        String(message.recipientUserId) !== String(resolution.recipient._id) ||
        message.body !== text)
    ) {
      return privateJson(
        { error: 'This message identifier has already been used for another message' },
        { status: 409 }
      );
    }

    // A saved message is the source of truth. Retrying must never regress a newer inbox preview.
    let unreadCount: number | undefined;
    try {
      await Conversation.updateOne(
        {
          _id: conversation._id,
          $or: [
            { lastMessageAt: null },
            { lastMessageAt: replayed ? { $lt: message.createdAt } : { $lte: message.createdAt } },
          ],
        },
        {
          $set: {
            lastMessageText: message.body,
            lastMessageAt: message.createdAt,
            lastMessageSenderId: currentUser._id,
          },
          ...(!replayed ? { $pull: { hiddenFor: { $in: resolution.participantIds } } } : {}),
        }
      );
      unreadCount = await Message.countDocuments({
        recipientUserId: resolution.recipient._id,
        seenAt: null,
        deletedFor: { $ne: resolution.recipient._id },
      });

      if (!replayed)
        emitMessageEvent({
          type: 'message-created',
          conversationId: conversation._id.toString(),
          senderUserId: currentUser._id.toString(),
          recipientUserId: resolution.recipient._id,
          messageId: message._id.toString(),
          unreadCount,
        });
    } catch (error) {
      console.error('Message saved, but inbox/realtime refresh failed', error);
    }

    return privateJson({
      success: true,
      conversationId: conversation._id.toString(),
      message: {
        _id: message._id.toString(),
        senderUserId: message.senderUserId.toString(),
        recipientUserId: message.recipientUserId.toString(),
        body: message.body,
        clientMessageId: message.clientMessageId,
        deliveredAt: toIso(message.deliveredAt),
        seenAt: toIso(message.seenAt),
        editedAt: toIso(message.editedAt),
        deletedFor: [],
        createdAt: toIso(message.createdAt),
        updatedAt: toIso(message.updatedAt),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Failed to send message', error);
    return privateJson({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return privateJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : '';
  const messageId = typeof body?.messageId === 'string' ? body.messageId : '';
  const text = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!isValidObjectId(conversationId)) {
    return privateJson({ error: 'Invalid conversation' }, { status: 400 });
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participantUserIds: currentUser._id,
  }).lean();

  if (!conversation) {
    return privateJson({ error: 'Conversation not found' }, { status: 404 });
  }

  if (action === 'mark-seen') {
    const ids = body?.messageIds;
    if (
      ids !== undefined &&
      (!Array.isArray(ids) ||
        !ids.length ||
        ids.length > MESSAGE_PAGE_SIZE ||
        ids.some((id) => typeof id !== 'string' || !isValidObjectId(id)))
    ) {
      return privateJson({ error: 'Invalid message identifiers' }, { status: 400 });
    }
    await Message.updateMany(
      {
        ...(ids ? { _id: { $in: ids } } : {}),
        conversationId: conversation._id,
        recipientUserId: currentUser._id,
        seenAt: null,
        deletedFor: { $ne: currentUser._id },
      },
      {
        $set: {
          seenAt: new Date(),
          deliveredAt: new Date(),
        },
      }
    );

    const unreadCount = await Message.countDocuments({
      recipientUserId: currentUser._id,
      seenAt: null,
      deletedFor: { $ne: currentUser._id },
    });

    emitMessageEvent({
      type: 'conversation-read',
      conversationId: conversation._id.toString(),
      senderUserId: currentUser._id.toString(),
      unreadCount,
    });

    return privateJson({ success: true, unreadCount });
  }

  if (action === 'hide-conversation') {
    await Conversation.updateOne(
      { _id: conversation._id },
      { $addToSet: { hiddenFor: currentUser._id } }
    );

    emitMessageEvent({
      type: 'conversation-hidden',
      conversationId: conversation._id.toString(),
      senderUserId: currentUser._id.toString(),
      recipientUserId: currentUser._id.toString(),
    });

    return privateJson({ success: true });
  }

  if (action === 'edit-message') {
    if (!isValidObjectId(messageId) || !text || text.length > MESSAGE_MAX_LENGTH) {
      return privateJson({ error: 'Invalid message payload' }, { status: 400 });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversationId: conversation._id,
      senderUserId: currentUser._id,
      deletedFor: { $ne: currentUser._id },
    });

    if (!message) {
      return privateJson({ error: 'Message not found' }, { status: 404 });
    }

    message.body = text;
    message.editedAt = new Date();
    message.editedByUserId = currentUser._id;
    await message.save();

    emitMessageEvent({
      type: 'message-updated',
      conversationId: conversation._id.toString(),
      senderUserId: currentUser._id.toString(),
      recipientUserId: message.recipientUserId.toString(),
      messageId: message._id.toString(),
    });

    return privateJson({ success: true });
  }

  if (action === 'delete-message') {
    if (!isValidObjectId(messageId)) {
      return privateJson({ error: 'Invalid message payload' }, { status: 400 });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversationId: conversation._id,
      deletedFor: { $ne: currentUser._id },
    });

    if (!message) {
      return privateJson({ error: 'Message not found' }, { status: 404 });
    }

    await Message.updateOne(
      { _id: message._id },
      {
        $addToSet: { deletedFor: currentUser._id },
      }
    );

    emitMessageEvent({
      type: 'message-updated',
      conversationId: conversation._id.toString(),
      senderUserId: currentUser._id.toString(),
      recipientUserId: message.senderUserId.toString(),
      messageId: message._id.toString(),
    });

    return privateJson({ success: true });
  }

  return privateJson({ error: 'Invalid action' }, { status: 400 });
}
