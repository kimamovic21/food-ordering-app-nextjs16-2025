'use client';

import { useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourierTracking } from '@/hooks/useCourierTracking';
import { formatAppDateTime } from '@/libs/dateFormat';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

type OrderMapProps = {
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  customerEmail?: string;
  className?: string;
  heightClassName?: string;
  orderId?: string; // Customer/admin tracking; omitted for the courier's own location
  shouldFetchCourier?: boolean; // Set to false to only show restaurant/location without fetching courier
  enableCourierPolling?: boolean;
};

export type OrderMapHandle = {
  refetchCourierLocation: () => Promise<void>;
};

// Custom icons for different markers
const createCustomIcon = (color: string) => {
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const courierIcon = createCustomIcon('red');
const customerIcon = createCustomIcon('blue');
const restaurantIcon = createCustomIcon('orange');

// Component to update map view when locations change
function MapUpdater({
  coordinates,
  courierLocation,
  hasCustomerLocation,
}: {
  coordinates: [number, number] | null;
  courierLocation: [number, number] | null;
  hasCustomerLocation: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    let center: [number, number];
    let zoom: number;

    if (courierLocation && coordinates && hasCustomerLocation) {
      // Calculate center point between courier and customer
      center = [
        (coordinates[0] + courierLocation[0]) / 2,
        (coordinates[1] + courierLocation[1]) / 2,
      ];
      zoom = 14;
    } else if (courierLocation) {
      // Only courier location
      center = courierLocation;
      zoom = 15;
    } else if (coordinates) {
      // Only customer location
      center = coordinates;
      zoom = 15;
    } else {
      return;
    }

    map.setView(center, zoom);
  }, [map, coordinates, courierLocation, hasCustomerLocation]);

  return null;
}

const OrderMap = forwardRef<OrderMapHandle, OrderMapProps>(
  (
    {
      address,
      city,
      postalCode,
      country,
      customerEmail,
      className = '',
      heightClassName = 'h-[300px]',
      orderId,
      shouldFetchCourier = true,
      enableCourierPolling = true,
    },
    ref
  ) => {
    const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const tracking = useCourierTracking(orderId, shouldFetchCourier, enableCourierPolling);
    const latitude = tracking.location?.latitude;
    const longitude = tracking.location?.longitude;
    const courierLocation = useMemo<[number, number] | null>(
      () => (latitude !== undefined && longitude !== undefined ? [latitude, longitude] : null),
      [latitude, longitude]
    );

    // Expose refetch method to parent component
    useImperativeHandle(ref, () => ({
      refetchCourierLocation: tracking.refresh,
    }));

    useEffect(() => {
      let active = true;

      const geocodeAddress = async () => {
        try {
          setLoading(true);

          // Only geocode if we have all required address components
          if (!address || !city || !postalCode || !country) {
            if (active) {
              setCoordinates(null);
              setError(null);
            }
            return;
          }

          // Format address for geocoding
          const fullAddress = `${address}, ${city}, ${postalCode}, ${country}`;
          const encodedAddress = encodeURIComponent(fullAddress);

          // Using Nominatim (OpenStreetMap) for geocoding - free and no API key required
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
          );

          if (!response.ok) {
            throw new Error('Failed to geocode address');
          }

          const data = await response.json();

          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            if (active) {
              setCoordinates([parseFloat(lat), parseFloat(lon)]);
              setError(null);
            }
          } else {
            // Fallback to city-level geocoding if full address fails
            const cityResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                city + ', ' + country
              )}&limit=1`
            );
            const cityData = await cityResponse.json();

            if (cityData && cityData.length > 0) {
              const { lat, lon } = cityData[0];
              if (active) {
                setCoordinates([parseFloat(lat), parseFloat(lon)]);
                setError('Showing approximate location (city center)');
              }
            } else {
              if (active) {
                setError('Unable to locate address on map');
              }
            }
          }
        } catch (err) {
          console.error('Geocoding error:', err);
          if (active) {
            setError('Failed to load map location');
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      geocodeAddress();

      return () => {
        active = false;
      };
    }, [address, city, postalCode, country]);

    const trackingStatus = shouldFetchCourier && (
      <div className='flex shrink-0 items-center gap-3 bg-background px-3 py-2'>
        <div className='min-w-0 flex-1 text-xs' role='status' aria-live='polite'>
          <p
            className={
              tracking.isError || tracking.freshness === 'stale'
                ? 'text-amber-700 dark:text-amber-400'
                : courierLocation && tracking.freshness === 'fresh'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-muted-foreground'
            }
          >
            {tracking.message}
          </p>
          {tracking.location?.lastLocationUpdate && (
            <p className='mt-1 text-muted-foreground'>
              Last updated {formatAppDateTime(tracking.location.lastLocationUpdate)}
            </p>
          )}
        </div>
        {tracking.canRefresh && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-8 shrink-0'
            aria-label='Refresh courier location'
            title='Refresh courier location'
            disabled={tracking.isFetching}
            onClick={() => void tracking.refresh()}
          >
            <RefreshCw
              aria-hidden='true'
              className={`size-4 ${tracking.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`}
            />
          </Button>
        )}
      </div>
    );

    if (loading && address && city && postalCode && country) {
      return (
        <div
          className={`flex items-center justify-center rounded-lg border bg-slate-50 p-4 dark:bg-slate-900 ${heightClassName} ${className}`}
        >
          <p className='text-muted-foreground'>Loading map...</p>
        </div>
      );
    }

    if (error && !coordinates && !courierLocation) {
      return (
        <div
          className={`flex items-center justify-center rounded-lg border bg-slate-50 p-4 dark:bg-slate-900 ${heightClassName} ${className}`}
        >
          <div className='text-center'>
            <p className='text-red-600 mb-2'>{error}</p>
            {address && city && postalCode && country && (
              <p className='text-sm text-muted-foreground'>
                {address}, {city}, {postalCode}, {country}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Waiting, terminal and denied states must not pretend to be a live map.
    if (!coordinates && !courierLocation) {
      return (
        <div
          className={`flex items-center justify-center rounded-lg border bg-background p-4 ${heightClassName} ${className}`}
        >
          {shouldFetchCourier ? (
            trackingStatus
          ) : (
            <p className='text-muted-foreground'>Waiting for location...</p>
          )}
        </div>
      );
    }

    // Determine map center based on what we have
    let mapCenter: [number, number] = [20, 0]; // Default fallback
    let mapZoom = 2;

    if (coordinates && courierLocation) {
      // Both courier and customer location - center between them
      mapCenter = [
        (coordinates[0] + courierLocation[0]) / 2,
        (coordinates[1] + courierLocation[1]) / 2,
      ];
      mapZoom = 14;
    } else if (courierLocation) {
      // Only courier location
      mapCenter = courierLocation;
      mapZoom = 15;
    } else if (coordinates) {
      // Only customer location
      mapCenter = coordinates;
      mapZoom = 15;
    }

    const hasCustomerLocation = coordinates !== null;

    return (
      <div
        className={`relative z-0 flex flex-col overflow-hidden rounded-lg border bg-background ${heightClassName} ${className}`}
      >
        {trackingStatus}
        {error && (
          <p className='shrink-0 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200'>
            {error}
          </p>
        )}
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className='relative z-0 min-h-0 w-full flex-1'
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />

          {/* Component to update map view when locations change */}
          <MapUpdater
            coordinates={coordinates}
            courierLocation={courierLocation}
            hasCustomerLocation={hasCustomerLocation}
          />

          {/* Draw route line if courier location is available and customer location exists */}
          {courierLocation && coordinates && (
            <Polyline
              positions={[courierLocation, coordinates]}
              color='#3b82f6'
              weight={2}
              opacity={0.7}
              dashArray='5, 5'
            />
          )}

          {/* Courier Location Marker (Red) */}
          {courierLocation && courierLocation.length === 2 && (
            <Marker
              position={courierLocation}
              icon={courierIcon}
              opacity={tracking.freshness === 'fresh' && !tracking.isError ? 1 : 0.6}
            >
              <Popup>
                <div className='text-sm'>
                  <p className='font-semibold mb-1 text-red-600'>Courier Location</p>
                  <p className='text-xs text-gray-600'>{tracking.message}</p>
                  <p className='text-xs'>
                    Lat: {courierLocation[0]?.toFixed(4) ?? 'N/A'}, Lon:{' '}
                    {courierLocation[1]?.toFixed(4) ?? 'N/A'}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Location Marker - Restaurant (Orange) or Delivery (Blue) */}
          {coordinates && (
            <Marker
              position={coordinates}
              icon={shouldFetchCourier ? customerIcon : restaurantIcon}
            >
              <Popup>
                <div className='text-sm'>
                  <p className='font-semibold mb-1'>
                    {shouldFetchCourier ? 'Delivery Location' : 'Restaurant Location'}
                  </p>
                  {customerEmail && <p className='text-xs text-gray-600 mb-1'>{customerEmail}</p>}
                  {address && <p className='text-xs'>{address}</p>}
                  {city && postalCode && (
                    <p className='text-xs'>
                      {city}, {postalCode}
                    </p>
                  )}
                  {country && <p className='text-xs'>{country}</p>}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    );
  }
);

OrderMap.displayName = 'OrderMap';
export default OrderMap;
