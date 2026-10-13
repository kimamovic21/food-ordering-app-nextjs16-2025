'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/libs/utils';
import type {
  OrderMaintenanceRecoveryIssue,
  OrderMaintenanceRecoveryRunResult,
  OrderMaintenanceRecoverySnapshot,
} from '@/types/order-maintenance-recovery';

const issueTone: Record<
  OrderMaintenanceRecoveryIssue,
  {
    className: string;
    label: string;
  }
> = {
  expired_inventory_reservation: {
    className:
      'border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200',
    label: 'Inventory',
  },
  ready_without_courier: {
    className:
      'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
    label: 'Ready order',
  },
  stale_courier_assignment: {
    className:
      'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
    label: 'Courier',
  },
  stale_unpaid_order: {
    className:
      'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-200',
    label: 'Payment',
  },
};

const emptySnapshot: OrderMaintenanceRecoverySnapshot = {
  canRecover: false,
  candidates: [],
  checkedAt: new Date(0).toISOString(),
  summary: {
    expiredInventoryReservations: 0,
    readyWithoutCourierOrders: 0,
    staleCourierAssignments: 0,
    staleUnpaidOrders: 0,
    totalIssues: 0,
    uniqueOrders: 0,
  },
};

const readError = async (response: Response) => {
  const json = await response.json().catch(() => null);

  return json?.error || 'Order maintenance recovery request failed.';
};

const formatCheckedAt = (value: string | null) => {
  if (!value) return 'Not checked yet';

  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not checked yet';
};

const MetricCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  value: number;
}) => {
  const toneClassName =
    tone === 'danger'
      ? 'border-red-900/60 bg-red-950/20 text-red-200'
      : tone === 'warning'
        ? 'border-amber-900/60 bg-amber-950/20 text-amber-200'
        : tone === 'success'
          ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200'
          : 'border-border bg-background/60 text-muted-foreground';

  return (
    <div className={cn('rounded-lg border p-3', toneClassName)}>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-2 text-2xl font-semibold tracking-tight'>{value}</p>
    </div>
  );
};

const OrderMaintenanceRecoveryPanel = () => {
  const [snapshot, setSnapshot] = useState<OrderMaintenanceRecoverySnapshot>(emptySnapshot);
  const [lastRun, setLastRun] = useState<OrderMaintenanceRecoveryRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = async ({ showToast = false }: { showToast?: boolean } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/order-maintenance/recovery', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const json = (await response.json()) as { snapshot: OrderMaintenanceRecoverySnapshot };
      setSnapshot(json.snapshot);

      if (showToast) {
        sonnerToast.success('Order maintenance check refreshed.');
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Failed to check order maintenance.';
      setError(message);
      sonnerToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const runRecovery = async () => {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/order-maintenance/recovery', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const json = (await response.json()) as { result: OrderMaintenanceRecoveryRunResult };
      setLastRun(json.result);
      setSnapshot({
        ...emptySnapshot,
        checkedAt: json.result.appliedAt,
      });
      setDialogOpen(false);
      sonnerToast.success('Order maintenance recovery completed.');
      await fetchSnapshot();
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run recovery.';
      setError(message);
      sonnerToast.error(message);
    } finally {
      setRunning(false);
    }
  };

  const topCandidates = useMemo(() => snapshot.candidates.slice(0, 5), [snapshot.candidates]);
  const isHealthy = !loading && snapshot.summary.uniqueOrders === 0;

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden',
          snapshot.summary.uniqueOrders > 0
            ? 'border-amber-900/50 bg-amber-950/10'
            : 'border-emerald-900/50 bg-emerald-950/10'
        )}
      >
        <CardHeader>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='max-w-3xl'>
              <div className='flex flex-wrap items-center gap-2'>
                {isHealthy ? (
                  <CheckCircle2 className='size-5 text-emerald-300' />
                ) : (
                  <ShieldAlert className='size-5 text-amber-300' />
                )}
                <CardTitle>Order Maintenance Recovery</CardTitle>
                <Badge
                  variant='outline'
                  className={
                    isHealthy
                      ? 'border-emerald-900 bg-emerald-950/60 text-emerald-200'
                      : 'border-amber-900 bg-amber-950/60 text-amber-200'
                  }
                >
                  {isHealthy ? 'No stale orders' : `${snapshot.summary.uniqueOrders} need review`}
                </Badge>
              </div>
              <p className='mt-2 text-sm text-muted-foreground'>
                Safety net for delayed QStash jobs. Use it to find and recover stale unpaid orders,
                expired stock reservations, stuck courier assignments, and ready orders without a
                courier.
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                Last checked: {formatCheckedAt(snapshot.checkedAt)}
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                className='gap-2'
                disabled={loading || running}
                onClick={() => fetchSnapshot({ showToast: true })}
              >
                {loading ? <Loader2 className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}
                Check now
              </Button>
              <Button
                type='button'
                className='gap-2'
                disabled={loading || running || !snapshot.canRecover}
                onClick={() => setDialogOpen(true)}
              >
                {running ? <Loader2 className='size-4 animate-spin' /> : <RotateCcw className='size-4' />}
                Run recovery
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
            <MetricCard
              label='Affected orders'
              value={snapshot.summary.uniqueOrders}
              tone={snapshot.summary.uniqueOrders > 0 ? 'warning' : 'success'}
            />
            <MetricCard
              label='Unpaid stale'
              value={snapshot.summary.staleUnpaidOrders}
              tone={snapshot.summary.staleUnpaidOrders > 0 ? 'warning' : 'neutral'}
            />
            <MetricCard
              label='Reserved stock'
              value={snapshot.summary.expiredInventoryReservations}
              tone={snapshot.summary.expiredInventoryReservations > 0 ? 'danger' : 'neutral'}
            />
            <MetricCard
              label='Courier pending'
              value={snapshot.summary.staleCourierAssignments}
              tone={snapshot.summary.staleCourierAssignments > 0 ? 'warning' : 'neutral'}
            />
            <MetricCard
              label='Ready no courier'
              value={snapshot.summary.readyWithoutCourierOrders}
              tone={snapshot.summary.readyWithoutCourierOrders > 0 ? 'warning' : 'neutral'}
            />
          </div>

          {error && (
            <div className='flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/20 p-3 text-sm text-red-200'>
              <AlertTriangle className='mt-0.5 size-4 shrink-0' />
              <p>{error}</p>
            </div>
          )}

          {lastRun && (
            <div className='rounded-lg border border-border bg-background/60 p-3 text-sm'>
              <p className='font-semibold'>Last recovery run</p>
              <p className='mt-1 text-muted-foreground'>
                Canceled {lastRun.summary.canceledOrders}, expired{' '}
                {lastRun.summary.expiredAssignments} assignments, released{' '}
                {lastRun.summary.releasedReservations} reservations, failed{' '}
                {lastRun.summary.failedOrders}.
              </p>
            </div>
          )}

          {topCandidates.length > 0 ? (
            <div className='divide-y divide-border rounded-lg border border-border bg-background/60'>
              {topCandidates.map((candidate) => (
                <div
                  key={`${candidate.orderId}-${candidate.issue}`}
                  className='flex flex-col gap-3 p-3 lg:flex-row lg:items-start lg:justify-between'
                >
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='outline' className={issueTone[candidate.issue].className}>
                        {issueTone[candidate.issue].label}
                      </Badge>
                      <p className='font-semibold'>{candidate.label}</p>
                    </div>
                    <p className='mt-1 text-sm text-muted-foreground'>{candidate.description}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Order {candidate.orderId} · {candidate.email || 'unknown customer'} ·{' '}
                      {candidate.minutesOverdue} min overdue
                    </p>
                  </div>
                  <p className='max-w-sm text-sm text-muted-foreground'>{candidate.action}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className='rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground'>
              No stale order maintenance candidates were found.
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run order maintenance recovery?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reload each affected order and run the existing maintenance helpers. It can
              cancel stale unpaid orders, release expired stock reservations, expire stale courier
              assignments, and write an audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={running} onClick={runRecovery}>
              {running ? 'Running...' : 'Run recovery'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderMaintenanceRecoveryPanel;
