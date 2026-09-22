'use client';

import { useEffect, useState } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { MapPin, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import Image from 'next/image';
import Link from 'next/link';
import Title from '@/components/shared/Title';
import FavoriteToggleButton from '@/components/shared/FavoriteToggleButton';
import useFavorites from '@/hooks/useFavorites';
import ShareActions from '@/components/shared/ShareActions';
import HeartRating from '@/components/shared/HeartRating';
import SearchInput from './SearchInput';
import RestaurantsPageSkeleton from './RestaurantsPageSkeleton';
import type { RestaurantFilterOptions, RestaurantListItem } from '@/types/restaurant';

const PAGE_SIZE = 9;
const ALL_FILTER_VALUE = 'all';

const RestaurantsPage = () => {
  const [
    {
      city: cityQuery,
      country: countryQuery,
      delivery: deliveryQuery,
      maxMinimumOrder: maxMinimumOrderQuery,
      minRating: minRatingQuery,
      page: pageQuery,
      q: searchQuery,
      sort: sortQuery,
      status: statusQuery,
    },
    setRestaurantQuery,
  ] = useQueryStates({
    city: parseAsString.withDefault(''),
    country: parseAsString.withDefault(''),
    delivery: parseAsString.withDefault('all'),
    maxMinimumOrder: parseAsString.withDefault(''),
    minRating: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
    q: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('smart'),
    status: parseAsString.withDefault('all'),
  });

  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<RestaurantFilterOptions>({
    cities: [],
    countries: [],
  });
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const page = Math.max(1, pageQuery);
  const activeSearch = searchQuery.trim();
  const activeCity = cityQuery.trim();
  const activeCountry = countryQuery.trim();
  const activeDelivery = deliveryQuery || 'all';
  const activeMaxMinimumOrder = maxMinimumOrderQuery.trim();
  const activeMinRating = minRatingQuery.trim();
  const activeSort = sortQuery || 'smart';
  const activeStatus = statusQuery || 'all';
  const [searchInput, setSearchInput] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { data: favorites, setRestaurantFavorite } = useFavorites();

  useEffect(() => {
    setSearchInput(activeSearch);
  }, [activeSearch]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRestaurants = async () => {
      if (locationLoading) {
        return;
      }

      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_SIZE));
        params.set('page', String(page));

        if (activeSearch) {
          params.set('q', activeSearch);
        }

        if (activeCity) {
          params.set('city', activeCity);
        }

        if (activeCountry) {
          params.set('country', activeCountry);
        }

        if (activeStatus !== 'all') {
          params.set('status', activeStatus);
        }

        if (activeSort !== 'smart') {
          params.set('sort', activeSort);
        }

        if (activeDelivery !== 'all') {
          params.set('delivery', activeDelivery);
        }

        if (activeMinRating) {
          params.set('minRating', activeMinRating);
        }

        if (activeMaxMinimumOrder) {
          params.set('maxMinimumOrder', activeMaxMinimumOrder);
        }

        if (userLocation) {
          params.set('latitude', String(userLocation.latitude));
          params.set('longitude', String(userLocation.longitude));
        }

        const response = await fetch(`/api/restaurants?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch restaurants');
        }

        setRestaurants(Array.isArray(data.restaurants) ? data.restaurants : []);
        setFilterOptions({
          cities: Array.isArray(data?.filterOptions?.cities) ? data.filterOptions.cities : [],
          countries: Array.isArray(data?.filterOptions?.countries)
            ? data.filterOptions.countries
            : [],
        });
        setTotalPages(Math.max(1, Number(data?.pagination?.totalPages || 1)));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error fetching restaurants:', error);
          setRestaurants([]);
          setTotalPages(1);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();

    return () => {
      controller.abort();
    };
  }, [
    page,
    activeCity,
    activeCountry,
    activeDelivery,
    activeMaxMinimumOrder,
    activeMinRating,
    activeSearch,
    activeSort,
    activeStatus,
    userLocation,
    locationLoading,
  ]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      setLocationError('Geolocation is not supported in your browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location access denied. Showing default order.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location unavailable. Showing default order.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Showing default order.');
        } else {
          setLocationError('Failed to get your location. Showing default order.');
        }

        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
    );
  }, []);

  const getRestaurantsHref = (nextPage: number) => {
    const params = new URLSearchParams();

    if (activeSearch) {
      params.set('q', activeSearch);
    }

    if (activeCity) {
      params.set('city', activeCity);
    }

    if (activeCountry) {
      params.set('country', activeCountry);
    }

    if (activeStatus !== 'all') {
      params.set('status', activeStatus);
    }

    if (activeSort !== 'smart') {
      params.set('sort', activeSort);
    }

    if (activeDelivery !== 'all') {
      params.set('delivery', activeDelivery);
    }

    if (activeMinRating) {
      params.set('minRating', activeMinRating);
    }

    if (activeMaxMinimumOrder) {
      params.set('maxMinimumOrder', activeMaxMinimumOrder);
    }

    if (nextPage > 1) {
      params.set('page', String(nextPage));
    }

    const queryString = params.toString();
    return queryString ? `/restaurants?${queryString}` : '/restaurants';
  };

  const handleSearch = () => {
    const nextQuery = searchInput.trim();
    void setRestaurantQuery({ q: nextQuery || null, page: 1 });
  };

  const handleClear = () => {
    setSearchInput('');
    void setRestaurantQuery({ q: null, page: 1 });
  };

  const handleFilterChange = (key: string, value: string) => {
    const nextValue = value === ALL_FILTER_VALUE ? null : value;
    void setRestaurantQuery({ [key]: nextValue, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    void setRestaurantQuery({
      city: null,
      country: null,
      delivery: null,
      maxMinimumOrder: null,
      minRating: null,
      page: 1,
      q: null,
      sort: null,
      status: null,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const goToPage = (nextPage: number) => {
    const validPage = Math.max(1, Math.min(totalPages, nextPage));
    void setRestaurantQuery({ page: validPage });
  };

  const shouldShowLoading = loading || (locationLoading && restaurants.length === 0);
  const activeFiltersCount = [
    activeSearch,
    activeCity,
    activeCountry,
    activeStatus !== 'all' ? activeStatus : '',
    activeSort !== 'smart' ? activeSort : '',
    activeDelivery !== 'all' ? activeDelivery : '',
    activeMinRating,
    activeMaxMinimumOrder,
  ].filter(Boolean).length;

  if (shouldShowLoading) {
    return <RestaurantsPageSkeleton />;
  }

  return (
    <section className='mt-8 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
      {/* Loaded - Title and Description */}
      <div className='mb-6 flex flex-col gap-3'>
        <Title>Restaurants</Title>
        <p className='text-sm text-muted-foreground'>
          Browse restaurants, discover their details, and choose where you want to order from.
        </p>
        <p className='text-sm text-muted-foreground'>
          {locationLoading
            ? 'Detecting your location for nearest restaurants...'
            : userLocation
              ? 'Showing restaurants from closest to farthest based on your location.'
              : locationError || 'Location unavailable. Showing default order.'}
        </p>
      </div>

      {/* Loaded - Search Input */}
      <div className='mb-8'>
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          onClear={handleClear}
          onKeyDown={handleKeyDown}
        />
        <div className='mt-4 rounded-xl border border-white/10 bg-card/70 p-4'>
          <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <SlidersHorizontal className='size-4 text-primary' aria-hidden='true' />
              Restaurant filters
              {activeFiltersCount > 0 && (
                <Badge variant='secondary'>{activeFiltersCount} active</Badge>
              )}
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='w-full gap-2 rounded-full sm:w-auto'
              onClick={handleResetFilters}
              disabled={activeFiltersCount === 0}
            >
              <RotateCcw className='size-4' aria-hidden='true' />
              Reset filters
            </Button>
          </div>

          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <Select
              value={activeStatus}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Restaurant status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any status</SelectItem>
                <SelectItem value='accepting'>Accepting orders</SelectItem>
                <SelectItem value='open'>Open now</SelectItem>
                <SelectItem value='closed'>Closed now</SelectItem>
                <SelectItem value='paused'>Paused</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeCity || 'all'} onValueChange={(value) => handleFilterChange('city', value)}>
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='City' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All cities</SelectItem>
                {filterOptions.cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={activeCountry || 'all'}
              onValueChange={(value) => handleFilterChange('country', value)}
            >
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Country' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All countries</SelectItem>
                {filterOptions.countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={activeMinRating || 'all'}
              onValueChange={(value) => handleFilterChange('minRating', value)}
            >
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

            <Select
              value={activeDelivery}
              onValueChange={(value) => handleFilterChange('delivery', value)}
            >
              <SelectTrigger className='h-10 w-full rounded-full'>
                <SelectValue placeholder='Delivery' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any delivery range</SelectItem>
                <SelectItem value='to-me' disabled={!userLocation}>
                  Delivers to me
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={activeMaxMinimumOrder || 'all'}
              onValueChange={(value) => handleFilterChange('maxMinimumOrder', value)}
            >
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

            <Select value={activeSort} onValueChange={(value) => handleFilterChange('sort', value)}>
              <SelectTrigger className='h-10 w-full rounded-full sm:col-span-2 xl:col-span-1'>
                <SelectValue placeholder='Sort restaurants' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='smart'>Smart sort</SelectItem>
                <SelectItem value='nearest' disabled={!userLocation}>
                  Nearest first
                </SelectItem>
                <SelectItem value='rating'>Highest rated</SelectItem>
                <SelectItem value='minimum-order'>Lowest minimum order</SelectItem>
                <SelectItem value='name'>Name A-Z</SelectItem>
                <SelectItem value='newest'>Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Loaded - Restaurant Cards or No Results */}
      {restaurants.length === 0 ? (
        <Card>
          <CardContent className='py-10 text-center text-muted-foreground'>
            No restaurants found for your search.
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {restaurants.map((restaurant) => (
            <Card
              key={restaurant._id}
              className='h-full overflow-hidden border-border/80 hover:shadow-md transition-shadow'
            >
              <Link href={`/restaurants/${restaurant._id}`}>
                <div className='relative h-48 w-full bg-muted'>
                  {restaurant.image ? (
                    <Image
                      src={restaurant.image}
                      alt={restaurant.name}
                      fill
                      className='object-cover'
                      sizes='(max-width: 1024px) 100vw, 33vw'
                    />
                  ) : (
                    <div className='h-full w-full flex items-center justify-center text-muted-foreground text-sm'>
                      No image available
                    </div>
                  )}
                </div>
              </Link>
              <CardHeader className='space-y-2'>
                <div className='flex items-start justify-between gap-3'>
                  <CardTitle className='text-xl'>
                    <Link href={`/restaurants/${restaurant._id}`}>{restaurant.name}</Link>
                  </CardTitle>
                  <FavoriteToggleButton
                    type='restaurant'
                    targetId={restaurant._id}
                    isFavorite={favorites.favoriteRestaurantIds.includes(restaurant._id)}
                    onChanged={(nextIsFavorite) =>
                      setRestaurantFavorite(restaurant._id, nextIsFavorite)
                    }
                  />
                </div>
                <Badge
                  variant={
                    restaurant.isAcceptingOrders
                      ? 'default'
                      : restaurant.isPaused
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {restaurant.isAcceptingOrders
                    ? 'Accepting orders'
                    : restaurant.isPaused
                      ? 'Paused'
                      : restaurant.isOpen
                        ? 'Open'
                        : 'Closed'}
                </Badge>
                <HeartRating rating={restaurant.averageRating} ratingCount={restaurant.ratingCount} />
                <p className='text-sm text-muted-foreground flex items-center gap-1'>
                  <MapPin className='h-4 w-4' />
                  {restaurant.city}, {restaurant.country}
                </p>
                {typeof restaurant.distanceKm === 'number' && (
                  <p className='text-xs text-muted-foreground'>
                    {restaurant.distanceKm.toFixed(1)} km away
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  Min. order ${restaurant.minimumOrderAmount.toFixed(2)} • Delivery radius{' '}
                  {restaurant.deliveryRadiusKm} km
                </p>
              </CardHeader>
              <CardContent className='space-y-3'>
                <p className='text-sm text-muted-foreground'>{restaurant.street}</p>
                <p className='text-sm text-foreground/90'>
                  {restaurant.description.length > 110
                    ? `${restaurant.description.slice(0, 110)}...`
                    : restaurant.description}
                </p>
                <ShareActions
                  url={`${typeof window !== 'undefined' ? window.location.origin : ''}/restaurants/${restaurant._id}`}
                  title={`Check out this restaurant: ${restaurant.name}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {restaurants.length > 0 && (
        <div className='mt-8 flex items-center justify-center'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={getRestaurantsHref(Math.max(1, page - 1))}
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page - 1);
                  }}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              <div className='px-4 text-sm text-muted-foreground'>
                Page {page} of {totalPages}
              </div>

              <PaginationItem>
                <PaginationNext
                  href={getRestaurantsHref(Math.min(totalPages, page + 1))}
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page + 1);
                  }}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </section>
  );
};

export default RestaurantsPage;
