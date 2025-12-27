import { Card } from '@/components/ui/card';

type CartProduct = {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
};

type OrderItemsCardProps = {
  cartProducts: CartProduct[];
  total: number;
};

const OrderItemsCard = ({ cartProducts, total }: OrderItemsCardProps) => {
  const subtotal = cartProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Card className='p-6 bg-card text-card-foreground border border-border shadow-sm'>
      <h2 className='text-lg font-semibold mb-4'>Order Items</h2>
      <div className='overflow-x-auto'>
        <table className='min-w-full'>
          <thead className='bg-muted border-b border-border'>
            <tr>
              <th className='px-4 py-2 text-left text-sm font-semibold text-muted-foreground'>
                Product Name
              </th>
              <th className='px-4 py-2 text-left text-sm font-semibold text-muted-foreground'>
                Size
              </th>
              <th className='px-4 py-2 text-center text-sm font-semibold text-muted-foreground'>
                Quantity
              </th>
              <th className='px-4 py-2 text-right text-sm font-semibold text-muted-foreground'>
                Price
              </th>
              <th className='px-4 py-2 text-right text-sm font-semibold text-muted-foreground'>
                Total
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {cartProducts.map((product, index) => (
              <tr key={index} className='hover:bg-muted/50'>
                <td className='px-4 py-3 font-medium'>{product.name}</td>
                <td className='px-4 py-3 text-muted-foreground capitalize'>{product.size}</td>
                <td className='px-4 py-3 text-center text-muted-foreground'>{product.quantity}</td>
                <td className='px-4 py-3 text-right text-muted-foreground'>
                  ${product.price.toFixed(2)}
                </td>
                <td className='px-4 py-3 text-right font-semibold'>
                  ${(product.price * product.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='mt-6 space-y-2 border-t border-border pt-4'>
        <div className='flex justify-between text-muted-foreground'>
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className='flex justify-between text-lg font-semibold pt-2 border-t border-border'>
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  );
};

export default OrderItemsCard;
