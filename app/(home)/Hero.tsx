import { FaArrowCircleRight } from 'react-icons/fa';
import Image from 'next/image';
import Pizza from '@/public/pizza.png';

const Hero = () => {
  return (
    <section className='mt-4 block md:grid md:grid-cols-[0.4fr_0.6fr]'>
      <div className='py-12'>
        <h1 className='text-4xl font-bold leading-12'>
          <span>Everything</span>
          <br />
          <span>is better with a</span>
          <br />
          <span className='text-primary'>Pizza</span>
        </h1>

        <p className='my-6 text-gray-500'>
          Pizza is the missing piece that makes every day complete
        </p>

        <div className='flex gap-4'>
          <button className='uppercase flex gap-2 items-center font-semibold bg-primary text-white px-4 py-2 rounded-full cursor-pointer hover:bg-orange-700'>
            Order now <FaArrowCircleRight />
          </button>

          <button className='flex gap-2 items-center px-4 py-2 text-gray-600 font-semibold bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200'>
            Learn more <FaArrowCircleRight />
          </button>
        </div>
      </div>

      <div className='relative'>
        <Image
          src={Pizza}
          alt='Pizza Cover'
          layout='fill'
          objectFit='contain'
        />
      </div>
    </section>
  );
};

export default Hero;