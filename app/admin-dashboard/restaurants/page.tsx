'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Store,
  Users,
} from 'lucide-react';

import {
  createDataTableColumnHelper,
  TanStackDataTable,
  type DataTableColumnDef,
} from '@/components/shared/TanStackDataTable';
import Title from '@/components/shared/Title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import useProfile from '@/hooks/useProfile';
import { formatAppDate } from '@/libs/dateFormat';
import { queryKeys } from '@/libs/queryKeys';
import type { AdminRestaurantListItem, AdminRestaurantsListResponse } from '@/types/restaurant';

const PAGE_SIZE = 10;
const ALL_FILTER_VALUE = 'all';

type AdminRestaurantsFilters = {
  blockedDates: string;
  capacity: string;
  city: string;
  country: string;
  imageStatus: string;
  maxMinimumOrder: string;
  minRating: string;
  owner: string;
  page: number;
  q: string;
  sort: string;
  status: string;
};

const columnHelper = createDataTableColumnHelper<AdminRestaurantListItem>();

const statusBadgeClassName = (restaurant: AdminRestaurantListItem) => {
  if (restaurant.isAcceptingOrders) {
    return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100';
  }

  if (restaurant.isPaused) {
    return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-100';
  }

  if (restaurant.isOpen) {
    return 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100';
  }

  return '';
};

const adminRestaurantsColumns = columnHelper.columns([
  columnHelper.accessor((restaurant) => restaurant.name, {
    id: 'name',
    header: 'Restaurant',
    cell: ({ row }) => (
      <div className='min-w-0'>
        <Link
          href={`/restaurants/${row.original._id}`}
          className='font-semibold text-foreground transition hover:text-primary'
        >
          {row.original.name}
        </Link>
        <p className='mt-1 text-xs text-muted-foreground'>
          {row.original.city}, {row.original.country}
        </p>
      </div>
    ),
  }),
  columnHelper.accessor((restaurant) => restaurant.owner?.email || '', {
    id: 'owner',
    header: 'Owner',
    cell: ({ row }) => (
      <div className='min-w-0'>
        <p className='font-medium'>{row.original.owner?.name || 'Unknown owner'}</p>
        <p className='text-xs text-muted-foreground'>{row.original.owner?.email || '-'}</p>
      </div>
    ),
  }),
  columnHelper.accessor((restaurant) => restaurant.isAcceptingOrders, {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div className='flex flex-col items-start gap-1'>
        <Badge variant='secondary' className={statusBadgeClassName(row.original)}>
          {row.original.isAcceptingOrders
            ? 'Accepting'
            : row.original.isPaused
              ? 'Paused'
              : row.original.isOpen
                ? 'Open'
                : 'Closed'}
        </Badge>
        {row.original.pauseReason ? (
          <span className='max-w-[220px] truncate text-xs text-muted-foreground'>
            {row.original.pauseReason}
          </span>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor((restaurant) => restaurant.averageRating, {
    id: 'rating',
    header: 'Rating',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.averageRating.toFixed(1)} / 5 ({row.original.ratingCount})
      </span>
    ),
  }),
  columnHelper.accessor((restaurant) => restaurant.activeOrderLimit, {
    id: 'capacity',
    header: 'Capacity',
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        <p>{row.original.activeOrderLimit} active orders</p>
        <p>{row.original.maxItemsPerOrder} items / order</p>
      </div>
    ),
  }),
  columnHelper.accessor((restaurant) => restaurant.minimumOrderAmount, {
    id: 'ordering',
    header: 'Ordering',
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        <p>Min. ${row.original.minimumOrderAmount.toFixed(2)}</p>
        <p>{row.original.deliveryRadiusKm} km radius</p>
      </div>
    ),
  }),
  columnHelper.accessor((restaurant) => restaurant.imageCount, {
    id: 'media',
    header: 'Media',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.imageCount} image{row.original.imageCount === 1 ? '' : 's'}
      </span>
    ),
  }),
  columnHelper.accessor((restaurant) => restaurant.updatedAt || '', {
    id: 'updatedAt',
    header: 'Updated',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.updatedAt ? formatAppDate(row.original.updatedAt) : '-'}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Link
        href={`/admin-dashboard/restaurants/${row.original._id}`}
        aria-label={`Open ${row.original.name}`}
        className='inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary'
      >
        <ExternalLink className='size-4' aria-hidden='true' />
      </Link>
    ),
    enableGlobalFilter: false,
    enableHiding: false,
    enableSorting: false,
  }),
]) satisfies DataTableColumnDef<AdminRestaurantListItem>[];

const columnLabels = {
  actions: 'Actions',
  capacity: 'Capacity',
  media: 'Media',
  name: 'Restaurant',
  ordering: 'Ordering',
  owner: 'Owner',
  rating: 'Rating',
  status: 'Status',
  updatedAt: 'Updated',
};

const fetchAdminRestaurants = async (
  filters: AdminRestaurantsFilters
): Promise<AdminRestaurantsListResponse> => {
  const params = new URLSearchParams();
  params.set('limit', String(PAGE_SIZE));
  params.set('page', String(filters.page));

  const optionalParams = {
    blockedDates: filters.blockedDates !== 'all' ? filters.blockedDates : '',
    capacity: filters.capacity !== 'all' ? filters.capacity : '',
    city: filters.city,
    country: filters.country,
    imageStatus: filters.imageStatus !== 'all' ? filters.imageStatus : '',
    maxMinimumOrder: filters.maxMinimumOrder,
    minRating: filters.minRating,
    owner: filters.owner,
    q: filters.q,
    sort: filters.sort !== 'newest' ? filters.sort : '',
    status: filters.status !== 'all' ? filters.status : '',
  };

  Object.entries(optionalParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(`/api/admin/restaurants?${params.toString()}`, {
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load restaurants.');
  }

  return {
    restaurants: Array.isArray(payload.restaurants) ? payload.restaurants : [],
    filterOptions: {
      cities: Array.isArray(payload?.filterOptions?.cities) ? payload.filterOptions.cities : [],
      countries: Array.isArray(payload?.filterOptions?.countries)
        ? payload.filterOptions.countries
        : [],
    },
    pagination: {
      total: Number(payload?.pagination?.total || 0),
      page: Number(payload?.pagination?.page || filters.page),
      pageSize: Number(payload?.pagination?.pageSize || PAGE_SIZE),
      totalPages: Number(payload?.pagination?.totalPages || 1),
      hasNextPage: Boolean(payload?.pagination?.hasNextPage),
      hasPreviousPage: Boolean(payload?.pagination?.hasPreviousPage),
    },
  };
};

const AdminRestaurantsLoading = () => (
  <section className='mt-8 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
    <Skeleton className='h-8 w-56' />
    <Skeleton className='mt-3 h-4 w-96 max-w-full' />
    <div className='mt-8 rounded-xl border border-white/10 bg-card/70 p-4'>
      <Skeleton className='h-11 w-full rounded-full' />
      <div className='mt-4 grid gap-3 md:grid-cols-4'>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className='h-10 w-full rounded-full' />
        ))}
      </div>
    </div>
    <Skeleton className='mt-6 h-96 w-full rounded-xl' />
  </section>
);

const AdminRestaurantsPage = () => {
  const router = useRouter();
  const { data: profileData, loading: profileLoading } = useProfile();
  const isSuperAdmin =
    profileData?.role === 'admin' &&
    profileData?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const [
    {
      blockedDates,
      capacity,
      city,
      country,
      imageStatus,
      maxMinimumOrder,
      minRating,
      owner,
      page,
      q,
      sort,
      status,
    },
    setFilters,
  ] = useQueryStates({
    blockedDates: parseAsString.withDefault('all'),
    capacity: parseAsString.withDefault('all'),
    city: parseAsString.withDefault(''),
    country: parseAsString.withDefault(''),
    imageStatus: parseAsString.withDefault('all'),
    maxMinimumOrder: parseAsString.withDefault(''),
    minRating: parseAsString.withDefault(''),
    owner: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
    q: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('newest'),
    status: parseAsString.withDefault('all'),
  });
  const activeFilters: AdminRestaurantsFilters = {
    blockedDates,
    capacity,
    city: city.trim(),
    country: country.trim(),
    imageStatus,
    maxMinimumOrder: maxMinimumOrder.trim(),
    minRating: minRating.trim(),
    owner: owner.trim(),
    page: Math.max(1, page),
    q: q.trim(),
    sort,
    status,
  };
  const [searchInput, setSearchInput] = useState(activeFilters.q);
  const [ownerInput, setOwnerInput] = useState(activeFilters.owner);

  useEffect(() => {
    setSearchInput(activeFilters.q);
  }, [activeFilters.q]);

  useEffect(() => {
    setOwnerInput(activeFilters.owner);
  }, [activeFilters.owner]);

  useEffect(() => {
    if (!profileLoading && !isSuperAdmin) {
      router.push(profileData?.role === 'admin' ? '/admin-dashboard' : '/');
    }
  }, [isSuperAdmin, profileData?.role, profileLoading, router]);

  const restaurantsQuery = useQuery({
    queryKey: queryKeys.restaurants.adminList(activeFilters),
    queryFn: () => fetchAdminRestaurants(activeFilters),
    enabled: !profileLoading && isSuperAdmin,
    refetchOnWindowFocus: true,
  });

  const response = restaurantsQuery.data;
  const restaurants = useMemo(() => response?.restaurants || [], [response?.restaurants]);
  const filterOptions = response?.filterOptions || { cities: [], countries: [] };
  const totalPages = response?.pagination.totalPages || 1;
  const totalRestaurants = response?.pagination.total || 0;
  const activeFilterCount = [
    activeFilters.blockedDates !== 'all' ? activeFilters.blockedDates : '',
    activeFilters.capacity !== 'all' ? activeFilters.capacity : '',
    activeFilters.city,
    activeFilters.country,
    activeFilters.imageStatus !== 'all' ? activeFilters.imageStatus : '',
    activeFilters.maxMinimumOrder,
    activeFilters.minRating,
    activeFilters.owner,
    activeFilters.q,
    activeFilters.sort !== 'newest' ? activeFilters.sort : '',
    activeFilters.status !== 'all' ? activeFilters.status : '',
  ].filter(Boolean).length;
  const summary = useMemo(
    () => ({
      accepting: restaurants.filter((restaurant) => restaurant.isAcceptingOrders).length,
      paused: restaurants.filter((restaurant) => restaurant.isPaused).length,
      missingImages: restaurants.filter((restaurant) => restaurant.imageCount === 0).length,
    }),
    [restaurants]
  );

  const updateFilter = (key: keyof AdminRestaurantsFilters, value: string | number | null) => {
    void setFilters({ [key]: value, page: key === 'page' ? Number(value || 1) : 1 });
  };

  const applyTextFilters = () => {
    void setFilters({
      owner: ownerInput.trim() || null,
      page: 1,
      q: searchInput.trim() || null,
    });
  };

  const resetFilters = () => {
    setSearchInput('');
    setOwnerInput('');
    void setFilters({
      blockedDates: null,
      capacity: null,
      city: null,
      country: null,
      imageStatus: null,
      maxMinimumOrder: null,
      minRating: null,
      owner: null,
      page: 1,
      q: null,
      sort: null,
      status: null,
    });
  };

  if (profileLoading || (isSuperAdmin && restaurantsQuery.isLoading)) {
    return <AdminRestaurantsLoading />;
  }

  return (
    <section className='mt-8 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
      <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
        <div>
          <Title>Restaurants</Title>
          <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>
            Review every restaurant in the platform with customer-facing filters plus superadmin
            operational filters.
          </p>
        </div>
        <div className='grid gap-2 text-sm text-muted-foreground sm:grid-cols-3'>
          <div className='rounded-xl border border-white/10 bg-card/70 px-4 py-3'>
            <p className='font-semibold text-foreground'>{totalRestaurants}</p>
            <p>Total results</p>
          </div>
          <div className='rounded-xl border border-white/10 bg-card/70 px-4 py-3'>
            <p className='font-semibold text-green-400'>{summary.accepting}</p>
            <p>Accepting on page</p>
          </div>
          <div className='rounded-xl border border-white/10 bg-card/70 px-4 py-3'>
            <p className='font-semibold text-red-300'>{summary.paused}</p>
            <p>Paused on page</p>
          </div>
        </div>
      </div>

      <Card className='mt-8 border-white/10 bg-card/70'>
        <CardContent className='p-4'>
          <div className='mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <SlidersHorizontal className='size-4 text-primary' aria-hidden='true' />
              Superadmin filters
              {activeFilterCount > 0 && <Badge variant='secondary'>{activeFilterCount} active</Badge>}
            </div>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <Button
                type='button'
                variant='outline'
                className='gap-2 rounded-full'
                onClick={applyTextFilters}
              >
                <Search className='size-4' aria-hidden='true' />
                Search
              </Button>
              <Button
                type='button'
                variant='outline'
                className='gap-2 rounded-full'
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
              >
                <RotateCcw className='size-4' aria-hidden='true' />
                Reset
              </Button>
            </div>
          </div>

          <div className='grid gap-3 lg:grid-cols-4'>
            <div className='relative lg:col-span-2'>
              <Search
                className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                aria-hidden='true'
              />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyTextFilters();
                }}
                placeholder='Search restaurant name, city, email, address...'
                className='h-10 rounded-full border-white/15 bg-background/80 pl-10'
              />
            </div>
            <div className='relative lg:col-span-2'>
              <Users
                className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                aria-hidden='true'
              />
              <Input
                value={ownerInput}
                onChange={(event) => setOwnerInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyTextFilters();
                }}
                placeholder='Filter owner by name or email'
                className='h-10 rounded-full border-white/15 bg-background/80 pl-10'
              />
            </div>

            <Select value={activeFilters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any status</SelectItem>
                <SelectItem value='accepting'>Accepting orders</SelectItem>
                <SelectItem value='open'>Open now</SelectItem>
                <SelectItem value='closed'>Closed now</SelectItem>
                <SelectItem value='paused'>Paused</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilters.city || 'all'} onValueChange={(value) => updateFilter('city', value === ALL_FILTER_VALUE ? null : value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='City' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All cities</SelectItem>
                {filterOptions.cities.map((cityOption) => (
                  <SelectItem key={cityOption} value={cityOption}>
                    {cityOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={activeFilters.country || 'all'} onValueChange={(value) => updateFilter('country', value === ALL_FILTER_VALUE ? null : value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Country' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All countries</SelectItem>
                {filterOptions.countries.map((countryOption) => (
                  <SelectItem key={countryOption} value={countryOption}>
                    {countryOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={activeFilters.minRating || 'all'} onValueChange={(value) => updateFilter('minRating', value === ALL_FILTER_VALUE ? null : value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Rating' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any rating</SelectItem>
                <SelectItem value='3'>3.0+ rating</SelectItem>
                <SelectItem value='4'>4.0+ rating</SelectItem>
                <SelectItem value='4.5'>4.5+ rating</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilters.imageStatus} onValueChange={(value) => updateFilter('imageStatus', value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Images' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any image status</SelectItem>
                <SelectItem value='with-images'>Has images</SelectItem>
                <SelectItem value='missing-images'>Missing images</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilters.capacity} onValueChange={(value) => updateFilter('capacity', value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Capacity' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any capacity</SelectItem>
                <SelectItem value='small'>Small, up to 10</SelectItem>
                <SelectItem value='medium'>Medium, 11-30</SelectItem>
                <SelectItem value='large'>Large, 31+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilters.blockedDates} onValueChange={(value) => updateFilter('blockedDates', value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Blocked dates' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any blocked date status</SelectItem>
                <SelectItem value='yes'>Has blocked dates</SelectItem>
                <SelectItem value='no'>No blocked dates</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilters.maxMinimumOrder || 'all'} onValueChange={(value) => updateFilter('maxMinimumOrder', value === ALL_FILTER_VALUE ? null : value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Minimum order' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any minimum order</SelectItem>
                <SelectItem value='10'>$10 or less</SelectItem>
                <SelectItem value='15'>$15 or less</SelectItem>
                <SelectItem value='20'>$20 or less</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilters.sort} onValueChange={(value) => updateFilter('sort', value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Sort' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='newest'>Newest</SelectItem>
                <SelectItem value='updated'>Recently updated</SelectItem>
                <SelectItem value='oldest'>Oldest</SelectItem>
                <SelectItem value='name'>Name A-Z</SelectItem>
                <SelectItem value='rating'>Highest rated</SelectItem>
                <SelectItem value='minimum-order'>Lowest minimum order</SelectItem>
                <SelectItem value='capacity'>Highest capacity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {summary.missingImages > 0 ? (
            <div className='mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100'>
              <Store className='mr-2 inline size-4' aria-hidden='true' />
              {summary.missingImages} restaurant{summary.missingImages === 1 ? '' : 's'} on this
              page need media review.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className='mt-6'>
        {restaurantsQuery.isError ? (
          <Card className='border-destructive/30 bg-destructive/10'>
            <CardContent className='p-4 text-sm text-destructive'>
              <p>
                {restaurantsQuery.error instanceof Error
                  ? restaurantsQuery.error.message
                  : 'Failed to load restaurants.'}
              </p>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='mt-3'
                onClick={() => void restaurantsQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TanStackDataTable
            columns={adminRestaurantsColumns}
            data={restaurants}
            tableKey='admin-restaurants'
            searchPlaceholder='Search loaded restaurants...'
            emptyMessage='No restaurants match these filters.'
            minWidthClassName='min-w-[1180px]'
            columnLabels={columnLabels}
            showSearch={false}
            showPagination={false}
          />
        )}
      </div>

      {!restaurantsQuery.isError && (
        <div className='mt-6 flex items-center justify-center gap-4 pb-4'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href='#'
                  onClick={(event) => {
                    event.preventDefault();
                    updateFilter('page', Math.max(1, activeFilters.page - 1));
                  }}
                  aria-disabled={activeFilters.page <= 1}
                  className={activeFilters.page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              <div className='flex items-center justify-center px-4 text-sm font-medium text-muted-foreground'>
                Page {activeFilters.page} of {totalPages}
              </div>

              <PaginationItem>
                <PaginationNext
                  href='#'
                  onClick={(event) => {
                    event.preventDefault();
                    updateFilter('page', Math.min(totalPages, activeFilters.page + 1));
                  }}
                  aria-disabled={activeFilters.page >= totalPages}
                  className={
                    activeFilters.page >= totalPages ? 'pointer-events-none opacity-50' : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </section>
  );
};

const AdminRestaurantsPageWithSuspense = () => (
  <Suspense fallback={<AdminRestaurantsLoading />}>
    <AdminRestaurantsPage />
  </Suspense>
);

export default AdminRestaurantsPageWithSuspense;
