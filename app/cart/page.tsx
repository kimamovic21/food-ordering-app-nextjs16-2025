'use client';

import { CiTrash } from 'react-icons/ci';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import Pizza from '@/public/pizza.png';

const CartPage = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    getTotalPrice,
    clearCart
  } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className='text-center py-16'>
        <h2 className='text-4xl font-bold text-gray-700 mb-4'>
          Your Cart is Empty
        </h2>

        <p className='text-gray-500 mb-8'>
          Add some delicious items to your cart!
        </p>

        <Link
          href='/menu'
          className='bg-primary text-white px-8 py-3 rounded-full hover:bg-orange-700 inline-block'
        >
          Browse Menu
        </Link>
      </div>
    );
  };

  return (
    <div className='max-w-3xl mx-auto py-4 sm:py-8 px-2 sm:px-4'>
      <div className='flex justify-between items-center mb-6 sm:mb-8'>
        <h2 className='text-2xl sm:text-3xl md:text-4xl font-bold text-gray-700'>
          Shopping Cart
        </h2>
      </div>

      <div className='space-y-4 mb-6 sm:mb-8'>
        {cartItems.map((item) => {
          const imageUrl = item.image || Pizza.src;
          const isRemoteImage = typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.includes('cloudinary'));

          return (
            <div
              key={`${item._id}-${item.size}`}
              className='bg-white rounded-lg shadow-md p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'
            >
              <div className='flex items-start gap-3 w-full sm:w-auto'>
                <div className='w-16 h-16 sm:w-20 sm:h-20 shrink-0'>
                  {isRemoteImage ? (
                    <img
                      src={imageUrl}
                      alt={item.name}
                      className='w-full h-full object-contain rounded'
                    />
                  ) : (
                    <Image
                      src={imageUrl}
                      alt={item.name}
                      width={80}
                      height={80}
                      className='w-full h-full object-contain rounded'
                    />
                  )}
                </div>

                <div className='grow min-w-0'>
                  <h3 className='text-base sm:text-lg font-semibold text-gray-800 truncate'>
                    {item.name}
                  </h3>
                  <p className='text-xs sm:text-sm text-gray-500 capitalize'>
                    Size: {item.size}
                  </p>
                  <p className='text-xs sm:text-sm font-semibold text-primary mt-1'>
                    ${item.price.toFixed(2)} each
                  </p>
                </div>
              </div>

              <div className='flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-4'>
                <div className='flex items-center gap-2 sm:gap-3'>
                  <button
                    onClick={() => updateQuantity(item._id, item.size, item.quantity - 1)}
                    className='bg-gray-200 hover:bg-gray-300 rounded-full p-1.5 sm:p-2 transition'
                    aria-label='Decrease quantity'
                  >
                    <FaMinus size={10} className='text-gray-700' />
                  </button>

                  <span className='font-semibold text-base sm:text-lg w-6 sm:w-8 text-center'>
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => updateQuantity(item._id, item.size, item.quantity + 1)}
                    className='bg-gray-200 hover:bg-gray-300 rounded-full p-1.5 sm:p-2 transition'
                    aria-label='Increase quantity'
                  >
                    <FaPlus size={10} className='text-gray-700' />
                  </button>
                </div>

                <div className='flex items-center gap-3'>
                  <div className='text-right'>
                    <p className='font-bold text-base sm:text-lg text-gray-800 whitespace-nowrap'>
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFromCart(item._id, item.size)}
                    className='text-red-600 hover:text-red-800 transition p-1 sm:p-2'
                    aria-label='Remove item'
                  >
                    <CiTrash size={20} className='sm:w-6 sm:h-6' />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={clearCart}
        className='text-red-600 hover:text-red-800 text-xs sm:text-sm font-semibold flex items-center gap-1 mb-4'
      >
        <CiTrash size={18} className='sm:w-5 sm:h-5' />
        Clear Cart
      </button>

      <div className='mt-4 sm:mt-6 bg-gray-100 rounded-lg p-4 sm:p-6 space-y-2 sm:space-y-3'>
        <div className='flex justify-between text-gray-700 text-sm sm:text-base'>
          <span className='font-semibold'>Subtotal:</span>
          <span>${getTotalPrice().toFixed(2)}</span>
        </div>
        <div className='flex justify-between text-gray-700 text-sm sm:text-base'>
          <span className='font-semibold'>Tax (10%):</span>
          <span>${(getTotalPrice() * 0.1).toFixed(2)}</span>
        </div>
        <div className='flex justify-between text-gray-700 text-sm sm:text-base'>
          <span className='font-semibold'>Delivery Fee:</span>
          <span>$5.00</span>
        </div>
        <div className='border-t border-gray-300 pt-2 sm:pt-3 mt-2 sm:mt-3'>
          <div className='flex justify-between text-lg sm:text-xl font-bold text-gray-900'>
            <span>Total:</span>
            <span>${(getTotalPrice() * 1.1 + 5).toFixed(2)}</span>
          </div>
        </div>

        <button className='w-full bg-primary text-white py-2.5 sm:py-3 rounded-full font-semibold text-base sm:text-lg hover:bg-orange-700 transition mt-3 sm:mt-4'>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
};

export default CartPage;
