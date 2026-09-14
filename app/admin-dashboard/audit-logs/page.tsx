'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Eye, FilterX, Search, X } from 'lucide-react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createDataTableColumnHelper,
  TanStackDataTable,
  type DataTableColumnDef,
} from '@/components/shared/TanStackDataTable';
import Title from '@/components/shared/Title';
import useProfile from '@/hooks/useProfile';
import { formatAppDateTime } from '@/libs/dateFormat';
import { cn } from '@/libs/utils';
import type { AuditLogItem } from '@/types/audit-log';

const ALL_FILTER_VALUE = 'all';
const AUDIT_LOGS_LIMIT = 20;

type AuditLogsFilters = {
  availableActions: string[];
  availableEntityTypes: string[];
};

type AuditLogsResponse = {
  logs: AuditLogItem[];
  page: number;
  totalPages: number;
  totalLogs: number;
  filters?: AuditLogsFilters;
};

const formatActionLabel = (action: string) =>
  action
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatEntityLabel = (entityType: string) =>
  entityType.charAt(0).toUpperCase() + entityType.slice(1);

const getActionBadgeClassName = (action: string) => {
  const normalizedAction = action.toLowerCase();

  if (
    normalizedAction.includes('delete') ||
    normalizedAction.includes('removed') ||
    normalizedAction.includes('cancel')
  ) {
    return 'border-red-500/35 bg-red-500/15 text-red-300';
  }

  if (
    normalizedAction.includes('role') ||
    normalizedAction.includes('admin') ||
    normalizedAction.includes('courier')
  ) {
    return 'border-amber-500/35 bg-amber-500/15 text-amber-300';
  }

  if (normalizedAction.includes('create')) {
    return 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300';
  }

  if (normalizedAction.includes('update') || normalizedAction.includes('paid')) {
    return 'border-sky-500/35 bg-sky-500/15 text-sky-300';
  }

  return 'border-white/15 bg-muted text-muted-foreground';
};

const getMetadataEntries = (metadata: Record<string, unknown>) =>
  Object.entries(metadata || {}).filter(([, value]) => value !== undefined);

const stringifyMetadata = (metadata: Record<string, unknown>) => {
  try {
    return JSON.stringify(metadata || {}, null, 2);
  } catch {
    return 'Unable to display metadata.';
  }
};

const AuditLogDetailsDialog = ({ log }: { log: AuditLogItem }) => {
  const metadataEntries = getMetadataEntries(log.metadata);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type='button'
          data-slot='button'
          className='inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45'
          aria-label={`View details for ${log.action || 'audit log'}`}
          title='View details'
        >
          <Eye className='size-4' aria-hidden='true' />
        </button>
      </DialogTrigger>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Audit log details</DialogTitle>
          <DialogDescription>
            Full context for this audit event without stretching the table row.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2'>
          <div>
            <p className='text-muted-foreground'>Action</p>
            <p className='font-medium'>{log.action || '-'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Time</p>
            <p className='font-medium'>{formatAppDateTime(log.createdAt, 'Unknown')}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Actor</p>
            <p className='font-medium'>{log.actorEmail || 'System'}</p>
            <p className='text-xs text-muted-foreground'>{log.actorRole || '-'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Entity</p>
            <p className='font-medium'>{log.entityType || '-'}</p>
            <p className='font-mono text-xs text-muted-foreground'>{log.entityId || '-'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Restaurant ID</p>
            <p className='font-mono text-xs'>{log.restaurantId || '-'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Order ID</p>
            <p className='font-mono text-xs'>{log.orderId || '-'}</p>
          </div>
        </div>

        <div className='space-y-3'>
          <h3 className='text-sm font-semibold'>Metadata</h3>
          {metadataEntries.length ? (
            <div className='grid gap-2 sm:grid-cols-2'>
              {metadataEntries.map(([key, value]) => (
                <div key={key} className='rounded-lg border border-border bg-muted/20 p-3'>
                  <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                    {key}
                  </p>
                  <p className='mt-1 break-words text-sm'>
                    {typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : String(value)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>No metadata was saved for this event.</p>
          )}

          <pre className='max-h-72 overflow-auto rounded-lg border border-border bg-black/30 p-4 text-xs text-muted-foreground'>
            {stringifyMetadata(log.metadata)}
          </pre>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
};

const columnHelper = createDataTableColumnHelper<AuditLogItem>();

const auditLogColumns = columnHelper.columns([
  columnHelper.accessor((log) => (log.createdAt ? new Date(log.createdAt).getTime() : 0), {
    id: 'createdAt',
    header: 'Time',
    sortDescFirst: true,
    cell: ({ row }) => formatAppDateTime(row.original.createdAt, 'Unknown'),
  }),
  columnHelper.accessor((log) => log.action, {
    id: 'action',
    header: 'Action',
    cell: ({ getValue }) => {
      const action = String(getValue() || '');

      return (
        <Badge variant='outline' className={cn('font-medium', getActionBadgeClassName(action))}>
          {formatActionLabel(action) || 'Unknown'}
        </Badge>
      );
    },
  }),
  columnHelper.accessor((log) => `${log.actorEmail || 'System'} ${log.actorRole || ''}`, {
    id: 'actor',
    header: 'Actor',
    cell: ({ row }) => (
      <div>
        <div className='font-medium'>{row.original.actorEmail || 'System'}</div>
        <div className='text-xs text-muted-foreground'>{row.original.actorRole || '-'}</div>
      </div>
    ),
  }),
  columnHelper.accessor((log) => `${log.entityType} ${log.entityId || ''}`, {
    id: 'entity',
    header: 'Entity',
    cell: ({ row }) => (
      <div>
        <div className='font-medium'>{formatEntityLabel(row.original.entityType || 'unknown')}</div>
        <div className='font-mono text-xs text-muted-foreground'>
          {row.original.entityId || '-'}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor((log) => getMetadataEntries(log.metadata).length, {
    id: 'metadata',
    header: 'Metadata',
    cell: ({ row, getValue }) => (
      <div className='flex items-center justify-between gap-3'>
        <span className='text-sm text-muted-foreground'>{getValue()} fields</span>
        <AuditLogDetailsDialog log={row.original} />
      </div>
    ),
  }),
]) satisfies DataTableColumnDef<AuditLogItem>[];

const auditLogColumnLabels = {
  action: 'Action',
  actor: 'Actor',
  createdAt: 'Time',
  entity: 'Entity',
  metadata: 'Metadata',
};

const buildAuditLogsUrl = ({
  action,
  actorEmail,
  entityType,
  page,
  search,
}: {
  action: string;
  actorEmail: string;
  entityType: string;
  page: number;
  search: string;
}) => {
  const params = new URLSearchParams({
    limit: String(AUDIT_LOGS_LIMIT),
    page: String(page),
  });

  if (search.trim()) params.set('q', search.trim());
  if (action !== ALL_FILTER_VALUE) params.set('action', action);
  if (actorEmail.trim()) params.set('actorEmail', actorEmail.trim());
  if (entityType !== ALL_FILTER_VALUE) params.set('entityType', entityType);

  return `/api/audit-logs?${params.toString()}`;
};

const AuditLogsPageContent = () => {
  const router = useRouter();
  const { data: profileData, loading: profileLoading } = useProfile();
  const [auditLogQuery, setAuditLogQuery] = useQueryStates({
    action: parseAsString.withDefault(ALL_FILTER_VALUE),
    actorEmail: parseAsString.withDefault(''),
    entityType: parseAsString.withDefault(ALL_FILTER_VALUE),
    page: parseAsInteger.withDefault(1),
    q: parseAsString.withDefault(''),
  });
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [filters, setFilters] = useState<AuditLogsFilters>({
    availableActions: [],
    availableEntityTypes: [],
  });
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = profileData?.role === 'admin';
  const isSuperAdmin = isAdmin && profileData?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const page = Math.max(1, auditLogQuery.page);
  const searchQuery = auditLogQuery.q;
  const actionFilter = auditLogQuery.action;
  const actorEmailFilter = auditLogQuery.actorEmail;
  const entityTypeFilter = auditLogQuery.entityType;
  const [draftSearchQuery, setDraftSearchQuery] = useState(searchQuery);
  const [draftActionFilter, setDraftActionFilter] = useState(actionFilter);
  const [draftActorEmailFilter, setDraftActorEmailFilter] = useState(actorEmailFilter);
  const [draftEntityTypeFilter, setDraftEntityTypeFilter] = useState(entityTypeFilter);
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(actorEmailFilter.trim()) ||
    actionFilter !== ALL_FILTER_VALUE ||
    entityTypeFilter !== ALL_FILTER_VALUE;
  const hasDraftFilters =
    Boolean(draftSearchQuery.trim()) ||
    Boolean(draftActorEmailFilter.trim()) ||
    draftActionFilter !== ALL_FILTER_VALUE ||
    draftEntityTypeFilter !== ALL_FILTER_VALUE;
  const hasPendingFilterChanges =
    draftSearchQuery !== searchQuery ||
    draftActorEmailFilter !== actorEmailFilter ||
    draftActionFilter !== actionFilter ||
    draftEntityTypeFilter !== entityTypeFilter;

  const actionOptions = useMemo(
    () =>
      actionFilter !== ALL_FILTER_VALUE && !filters.availableActions.includes(actionFilter)
        ? [actionFilter, ...filters.availableActions.filter(Boolean)]
        : filters.availableActions.filter(Boolean),
    [actionFilter, filters.availableActions]
  );
  const entityTypeOptions = useMemo(
    () =>
      entityTypeFilter !== ALL_FILTER_VALUE &&
      !filters.availableEntityTypes.includes(entityTypeFilter)
        ? [entityTypeFilter, ...filters.availableEntityTypes.filter(Boolean)]
        : filters.availableEntityTypes.filter(Boolean),
    [entityTypeFilter, filters.availableEntityTypes]
  );

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    if (!isAdmin) {
      router.push('/');
      return;
    }

    if (!isSuperAdmin) {
      router.push('/admin-dashboard');
    }
  }, [isAdmin, isSuperAdmin, profileLoading, router]);

  useEffect(() => {
    if (profileLoading || !isSuperAdmin) {
      return;
    }

    const controller = new AbortController();

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          buildAuditLogsUrl({
            action: actionFilter,
            actorEmail: actorEmailFilter,
            entityType: entityTypeFilter,
            page,
            search: searchQuery,
          }),
          { signal: controller.signal }
        );
        const json = (await response.json()) as Partial<AuditLogsResponse> & { error?: string };

        if (!response.ok) {
          throw new Error(json.error || 'Failed to load audit logs');
        }

        setLogs(Array.isArray(json.logs) ? json.logs : []);
        setFilters({
          availableActions: json.filters?.availableActions || [],
          availableEntityTypes: json.filters?.availableEntityTypes || [],
        });
        setTotalLogs(Number(json.totalLogs || 0));
        setTotalPages(Number(json.totalPages || 1));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchLogs();

    return () => controller.abort();
  }, [
    actionFilter,
    actorEmailFilter,
    entityTypeFilter,
    isSuperAdmin,
    page,
    profileLoading,
    searchQuery,
  ]);

  useEffect(() => {
    setDraftSearchQuery(searchQuery);
    setDraftActionFilter(actionFilter);
    setDraftActorEmailFilter(actorEmailFilter);
    setDraftEntityTypeFilter(entityTypeFilter);
  }, [actionFilter, actorEmailFilter, entityTypeFilter, searchQuery]);

  const setFilter = (nextQuery: Partial<typeof auditLogQuery>) => {
    void setAuditLogQuery({ ...nextQuery, page: 1 });
  };

  const applyFilters = () => {
    void setAuditLogQuery({
      action: draftActionFilter,
      actorEmail: draftActorEmailFilter,
      entityType: draftEntityTypeFilter,
      page: 1,
      q: draftSearchQuery,
    });
  };

  const resetFilters = () => {
    setDraftSearchQuery('');
    setDraftActionFilter(ALL_FILTER_VALUE);
    setDraftActorEmailFilter('');
    setDraftEntityTypeFilter(ALL_FILTER_VALUE);
    void setAuditLogQuery({
      action: ALL_FILTER_VALUE,
      actorEmail: '',
      entityType: ALL_FILTER_VALUE,
      page: 1,
      q: '',
    });
  };

  const clearAppliedFilter = (filterName: 'action' | 'actorEmail' | 'entityType' | 'q') => {
    if (filterName === 'q') {
      setDraftSearchQuery('');
      void setAuditLogQuery({ page: 1, q: '' });
      return;
    }

    if (filterName === 'action') {
      setDraftActionFilter(ALL_FILTER_VALUE);
      void setAuditLogQuery({ action: ALL_FILTER_VALUE, page: 1 });
      return;
    }

    if (filterName === 'entityType') {
      setDraftEntityTypeFilter(ALL_FILTER_VALUE);
      void setAuditLogQuery({ entityType: ALL_FILTER_VALUE, page: 1 });
      return;
    }

    setDraftActorEmailFilter('');
    void setAuditLogQuery({ actorEmail: '', page: 1 });
  };

  if (profileLoading || (isSuperAdmin && loading && logs.length === 0)) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-40' />
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-36' />
            <Skeleton className='h-4 w-72 max-w-full' />
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex flex-wrap gap-3'>
              <Skeleton className='h-10 w-60' />
              <Skeleton className='h-10 w-48' />
              <Skeleton className='h-10 w-48' />
              <Skeleton className='h-10 w-48' />
            </div>
            {[...Array(6)].map((_, index) => (
              <Skeleton key={index} className='h-12 w-full' />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <p className='text-sm text-muted-foreground'>Redirecting...</p>;
  }

  return (
    <div className='space-y-6'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/admin-dashboard'>Admin Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Audit Logs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Title>Audit Logs</Title>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Review superadmin and restaurant-level actions with focused filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
              <p>{error}</p>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='mt-3'
                onClick={() => setFilter({})}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <form
                className='mb-4 space-y-3 rounded-xl border border-white/10 bg-background/40 p-4'
                onSubmit={(event) => {
                  event.preventDefault();
                  applyFilters();
                }}
              >
                <div className='flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center'>
                  <label className='sr-only' htmlFor='audit-log-search'>
                    Search audit logs
                  </label>
                  <div className='relative w-full max-w-3xl'>
                    <Search
                      className='pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground'
                      aria-hidden='true'
                    />
                    <Input
                      id='audit-log-search'
                      type='text'
                      value={draftSearchQuery}
                      onChange={(event) => setDraftSearchQuery(event.target.value)}
                      placeholder='Search by actor, action, entity, or id...'
                      className='h-11 rounded-full bg-background/80 pl-11 pr-11'
                    />
                    {draftSearchQuery ? (
                      <button
                        type='button'
                        data-slot='button'
                        onClick={() => setDraftSearchQuery('')}
                        className='absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground'
                        aria-label='Clear audit log search'
                      >
                        <X className='size-4' aria-hidden='true' />
                      </button>
                    ) : null}
                  </div>
                  <span className='shrink-0 text-sm text-muted-foreground'>
                    {logs.length} of {totalLogs} rows
                  </span>
                </div>

                <div className='grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[14rem_13rem_minmax(16rem,1fr)_auto] xl:items-center'>
                  <Select
                    value={draftActionFilter}
                    onValueChange={(value) => setDraftActionFilter(value)}
                  >
                    <SelectTrigger className='h-10 w-full rounded-full bg-background/80'>
                      <SelectValue placeholder='Action type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>All actions</SelectItem>
                      {actionOptions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {formatActionLabel(action)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={draftEntityTypeFilter}
                    onValueChange={(value) => setDraftEntityTypeFilter(value)}
                  >
                    <SelectTrigger className='h-10 w-full rounded-full bg-background/80'>
                      <SelectValue placeholder='Entity type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>All entities</SelectItem>
                      {entityTypeOptions.map((entityType) => (
                        <SelectItem key={entityType} value={entityType}>
                          {formatEntityLabel(entityType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type='email'
                    value={draftActorEmailFilter}
                    onChange={(event) => setDraftActorEmailFilter(event.target.value)}
                    placeholder='Actor email'
                    className='h-10 rounded-full bg-background/80 sm:col-span-2 xl:col-span-1'
                  />

                  <div className='flex min-w-0 gap-2 sm:col-span-2 xl:col-span-1'>
                    <Button
                      type='submit'
                      className='h-10 flex-1 gap-2 rounded-full px-4'
                      disabled={!hasPendingFilterChanges || loading}
                    >
                      <Search className='size-4' aria-hidden='true' />
                      {loading ? 'Searching...' : 'Search'}
                    </Button>

                    <Button
                      type='button'
                      variant='outline'
                      className='h-10 flex-1 gap-2 rounded-full px-4'
                      disabled={(!hasActiveFilters && !hasDraftFilters) || loading}
                      onClick={resetFilters}
                    >
                      <FilterX className='size-4' aria-hidden='true' />
                      Reset
                    </Button>
                  </div>
                </div>

                {hasActiveFilters ? (
                  <div className='flex flex-wrap items-center gap-2 border-t border-white/10 pt-3'>
                    <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                      Applied
                    </span>

                    {searchQuery.trim() ? (
                      <Badge
                        variant='outline'
                        className='gap-1 rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-primary'
                      >
                        Search: {searchQuery}
                        <button
                          type='button'
                          data-slot='button'
                          className='ml-1 grid size-4 cursor-pointer place-items-center rounded-full hover:bg-primary/15'
                          onClick={() => clearAppliedFilter('q')}
                          aria-label='Remove search filter'
                        >
                          <X className='size-3' aria-hidden='true' />
                        </button>
                      </Badge>
                    ) : null}

                    {actionFilter !== ALL_FILTER_VALUE ? (
                      <Badge
                        variant='outline'
                        className='gap-1 rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-primary'
                      >
                        Action: {formatActionLabel(actionFilter)}
                        <button
                          type='button'
                          data-slot='button'
                          className='ml-1 grid size-4 cursor-pointer place-items-center rounded-full hover:bg-primary/15'
                          onClick={() => clearAppliedFilter('action')}
                          aria-label='Remove action filter'
                        >
                          <X className='size-3' aria-hidden='true' />
                        </button>
                      </Badge>
                    ) : null}

                    {entityTypeFilter !== ALL_FILTER_VALUE ? (
                      <Badge
                        variant='outline'
                        className='gap-1 rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-primary'
                      >
                        Entity: {formatEntityLabel(entityTypeFilter)}
                        <button
                          type='button'
                          data-slot='button'
                          className='ml-1 grid size-4 cursor-pointer place-items-center rounded-full hover:bg-primary/15'
                          onClick={() => clearAppliedFilter('entityType')}
                          aria-label='Remove entity filter'
                        >
                          <X className='size-3' aria-hidden='true' />
                        </button>
                      </Badge>
                    ) : null}

                    {actorEmailFilter.trim() ? (
                      <Badge
                        variant='outline'
                        className='gap-1 rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-primary'
                      >
                        Actor: {actorEmailFilter}
                        <button
                          type='button'
                          data-slot='button'
                          className='ml-1 grid size-4 cursor-pointer place-items-center rounded-full hover:bg-primary/15'
                          onClick={() => clearAppliedFilter('actorEmail')}
                          aria-label='Remove actor email filter'
                        >
                          <X className='size-3' aria-hidden='true' />
                        </button>
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </form>

              <TanStackDataTable
                columns={auditLogColumns}
                data={logs}
                tableKey='audit-logs'
                emptyMessage='No audit logs match these filters.'
                initialSorting={[{ id: 'createdAt', desc: true }]}
                minWidthClassName='min-w-[980px]'
                columnLabels={auditLogColumnLabels}
                showPagination={false}
                showToolbar={false}
                getCellClassName={(columnId) =>
                  columnId === 'createdAt'
                    ? 'whitespace-nowrap'
                    : columnId === 'metadata'
                      ? 'whitespace-nowrap'
                      : ''
                }
              />
            </>
          )}

          <div className='mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
            <span>
              Showing page {page} of {totalPages} ({totalLogs} matching logs)
            </span>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                disabled={page <= 1 || loading}
                onClick={() => void setAuditLogQuery({ page: Math.max(1, page - 1) })}
              >
                Previous
              </Button>
              <Button
                type='button'
                variant='outline'
                disabled={page >= totalPages || loading}
                onClick={() => void setAuditLogQuery({ page: Math.min(totalPages, page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AuditLogsPage = () => (
  <Suspense fallback={<p className='text-sm text-muted-foreground'>Loading audit logs...</p>}>
    <AuditLogsPageContent />
  </Suspense>
);

export default AuditLogsPage;
