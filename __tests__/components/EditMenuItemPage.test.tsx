/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditMenuItemPage from '@/app/admin-dashboard/menu-items/edit/[id]/page';

const mocks = vi.hoisted(() => ({ router: { push: vi.fn() }, success: vi.fn(), error: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useParams: () => ({ id: 'menu-1' }),
}));
vi.mock('@/hooks/useProfile', () => ({
  default: () => ({ data: { _id: 'admin-1', role: 'admin' }, loading: false }),
}));
vi.mock('@/components/shared/SonnerToastComponent', () => ({
  sonnerToast: { success: mocks.success, error: mocks.error },
}));
vi.mock('next/image', () => ({ default: () => null }));

const item = {
  _id: 'menu-1',
  adminId: 'admin-1',
  restaurantId: 'restaurant-1',
  name: 'Soup',
  description: 'Original recipe',
  category: 'category-1',
  image: 'https://example.com/soup.png',
  priceType: 'single',
  priceSmall: 5,
  priceMedium: null,
  priceLarge: null,
  trackInventory: true,
  stockQuantity: 10,
  reservedStockQuantity: 2,
  lowStockThreshold: 3,
  maxQuantityPerOrder: 20,
  isAvailable: true,
  editVersion: 0,
};

let latest = { ...item };
let saveResponse: () => Response;
let writes: Record<string, unknown>[];
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  latest = { ...item };
  writes = [];
  saveResponse = () => Response.json({ ...latest, stockQuantity: 7, editVersion: 1 });
  fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/api/categories') return Response.json([{ _id: 'category-1', name: 'Soup' }]);
    if (options?.method === 'PUT') {
      writes.push(
        JSON.parse(
          options.body instanceof FormData
            ? (options.body.get('data') as string)
            : (options.body as string)
        )
      );
      return saveResponse();
    }
    return Response.json([latest]);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const openForm = async () => {
  render(<EditMenuItemPage />);
  await screen.findByDisplayValue('Original recipe');
};

it('omits unchanged stock, stays on the edit route and adopts the returned stock/version', async () => {
  const user = userEvent.setup();
  await openForm();
  await user.type(screen.getByLabelText('Menu item name'), ' special');
  await user.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  expect(writes[0]).toMatchObject({ name: 'Soup special', expectedEditVersion: 0 });
  expect(writes[0]).not.toHaveProperty('stockQuantity');
  expect(writes[0]).not.toHaveProperty('expectedStockQuantity');
  expect(screen.getByLabelText('Current stock')).toHaveValue(7);
  await user.click(screen.getByRole('button', { name: 'Update' }));
  expect(writes[1].expectedEditVersion).toBe(1);
  expect(mocks.router.push).not.toHaveBeenCalled();
});

it('sends an intentional stock adjustment with its original baseline', async () => {
  const user = userEvent.setup();
  await openForm();
  fireEvent.change(screen.getByLabelText('Current stock'), { target: { value: '20' } });
  await user.click(screen.getByRole('button', { name: 'Update' }));
  expect(writes[0]).toMatchObject({
    stockQuantity: 20,
    expectedStockQuantity: 10,
    expectedEditVersion: 0,
  });
});

it('preserves the draft on conflict and requires confirmation before loading fresh values', async () => {
  const user = userEvent.setup();
  saveResponse = () =>
    Response.json({ error: 'This item changed in another tab.' }, { status: 409 });
  await openForm();
  await user.clear(screen.getByLabelText('Menu item name'));
  await user.type(screen.getByLabelText('Menu item name'), 'My unsaved name');
  await user.click(screen.getByRole('button', { name: 'Update' }));
  expect(await screen.findByText('Changes not saved')).toBeInTheDocument();
  expect(screen.getByLabelText('Menu item name')).toHaveValue('My unsaved name');
  expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Reload latest item' }));
  await user.click(screen.getByRole('button', { name: 'Keep draft' }));
  expect(screen.getByLabelText('Menu item name')).toHaveValue('My unsaved name');
  latest = { ...item, name: 'Other tab name', editVersion: 2, stockQuantity: 6 };
  await user.click(screen.getByRole('button', { name: 'Reload latest item' }));
  await user.click(screen.getByRole('button', { name: 'Reload latest', exact: true }));
  expect(await screen.findByDisplayValue('Other tab name')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
  expect(screen.getByLabelText('Current stock')).toHaveValue(6);
});

it('does not replace a draft if the confirmed reload fails', async () => {
  const user = userEvent.setup();
  saveResponse = () => Response.json({ error: 'Conflict' }, { status: 409 });
  await openForm();
  await user.type(screen.getByLabelText('Menu item name'), ' unsaved');
  await user.click(screen.getByRole('button', { name: 'Update' }));
  await user.click(await screen.findByRole('button', { name: 'Reload latest item' }));
  fetchMock.mockImplementation(async () =>
    Response.json({ error: 'Unavailable' }, { status: 503 })
  );
  await user.click(screen.getByRole('button', { name: 'Reload latest', exact: true }));
  expect(await screen.findByDisplayValue('Soup unsaved')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
});

it('keeps image selection local and sends the file only with an explicit save, including retries', async () => {
  const user = userEvent.setup();
  saveResponse = () => Response.json({ error: 'Temporary failure' }, { status: 503 });
  await openForm();
  fetchMock.mockClear();
  await user.upload(
    screen.getByLabelText('Edit'),
    new File(['image'], 'soup.png', { type: 'image/png' })
  );
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Temporary failure', expect.anything())
  );
  saveResponse = () =>
    Response.json({ ...item, image: 'https://example.com/uploaded.png', editVersion: 1 });
  await user.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/upload/menu-items')).toHaveLength(0);
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/menu-items')).toHaveLength(2);
  const body = fetchMock.mock.calls[1][1].body as FormData;
  expect((body.get('file') as File).name).toBe('soup.png');
  expect(writes[1].image).toBe(item.image);
});

it('does not upload or delete anything when an image is selected and the form is left', async () => {
  const user = userEvent.setup();
  await openForm();
  fetchMock.mockClear();
  await user.upload(
    screen.getByLabelText('Edit'),
    new File(['image'], 'soup.png', { type: 'image/png' })
  );
  cleanup();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('shows a retry state instead of an editable empty form when loading fails', async () => {
  fetchMock.mockImplementation(async () => Response.json([], { status: 503 }));
  render(<EditMenuItemPage />);
  expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
});
