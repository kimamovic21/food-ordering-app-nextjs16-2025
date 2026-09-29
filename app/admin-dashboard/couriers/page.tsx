'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Title from '@/components/shared/Title';
import useProfile from '@/hooks/useProfile';
import { formatAppDate } from '@/libs/dateFormat';
import type { CourierAvailabilityStatus, CourierListItem } from '@/types/courier';

const formatWorkMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (!hours) {
    return `${remainder}m`;
  }

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

const statusLabels: Record<CourierAvailabilityStatus, string> = {
  offline: 'Offline',
  online: 'Online',
  on_break: 'On break',
};

const getCourierStatus = (courier: CourierListItem): CourierAvailabilityStatus =>
  courier.courierAvailabilityStatus || (courier.availability ? 'online' : 'offline');

const getInitials = (name: string) =>
  name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const CouriersPage = () => {
  const router = useRouter();
  const { data: profileData, loading: profileLoading } = useProfile();
  const [couriers, setCouriers] = useState<CourierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin =
    profileData?.role === 'admin' &&
    profileData?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  useEffect(() => {
    if (profileLoading) return;

    if (!isSuperAdmin) {
      router.push('/');
      return;
    }

    const fetchCouriers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/my-delivery');
        if (!res.ok) {
          throw new Error('Failed to fetch couriers');
        }
        const data = await res.json();
        setCouriers(data.couriers);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCouriers();
  }, [isSuperAdmin, profileLoading, router]);

  if (profileLoading || loading) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='space-y-6'>
          <div>
            <Skeleton className='h-10 w-96' />
            <Skeleton className='h-5 w-80 mt-2' />
          </div>
          <div className='space-y-4'>
            {[...Array(4)].map((_, idx) => (
              <Skeleton key={idx} className='h-24 w-full rounded-xl' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className='w-full md:w-4xl lg:w-5xl max-w-5xl mx-auto px-4 py-6'>
      <div className='mb-6'>
        <Title>Couriers Management</Title>
        <p className='text-muted-foreground mt-2'>Total couriers: {couriers.length}</p>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6'>
          {error}
        </div>
      )}

      {couriers.length === 0 ? (
        <div className='flex justify-center'>
          <Card className='w-full max-w-2xl'>
            <CardContent className='py-16 text-center text-lg'>
              <p className='text-muted-foreground'>No couriers found</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className='space-y-4'>
          {couriers.map((courier) => {
            const status = getCourierStatus(courier);

            return (
              <Card key={courier._id} className='hover:shadow-lg transition-shadow'>
                <CardContent className='py-4'>
                  <div className='flex flex-col gap-4 md:flex-row md:items-center'>
                    <Avatar className='h-12 w-12'>
                      <AvatarImage src={courier.image || undefined} alt={courier.name} />
                      <AvatarFallback>{getInitials(courier.name)}</AvatarFallback>
                    </Avatar>

                    <div className='flex-1 min-w-0'>
                      <h3 className='text-lg font-semibold'>{courier.name}</h3>
                      <p className='text-sm text-muted-foreground'>{courier.email}</p>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium text-muted-foreground'>
                        Availability:
                      </span>
                      <Badge
                        variant={status === 'offline' ? 'destructive' : 'default'}
                        className={
                          status === 'online'
                            ? 'bg-green-600 hover:bg-green-700'
                            : status === 'on_break'
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-red-600 hover:bg-red-700'
                        }
                      >
                        {statusLabels[status]}
                      </Badge>
                    </div>

                    <div className='text-xs text-muted-foreground'>
                      Week: {formatWorkMinutes(courier.workSummary?.week?.netWorkMinutes || 0)}
                      <br />
                      Month: {formatWorkMinutes(courier.workSummary?.month?.netWorkMinutes || 0)}
                    </div>

                    <div className='text-xs text-muted-foreground'>
                      Joined: {formatAppDate(courier.createdAt)}
                    </div>

                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => router.push(`/admin-dashboard/couriers/${courier._id}`)}
                      className='w-full md:w-auto'
                    >
                      <BarChart3 className='mr-2 size-4' />
                      View stats
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CouriersPage;
