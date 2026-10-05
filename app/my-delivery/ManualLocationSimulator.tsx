'use client';

import { useState } from 'react';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPinned, X } from 'lucide-react';

interface ManualLocationSimulatorProps {
  availability: boolean;
  pollingEnabled: boolean;
  updating: boolean;
  onPollingToggle: () => void;
  onManualUpdate: (latitude: number, longitude: number) => Promise<void>;
}

const ManualLocationSimulator: React.FC<ManualLocationSimulatorProps> = ({
  availability,
  pollingEnabled,
  updating,
  onPollingToggle,
  onManualUpdate,
}) => {
  const [open, setOpen] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const latitudeValue = latitude.trim();
  const longitudeValue = longitude.trim();
  const hasCoordinates = Boolean(latitudeValue && longitudeValue);

  const handleManualSubmit = async () => {
    if (!hasCoordinates) {
      sonnerToast.error('Latitude and longitude are required', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
      return;
    }

    const parsedLatitude = Number(latitudeValue);
    const parsedLongitude = Number(longitudeValue);

    if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
      sonnerToast.error('Latitude and longitude must be valid numbers', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
      return;
    }

    if (
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      sonnerToast.error('Coordinates are out of range', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
      return;
    }

    await onManualUpdate(parsedLatitude, parsedLongitude);
  };

  return (
    <div className='fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm pointer-events-none sm:bottom-6 sm:right-6'>
      {!open ? (
        <Button
          type='button'
          onClick={() => setOpen(true)}
          className='ml-auto flex shadow-2xl pointer-events-auto'
        >
          <MapPinned className='size-4' aria-hidden='true' />
          Dev Courier Simulator
        </Button>
      ) : (
        <div className='rounded-xl border bg-background/95 p-4 shadow-2xl backdrop-blur supports-backdrop-filter:bg-background/80 pointer-events-auto'>
          <div className='mb-3 flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <MapPinned className='size-4 text-primary' aria-hidden='true' />
                <p className='font-semibold text-foreground'>Dev Courier Simulator</p>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Enter latitude/longitude to simulate courier movement on the map.
              </p>
            </div>
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              aria-label='Close dev courier simulator'
              onClick={() => setOpen(false)}
            >
              <X className='size-4' aria-hidden='true' />
            </Button>
          </div>

          <div className='grid grid-cols-2 gap-2 mb-3'>
            <Input
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder='Latitude'
              inputMode='decimal'
              disabled={updating}
            />
            <Input
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder='Longitude'
              inputMode='decimal'
              disabled={updating}
            />
          </div>

          <div className='space-y-2'>
            <Button
              onClick={handleManualSubmit}
              disabled={updating || !availability || !hasCoordinates}
              className='w-full bg-primary hover:bg-primary/90'
            >
              {updating ? 'Updating Location...' : 'Update Manual Location'}
            </Button>

            <Button onClick={onPollingToggle} className='w-full bg-primary hover:bg-primary/90'>
              {pollingEnabled ? 'Disable Location Polling' : 'Enable Location Polling'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualLocationSimulator;
