'use client';

import { CalendarDays, Clock, TimerReset } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourierWorkSummary } from '@/types/courier';

const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (!hours) {
    return `${remainder}m`;
  }

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

const emptySummary: CourierWorkSummary = {
  today: { breakMinutes: 0, grossMinutes: 0, netWorkMinutes: 0, sessionCount: 0 },
  week: { breakMinutes: 0, grossMinutes: 0, netWorkMinutes: 0, sessionCount: 0 },
  month: { breakMinutes: 0, grossMinutes: 0, netWorkMinutes: 0, sessionCount: 0 },
  year: { breakMinutes: 0, grossMinutes: 0, netWorkMinutes: 0, sessionCount: 0 },
};

const CourierWorkSummaryCard = ({ summary }: { summary?: CourierWorkSummary }) => {
  const safeSummary = {
    ...emptySummary,
    ...(summary || {}),
  };
  const cards = [
    { label: 'Today', value: safeSummary.today, icon: Clock },
    { label: 'This week', value: safeSummary.week, icon: CalendarDays },
    { label: 'This month', value: safeSummary.month, icon: CalendarDays },
    { label: 'This year', value: safeSummary.year, icon: TimerReset },
  ];

  return (
    <Card className='mb-6'>
      <CardHeader>
        <CardTitle>Work time</CardTitle>
        <CardDescription>
          Your online courier sessions are tracked automatically when you go online and offline.
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className='rounded-lg border bg-background p-4'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Icon className='size-4 text-primary' />
                {card.label}
              </div>
              <p className='mt-3 text-2xl font-bold'>{formatMinutes(card.value.netWorkMinutes)}</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {card.value.sessionCount} session{card.value.sessionCount === 1 ? '' : 's'} ·{' '}
                {formatMinutes(card.value.breakMinutes)} break
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default CourierWorkSummaryCard;
