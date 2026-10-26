/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MenuItemsListPage from '@/app/admin-dashboard/menu-items/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('nuqs', () => ({
  parseAsString: { withDefault: () => ({}) },
  useQueryState: () => ['', vi.fn()],
}));
vi.mock('@/hooks/useProfile', () => ({
  default: () => ({ data: { _id: 'admin-1', role: 'admin' }, loading: false }),
}));
vi.mock('@/components/shared/SonnerToastComponent', () => ({
  sonnerToast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/app/admin-dashboard/menu-items/MenuItems', () => ({
  default: ({ menuItems, onToggleAvailability }: any) => (
    <div>
      {menuItems.map((item: any) => (
        <button
          key={item._id}
          onClick={() => void onToggleAvailability(item._id, !item.isAvailable)}
        >
          {item.name}:{String(item.isAvailable)}:v{item.editVersion ?? 0}
        </button>
      ))}
    </div>
  ),
}));

const items = [
  { _id: 'a', name: 'Soup', isAvailable: true, editVersion: 0 },
  { _id: 'b', name: 'Pizza', isAvailable: true, editVersion: 0 },
];
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('a failed toggle does not roll back a different item that saved successfully', async () => {
  let failFirst!: (response: Response) => void;
  const requests: any[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        const body = JSON.parse(options.body as string);
        requests.push(body);
        if (body._id === 'a')
          return new Promise<Response>((resolve) => {
            failFirst = resolve;
          });
        return Response.json({ ...items[1], isAvailable: false, editVersion: 1 });
      }
      return Response.json(url === '/api/categories' ? [] : items);
    })
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<MenuItemsListPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Soup:true:v0' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pizza:true:v0' }));
  await screen.findByRole('button', { name: 'Pizza:false:v1' });
  failFirst(Response.json({ error: 'Temporary failure' }, { status: 503 }));
  await screen.findByRole('button', { name: 'Soup:true:v0' });
  expect(screen.getByRole('button', { name: 'Pizza:false:v1' })).toBeInTheDocument();
  expect(requests).toEqual([
    { _id: 'a', isAvailable: false, expectedEditVersion: 0 },
    { _id: 'b', isAvailable: false, expectedEditVersion: 0 },
  ]);
});

it('reloads a conflicted row and sends its refreshed version on the next toggle', async () => {
  const requests: any[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        requests.push(JSON.parse(options.body as string));
        return requests.length === 1
          ? Response.json({ error: 'Item changed' }, { status: 409 })
          : Response.json({ ...items[0], isAvailable: true, editVersion: 3 });
      }
      if (url.includes('?_id='))
        return Response.json([{ ...items[0], isAvailable: false, editVersion: 2 }]);
      return Response.json(url === '/api/categories' ? [] : items);
    })
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<MenuItemsListPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Soup:true:v0' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Soup:false:v2' }));
  await waitFor(() =>
    expect(requests[1]).toMatchObject({ expectedEditVersion: 2, isAvailable: true })
  );
  await screen.findByRole('button', { name: 'Soup:true:v3' });
});
