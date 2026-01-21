import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/libs/authOptions';
import { User } from '@/models/user';
import cloudinary from '@/libs/cloudinary';
import mongoose from 'mongoose';

type ProfileUpdateData = {
  name?: string;
  phone?: string;
  streetAddress?: string;
  postalCode?: string;
  city?: string;
  country?: string;
};

export async function PUT(req: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const data = await req.json();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedFields: (keyof ProfileUpdateData)[] = [
    'name',
    'phone',
    'streetAddress',
    'postalCode',
    'city',
    'country',
  ];

  const updateData: ProfileUpdateData = {};

  for (const key of allowedFields) {
    if (key in data) {
      updateData[key] = data[key];
    }
  }

  await User.updateOne({ email }, { $set: updateData });

  const updatedUser = await User.findOne({ email });

  return Response.json(updatedUser);
}

export async function GET() {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await User.findOne({ email });

  return Response.json(user);
}

export async function DELETE() {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user to check if they have an image to delete
  const user = await User.findOne({ email });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // Delete user's image from Cloudinary if it exists
  if (user.image && user.image !== '/user-default-image.webp') {
    try {
      const matches = user.image.match(/users(?:-production)?\/([^\.]+)/);
      const folder = process.env.NODE_ENV === 'production' ? 'users-production' : 'users';
      const publicId = matches ? `${folder}/${matches[1]}` : null;

      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (cloudinaryErr) {
      console.error('Cloudinary delete error:', cloudinaryErr);
      // Continue with user deletion even if image deletion fails
    }
  }

  // Delete the user from the database
  // Orders remain intact as per requirements
  await User.deleteOne({ email });

  return Response.json({ success: true, message: 'Account deleted successfully' });
}
