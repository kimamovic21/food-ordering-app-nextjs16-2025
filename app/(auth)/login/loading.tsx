import { Skeleton } from '@/components/ui/skeleton';

const LoginLoading = () => {
  return (
    <section className='mt-8 w-full sm:w-xl md:w-2xl lg:w-3xl max-w-3xl mx-auto px-4'>
      <div className='text-center mb-8'>
        <Skeleton className='h-10 w-40 mx-auto' />
      </div>

      <div className='w-full max-w-3xl mx-auto space-y-6'>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-9 w-full' />
          </div>

          <div className='space-y-2'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-9 w-full' />
          </div>

          <Skeleton className='h-10 w-full' />
        </div>

        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t border-border' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <Skeleton className='h-4 w-32 bg-background' />
          </div>
        </div>

        <div className='flex justify-center'>
          <Skeleton className='h-10 w-60' />
        </div>

        <div className='text-center pt-4 border-t border-border'>
          <Skeleton className='h-4 w-56 mx-auto' />
        </div>
      </div>
    </section>
  );
};

export default LoginLoading;
