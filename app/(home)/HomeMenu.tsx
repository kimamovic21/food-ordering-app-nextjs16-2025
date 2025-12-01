import Image from 'next/image';
import SaladImage1 from '@/public/salad1.png';
import SaladImage2 from '@/public/salad2.png';
import MenuItem from './MenuItem';

const HomeMenu = () => {
  return (
    <section className='my-16'>
      <div className='absolute left-0 right-0 w-full'>
        <div className='absolute left-0 -top-16 text-left -z-10'>
          <Image
            src={SaladImage1}
            width={109}
            height={189}
            alt={'salad 1'}
          />
        </div>

        <div className='absolute -top-24 right-0 -z-10'>
          <Image
            src={SaladImage2}
            width={107}
            height={195}
            alt={'salad 2'}
          />
        </div>
      </div>

      <div className='text-center mb-4'>
        <h3 className='uppercase text-gray-500 font-semibold leading-3'>
          Check out
        </h3>

        <h2 className='text-primary font-bold text-4xl italic'>
          Menu
        </h2>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <MenuItem />
        <MenuItem />
        <MenuItem />
        <MenuItem />
        <MenuItem />
        <MenuItem />
      </div>
    </section>
  );
};

export default HomeMenu;