'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { RestaurantMapPin } from '@/types/restaurant';

const SARAJEVO_CENTER: [number, number] = [43.8563, 18.4131];
const DEFAULT_ZOOM = 12;

type RestaurantLocationsMapProps = {
  restaurants: RestaurantMapPin[];
};

const restaurantPinIcon = L.divIcon({
  className: 'restaurant-location-marker',
  html: '<span class="restaurant-location-marker__pin"><span class="restaurant-location-marker__dot"></span></span>',
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  popupAnchor: [0, -36],
});

function RestaurantMapBounds({ restaurants }: RestaurantLocationsMapProps) {
  const map = useMap();

  useEffect(() => {
    const positions = restaurants.map(
      (restaurant) => [restaurant.latitude, restaurant.longitude] as [number, number]
    );

    if (positions.length === 0) {
      map.setView(SARAJEVO_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], 13);
      return;
    }

    map.fitBounds(L.latLngBounds(positions), {
      animate: false,
      maxZoom: 13,
      padding: [48, 48],
    });
  }, [map, restaurants]);

  return null;
}

const getStatusLabel = (restaurant: RestaurantMapPin) => {
  if (restaurant.isAcceptingOrders) return 'Accepting orders';
  if (restaurant.isPaused) return 'Paused';
  if (restaurant.isOpen) return 'Open';
  return 'Closed';
};

const getStatusClassName = (restaurant: RestaurantMapPin) => {
  if (restaurant.isAcceptingOrders) {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (restaurant.isPaused) {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  return restaurant.isOpen
    ? 'bg-primary/10 text-primary'
    : 'bg-muted text-muted-foreground';
};

const RestaurantLocationsMap = ({ restaurants }: RestaurantLocationsMapProps) => {
  const initialCenter = useMemo<[number, number]>(() => {
    if (restaurants.length === 1) {
      return [restaurants[0].latitude, restaurants[0].longitude];
    }

    return SARAJEVO_CENTER;
  }, [restaurants]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={DEFAULT_ZOOM}
      className='relative z-0 h-full w-full'
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      <RestaurantMapBounds restaurants={restaurants} />

      {restaurants.map((restaurant) => (
        <Marker
          key={restaurant._id}
          position={[restaurant.latitude, restaurant.longitude]}
          icon={restaurantPinIcon}
        >
          <Popup>
            <div className='min-w-44 space-y-2 text-sm'>
              <div>
                <p className='font-semibold text-foreground'>{restaurant.name}</p>
                <p className='text-xs text-muted-foreground'>
                  {restaurant.street}, {restaurant.city}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusClassName(
                  restaurant
                )}`}
              >
                {getStatusLabel(restaurant)}
              </span>
              <Link
                href={`/restaurants/${restaurant._id}`}
                className='block text-xs font-semibold text-primary hover:underline'
              >
                View restaurant
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default RestaurantLocationsMap;
