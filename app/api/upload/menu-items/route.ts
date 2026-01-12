import { type UploadApiResponse } from 'cloudinary';
import { MenuItem } from '@/models/menuItem';
import { isAdmin } from '../../auth/[...nextauth]/route';
import cloudinary from '@/libs/cloudinary';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    await mongoose.connect(process.env.MONGODB_URL as string);

    if (!(await isAdmin())) {
      return new Response('Unauthorized', { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const menuItemId = form.get('menuItemId') as string | null;

    if (!file) {
      return new Response('No file provided', { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadedImage: UploadApiResponse = await new Promise((resolve, reject) => {
      const folder = process.env.NODE_ENV === 'production' ? 'menu-items-production' : 'menu-items';
      const uploadStream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
        if (error) return reject(error);
        resolve(result as UploadApiResponse);
      });
      uploadStream.end(buffer);
    });

    // If updating an existing menu item
    if (menuItemId) {
      const menuItem = await MenuItem.findById(menuItemId);

      if (!menuItem) {
        return new Response('Menu item not found', { status: 404 });
      }

      // Delete old image if exists
      if (menuItem.image) {
        const matches = menuItem.image.match(/menu-items\/([^\.]+)/);
        const oldPublicId = matches ? `menu-items/${matches[1]}` : null;

        if (oldPublicId) {
          await cloudinary.uploader.destroy(oldPublicId);
        }
      }

      // Update the menu item with new image
      const updatedMenuItem = await MenuItem.findByIdAndUpdate(
        menuItemId,
        { image: uploadedImage.secure_url },
        { new: true }
      );

      return Response.json({
        success: true,
        url: uploadedImage.secure_url,
        menuItem: updatedMenuItem,
      });
    }

    return Response.json({
      success: true,
      url: uploadedImage.secure_url,
    });
  } catch (err) {
    console.error('UPLOAD ERROR:', err);
    return new Response('Upload error', { status: 500 });
  }
}
