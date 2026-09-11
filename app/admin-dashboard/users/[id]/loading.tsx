import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const UserLoading = () => {
  return (
    <div className='max-w-7xl mx-auto px-4 py-6'>
      <Breadcrumb className='mb-6'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Skeleton className='h-4 w-12' />
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <Skeleton className='h-4 w-2' />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <Skeleton className='h-4 w-24' />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='flex flex-col gap-6'>
        <div className='max-w-6xl mx-auto w-full space-y-6'>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700'>
                <Skeleton className='size-20 rounded-full' />
                <div className='space-y-2'>
                  <Skeleton className='h-8 w-40' />
                  <div className='flex gap-2'>
                    <Skeleton className='h-6 w-20 rounded-full' />
                    <Skeleton className='h-6 w-28 rounded-full' />
                  </div>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-4'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className='rounded-lg border border-border bg-muted/30 p-4 space-y-3'
                  >
                    <Skeleton className='h-3 w-24' />
                    <Skeleton className='h-6 w-16' />
                  </div>
                ))}
              </div>

              <div className='space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700'>
                <div className='space-y-2'>
                  <Skeleton className='h-6 w-36' />
                  <Skeleton className='h-4 w-72 max-w-full' />
                </div>
                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className='space-y-2'>
                      <Skeleton className='h-4 w-28' />
                      <Skeleton className='h-5 w-24' />
                    </div>
                  ))}
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className={index === 0 || index === 7 ? 'md:col-span-2' : ''}>
                    <Skeleton className='h-4 w-28 mb-2' />
                    <Skeleton className='h-5 w-full' />
                  </div>
                ))}
              </div>

              <div className='grid gap-4 border-t border-gray-200 pt-6 dark:border-gray-700 md:grid-cols-2'>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className={index === 2 ? 'md:col-span-2' : ''}>
                    <Skeleton className='h-4 w-36 mb-2' />
                    <Skeleton className='h-5 w-full' />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-20' />
            </CardHeader>
            <CardContent className='min-h-80'>
              <Skeleton className='h-80 rounded-lg w-full' />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserLoading;
