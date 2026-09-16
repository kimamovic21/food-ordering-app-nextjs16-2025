import { isSuperAdmin } from '@/libs/authGuards';
import { createUserRoleAuditLog } from '@/libs/userRoleAudit';
import { User } from '@/models/user';
import mongoose from 'mongoose';

export async function PATCH(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  if (!(await isSuperAdmin())) {
    return Response.json({ error: 'Only super admin can remove admin role' }, { status: 401 });
  }

  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  const { userId } = await request.json();

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return Response.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const user = await User.findById(userId);

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.role !== 'admin') {
    return Response.json({ error: 'User is not an admin' }, { status: 400 });
  }

  if (superAdminEmail && user.email === superAdminEmail) {
    return Response.json(
      { error: 'You cannot remove admin role from super admin' },
      { status: 409 }
    );
  }

  const previousRole = user.role;
  user.role = 'user';

  const updatedUser = await user.save();

  await createUserRoleAuditLog({
    targetUser: updatedUser,
    previousRole,
    nextRole: 'user',
    action: 'user.admin_role_removed',
  });

  return Response.json({ user: updatedUser });
}
