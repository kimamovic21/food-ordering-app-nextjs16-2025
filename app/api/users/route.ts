import { isAdmin } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@/models/user';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  if (!(await isAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = 5;
  const skip = (page - 1) * limit;

  const totalUsers = await User.countDocuments({});
  const users = await User.find(
    {},
    'name email image city country phone postalCode streetAddress admin'
  )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalUsers / limit) || 1;

  return Response.json({ users, page, totalPages, totalUsers });
}