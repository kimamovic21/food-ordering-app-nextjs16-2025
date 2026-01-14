import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type OrderInfoCardProps = {
  orderId: string;
  paymentStatus: boolean;
  orderStatus: 'pending' | 'processing' | 'completed';
  createdAt: string;
};

const OrderInfoCard = ({ orderId, paymentStatus, orderStatus, createdAt }: OrderInfoCardProps) => {
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
    <Card className='p-6 bg-card text-card-foreground border border-border shadow-sm'>
      <h2 className='text-lg font-semibold mb-4'>Order Information</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <p className='text-sm text-muted-foreground'>Order ID</p>
          <p className='font-semibold break-all'>{orderId}</p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Payment Status</p>
          <Badge
            variant={paymentStatus ? 'secondary' : 'destructive'}
            className={paymentStatus ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}
          >
            {paymentStatus ? 'Paid' : 'Unpaid'}
          </Badge>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Order Status</p>
          <Badge
            variant='secondary'
            className={
              orderStatus === 'completed'
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 capitalize'
                : orderStatus === 'processing'
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 capitalize'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-100 capitalize'
            }
          >
            {orderStatus}
          </Badge>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Order Date</p>
          <p className='font-semibold'>{formatDate(createdAt)}</p>
        </div>
      </div>
    </Card>
  );
};

export default OrderInfoCard;
