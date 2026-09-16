import { isSuperAdmin } from '@/libs/authGuards';
import { createUserRoleAuditLog } from '@/libs/userRoleAudit';
import { User } from '@/models/user';
import mongoose from 'mongoose';

export async function PATCH(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  if (!(await isSuperAdmin())) {
    return Response.json({ error: 'Only super admin can make someone an admin' }, { status: 401 });
  }

  const { userId } = await request.json();

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return Response.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const user = await User.findById(userId);

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.role === 'admin') {
    return Response.json({ error: 'User is already an admin' }, { status: 400 });
  }

  const previousRole = user.role;
  user.role = 'admin';

  const updatedUser = await user.save();

  await createUserRoleAuditLog({
    targetUser: updatedUser,
    previousRole,
    nextRole: 'admin',
    action: 'user.role_promoted_to_admin',
  });

  return Response.json({ user: updatedUser });
}
