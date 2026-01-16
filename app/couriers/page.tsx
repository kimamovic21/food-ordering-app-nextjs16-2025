'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import useProfile from '@/contexts/UseProfile';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

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
    if (profileLoading || profileData?.role !== 'admin') return;

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
          <Skeleton className='h-8 w-32' />
          <Skeleton className='h-96 w-full' />
        </div>
      </div>
    );
  }

  if (profileData?.role !== 'admin') {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='text-red-500'>Unauthorized: Only admins can access this page</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-32' />
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {[...Array(6)].map((_, idx) => (
              <Skeleton key={idx} className='h-48 w-full' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 py-6'>
      <Breadcrumb className='mb-6'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/'>Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Couriers</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {couriers.map((courier) => (
            <Card key={courier._id} className='hover:shadow-lg transition-shadow'>
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-3'>
                    <Avatar>
                      <AvatarImage src={courier.image} alt={courier.name} />
                      <AvatarFallback>
                        {courier.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className='text-lg'>{courier.name}</CardTitle>
                      <p className='text-sm text-muted-foreground'>{courier.email}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-muted-foreground'>
                      Availability:
                    </span>
                    <Badge
                      variant={courier.availability ? 'default' : 'secondary'}
                      className={
                        courier.availability
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-400 hover:bg-gray-500'
                      }
                    >
                      {courier.availability ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  {courier.takenOrder && (
                    <div className='text-sm'>
                      <span className='font-medium text-muted-foreground'>Current Order: </span>
                      <span className='text-foreground font-semibold'>
                        {courier.takenOrder.toString().slice(-8).toUpperCase()}
                      </span>
                    </div>
                  )}

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