import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { isAdmin } from '@/libs/authGuards';
import cloudinary from '@/libs/cloudinary';
import { MenuItem } from '@/models/menuItem';
import { User } from '@/models/user';
import { POST, PUT } from '@/app/api/menu-items/route';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/libs/authOptions', () => ({ authOptions: {} }));
vi.mock('@/libs/authGuards', () => ({ isAdmin: vi.fn() }));
vi.mock('@/libs/cloudinary', () => ({
  default: { uploader: { upload_stream: vi.fn(), destroy: vi.fn() } },
}));

const itemId = '507f1f77bcf86cd799439011';
const adminId = '507f1f77bcf86cd799439012';
const restaurantId = '507f1f77bcf86cd799439013';
const categoryId = '507f1f77bcf86cd799439014';
const imageUrl = (name: string, folder = 'menu-items') =>
  `https://res.cloudinary.com/demo/image/upload/v123/${folder}/${name}.png`;
const payload = {
  _id: itemId,
  name: 'Soup',
  description: 'Warm soup',
  category: categoryId,
  image: imageUrl('old'),
  priceType: 'single',
  priceSmall: 5,
  expectedEditVersion: 0,
};
const existing = { ...payload, adminId, restaurantId, editVersion: 0 };
const request = (
  data: unknown = payload,
  file = new File(['image'], 'soup.png', { type: 'image/png' })
) => {
  const form = new FormData();
  form.append('data', JSON.stringify(data));
  form.append('file', file);
  return new Request('http://localhost/api/menu-items', { method: 'POST', body: form });
};

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo');
  vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
  vi.mocked(isAdmin).mockResolvedValue(true as never);
  vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'admin@example.com' } } as never);
  vi.spyOn(User, 'findOne').mockResolvedValue({ _id: adminId, restaurantId } as never);
  vi.spyOn(MenuItem, 'findById').mockResolvedValue(existing as never);
  vi.spyOn(MenuItem, 'exists').mockImplementation(
    (filter: any) => Promise.resolve(filter.image ? null : { _id: itemId }) as never
  );
  vi.spyOn(MenuItem, 'create').mockImplementation(
    async (data: any) => ({ ...data, _id: itemId }) as never
  );
  vi.spyOn(MenuItem, 'findOneAndUpdate').mockImplementation(
    async (_filter: any, update: any) => ({ ...existing, ...update.$set, editVersion: 1 }) as never
  );
  vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
    (options: any, callback: any) =>
      ({
        end: () =>
          callback(null, {
            secure_url: imageUrl('new', options.folder),
            public_id: `${options.folder}/new`,
          }),
      }) as never
  );
  vi.mocked(cloudinary.uploader.destroy).mockResolvedValue({ result: 'ok' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

it('creates an item and its image in one save, after model validation', async () => {
  const validate = vi.spyOn(MenuItem, 'validate');
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).image).toBe(imageUrl('new'));
  expect(validate.mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(cloudinary.uploader.upload_stream).mock.invocationCallOrder[0]
  );
  expect(MenuItem.create).toHaveBeenCalledWith(
    expect.objectContaining({ image: imageUrl('new'), adminId, restaurantId })
  );
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

it.each(['development', 'production'])(
  'replaces the image and then cleans the old %s image',
  async (env) => {
    vi.stubEnv('NODE_ENV', env);
    const folder = env === 'production' ? 'menu-items-production' : 'menu-items';
    vi.mocked(MenuItem.findById).mockResolvedValue({
      ...existing,
      image: imageUrl('old', folder),
    } as never);
    const response = await PUT(request());
    expect(response.status).toBe(200);
    expect((await response.json()).image).toBe(imageUrl('new', folder));
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      { folder, resource_type: 'image' },
      expect.any(Function)
    );
    expect(cloudinary.uploader.destroy).toHaveBeenCalledExactlyOnceWith(`${folder}/old`, {
      invalidate: true,
    });
    expect(vi.mocked(MenuItem.findOneAndUpdate).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(cloudinary.uploader.destroy).mock.invocationCallOrder[0]
    );
  }
);

it('rejects a stale edit before uploading', async () => {
  vi.mocked(MenuItem.exists).mockResolvedValue(null);
  expect((await PUT(request())).status).toBe(409);
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  expect(MenuItem.findOneAndUpdate).not.toHaveBeenCalled();
});

it('cleans only the new upload when another edit or reservation wins during upload', async () => {
  vi.mocked(MenuItem.findOneAndUpdate).mockResolvedValue(null);
  expect((await PUT(request())).status).toBe(409);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledExactlyOnceWith('menu-items/new', {
    invalidate: true,
  });
});

it.each(['create', 'edit'])(
  'cleans an unused upload when the %s database write fails',
  async (mode) => {
    if (mode === 'create')
      vi.mocked(MenuItem.create).mockRejectedValue(new Error('Database unavailable'));
    else vi.mocked(MenuItem.findOneAndUpdate).mockRejectedValue(new Error('Database unavailable'));
    expect((await (mode === 'create' ? POST : PUT)(request())).status).toBe(500);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledExactlyOnceWith('menu-items/new', {
      invalidate: true,
    });
  }
);

it('does not delete a new image if an uncertain write actually committed', async () => {
  vi.mocked(MenuItem.findOneAndUpdate).mockRejectedValue(new Error('Write acknowledgement lost'));
  vi.mocked(MenuItem.exists).mockResolvedValue({ _id: itemId } as never);
  expect((await PUT(request())).status).toBe(500);
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

it('leaves the old image and document unchanged when upload fails', async () => {
  vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
    (_options: any, callback: any) =>
      ({ end: () => callback(new Error('Cloudinary unavailable')) }) as never
  );
  expect((await PUT(request())).status).toBe(500);
  expect(MenuItem.findOneAndUpdate).not.toHaveBeenCalled();
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

it('does not report a committed save as failed when old-image cleanup fails', async () => {
  vi.mocked(cloudinary.uploader.destroy).mockRejectedValue(new Error('Cleanup unavailable'));
  expect((await PUT(request())).status).toBe(200);
  expect(console.error).toHaveBeenCalled();
});

it('keeps images referenced by another menu item', async () => {
  vi.mocked(MenuItem.exists).mockResolvedValue({ _id: itemId } as never);
  expect((await PUT(request())).status).toBe(200);
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

it.each([
  imageUrl('old', 'menu-items-production'),
  imageUrl('old').replace('/demo/', '/another-cloud/'),
  imageUrl('old').replace('res.cloudinary.com', 'example.com'),
])('does not delete outside the current menu image folder/cloud: %s', async (image) => {
  vi.mocked(MenuItem.findById).mockResolvedValue({ ...existing, image } as never);
  expect((await PUT(request())).status).toBe(200);
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

it.each([POST, PUT])('validates required content before any upload', async (save) => {
  expect((await save(request({ ...payload, description: '' }))).status).toBe(400);
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
});

it.each([
  new File([], 'empty.png', { type: 'image/png' }),
  new File(['text'], 'note.txt', { type: 'text/plain' }),
  new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
])('rejects invalid file %s before uploading', async (file) => {
  expect((await POST(request(payload, file))).status).toBe(400);
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
});

it('rejects a standalone file posted to the save endpoint without item data', async () => {
  const form = new FormData();
  form.append('file', new File(['image'], 'soup.png', { type: 'image/png' }));
  expect(
    (await POST(new Request('http://localhost/api/menu-items', { method: 'POST', body: form })))
      .status
  ).toBe(400);
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
});

it('does not upload for unauthorized users or another owner', async () => {
  vi.mocked(isAdmin).mockResolvedValue(false as never);
  expect((await POST(request())).status).toBe(401);
  vi.mocked(isAdmin).mockResolvedValue(true as never);
  vi.mocked(MenuItem.findById).mockResolvedValue({ ...existing, adminId: restaurantId } as never);
  expect((await PUT(request())).status).toBe(403);
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
});

it('requires an owned restaurant before creating an image and item', async () => {
  vi.mocked(User.findOne).mockResolvedValue({ _id: adminId } as never);
  expect((await POST(request())).status).toBe(403);
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
});

it('saving an unchanged image never uploads or destroys anything', async () => {
  const response = await PUT(
    new Request('http://localhost/api/menu-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );
  expect(response.status).toBe(200);
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});
