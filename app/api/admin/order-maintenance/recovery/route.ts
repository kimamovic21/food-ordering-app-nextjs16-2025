import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/libs/authOptions';
import { mongoConnect } from '@/libs/mongoConnect';
import {
  getOrderMaintenanceRecoverySnapshot,
  runOrderMaintenanceRecovery,
} from '@/libs/orderMaintenanceRecovery';
import { User } from '@/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const getLimit = (request: Request) => {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || 50);

  return Number.isFinite(limit) ? limit : 50;
};

const getSuperAdminActor = async () => {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email;
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  if (!actorEmail) {
    return {
      actor: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  await mongoConnect();

  const actor = await User.findOne({ email: actorEmail }).select('_id email role');

  if (!actor || actor.role !== 'admin' || !superAdminEmail || actor.email !== superAdminEmail) {
    return {
      actor: null,
      response: NextResponse.json(
        { error: 'Only super admin can run order maintenance recovery' },
        { status: 403 }
      ),
    };
  }

  return { actor, response: null };
};

export async function GET(request: Request) {
  const { response } = await getSuperAdminActor();

  if (response) {
    return response;
  }

  const snapshot = await getOrderMaintenanceRecoverySnapshot({ limit: getLimit(request) });

  return NextResponse.json({ snapshot });
}

export async function POST(request: Request) {
  const { actor, response } = await getSuperAdminActor();

  if (response) {
    return response;
  }

  const result = await runOrderMaintenanceRecovery({
    actor: {
      _id: actor?._id,
      email: actor?.email,
      role: actor?.role,
    },
    limit: getLimit(request),
  });

  return NextResponse.json({ result });
}
