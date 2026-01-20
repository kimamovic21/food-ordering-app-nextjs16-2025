import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type DeliveryFeeBreakdown = {
  baseFee?: number;
  altitudeAdjustment?: number;
  weatherAdjustment?: number;
  totalAdjustment?: number;
};

type OrderInfoCardProps = {
  orderId: string;
  paymentStatus: boolean;
  orderStatus: 'placed' | 'processing' | 'ready' | 'transportation' | 'completed';
  createdAt: string;
  deliveryFee?: number;
  deliveryFeeBreakdown?: DeliveryFeeBreakdown;
};

const OrderInfoCard = ({
  orderId,
  paymentStatus,
  orderStatus,
  createdAt,
  deliveryFee,
  deliveryFeeBreakdown,
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
    <Card className='p-6 bg-card text-card-foreground border border-border shadow-sm'>
      <h2 className='text-lg font-semibold mb-4'>Order Information</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <p className='text-sm text-muted-foreground'>Order ID</p>
          <p className='font-semibold break-all text-xs sm:text-sm' title={orderId}>
            {orderId}
          </p>
        </div>
        <div className='md:col-span-2'>
          <p className='text-sm text-muted-foreground'>Order Date</p>
          <p
            className='font-semibold whitespace-nowrap text-sm md:text-base'
            title={formatDate(createdAt)}
          >
            {formatDate(createdAt)}
          </p>
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
          <p className='text-sm text-muted-foreground'>Payment Status</p>
          <Badge
            variant={paymentStatus ? 'secondary' : 'destructive'}
            className={paymentStatus ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}
          >
            {paymentStatus ? 'Paid' : 'Unpaid'}
          </Badge>
        </div>

        {/* Delivery Fee Details */}
        {deliveryFee !== undefined && (
          <div className='md:col-span-2 border-t pt-4'>
            <p className='text-sm text-muted-foreground mb-2 font-semibold'>Delivery Fee Details</p>
            <div className='space-y-1 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Base Fee:</span>
                <span className='font-semibold text-foreground'>
                  ${(deliveryFeeBreakdown?.baseFee || 5).toFixed(2)}
                </span>
              </div>
              {deliveryFeeBreakdown?.altitudeAdjustment ? (
                <div className='flex justify-between text-xs pl-2'>
                  <span className='text-muted-foreground'>+ Altitude:</span>
                  <span className='text-foreground'>
                    ${deliveryFeeBreakdown.altitudeAdjustment.toFixed(2)}
                  </span>
                </div>
              ) : null}
              {deliveryFeeBreakdown?.weatherAdjustment ? (
                <div className='flex justify-between text-xs pl-2'>
                  <span className='text-muted-foreground'>+ Weather:</span>
                  <span className='text-foreground'>
                    ${deliveryFeeBreakdown.weatherAdjustment.toFixed(2)}
                  </span>
                </div>
              ) : null}
              <div className='flex justify-between border-t pt-1 font-semibold'>
                <span className='text-foreground'>Total:</span>
                <span className='text-foreground'>${deliveryFee.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default OrderInfoCard;
