import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/libs/authOptions';
import { User } from '@/models/user';

export const isAdmin = async () => {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return false;
  }

  await mongoose.connect(process.env.MONGODB_URL as string);
  const user = await User.findOne({ email: userEmail });

  if (!user) {
    return false;
  }

  return user.role === 'admin';
};

export const isSuperAdmin = async () => {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  if (!userEmail || !superAdminEmail) {
    return false;
  }

  return userEmail === superAdminEmail;
};
