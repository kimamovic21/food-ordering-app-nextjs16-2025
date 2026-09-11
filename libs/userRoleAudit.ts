import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/libs/authOptions';
import { createAuditLog } from '@/libs/auditLog';
import { User } from '@/models/user';

type UserRoleAuditTarget = {
  _id?: unknown;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

export const createUserRoleAuditLog = async ({
  targetUser,
  previousRole,
  nextRole,
  action,
}: {
  targetUser: UserRoleAuditTarget;
  previousRole?: string | null;
  nextRole?: string | null;
  action: string;
}) => {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email;
  const actor = actorEmail
    ? await User.findOne({ email: actorEmail }).select('_id email role').lean()
    : null;

  await createAuditLog({
    actor,
    action,
    entityType: 'user',
    entityId: targetUser._id,
    metadata: {
      targetEmail: targetUser.email || '',
      targetName: targetUser.name || '',
      previousRole: previousRole || '',
      nextRole: nextRole || '',
    },
  });
};
