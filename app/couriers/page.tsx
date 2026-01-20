'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import useProfile from '@/contexts/UseProfile';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type CourierType = {
  _id: string;
  name: string;
  email: string;
  image?: string;
  availability: boolean;
  takenOrder?: string;
  role: string;
  createdAt: string;
};

const CouriersPage = () => {
  const { data: profileData, loading: profileLoading } = useProfile();
  const session = useSession();
  const [couriers, setCouriers] = useState<CourierType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading || (profileData?.role !== 'admin' && profileData?.role !== 'manager')) return;

    const fetchCouriers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/couriers');
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
  }, [profileData?.role, profileLoading]);

  if (profileLoading) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='space-y-4'>
          <Skeleton className='h-10 w-48' />
          <Skeleton className='h-5 w-32' />
          <div className='space-y-4'>
            {[...Array(4)].map((_, idx) => (
              <Skeleton key={idx} className='h-20 w-full' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (profileData?.role !== 'admin' && profileData?.role !== 'manager') {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='text-red-500'>Unauthorized: Only admins or managers can access this page</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='space-y-4'>
          <Skeleton className='h-10 w-48' />
          <Skeleton className='h-5 w-32' />
          <div className='space-y-4'>
            {[...Array(4)].map((_, idx) => (
              <Skeleton key={idx} className='h-20 w-full' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 py-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-foreground'>Couriers</h1>
        <p className='text-muted-foreground mt-2'>
          Total couriers: {couriers.length}
        </p>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6'>
          {error}
        </div>
      )}

      {couriers.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <p className='text-muted-foreground'>No couriers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-4'>
          {couriers.map((courier) => (
            <Card key={courier._id} className='hover:shadow-lg transition-shadow'>
              <CardContent className='py-4'>
                <div className='flex items-center gap-4'>
                  <Avatar className='h-12 w-12'>
                    <AvatarImage src={courier.image} alt={courier.name} />
                    <AvatarFallback>
                      {courier.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className='flex-1'>
                    <h3 className='text-lg font-semibold'>{courier.name}</h3>
                    <p className='text-sm text-muted-foreground'>{courier.email}</p>
                  </div>

                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-muted-foreground'>
                      Availability:
                    </span>
                    <Badge
                      variant={courier.availability ? 'default' : 'destructive'}
                      className={
                        courier.availability
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }
                    >
                      {courier.availability ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  <div className='text-xs text-muted-foreground'>
                    Joined: {new Date(courier.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CouriersPage;