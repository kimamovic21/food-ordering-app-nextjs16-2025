import { Card } from '@/components/ui/card';

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
    <Card className='p-6 bg-card text-card-foreground border border-border shadow-sm'>
      <h2 className='text-lg font-semibold mb-4'>Delivery Information</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <p className='text-sm text-muted-foreground'>Email</p>
          <p className='font-semibold break-all'>{email}</p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Phone</p>
          <p className='font-semibold'>{phone || 'Not provided'}</p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Street Address</p>
          <p className='font-semibold'>{streetAddress || 'Not provided'}</p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Postal Code</p>
          <p className='font-semibold'>{postalCode || 'Not provided'}</p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>City</p>
          <p className='font-semibold'>{city || 'Not provided'}</p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Country</p>
          <p className='font-semibold'>{country || 'Not provided'}</p>
        </div>
      </div>
    </Card>
  );
};

export default CustomerInfoCard;
