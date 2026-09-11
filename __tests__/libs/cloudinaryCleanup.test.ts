import { deleteCloudinaryImageByUrl, extractCloudinaryPublicId } from '@/libs/cloudinaryCleanup';
import cloudinary from '@/libs/cloudinary';

vi.mock('@/libs/cloudinary', () => ({
  default: {
    uploader: {
      destroy: vi.fn(),
    },
  },
}));

describe('cloudinaryCleanup helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts a development user image public id', () => {
    expect(
      extractCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1/users/avatar.jpg')
    ).toBe('users/avatar');
  });

  it('extracts a production restaurant image public id', () => {
    expect(
      extractCloudinaryPublicId(
        'https://res.cloudinary.com/demo/image/upload/v178/restaurants-production/cover.png'
      )
    ).toBe('restaurants-production/cover');
  });

  it('extracts a transformed menu item image public id', () => {
    expect(
      extractCloudinaryPublicId(
        'https://res.cloudinary.com/demo/image/upload/c_fill,w_800/v222/menu-items/item-one.webp'
      )
    ).toBe('menu-items/item-one');
  });

  it('extracts a folder-only stored image path', () => {
    expect(extractCloudinaryPublicId('users-production/avatar.jpg')).toBe(
      'users-production/avatar'
    );
  });

  it('ignores default and non-cloudinary images', () => {
    expect(extractCloudinaryPublicId('/user-default-image.webp')).toBeNull();
    expect(extractCloudinaryPublicId('/local-image.webp')).toBeNull();
  });

  it('deletes an extracted public id from Cloudinary', async () => {
    vi.mocked(cloudinary.uploader.destroy).mockResolvedValueOnce({ result: 'ok' } as never);

    const result = await deleteCloudinaryImageByUrl(
      'https://res.cloudinary.com/demo/image/upload/v1/menu-items/menu-item.jpg'
    );

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('menu-items/menu-item');
    expect(result).toEqual({ publicId: 'menu-items/menu-item', deleted: true });
  });

  it('returns Cloudinary deletion errors without throwing', async () => {
    vi.mocked(cloudinary.uploader.destroy).mockRejectedValueOnce(new Error('network timeout'));

    const result = await deleteCloudinaryImageByUrl(
      'https://res.cloudinary.com/demo/image/upload/v1/users/avatar.jpg'
    );

    expect(result).toEqual({
      publicId: 'users/avatar',
      deleted: false,
      error: 'network timeout',
    });
  });
});
