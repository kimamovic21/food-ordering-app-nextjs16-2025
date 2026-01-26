'use client';

import { useSearchParams } from 'next/navigation';

export default function CheckoutStatusPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  return (
    <div className='flex flex-col items-center justify-center min-h-screen'>
      <h1 className='text-2xl font-bold mb-4'>Payment Status</h1>
      {status === 'success' ? (
        <div className='text-green-600 text-lg font-semibold'>
          Payment successful! Thank you for your order.
        </div>
      ) : (
        <div className='text-red-600 text-lg font-semibold'>
          Payment failed or cancelled. Please try again.
        </div>
      )}
    </div>
  );
}
