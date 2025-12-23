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
  const subtotal = cartProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
      <h2 className='text-lg font-semibold mb-4'>Order Items</h2>
      <div className='overflow-x-auto'>
        <table className='min-w-full'>
          <thead className='bg-gray-50 border-b border-gray-200'>
            <tr>
              <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>
                Product Name
              </th>
              <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>
                Size
              </th>
              <th className='px-4 py-2 text-center text-sm font-semibold text-gray-600'>
                Quantity
              </th>
              <th className='px-4 py-2 text-right text-sm font-semibold text-gray-600'>
                Price
              </th>
              <th className='px-4 py-2 text-right text-sm font-semibold text-gray-600'>
                Total
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {cartProducts.map((product, index) => (
              <tr key={index} className='hover:bg-gray-50'>
                <td className='px-4 py-3 text-gray-900 font-medium'>
                  {product.name}
                </td>
                <td className='px-4 py-3 text-gray-700 capitalize'>
                  {product.size}
                </td>
                <td className='px-4 py-3 text-center text-gray-700'>
                  {product.quantity}
                </td>
                <td className='px-4 py-3 text-right text-gray-700'>
                  ${product.price.toFixed(2)}
                </td>
                <td className='px-4 py-3 text-right font-semibold text-gray-900'>
                  ${(product.price * product.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='mt-6 space-y-2 border-t border-gray-200 pt-4'>
        <div className='flex justify-between text-gray-700'>
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className='flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200'>
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderItemsCard;
