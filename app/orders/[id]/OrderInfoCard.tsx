type OrderInfoCardProps = {
  orderId: string;
  paid: boolean;
  createdAt: string;
  updatedAt: string;
  stripeSessionId?: string;
};

const OrderInfoCard = ({
  orderId,
  paid,
  createdAt,
  updatedAt,
  stripeSessionId,
}: OrderInfoCardProps) => {
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

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
      <h2 className='text-lg font-semibold mb-4'>Order Information</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <p className='text-sm text-gray-600'>Order ID</p>
          <p className='font-semibold text-gray-900'>{orderId}</p>
        </div>
        <div>
          <p className='text-sm text-gray-600'>Status</p>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${paid
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}
          >
            {paid ? 'Paid' : 'Unpaid'}
          </span>
        </div>
        <div>
          <p className='text-sm text-gray-600'>Order Date</p>
          <p className='font-semibold text-gray-900'>
            {formatDate(createdAt)}
          </p>
        </div>
        <div>
          <p className='text-sm text-gray-600'>Last Updated</p>
          <p className='font-semibold text-gray-900'>
            {formatDate(updatedAt)}
          </p>
        </div>
        {stripeSessionId && (
          <div className='md:col-span-2'>
            <p className='text-sm text-gray-600'>Stripe Session ID</p>
            <p className='font-mono text-sm text-gray-900 break-all'>
              {stripeSessionId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderInfoCard;
