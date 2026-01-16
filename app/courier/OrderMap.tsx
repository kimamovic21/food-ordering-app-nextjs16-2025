'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

const OrderMap = ({ address, city, postalCode, country, customerEmail }: OrderMapProps) => {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className='border rounded-lg overflow-hidden'>
      <MapContainer
        center={coordinates}
        zoom={15}
        style={{ height: '300px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <Marker position={coordinates}>
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
};

export default OrderMap;
