import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type OrderInfoCardProps = {
  orderId: string;
  paid: boolean;
  createdAt: string;
};

const OrderInfoCard = ({ orderId, paid, createdAt }: OrderInfoCardProps) => {
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
          <p className='text-sm text-muted-foreground'>Status</p>
          <Badge
            variant={paid ? 'secondary' : 'destructive'}
            className={paid ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}
          >
            {paid ? 'Paid' : 'Unpaid'}
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
