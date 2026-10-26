/** @vitest-environment jsdom */
import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewMenuItemPage from '@/app/admin-dashboard/menu-items/new/page';
import type MenuItemForm from '@/app/admin-dashboard/menu-items/MenuItemForm';

const mocks = vi.hoisted(() => ({ router: { push: vi.fn() }, success: vi.fn(), error: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/hooks/useProfile', () => ({
  default: () => ({
    data: { _id: 'admin-1', role: 'admin', restaurantId: 'restaurant-1' },
    loading: false,
  }),
}));
vi.mock('@/components/shared/SonnerToastComponent', () => ({
  sonnerToast: { success: mocks.success, error: mocks.error },
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/app/admin-dashboard/menu-items/MenuItemForm', () => ({
  default: (props: ComponentProps<typeof MenuItemForm>) => (
    <>
      <input
        aria-label='Name'
        value={props.name}
        onChange={(e) => props.onNameChange(e.target.value)}
      />
      <input
        aria-label='Category'
        value={props.categoryId}
        onChange={(e) => props.onCategoryChange(e.target.value)}
      />
      <input
        aria-label='Price'
        value={props.priceSmall}
        onChange={(e) => props.onPriceSmallChange(e.target.value)}
      />
      <button type='submit' disabled={props.isSaving}>
        Save
      </button>
      <button type='button' onClick={props.onCancel}>
        Cancel
      </button>
    </>
  ),
}));

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async (_url: string, options?: RequestInit) =>
    options?.method === 'POST' ? Response.json({ _id: 'new-item' }) : Response.json([])
  );
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('does not contact Cloudinary or save when selecting an image and leaving the form', async () => {
  const user = userEvent.setup();
  const view = render(<NewMenuItemPage />);
  const upload = await screen.findByLabelText('Upload');
  fetchMock.mockClear();
  await user.upload(upload, new File(['image'], 'soup.png', { type: 'image/png' }));
  view.unmount();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('submits one multipart save containing the file and data, never a standalone upload', async () => {
  const user = userEvent.setup();
  render(<NewMenuItemPage />);
  await screen.findByLabelText('Name');
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Soup' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'category-1' } });
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '5' } });
  fetchMock.mockClear();
  await user.upload(
    screen.getByLabelText('Upload'),
    new File(['image'], 'soup.png', { type: 'image/png' })
  );
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/menu-items');
  expect(options.method).toBe('POST');
  expect((options.body.get('file') as File).name).toBe('soup.png');
  expect(JSON.parse(options.body.get('data'))).toMatchObject({ name: 'Soup', priceSmall: 5 });
  expect(mocks.router.push).toHaveBeenCalledWith('/admin-dashboard/menu-items');
});
