import { POST } from '@/app/api/upload/menu-items/route';
import cloudinary from '@/libs/cloudinary';

vi.mock('@/libs/cloudinary', () => ({
  default: { uploader: { upload_stream: vi.fn(), destroy: vi.fn() } },
}));

it('retires standalone uploads without sending anything to Cloudinary', async () => {
  const response = await POST();
  expect(response.status).toBe(410);
  expect((await response.json()).error).toContain('Save the menu item');
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});
