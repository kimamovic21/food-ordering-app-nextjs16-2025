'use client';

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

type OrderMapProps = {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  customerEmail: string;
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

const OrderMap = forwardRef<OrderMapHandle, OrderMapProps>(
  ({ address, city, postalCode, country, customerEmail }, ref) => {
    const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
    const [courierLocation, setCourierLocation] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [courierLoading, setCourierLoading] = useState(false);

    // Expose refetch method to parent component
    useImperativeHandle(ref, () => ({
      refetchCourierLocation: fetchCourierLocation,
    }));

    // Fetch courier location every 60 seconds
    const fetchCourierLocation = async () => {
      try {
        setCourierLoading(true);
        const res = await fetch('/api/courier/location');
        if (res.ok) {
          const data = await res.json();
          const { latitude, longitude } = data.location || {};

          console.log('Fetched courier location:', { latitude, longitude });

          // Validate that we have valid numeric coordinates
          if (
            typeof latitude === 'number' &&
            typeof longitude === 'number' &&
            !isNaN(latitude) &&
            !isNaN(longitude)
          ) {
            setCourierLocation([latitude, longitude]);
          } else {
            console.warn('Invalid courier location data:', data.location);
            setCourierLocation(null);
          }
        } else {
          console.error('Failed to fetch courier location:', res.status);
        }
      } catch (err) {
        console.error('Failed to fetch courier location:', err);
      } finally {
        setCourierLoading(false);
      }
    };

    useEffect(() => {
      const geocodeAddress = async () => {
        try {
          setLoading(true);
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
            setCoordinates([parseFloat(lat), parseFloat(lon)]);
            setError(null);
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
              setCoordinates([parseFloat(lat), parseFloat(lon)]);
              setError('Showing approximate location (city center)');
            } else {
              setError('Unable to locate address on map');
            }
          }
        } catch (err) {
          console.error('Geocoding error:', err);
          setError('Failed to load map location');
        } finally {
          setLoading(false);
        }
      };

      geocodeAddress();

      // Fetch immediately on mount
      fetchCourierLocation();

      // Set interval for polling every 60 seconds
      const interval = setInterval(fetchCourierLocation, 60000);

      return () => clearInterval(interval);
    }, [address, city, postalCode, country]);

    if (loading) {
      return (
        <div className='border rounded-lg p-4 h-[300px] flex items-center justify-center bg-slate-50 dark:bg-slate-900'>
          <p className='text-muted-foreground'>Loading map...</p>
        </div>
      );
    }

    if (error && !coordinates) {
      return (
        <div className='border rounded-lg p-4 h-[300px] flex items-center justify-center bg-slate-50 dark:bg-slate-900'>
          <div className='text-center'>
            <p className='text-red-600 mb-2'>{error}</p>
            <p className='text-sm text-muted-foreground'>
              {address}, {city}, {postalCode}, {country}
            </p>
          </div>
        </div>
      );
    }

    if (!coordinates) {
      return null;
    }

    // Calculate center point between courier and customer if both exist
    const mapCenter = courierLocation
      ? [(coordinates[0] + courierLocation[0]) / 2, (coordinates[1] + courierLocation[1]) / 2]
      : coordinates;

    return (
      <div className='border rounded-lg overflow-hidden'>
        <MapContainer
          center={mapCenter as [number, number]}
          zoom={courierLocation ? 14 : 15}
          style={{ height: '300px', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          {/* Draw route line if courier location is available */}
          {courierLocation && (
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
            <Marker position={courierLocation} icon={courierIcon}>
              <Popup>
                <div className='text-sm'>
                  <p className='font-semibold mb-1 text-red-600'>Courier Location</p>
                  <p className='text-xs text-gray-600'>
                    {courierLoading ? 'Updating...' : 'Live Position'}
                  </p>
                  <p className='text-xs'>
                    Lat: {courierLocation[0]?.toFixed(4) ?? 'N/A'}, Lon:{' '}
                    {courierLocation[1]?.toFixed(4) ?? 'N/A'}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Customer Location Marker (Blue) */}
          <Marker position={coordinates} icon={customerIcon}>
            <Popup>
              <div className='text-sm'>
                <p className='font-semibold mb-1'>Delivery Location</p>
                <p className='text-xs text-gray-600 mb-1'>{customerEmail}</p>
                <p className='text-xs'>{address}</p>
                <p className='text-xs'>
                  {city}, {postalCode}
                </p>
                <p className='text-xs'>{country}</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
        {error && (
          <div className='bg-amber-50 border-t border-amber-200 px-3 py-2'>
            <p className='text-xs text-amber-800'>{error}</p>
          </div>
        )}
      </div>
    );
  }
);

OrderMap.displayName = 'OrderMap';
export default OrderMap;
