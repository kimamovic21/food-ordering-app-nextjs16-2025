'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import UserLoading from './loading';
import useProfile from '@/hooks/useProfile';
import { formatAppDateTime } from '@/libs/dateFormat';
import { formatMoney } from '@/libs/money';
import type { AdminUserListItem } from '@/types/user';

const UserLocationMap = dynamic(() => import('./UserLocationMap'), {
  ssr: false,
  loading: () => (
    <div className='h-80 rounded-lg border border-gray-200 bg-muted/40 dark:border-gray-800' />
  ),
});

type InfoItemProps = {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  wide?: boolean;
};

const getRoleBadgeVariant = (role?: string | null): 'default' | 'outline' | 'secondary' => {
  if (role === 'admin') return 'default';
  if (role === 'courier') return 'outline';
  return 'secondary';
};

const formatBoolean = (value?: boolean) => (value ? 'Yes' : 'No');

const formatOptionalDate = (value?: string | null) => (value ? formatAppDateTime(value) : '-');

const getRestaurantLabel = (restaurantId: AdminUserListItem['restaurantId']) => {
  if (!restaurantId) return '-';
  if (typeof restaurantId === 'string') return restaurantId;
  return restaurantId.name || restaurantId._id || '-';
};

const getRestaurantId = (restaurantId: AdminUserListItem['restaurantId']) => {
  if (!restaurantId) return '';
  if (typeof restaurantId === 'string') return restaurantId;
  return restaurantId._id || '';
};

const InfoItem = ({ label, value, mono = false, wide = false }: InfoItemProps) => (
  <div className={wide ? 'md:col-span-2' : ''}>
    <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>{label}</span>
    <p className={`mt-1 text-base wrap-break-word ${mono ? 'font-mono text-sm' : ''}`}>
      {value || '-'}
    </p>
  </div>
);

const UserDetailsPage = () => {
  const params = useParams()!;
  const router = useRouter();
  const [user, setUser] = useState<AdminUserListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [makingCourier, setMakingCourier] = useState(false);
  const [makingAdmin, setMakingAdmin] = useState(false);
  const { data: profileData, loading: profileLoading } = useProfile();
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const isCurrentUserSuperAdmin =
    profileData?.role === 'admin' &&
    Boolean(superAdminEmail && profileData.email === superAdminEmail);
  const isViewedUserSuperAdmin = Boolean(
    user?.email && superAdminEmail && user.email === superAdminEmail
  );
  const defaultDeliveryAddress = user?.deliveryAddresses?.find((address) => address.isDefault);
  const restaurantId = getRestaurantId(user?.restaurantId);
  const activitySummary = user?.activitySummary;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users?id=${params.id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = await res.json();
        await new Promise((resolve) => setTimeout(resolve, 500));
        setUser(data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (params.id && !profileLoading && isCurrentUserSuperAdmin) {
      fetchUser();
    }
  }, [isCurrentUserSuperAdmin, params.id, profileLoading]);

  useEffect(() => {
    if (profileLoading || isCurrentUserSuperAdmin) return;

    router.push(profileData?.role === 'admin' ? '/admin-dashboard' : '/');
  }, [isCurrentUserSuperAdmin, profileData?.role, profileLoading, router]);

  const handleMakeCourier = async () => {
    if (!user) return;

    try {
      setMakingCourier(true);
      const res = await fetch('/api/users/make-courier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        sonnerToast.error(data.error || 'Failed to make courier', {
          style: {
            background: '#ef4444',
            color: 'white',
          },
        });
        return;
      }

      setUser({ ...user, role: 'courier' });
      sonnerToast.success('User has been promoted to courier', {
        style: {
          background: '#22c55e',
          color: 'white',
        },
      });
    } catch (err) {
      console.error(err);
      sonnerToast.error('Failed to make courier', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
    } finally {
      setMakingCourier(false);
    }
  };

  const handleRemoveCourier = async () => {
    if (!user) return;

    try {
      setMakingCourier(true);
      const res = await fetch('/api/users/remove-courier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        sonnerToast.error(data.error || 'Failed to remove courier', {
          style: {
            background: '#ef4444',
            color: 'white',
          },
        });
        return;
      }

      setUser({ ...user, role: 'user' });
      sonnerToast.success('User courier role has been removed', {
        style: {
          background: '#22c55e',
          color: 'white',
        },
      });
    } catch (err) {
      console.error(err);
      sonnerToast.error('Failed to remove courier', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
    } finally {
      setMakingCourier(false);
    }
  };

  const handleMakeAdmin = async () => {
    if (!user) return;

    try {
      setMakingAdmin(true);
      const res = await fetch('/api/users/make-admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        sonnerToast.error(data.error || 'Failed to make admin', {
          style: {
            background: '#ef4444',
            color: 'white',
          },
        });
        return;
      }

      setUser({ ...user, role: 'admin' });
      sonnerToast.success('User has been promoted to admin', {
        style: {
          background: '#22c55e',
          color: 'white',
        },
      });
    } catch (err) {
      console.error(err);
      sonnerToast.error('Failed to make admin', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
    } finally {
      setMakingAdmin(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!user) return;

    try {
      setMakingAdmin(true);
      const res = await fetch('/api/users/remove-admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        sonnerToast.error(data.error || 'Failed to remove admin', {
          style: {
            background: '#ef4444',
            color: 'white',
          },
        });
        return;
      }

      setUser({ ...user, role: 'user' });
      sonnerToast.success('User admin role has been removed', {
        style: {
          background: '#22c55e',
          color: 'white',
        },
      });
    } catch (err) {
      console.error(err);
      sonnerToast.error('Failed to remove admin', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
    } finally {
      setMakingAdmin(false);
    }
  };

  if (loading || profileLoading || !isCurrentUserSuperAdmin) {
    return <UserLoading />;
  }

  if (error) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='text-red-500'>Error: {error}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='text-gray-500'>User not found</div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 py-6'>
      <Breadcrumb className='mb-6'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href='/admin-dashboard/users' className='hover:underline'>
              Users
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>User Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='flex flex-col gap-6'>
        <div className='max-w-6xl mx-auto w-full space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700'>
                <Avatar className='size-20'>
                  <AvatarImage
                    src={user.image || '/user-default-image.webp'}
                    alt={`${user.name}'s avatar`}
                    referrerPolicy='no-referrer'
                  />
                  <AvatarFallback className='text-2xl'>
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className='text-2xl font-bold'>{user.name}</h2>
                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                    </Badge>
                    {isViewedUserSuperAdmin && <Badge variant='outline'>Super admin</Badge>}
                    <Badge variant={user.emailVerifiedAt ? 'default' : 'secondary'}>
                      {user.emailVerifiedAt ? 'Verified email' : 'Unverified email'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-4'>
                <div className='rounded-lg border border-border bg-muted/30 p-4'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Provider</p>
                  <p className='mt-2 text-lg font-semibold capitalize'>{user.provider || '-'}</p>
                </div>
                <div className='rounded-lg border border-border bg-muted/30 p-4'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                    Delivery addresses
                  </p>
                  <p className='mt-2 text-lg font-semibold'>
                    {user.deliveryAddresses?.length || 0}
                  </p>
                </div>
                <div className='rounded-lg border border-border bg-muted/30 p-4'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                    Favorite meals
                  </p>
                  <p className='mt-2 text-lg font-semibold'>
                    {user.favoriteMenuItems?.length || 0}
                  </p>
                </div>
                <div className='rounded-lg border border-border bg-muted/30 p-4'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                    Favorite restaurants
                  </p>
                  <p className='mt-2 text-lg font-semibold'>
                    {user.favoriteRestaurants?.length || 0}
                  </p>
                </div>
              </div>

              {activitySummary && (
                <div className='space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700'>
                  <div>
                    <h3 className='text-lg font-semibold'>Order Activity</h3>
                    <p className='text-sm text-muted-foreground'>
                      High-level order history linked to this user account.
                    </p>
                  </div>
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                    <InfoItem label='Total orders:' value={activitySummary.totalOrders} />
                    <InfoItem label='Completed orders:' value={activitySummary.completedOrders} />
                    <InfoItem label='Active orders:' value={activitySummary.activeOrders} />
                    <InfoItem label='Canceled orders:' value={activitySummary.canceledOrders} />
                    <InfoItem label='Unpaid orders:' value={activitySummary.unpaidOrders} />
                    <InfoItem
                      label='Total spent:'
                      value={formatMoney(activitySummary.totalSpent)}
                    />
                    <InfoItem
                      label='Last order date:'
                      value={formatOptionalDate(activitySummary.lastOrderAt)}
                      wide
                    />
                  </div>
                </div>
              )}

              <div className='grid gap-4 md:grid-cols-2'>
                <InfoItem label='Email:' value={user.email} wide />
                <InfoItem label='Phone:' value={user.phone} />
                <InfoItem label='Provider:' value={user.provider || 'credentials'} />
                <InfoItem label='Street Address:' value={user.streetAddress} />
                <InfoItem label='Postal Code:' value={user.postalCode} />
                <InfoItem label='City:' value={user.city} />
                <InfoItem label='Country:' value={user.country} />
                <InfoItem label='User ID:' value={user._id} mono wide />
                <InfoItem
                  label='Email Verified At:'
                  value={formatOptionalDate(user.emailVerifiedAt)}
                />
                <InfoItem label='Created At:' value={formatOptionalDate(user.createdAt)} />
                <InfoItem label='Last Updated:' value={formatOptionalDate(user.updatedAt)} />
                <InfoItem
                  label='Restaurant:'
                  value={
                    restaurantId ? (
                      <Link
                        href={`/admin-dashboard/restaurant/edit/${restaurantId}`}
                        className='text-primary hover:underline'
                      >
                        {getRestaurantLabel(user.restaurantId)}
                      </Link>
                    ) : (
                      '-'
                    )
                  }
                />
              </div>

              <div className='grid gap-4 border-t border-gray-200 pt-6 dark:border-gray-700 md:grid-cols-2'>
                <InfoItem
                  label='Notification sound enabled:'
                  value={formatBoolean(user.notificationSoundEnabled)}
                />
                <InfoItem
                  label='Message sound enabled:'
                  value={formatBoolean(user.messageSoundEnabled)}
                />
                <InfoItem
                  label='Default delivery address:'
                  value={
                    defaultDeliveryAddress
                      ? `${defaultDeliveryAddress.streetAddress}, ${defaultDeliveryAddress.city}`
                      : '-'
                  }
                  wide
                />
              </div>

              {user.role === 'courier' && (
                <div className='space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700'>
                  <div>
                    <h3 className='text-lg font-semibold'>Courier Details</h3>
                    <p className='text-sm text-muted-foreground'>
                      Live courier fields stored on the user account.
                    </p>
                  </div>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <InfoItem label='Available:' value={formatBoolean(user.availability)} />
                    <InfoItem label='Taken order:' value={user.takenOrder || '-'} mono />
                    <InfoItem label='Latitude:' value={user.latitude ?? '-'} />
                    <InfoItem label='Longitude:' value={user.longitude ?? '-'} />
                    <InfoItem
                      label='Last location update:'
                      value={formatOptionalDate(user.lastLocationUpdate)}
                      wide
                    />
                  </div>
                  {user.courierWorkingHours?.length ? (
                    <div className='grid gap-2 sm:grid-cols-2'>
                      {user.courierWorkingHours.map((hours) => (
                        <div
                          key={hours.day}
                          className='rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm'
                        >
                          <div className='font-medium capitalize'>{hours.day}</div>
                          <div className='text-muted-foreground'>
                            {hours.isUnavailable
                              ? 'Unavailable'
                              : `${hours.startTime} - ${hours.endTime}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {user.deliveryAddresses?.length ? (
                <div className='space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700'>
                  <div>
                    <h3 className='text-lg font-semibold'>Saved Delivery Addresses</h3>
                    <p className='text-sm text-muted-foreground'>
                      Addresses this customer can reuse at checkout.
                    </p>
                  </div>
                  <div className='grid gap-3'>
                    {user.deliveryAddresses.map((address) => (
                      <div key={address._id} className='rounded-lg border border-border p-4'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='font-medium'>{address.label}</span>
                          {address.isDefault && <Badge variant='secondary'>Default</Badge>}
                        </div>
                        <p className='mt-2 text-sm text-muted-foreground'>
                          {address.streetAddress}, {address.postalCode} {address.city},{' '}
                          {address.country}
                        </p>
                        <p className='mt-1 text-sm text-muted-foreground'>{address.phone}</p>
                        <p className='mt-1 font-mono text-xs text-muted-foreground'>
                          {address.deliveryLatitude}, {address.deliveryLongitude}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {profileData?.role === 'admin' &&
                user.role !== 'courier' &&
                user.role !== 'admin' && (
                  <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3'>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={makingCourier}
                          className='w-full bg-primary hover:bg-primary/90'
                        >
                          {makingCourier ? 'Making Courier...' : 'Make Courier'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Make Courier</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to make {user.name} a courier?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className='flex gap-3 justify-end'>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleMakeCourier}
                            className='bg-primary hover:bg-primary/90'
                          >
                            Confirm
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>

                    {isCurrentUserSuperAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={makingAdmin}
                            className='w-full bg-primary hover:bg-primary/90'
                          >
                            {makingAdmin ? 'Making Admin...' : 'Make Admin'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Make Admin</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to make {user.name} an admin?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className='flex gap-3 justify-end'>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleMakeAdmin}
                              className='bg-primary hover:bg-primary/90'
                            >
                              Confirm
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}

              {profileData?.role === 'admin' && user.role === 'courier' && (
                <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={makingCourier} variant='destructive' className='w-full'>
                        {makingCourier ? 'Removing Courier...' : 'Remove Courier'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Courier</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {user.name} from courier role?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className='flex gap-3 justify-end'>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleRemoveCourier}
                          className='bg-red-600 hover:bg-red-700'
                        >
                          Confirm
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {profileData?.role === 'admin' &&
                user.role === 'admin' &&
                isCurrentUserSuperAdmin &&
                !isViewedUserSuperAdmin && (
                  <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button disabled={makingAdmin} variant='destructive' className='w-full'>
                          {makingAdmin ? 'Removing Admin...' : 'Remove Admin'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Admin</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {user.name} from admin role?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className='flex gap-3 justify-end'>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleRemoveAdmin}
                            className='bg-red-600 hover:bg-red-700'
                          >
                            Confirm
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className='min-h-80'>
              {user.streetAddress || user.city || user.country ? (
                <UserLocationMap
                  streetAddress={user.streetAddress}
                  city={user.city}
                  postalCode={user.postalCode}
                  country={user.country}
                  name={user.name}
                />
              ) : (
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Location data is unavailable.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage;
