import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MyOrdersLoading = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return (
    <section className='mt-8 flex flex-col min-h-[calc(100vh-8rem)] max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
      <div className='flex items-center justify-start'>
        {/* Title skeleton roughly matches <Title> (text-2xl) */}
        <Skeleton className='h-8 w-48' />
      </div>

      <div className='mt-8 flex-1 w-full'>
        <Card className='border border-border bg-card text-card-foreground shadow-sm'>
          <div className='overflow-x-auto'>
            <Table className='w-full min-w-[900px] table-fixed'>
              <TableHeader>
                <TableRow>
                  {['w-32', 'w-52', 'w-64', 'w-32', 'w-32', 'w-40'].map((w, idx) => (
                    <TableHead key={idx} className='p-3'>
                      <Skeleton className={`h-4 ${w}`} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(4)].map((_, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {[
                      'w-24' /* id */,
                      'w-40' /* date */,
                      'w-64' /* email */,
                      'w-24' /* total */,
                      'w-20' /* status */,
                      'w-32' /* action */,
                    ].map((w, cellIdx) => (
                      <TableCell key={cellIdx} className='p-3'>
                        <Skeleton className={`h-4 ${w}`} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div className='mt-6 flex items-center justify-center gap-4'>
        <Skeleton className='h-10 w-28' />
        <Skeleton className='h-5 w-32' />
        <Skeleton className='h-10 w-28' />
      </div>
    </section>
  );
};

export default MyOrdersLoading;
