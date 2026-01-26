import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      <Skeleton className='h-6 w-64 mb-6' />

      <div className='mb-6'>
        <Skeleton className='h-10 w-48 mb-2' />
        <Skeleton className='h-5 w-32' />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className='h-6 w-40' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <Skeleton className='h-16 w-full' />
              <Skeleton className='h-16 w-full' />
              <Skeleton className='h-16 w-full' />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='mt-6'>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
        </CardHeader>
        <CardContent className='space-y-4'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='flex items-center gap-4 p-4 border rounded-lg'>
              <Skeleton className='h-20 w-20 rounded-md' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-5 w-32' />
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-4 w-24' />
              </div>
              <div className='space-y-2'>
                <Skeleton className='h-5 w-16' />
                <Skeleton className='h-4 w-20' />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
