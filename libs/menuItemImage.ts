import 'server-only';
import type { UploadApiResponse } from 'cloudinary';
import cloudinary from '@/libs/cloudinary';
import { extractCloudinaryPublicId } from '@/libs/cloudinaryCleanup';
import { MenuItem } from '@/models/menuItem';

export class MenuItemSaveInputError extends Error {}

const imageFolder = () =>
  process.env.NODE_ENV === 'production' ? 'menu-items-production' : 'menu-items';

export async function readMenuItemSaveRequest(req: Request) {
  let data: unknown;
  let file: File | null = null;
  try {
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await req.formData();
      const payload = form.get('data');
      if (typeof payload !== 'string') throw new Error('Missing item data');
      data = JSON.parse(payload);
      const selected = form.get('file');
      if (selected !== null) {
        if (typeof selected === 'string') throw new Error('Invalid image file');
        file = selected;
      }
    } else {
      data = await req.json();
    }
  } catch {
    throw new MenuItemSaveInputError('Invalid menu item request. Reload the form and try again.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new MenuItemSaveInputError('Menu item data must be an object.');
  }
  if (file && (file.size === 0 || file.size > 4 * 1024 * 1024 || !file.type.startsWith('image/'))) {
    throw new MenuItemSaveInputError('Choose a non-empty image no larger than 4 MB.');
  }
  return { data: data as Record<string, unknown>, file };
}

export async function uploadMenuItemImage(file: File): Promise<UploadApiResponse> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: imageFolder(), resource_type: 'image' }, (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result.public_id)
          return reject(new Error('Image upload failed'));
        resolve(result);
      })
      .end(buffer);
  });
}

// Only server-known URLs in this environment's own menu folder may be removed.
export async function cleanupUnusedMenuItemImage(imageUrl?: string | null) {
  if (!imageUrl) return;
  try {
    const url = new URL(imageUrl);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const publicId = extractCloudinaryPublicId(imageUrl);
    if (
      !cloudName ||
      url.hostname !== 'res.cloudinary.com' ||
      !url.pathname.startsWith(`/${cloudName}/image/upload/`) ||
      !publicId?.startsWith(`${imageFolder()}/`)
    )
      return;

    // An uncertain write may already have committed. Never remove its attached image.
    if (await MenuItem.exists({ image: imageUrl })) return;
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    if (result?.result !== 'ok' && result?.result !== 'not found') {
      console.error('Menu item image cleanup was not confirmed:', publicId);
    }
  } catch (error) {
    // Cleanup failure must not turn a committed item save into a failed save.
    console.error('Menu item image cleanup failed; review the orphan audit:', error);
  }
}
