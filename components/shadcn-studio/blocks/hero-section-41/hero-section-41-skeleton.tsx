import { Skeleton } from '@/components/ui/skeleton';

const HeroSectionSkeleton = () => {
  return (
    <section className='flex-1 py-12 sm:py-16 lg:py-24'>
      <div className='mx-auto flex h-full max-w-7xl flex-col gap-16 px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-6 gap-y-12 md:gap-y-16 lg:grid-cols-5'>
          <div className='flex w-full flex-col justify-center gap-5 max-lg:items-center lg:col-span-3 lg:h-95.5'>
            <Skeleton className='h-20 w-[520px] max-lg:mx-auto' />
            <Skeleton className='h-8 w-[380px] max-lg:mx-auto' />
            <Skeleton className='h-12 w-48 rounded-full max-lg:mx-auto' />
          </div>
          <div className='w-full lg:col-span-2 flex items-center justify-center'>
            <Skeleton className='size-80 rounded-xl shadow-lg' />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSectionSkeleton;
