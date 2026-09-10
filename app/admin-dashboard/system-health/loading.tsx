import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/libs/utils';

const SummaryCardSkeleton = ({
  titleWidth,
  valueWidth,
  descriptionWidth,
}: {
  titleWidth: string;
  valueWidth: string;
  descriptionWidth: string;
}) => (
  <Card className='min-h-[140px]'>
    <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0 pb-2'>
      <Skeleton className={cn('h-4', titleWidth)} />
      <Skeleton className='size-9 rounded-lg' />
    </CardHeader>
    <CardContent className='pt-6'>
      <Skeleton className={cn('h-7', valueWidth)} />
      <Skeleton className={cn('mt-3 h-3', descriptionWidth)} />
    </CardContent>
  </Card>
);

const runtimeWidths = [
  ['w-28', 'w-24'],
  ['w-32', 'w-16'],
  ['w-16', 'w-16'],
  ['w-24', 'w-40'],
  ['w-24', 'w-40'],
  ['w-20', 'w-16'],
  ['w-20', 'w-28'],
  ['w-20', 'w-20'],
] as const;

const RuntimeSnapshotSkeleton = () => (
  <Card className='border-amber-900/40 bg-amber-950/10'>
    <CardHeader>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-2'>
          <Skeleton className='h-5 w-40' />
          <Skeleton className='h-4 w-[340px] max-w-full' />
        </div>
        <Skeleton className='size-5 shrink-0 rounded-md' />
      </div>
    </CardHeader>
    <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      {runtimeWidths.map(([labelWidth, valueWidth], index) => (
        <div key={index} className='rounded-lg border border-border bg-background/60 p-3'>
          <Skeleton className={cn('h-3', labelWidth)} />
          <Skeleton className={cn('mt-2 h-4', valueWidth)} />
        </div>
      ))}
    </CardContent>
  </Card>
);

const HealthGroupSkeleton = ({
  rows = 3,
  titleWidth = 'w-32',
  descriptionWidth = 'w-36',
}: {
  rows?: number;
  titleWidth?: string;
  descriptionWidth?: string;
}) => (
  <Card className='overflow-hidden'>
    <CardHeader>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-2'>
          <Skeleton className={cn('h-5', titleWidth)} />
          <Skeleton className={cn('h-4', descriptionWidth)} />
        </div>
        <Skeleton className='size-5 shrink-0 rounded-md' />
      </div>
    </CardHeader>
    <CardContent>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className='flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between'
        >
          <div className='min-w-0 flex-1 space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <Skeleton className='size-4 rounded-full' />
              <Skeleton className={cn('h-4', index % 2 === 0 ? 'w-40' : 'w-32')} />
              <Skeleton className='h-5 w-20 rounded-full' />
              <Skeleton className='h-5 w-24 rounded-full' />
            </div>
            <Skeleton className={cn('h-4', index % 2 === 0 ? 'w-full max-w-md' : 'w-4/5')} />
            <Skeleton className={cn('h-4', index % 2 === 0 ? 'w-48' : 'w-60')} />
          </div>
          <div className='flex min-w-0 flex-wrap gap-2 sm:max-w-xs sm:justify-end'>
            <Skeleton className={cn('h-5 rounded-full', index % 2 === 0 ? 'w-28' : 'w-24')} />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

const SystemHealthLoading = () => {
  return (
    <section className='space-y-6 pb-10'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div className='w-full max-w-3xl space-y-2'>
          <Skeleton className='h-8 w-56' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-3/4' />
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <Skeleton className='h-7 w-28 rounded-full' />
          <Skeleton className='h-9 w-24 rounded-md' />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <SummaryCardSkeleton titleWidth='w-28' valueWidth='w-32' descriptionWidth='w-36' />
        <SummaryCardSkeleton titleWidth='w-28' valueWidth='w-10' descriptionWidth='w-32' />
        <SummaryCardSkeleton titleWidth='w-20' valueWidth='w-8' descriptionWidth='w-44' />
        <SummaryCardSkeleton titleWidth='w-28' valueWidth='w-8' descriptionWidth='w-48' />
      </div>

      <RuntimeSnapshotSkeleton />

      <div className='grid gap-4 xl:grid-cols-2'>
        <HealthGroupSkeleton rows={3} titleWidth='w-24' descriptionWidth='w-36' />
        <HealthGroupSkeleton rows={1} titleWidth='w-28' descriptionWidth='w-32' />
        <HealthGroupSkeleton rows={3} titleWidth='w-36' descriptionWidth='w-36' />
        <HealthGroupSkeleton rows={1} titleWidth='w-24' descriptionWidth='w-32' />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className='h-5 w-40' />
        </CardHeader>
        <CardContent className='space-y-3'>
          <Skeleton className='h-4 w-full max-w-3xl' />
          <Skeleton className='h-4 w-full max-w-2xl' />
          <Skeleton className='h-10 w-36 rounded-md' />
        </CardContent>
      </Card>
    </section>
  );
};

export default SystemHealthLoading;
