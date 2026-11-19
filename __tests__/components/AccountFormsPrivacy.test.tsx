/** @vitest-environment jsdom */

import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccountCacheBoundary from '@/components/shared/AccountCacheBoundary';
import { CartProvider } from '@/contexts/CartContext';
import ProfilePage from '@/app/profile/page';
import CartPage from '@/app/cart/page';
import type UserProfileForm from '@/app/profile/UserProfileForm';
import type DeliveryInformation from '@/app/cart/DeliveryInformation';
import type OrderSummary from '@/app/cart/OrderSummary';
import type CartItems from '@/app/cart/CartItems';
import { queryKeys } from '@/libs/queryKeys';

const mocks = vi.hoisted(() => ({
  session: {
    status: 'authenticated' as 'authenticated' | 'unauthenticated' | 'loading',
    data: {
      user: {
        email: 'a@example.com',
        name: 'User A',
        phone: '',
        streetAddress: '',
        city: '',
        postalCode: '',
        country: '',
      },
    },
    update: vi.fn(),
  },
  signOut: vi.fn(),
  push: vi.fn(),
  toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('next-auth/react', () => ({ useSession: () => mocks.session, signOut: mocks.signOut }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/components/shared/SonnerToastComponent', () => ({
  sonnerToast: mocks.toast,
  default: (props: { pending?: string; success?: string; error?: string }) => (
    <div role='status'>{props.pending || props.success || props.error}</div>
  ),
}));
vi.mock('@/app/profile/UserProfileImage', () => ({ default: () => null }));
vi.mock('@/app/profile/UserProfileForm', () => ({
  default: (props: ComponentProps<typeof UserProfileForm>) => (
    <form onSubmit={props.onSubmit}>
      <input
        aria-label='Profile name'
        value={props.userName}
        onChange={(event) => props.onNameChange(event.target.value)}
      />
      <span>{props.email}</span>
      <button type='submit' disabled={props.isSaving}>
        Save profile
      </button>
      <button type='button' onClick={props.onDeleteAccount}>
        Delete account
      </button>
    </form>
  ),
}));
vi.mock('@/app/cart/CartItems', () => ({
  default: (props: ComponentProps<typeof CartItems>) => (
    <div data-testid='cart-items'>
      {props.cartItems.map((item) => item.name + ':' + item.quantity).join(',')}
    </div>
  ),
}));
vi.mock('@/app/cart/DeliveryInformation', () => ({
  default: (props: ComponentProps<typeof DeliveryInformation>) => (
    <div>
      <span data-testid='delivery-email'>{props.email}</span>
      <input
        aria-label='Delivery street'
        name='streetAddress'
        value={props.formData.streetAddress}
        onChange={props.handleInputChange}
      />
      <span data-testid='latitude'>{String(props.formData.deliveryLatitude)}</span>
      <span data-testid='address-selection'>{props.selectedAddressId}</span>
      <button onClick={props.onSaveCurrentAddress}>Save address</button>
    </div>
  ),
}));
vi.mock('@/app/cart/OrderSummary', () => ({
  default: (props: ComponentProps<typeof OrderSummary>) => (
    <div>
      <input
        aria-label='Coupon'
        value={props.couponCode}
        onChange={(event) => props.onCouponCodeChange(event.target.value)}
      />
      <button
        disabled={
          props.loadingRestaurants || props.loadingMenuAvailability || props.missingDeliveryLocation
        }
        onClick={props.handleCheckout}
      >
        Checkout
      </button>
    </div>
  ),
}));
vi.mock('@/components/shared/RestaurantAvailabilityNotifyButton', () => ({ default: () => null }));

let client: QueryClient;
let fetchMock: ReturnType<typeof vi.fn>;
const A = 'a@example.com';
const B = 'b@example.com';
const savedAddress = {
  _id: 'address-a',
  label: 'Home',
  phone: '+38761123456',
  streetAddress: 'Private street A',
  city: 'Sarajevo',
  postalCode: '71000',
  country: 'Bosnia and Herzegovina',
  deliveryLatitude: 43.85,
  deliveryLongitude: 18.41,
  isDefault: true,
};
function switchToB() {
  mocks.session.data = {
    user: {
      email: B,
      name: 'User B',
      phone: '',
      streetAddress: '',
      city: '',
      postalCode: '',
      country: '',
    },
  };
}
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <AccountCacheBoundary />
      <CartProvider>{children}</CartProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.status = 'authenticated';
  mocks.session.data = {
    user: {
      email: A,
      name: 'User A',
      phone: '',
      streetAddress: '',
      city: '',
      postalCode: '',
      country: '',
    },
  };
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  localStorage.clear();
  localStorage.setItem(
    'cart',
    JSON.stringify([
      {
        _id: 'm1',
        name: 'Meal',
        restaurantId: 'r1',
        size: 'small',
        price: 12,
        quantity: 2,
        note: 'No onion',
      },
    ])
  );
  fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/profile') return Response.json(mocks.session.data.user);
    if (url === '/api/profile/delivery-addresses')
      return Response.json({
        addresses: mocks.session.data.user.email === A ? [savedAddress] : [],
      });
    if (url === '/api/loyalty') return Response.json({ discountPercentage: 0 });
    if (url === '/api/restaurant/r1')
      return Response.json({
        restaurant: {
          _id: 'r1',
          name: 'Restaurant',
          isOpen: true,
          isAcceptingOrders: true,
          tax: 17,
          minimumOrderAmount: 10,
        },
      });
    if (url === '/api/cart/validate') return Response.json({ canCheckout: true, items: [] });
    if (url.startsWith('/api/coupons?')) return Response.json({ coupon: null });
    throw new Error('Unexpected URL: ' + url);
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('resets profile drafts only for a different account, not a same-account session refresh', async () => {
  const { rerender } = render(<ProfilePage />, { wrapper: Wrapper });
  await waitFor(() => expect(screen.getByLabelText('Profile name')).toHaveValue('User A'));
  fireEvent.change(screen.getByLabelText('Profile name'), { target: { value: 'Unsaved A' } });
  mocks.session.status = 'loading';
  rerender(<ProfilePage />);
  expect(screen.getByLabelText('Profile name')).toHaveValue('Unsaved A');
  mocks.session.status = 'authenticated';
  mocks.session.data = { user: { ...mocks.session.data.user } };
  rerender(<ProfilePage />);
  expect(screen.getByLabelText('Profile name')).toHaveValue('Unsaved A');
  switchToB();
  rerender(<ProfilePage />);
  await waitFor(() => expect(screen.getByLabelText('Profile name')).toHaveValue('User B'));
  expect(screen.queryByDisplayValue('Unsaved A')).not.toBeInTheDocument();
});

it('does not update the new session or caches when an old profile save finishes', async () => {
  let resolve!: (response: Response) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      })
  );
  const { rerender } = render(<ProfilePage />, { wrapper: Wrapper });
  await waitFor(() => expect(screen.getByLabelText('Profile name')).toHaveValue('User A'));
  fireEvent.click(screen.getByText('Save profile'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  switchToB();
  rerender(<ProfilePage />);
  await act(async () => {
    resolve(Response.json({ email: A, name: 'Saved A' }));
  });
  expect(mocks.session.update).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Profile name')).toHaveValue('User B');
  expect(client.getQueryData(queryKeys.profile.detail(A))).toBeUndefined();
  expect(client.getQueryData(queryKeys.profile.detail(B))).toBeUndefined();
  expect(screen.queryByText('Profile updated!')).not.toBeInTheDocument();
});

it('saves a current profile normally without any image-service request', async () => {
  render(<ProfilePage />, { wrapper: Wrapper });
  await waitFor(() => expect(screen.getByLabelText('Profile name')).toHaveValue('User A'));
  fireEvent.click(screen.getByText('Save profile'));
  await screen.findByText('Profile updated!');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/profile',
    expect.objectContaining({ method: 'PUT' })
  );
  expect(mocks.session.update).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(queryKeys.profile.detail(A))).toMatchObject({ email: A });
});

it('does not sign out the new account when an old account deletion finishes', async () => {
  let resolve!: (response: Response) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      })
  );
  const { rerender } = render(<ProfilePage />, { wrapper: Wrapper });
  fireEvent.click(screen.getByText('Delete account'));
  switchToB();
  rerender(<ProfilePage />);
  await act(async () => {
    resolve(Response.json({ success: true }));
  });
  expect(mocks.signOut).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Profile name')).toHaveValue('User B');
});

it('clears private delivery fields, coordinates, selection and coupon but keeps cart items and notes', async () => {
  const { rerender } = render(<CartPage />, { wrapper: Wrapper });
  await waitFor(() =>
    expect(screen.getByLabelText('Delivery street')).toHaveValue(savedAddress.streetAddress)
  );
  expect(screen.getByTestId('latitude')).toHaveTextContent('43.85');
  fireEvent.change(screen.getByLabelText('Coupon'), { target: { value: 'PRIVATE' } });
  switchToB();
  rerender(<CartPage />);
  await waitFor(() => expect(screen.getByTestId('delivery-email')).toHaveTextContent(B));
  expect(screen.getByLabelText('Delivery street')).toHaveValue('');
  expect(screen.getByTestId('latitude')).toHaveTextContent('null');
  expect(screen.getByTestId('address-selection')).toBeEmptyDOMElement();
  expect(screen.getByLabelText('Coupon')).toHaveValue('');
  expect(screen.getByTestId('cart-items')).toHaveTextContent('Meal:2');
  expect(JSON.parse(localStorage.getItem('cart')!)[0]).toMatchObject({
    quantity: 2,
    note: 'No onion',
  });
});

it('ignores an old checkout response without clearing the cart or redirecting the new account', async () => {
  let resolve!: (response: Response) => void;
  const baseFetch = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string) =>
    url === '/api/checkout'
      ? new Promise<Response>((done) => {
          resolve = done;
        })
      : baseFetch(url)
  );
  const { rerender } = render(<CartPage />, { wrapper: Wrapper });
  await waitFor(() => expect(screen.getByText('Checkout')).not.toBeDisabled(), { timeout: 2500 });
  fireEvent.click(screen.getByText('Checkout'));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/checkout',
      expect.objectContaining({ method: 'POST' })
    )
  );
  switchToB();
  rerender(<CartPage />);
  await act(async () => {
    resolve(Response.json({ paid: true, orderId: 'order-a' }));
  });
  await waitFor(() => expect(screen.getByTestId('delivery-email')).toHaveTextContent(B));
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.toast.success).not.toHaveBeenCalled();
  expect(mocks.toast.error).not.toHaveBeenCalled();
  expect(screen.getByTestId('cart-items')).toHaveTextContent('Meal:2');
});
