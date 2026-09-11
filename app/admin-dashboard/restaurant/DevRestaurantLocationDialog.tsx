'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DevRestaurantLocationDialogProps = {
  currentLatitude: number;
  currentLongitude: number;
  onManualLocationUpdate: (latitude: number, longitude: number) => void;
};

const DevRestaurantLocationDialog = ({
  currentLatitude,
  currentLongitude,
  onManualLocationUpdate,
}: DevRestaurantLocationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setLatitude(currentLatitude ? String(currentLatitude) : '');
      setLongitude(currentLongitude ? String(currentLongitude) : '');
    }

    setOpen(nextOpen);
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const hasCoordinates = Boolean(latitude.trim() && longitude.trim());

  const handleSubmit = () => {
    const parsedLatitude = Number(latitude.trim());
    const parsedLongitude = Number(longitude.trim());

    if (!hasCoordinates) {
      sonnerToast.error('Latitude and longitude are required');
      return;
    }

    if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      sonnerToast.error('Latitude and longitude must be valid numbers');
      return;
    }

    if (
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      sonnerToast.error('Coordinates are out of range');
      return;
    }

    onManualLocationUpdate(parsedLatitude, parsedLongitude);
    setOpen(false);
    sonnerToast.success('Dev restaurant location applied. Save the restaurant to persist it.');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type='button' variant='secondary' className='w-full gap-2'>
          <MapPin className='size-4' />
          Dev manual restaurant location
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dev restaurant location</DialogTitle>
          <DialogDescription>
            Simulate restaurant latitude and longitude for local delivery radius testing.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='dev-restaurant-latitude'>Latitude</Label>
            <Input
              id='dev-restaurant-latitude'
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder='Enter test latitude'
              inputMode='decimal'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='dev-restaurant-longitude'>Longitude</Label>
            <Input
              id='dev-restaurant-longitude'
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder='Enter test longitude'
              inputMode='decimal'
            />
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type='button' onClick={handleSubmit} disabled={!hasCoordinates}>
            Update location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DevRestaurantLocationDialog;
