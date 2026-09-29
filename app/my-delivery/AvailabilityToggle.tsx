'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coffee, Power, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CourierAvailabilityStatus } from '@/types/courier';

interface AvailabilityToggleProps {
  availability: boolean;
  availabilityStatus?: CourierAvailabilityStatus;
  breakEndsAt?: string | null;
  breakUnavailableReason?: string;
  canStartBreak?: boolean;
  togglingAvailability: boolean;
  onStartBreak: () => void;
  onToggle: () => void;
}

const getRemainingBreakMinutes = (breakEndsAt?: string | null, now = Date.now()) => {
  if (!breakEndsAt) return 0;

  const endTime = new Date(breakEndsAt).getTime();
  if (Number.isNaN(endTime)) return 0;

  return Math.max(0, Math.ceil((endTime - now) / 60000));
};

const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  availability,
  availabilityStatus,
  breakEndsAt,
  breakUnavailableReason,
  canStartBreak = false,
  togglingAvailability,
  onStartBreak,
  onToggle,
}) => {
  const [now, setNow] = useState(Date.now());
  const status = availabilityStatus || (availability ? 'online' : 'offline');
  const isOnBreak = status === 'on_break';
  const remainingBreakMinutes = useMemo(
    () => getRemainingBreakMinutes(breakEndsAt, now),
    [breakEndsAt, now]
  );

  useEffect(() => {
    if (!isOnBreak) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isOnBreak]);

  const statusConfig = {
    offline: {
      dot: 'bg-red-500',
      label: 'Offline',
      description: 'You are not available for new courier assignments.',
    },
    online: {
      dot: 'bg-green-500',
      label: 'Online',
      description: 'You are available for courier assignments during your saved shift.',
    },
    on_break: {
      dot: 'bg-amber-500',
      label: 'On break',
      description:
        remainingBreakMinutes > 0
          ? `Break locked for ${remainingBreakMinutes} more minute${
              remainingBreakMinutes === 1 ? '' : 's'
            }.`
          : 'Break is finished. Go online when you are ready.',
    },
  }[status];

  return (
    <div className='mb-6 rounded-lg border border-zinc-300 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex items-start gap-4'>
          <div className={`mt-1 size-3 rounded-full ${statusConfig.dot}`} />
          <div>
            <p className='font-semibold text-foreground'>Status: {statusConfig.label}</p>
            <p className='text-sm text-muted-foreground'>{statusConfig.description}</p>
            {isOnBreak && breakEndsAt && (
              <p className='mt-2 inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400'>
                <Timer className='size-4' />
                Break ends at{' '}
                {new Date(breakEndsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            {!isOnBreak && breakUnavailableReason && (
              <p className='mt-2 text-xs text-muted-foreground'>{breakUnavailableReason}</p>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-2 sm:flex-row lg:justify-end'>
          <Button
            type='button'
            onClick={onStartBreak}
            disabled={togglingAvailability || !canStartBreak || isOnBreak}
            variant='outline'
            className='w-full sm:w-auto'
          >
            <Coffee className='mr-2 size-4' />
            Start 30m break
          </Button>
          <Button
            type='button'
            onClick={onToggle}
            disabled={togglingAvailability || isOnBreak}
            variant={availability ? 'destructive' : 'default'}
            className={`w-full whitespace-nowrap sm:w-[140px] ${
              availability
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Power className='mr-2 size-4' />
            {togglingAvailability
              ? 'Updating...'
              : availability
                ? 'Go Offline'
                : isOnBreak
                  ? 'Break locked'
                  : 'Go Online'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityToggle;
