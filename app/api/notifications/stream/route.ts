import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/libs/authOptions';
import { subscribeToNotificationEvents } from '@/libs/notificationEvents';
import { User } from '@/models/user';

const getCurrentUser = async () => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  return User.findOne({ email }).select('_id').lean();
};

const HEARTBEAT_INTERVAL_MS = 25000;

export async function GET(request: Request = new Request('http://localhost')) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;
  let isClosed = false;

  const cleanup = () => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    unsubscribe?.();
    unsubscribe = null;

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    request.signal.removeEventListener('abort', cleanup);
  };

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => {
        if (isClosed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const send = (payload: unknown) => {
        enqueue(`data: ${JSON.stringify(payload)}\n\n`);
      };

      const currentUserId = currentUser._id.toString();

      if (request.signal.aborted) {
        cleanup();
        return;
      }

      request.signal.addEventListener('abort', cleanup, { once: true });
      send({ type: 'ready' });

      unsubscribe = subscribeToNotificationEvents((event) => {
        if (event.recipientUserId !== currentUserId) {
          return;
        }

        send({
          ...event,
          isIncoming: event.type === 'notification-created',
        });
      });

      heartbeatTimer = setInterval(() => {
        enqueue(`: ping\n\n`);
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
