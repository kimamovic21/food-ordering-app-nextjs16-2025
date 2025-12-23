'use client';

import { useState } from 'react';
import Link from 'next/link';

type OrderType = {
  _id: string;
  email: string;
  total: number;
  paid: boolean;
  createdAt: string;
};

type MyOrdersTableProps = {
  orders: OrderType[];
  loading: boolean;
};

const MyOrdersTable = ({ orders, loading }: MyOrdersTableProps) => {
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFinishPayment = async (orderId: string) => {
    try {
      setProcessingPayment(orderId);
      const res = await fetch(`/api/payment-link?orderId=${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to get payment link');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Payment link not available');
      }
    } catch (error) {
      console.error('Error fetching payment link:', error);
      alert('Failed to get payment link');
    } finally {
      setProcessingPayment(null);
    }
  };

  if (loading) {
    return <p>Loading orders...</p>;
  }

  if (orders.length === 0) {
    return <p>No orders found.</p>;
  }

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead className='bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600'>
            <tr>
              <th className='p-3'>Order ID</th>
              <th className='p-3'>Date</th>
              <th className='p-3'>Email</th>
              <th className='p-3'>Total</th>
              <th className='p-3'>Status</th>
              <th className='p-3'>Action</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {orders.map((order) => (
              <tr key={order._id} className='hover:bg-gray-50'>
                <td className='p-3 font-semibold text-gray-900 text-xs'>
                  {order._id.substring(0, 8)}...
                </td>
                <td className='p-3 text-gray-700'>
                  {formatDate(order.createdAt)}
                </td>
                <td className='p-3 text-gray-700'>{order.email}</td>
                <td className='p-3 font-semibold text-gray-900'>
                  ${order.total.toFixed(2)}
                </td>
                <td className='p-3'>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${order.paid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {order.paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td className='p-3'>
                  <div className='flex gap-2'>
                    <Link
                      href={`/my-orders/${order._id}`}
                      className='px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition'
                    >
                      View
                    </Link>
                    {!order.paid && (
                      <button
                        onClick={() => handleFinishPayment(order._id)}
                        disabled={processingPayment === order._id}
                        className='px-4 py-2 text-sm font-medium rounded-lg border-primary bg-primary text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
                      >
                        {processingPayment === order._id ? 'Loading...' : 'Finish Payment'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyOrdersTable;
