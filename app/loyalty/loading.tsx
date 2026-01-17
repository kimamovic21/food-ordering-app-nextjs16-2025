import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LoyaltyLoading() {
  return (
    <section className='max-w-4xl mx-auto px-4 py-8'>
      <div className='mb-8'>
        <Skeleton className='h-10 w-64 mb-2' />
        <Skeleton className='h-5 w-96' />
      </div>

      {/* Current Status Card */}
      <Card className='mb-6 border-2'>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Skeleton className='h-4 w-24 mb-2' />
                <Skeleton className='h-8 w-32' />
              </div>
              <div className='text-right'>
                <Skeleton className='h-4 w-16 mb-2' />
                <Skeleton className='h-10 w-16' />
              </div>
            </div>
            <Skeleton className='h-4 w-48' />
            <Skeleton className='h-24 w-full' />
          </div>
        </CardContent>
      </Card>

      {/* All Tiers */}
      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-40 mb-2' />
          <Skeleton className='h-4 w-64' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className='h-20 w-full' />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
