import cloudinary from '@/libs/cloudinary';

export type CloudinaryDeletionResult = {
  publicId: string | null;
  deleted: boolean;
  error?: string;
};

const CLOUDINARY_UPLOAD_SEGMENT = 'upload';
const CLOUDINARY_VERSION_PATTERN = /^v\d+$/;
const DEFAULT_USER_IMAGE = '/user-default-image.webp';

const removeExtension = (value: string) => value.replace(/\.[a-zA-Z0-9]+$/, '');

export function extractCloudinaryPublicId(imageUrl?: string | null) {
  if (!imageUrl || imageUrl === DEFAULT_USER_IMAGE) {
    return null;
  }

  try {
    const parsedUrl = new URL(imageUrl);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const uploadIndex = pathSegments.indexOf(CLOUDINARY_UPLOAD_SEGMENT);

    if (uploadIndex === -1) {
      return null;
    }

    const afterUploadSegments = pathSegments.slice(uploadIndex + 1);
    const versionIndex = afterUploadSegments.findIndex((segment) =>
      CLOUDINARY_VERSION_PATTERN.test(segment)
    );
    const publicIdSegments =
      versionIndex >= 0 ? afterUploadSegments.slice(versionIndex + 1) : afterUploadSegments;

    if (!publicIdSegments.length) {
      return null;
    }

    const lastSegment = publicIdSegments[publicIdSegments.length - 1];
    publicIdSegments[publicIdSegments.length - 1] = removeExtension(lastSegment);

    return publicIdSegments.join('/');
  } catch {
    const fallbackMatch = imageUrl.match(
      /(?:^|\/)(users(?:-production)?|restaurants(?:-production)?|menu-items(?:-production)?)\/([^/.]+)(?:\.[a-zA-Z0-9]+)?$/
    );

    return fallbackMatch ? `${fallbackMatch[1]}/${fallbackMatch[2]}` : null;
  }
}

export async function deleteCloudinaryImageByUrl(
  imageUrl?: string | null
): Promise<CloudinaryDeletionResult> {
  const publicId = extractCloudinaryPublicId(imageUrl);

  if (!publicId) {
    return { publicId: null, deleted: false };
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    return { publicId, deleted: true };
  } catch (error) {
    return {
      publicId,
      deleted: false,
      error: error instanceof Error ? error.message : 'Unknown Cloudinary deletion error',
    };
  }
}
