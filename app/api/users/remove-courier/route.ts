import { isAdmin } from '@/libs/authGuards';
import { createUserRoleAuditLog } from '@/libs/userRoleAudit';
import { User } from '@/models/user';
import mongoose from 'mongoose';

export async function PATCH(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  if (!(await isAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await request.json();

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return Response.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const user = await User.findById(userId);

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const previousRole = user.role;
  user.role = 'user';
  user.availability = false;
  user.takenOrder = null;

  const updatedUser = await user.save();

  await createUserRoleAuditLog({
    targetUser: updatedUser,
    previousRole,
    nextRole: 'user',
    action: 'user.courier_role_removed',
  });

  return Response.json({ user: updatedUser });
}
