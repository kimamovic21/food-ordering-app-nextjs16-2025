import Image from 'next/image'
import Pizza from '@/public/pizza.png';

const MenuItem = () => {
  return (
    <div className='bg-gray-200 p-4 rounded-lg text-center group hover:bg-gray-100 transition-all hover:shadow-md hover:shadow-black/20'>
      <div className='text-center'>
        <Image
          src={Pizza}
          alt='Pepperoni Pizza'
          width={140}
          height={140}
          className='mx-auto'
        />
      </div>

      <h4 className='font-semibold my-4 text-xl'>
        Pepperoni Pizza
      </h4>

      <p className='mt-4 text-gray-600 text-sm'>
        Classic pizza topped with spicy pepperoni and mozzarella cheese.
      </p>

      <button className='mt-4 bg-primary text-white rounded-full px-8 py-2'>
        Add to cart
      </button>
    </div>
  );
};

export default MenuItem;