import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/libs/authOptions';
import {
  getCourierAvailabilityErrorStatus,
  getCourierAvailabilityState,
  updateCourierAvailability,
} from '@/libs/courierWorkSessions';
import { User } from '@/models/user';
import mongoose from 'mongoose';

const getCourierFromSession = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userEmail = session.user.email;
  const userRole = (session.user as any).role;

  if (userRole !== 'courier') {
    return {
      error: Response.json({ error: 'Only couriers can toggle availability' }, { status: 403 }),
    };
  }

  const currentUser = await User.findOne({ email: userEmail });

  if (!currentUser) {
    return { error: Response.json({ error: 'User not found' }, { status: 404 }) };
  }

  return { currentUser };
};

export async function GET() {
  try {
    await mongoose.connect(process.env.MONGODB_URL as string);

    const { currentUser, error } = await getCourierFromSession();
    if (error) return error;

    const state = await getCourierAvailabilityState(currentUser, { includeWorkSummary: true });
    return Response.json(state);
  } catch (error) {
    console.error('Error fetching courier availability:', error);
    return Response.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await mongoose.connect(process.env.MONGODB_URL as string);

    const { currentUser, error } = await getCourierFromSession();
    if (error) return error;

    const body = await req.json().catch(() => null);
    const requestedAction =
      typeof body?.action === 'string'
        ? body.action
        : currentUser.availability
          ? 'go-offline'
          : 'go-online';
    const action = ['go-online', 'go-offline', 'start-break'].includes(requestedAction)
      ? requestedAction
      : 'toggle';
    const result = await updateCourierAvailability(currentUser, action as any);

    return Response.json({
      ...result.state,
      message: result.message,
    });
  } catch (error) {
    console.error('Error updating courier availability:', error);
    const status = getCourierAvailabilityErrorStatus(error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update availability' },
      { status }
    );
  }
}
