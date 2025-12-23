type CustomerInfoCardProps = {
  email: string;
  phone: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
};

const CustomerInfoCard = ({
  email,
  phone,
  streetAddress,
  postalCode,
  city,
  country,
}: CustomerInfoCardProps) => {
  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
      <h2 className='text-lg font-semibold mb-4'>Customer Information</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <p className='text-sm text-gray-600'>Email</p>
          <p className='font-semibold text-gray-900'>{email}</p>
        </div>
        <div>
          <p className='text-sm text-gray-600'>Phone</p>
          <p className='font-semibold text-gray-900'>{phone}</p>
        </div>
        <div>
          <p className='text-sm text-gray-600'>Street Address</p>
          <p className='font-semibold text-gray-900'>{streetAddress}</p>
        </div>
        <div>
          <p className='text-sm text-gray-600'>Postal Code</p>
          <p className='font-semibold text-gray-900'>{postalCode}</p>
        </div>
        <div>
          <p className='text-sm text-gray-600'>City</p>
          <p className='font-semibold text-gray-900'>{city}</p>
        </div>
        <div>
          <p className='text-sm text-gray-600'>Country</p>
          <p className='font-semibold text-gray-900'>{country}</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoCard;
