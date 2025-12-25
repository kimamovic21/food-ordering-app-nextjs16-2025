import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type OrderType = {
  _id: string;
  email: string;
  total: number;
  paid: boolean;
  createdAt: string;
};

type OrdersTableProps = {
  orders: OrderType[];
  loading: boolean;
};

const OrdersTable = ({ orders, loading }: OrdersTableProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Table className='w-full min-w-[900px] table-fixed'>
          <TableHeader className='bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600'>
            <TableRow>
              <TableHead className='p-3 w-32'>Order ID</TableHead>
              <TableHead className='p-3 w-52'>Date</TableHead>
              <TableHead className='p-3 w-64'>Email</TableHead>
              <TableHead className='p-3 w-32'>Total</TableHead>
              <TableHead className='p-3 w-32'>Status</TableHead>
              <TableHead className='p-3 w-32'>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='divide-y divide-gray-100'>
            {orders.map((order) => (
              <TableRow key={order._id} className='hover:bg-gray-50'>
                <TableCell className='p-3 font-semibold text-gray-900 text-xs'>
                  {order._id.substring(0, 8)}...
                </TableCell>
                <TableCell className='p-3 text-gray-700'>
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell className='p-3 text-gray-700'>{order.email}</TableCell>
                <TableCell className='p-3 font-semibold text-gray-900'>
                  ${order.total.toFixed(2)}
                </TableCell>
                <TableCell className='p-3'>
                  <Badge
                    variant={order.paid ? 'default' : 'destructive'}
                    className={order.paid ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                  >
                    {order.paid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </TableCell>
                <TableCell className='p-3'>
                  <Link href={`/orders/${order._id}`}>
                    <Button size='sm' variant='default'>
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrdersTable;