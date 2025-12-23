'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UserTabs from '@/components/shared/UserTabs';
import useProfile from '@/contexts/UseProfile';
import Link from 'next/link';

type CartProduct = {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
};

type OrderDetailsType = {
  _id: string;
  userId: string;
  email: string;
  phone: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  cartProducts: CartProduct[];
  total: number;
  paid: boolean;
  createdAt: string;
  updatedAt: string;
  stripeSessionId?: string;
};

const OrderDetailPage = () => {
  const [order, setOrder] = useState<OrderDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: profileData, loading: profileLoading } = useProfile();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  useEffect(() => {
    if (profileLoading || !profileData?.admin) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders?id=${orderId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch order');
        }
        const json = await res.json();
        setOrder(json.order);
      } catch (err) {
        console.error('Failed to load order', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, profileData?.admin, profileLoading]);

  if (profileLoading) return 'Loading user info...';
  if (!profileData?.admin) return 'Not an admin';

  if (loading) return <div className='mt-8'>Loading order details...</div>;

  if (error) return <div className='mt-8 text-red-600'>{error}</div>;

  if (!order) return <div className='mt-8'>Order not found</div>;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const subtotal = order.cartProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <section className='mt-8'>
      <UserTabs isAdmin={true} />

      <div className='mt-8 max-w-4xl mx-auto'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-3xl font-bold'>Order Details</h1>
          <Link
            href='/orders'
            className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium'
          >
            ← Back
          </Link>
        </div>

        <div className='space-y-6'>
          <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
            <h2 className='text-lg font-semibold mb-4'>Order Information</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <p className='text-sm text-gray-600'>Order ID</p>
                <p className='font-semibold text-gray-900'>{order._id}</p>
              </div>
              <div>
                <p className='text-sm text-gray-600'>Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${order.paid
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}
                >
                  {order.paid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
              <div>
                <p className='text-sm text-gray-600'>Order Date</p>
                <p className='font-semibold text-gray-900'>
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-600'>Last Updated</p>
                <p className='font-semibold text-gray-900'>
                  {formatDate(order.updatedAt)}
                </p>
              </div>
              {order.stripeSessionId && (
                <div className='md:col-span-2'>
                  <p className='text-sm text-gray-600'>Stripe Session ID</p>
                  <p className='font-mono text-sm text-gray-900 break-all'>
                    {order.stripeSessionId}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
            <h2 className='text-lg font-semibold mb-4'>Customer Information</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <p className='text-sm text-gray-600'>Email</p>
                <p className='font-semibold text-gray-900'>{order.email}</p>
              </div>
              <div>
                <p className='text-sm text-gray-600'>Phone</p>
                <p className='font-semibold text-gray-900'>{order.phone}</p>
              </div>
              <div>
                <p className='text-sm text-gray-600'>Street Address</p>
                <p className='font-semibold text-gray-900'>
                  {order.streetAddress}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-600'>Postal Code</p>
                <p className='font-semibold text-gray-900'>{order.postalCode}</p>
              </div>
              <div>
                <p className='text-sm text-gray-600'>City</p>
                <p className='font-semibold text-gray-900'>{order.city}</p>
              </div>
              <div>
                <p className='text-sm text-gray-600'>Country</p>
                <p className='font-semibold text-gray-900'>{order.country}</p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
            <h2 className='text-lg font-semibold mb-4'>Order Items</h2>
            <div className='overflow-x-auto'>
              <table className='min-w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>
                      Product Name
                    </th>
                    <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>
                      Size
                    </th>
                    <th className='px-4 py-2 text-center text-sm font-semibold text-gray-600'>
                      Quantity
                    </th>
                    <th className='px-4 py-2 text-right text-sm font-semibold text-gray-600'>
                      Price
                    </th>
                    <th className='px-4 py-2 text-right text-sm font-semibold text-gray-600'>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {order.cartProducts.map((product, index) => (
                    <tr key={index} className='hover:bg-gray-50'>
                      <td className='px-4 py-3 text-gray-900 font-medium'>
                        {product.name}
                      </td>
                      <td className='px-4 py-3 text-gray-700 capitalize'>
                        {product.size}
                      </td>
                      <td className='px-4 py-3 text-center text-gray-700'>
                        {product.quantity}
                      </td>
                      <td className='px-4 py-3 text-right text-gray-700'>
                        ${product.price.toFixed(2)}
                      </td>
                      <td className='px-4 py-3 text-right font-semibold text-gray-900'>
                        ${(product.price * product.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='mt-6 space-y-2 border-t border-gray-200 pt-4'>
              <div className='flex justify-between text-gray-700'>
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className='flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200'>
                <span>Total:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderDetailPage;