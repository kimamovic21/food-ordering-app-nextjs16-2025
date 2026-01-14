import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type OrderInfoCardProps = {
  orderId: string;
  paymentStatus: boolean;
  orderStatus: 'pending' | 'processing' | 'completed';
  createdAt: string;
  updatedAt: string;
  stripeSessionId?: string;
};

const OrderInfoCard = ({
  orderId,
  paymentStatus,
  orderStatus,
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
    <Card>
      <CardHeader>
        <CardTitle>Order Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <p className='text-sm text-muted-foreground'>Order ID</p>
            <p className='font-semibold text-foreground'>{orderId}</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground'>Payment Status</p>
            <Badge
              variant={paymentStatus ? 'default' : 'destructive'}
              className={paymentStatus ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
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
            <p className='font-semibold text-foreground'>{formatDate(createdAt)}</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground'>Last Updated</p>
            <p className='font-semibold text-foreground'>{formatDate(updatedAt)}</p>
          </div>
          {stripeSessionId && (
            <div className='md:col-span-2'>
              <p className='text-sm text-muted-foreground'>Stripe Session ID</p>
              <p className='font-mono text-sm text-foreground break-all'>{stripeSessionId}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderInfoCard;
