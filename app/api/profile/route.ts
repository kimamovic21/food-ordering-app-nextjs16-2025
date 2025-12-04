import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/libs/authOptions';
import { User } from '@/models/user';
import mongoose from 'mongoose';

export async function PUT(req: Request) {
  mongoose.connect(process.env.MONGODB_URL as string);

  const data = await req.json();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if ('name' in data) {
    await User.updateOne({ email }, { name: data.name });
  };

  return Response.json(true);
};