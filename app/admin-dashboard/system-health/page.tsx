import mongoose from 'mongoose';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Database,
  ExternalLink,
  RefreshCw,
  ServerCog,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import Title from '@/components/shared/Title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authOptions } from '@/libs/authOptions';
import { createPageMetadata } from '@/libs/metadata';
import { mongoConnect } from '@/libs/mongoConnect';
import {
  buildSystemHealthSnapshot,
  type SystemHealthCheck,
  type SystemHealthRuntimeItem,
  type SystemHealthTone,
} from '@/libs/systemHealth';
import { cn } from '@/libs/utils';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'System Health',
  description: 'Review production configuration and integration health for the food ordering app.',
  path: '/admin-dashboard/system-health',
  noIndex: true,
});

const toneConfig: Record<
  SystemHealthTone,
  {
    label: string;
    icon: LucideIcon;
    badgeClassName: string;
    panelClassName: string;
    iconClassName: string;
  }
> = {
  success: {
    label: 'Healthy',
    icon: CheckCircle2,
    badgeClassName:
      'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
    panelClassName:
      'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20',
    iconClassName: 'text-emerald-600 dark:text-emerald-300',
  },
  warning: {
    label: 'Needs review',
    icon: AlertTriangle,
    badgeClassName:
      'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
    panelClassName: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20',
    iconClassName: 'text-amber-600 dark:text-amber-300',
  },
  danger: {
    label: 'Action needed',
    icon: XCircle,
    badgeClassName:
      'border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200',
    panelClassName: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
    iconClassName: 'text-red-600 dark:text-red-300',
  },
  neutral: {
    label: 'Optional',
    icon: CircleDashed,
    badgeClassName: 'border-border bg-muted text-muted-foreground',
    panelClassName: 'border-border bg-muted/30',
    iconClassName: 'text-muted-foreground',
  },
};

const getDatabaseHealthCheck = async (): Promise<SystemHealthCheck> => {
  if (!process.env.MONGODB_URL?.trim()) {
    return {
      id: 'mongodb-live',
      label: 'MongoDB live connection',
      description: 'Pings the configured MongoDB database from this server runtime.',
      group: 'Database',
      status: 'danger',
      requirement: 'required',
      configuredVariables: [],
      missingVariables: ['MONGODB_URL'],
      message: 'Missing MONGODB_URL.',
    };
  }

  const startedAt = Date.now();

  try {
    await mongoConnect();

    if (!mongoose.connection.db) {
      throw new Error('MongoDB connection is not ready.');
    }

    await mongoose.connection.db.admin().ping();

    return {
      id: 'mongodb-live',
      label: 'MongoDB live connection',
      description: 'Pings the configured MongoDB database from this server runtime.',
      group: 'Database',
      status: 'success',
      requirement: 'required',
      configuredVariables: ['MONGODB_URL'],
      missingVariables: [],
      message: `Connected in ${Date.now() - startedAt} ms.`,
    };
  } catch {
    return {
      id: 'mongodb-live',
      label: 'MongoDB live connection',
      description: 'Pings the configured MongoDB database from this server runtime.',
      group: 'Database',
      status: 'danger',
      requirement: 'required',
      configuredVariables: ['MONGODB_URL'],
      missingVariables: [],
      message: 'Connection failed. Check MONGODB_URL, database status, and network access.',
    };
  }
};

const SummaryCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: SystemHealthTone;
}) => {
  const config = toneConfig[tone];

  return (
    <Card>
      <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
        <div className={cn('rounded-lg border p-2', config.panelClassName)}>
          <Icon className={cn('size-4', config.iconClassName)} />
        </div>
      </CardHeader>
      <CardContent>
        <p className='text-2xl font-semibold tracking-tight'>{value}</p>
        <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
      </CardContent>
    </Card>
  );
};

const HealthCheckRow = ({ check }: { check: SystemHealthCheck }) => {
  const config = toneConfig[check.status];
  const Icon = config.icon;

  return (
    <div className='flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between'>
      <div className='min-w-0 space-y-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <Icon className={cn('size-4', config.iconClassName)} />
          <p className='font-semibold'>{check.label}</p>
          <Badge variant='outline' className={config.badgeClassName}>
            {config.label}
          </Badge>
          <Badge variant='outline' className='capitalize text-muted-foreground'>
            {check.requirement}
          </Badge>
        </div>
        <p className='text-sm text-muted-foreground'>{check.description}</p>
        <p className='text-sm'>{check.message}</p>
      </div>

      <div className='flex min-w-0 flex-wrap gap-2 sm:max-w-xs sm:justify-end'>
        {check.configuredVariables.map((variable) => (
          <Badge key={variable} variant='outline' className='border-emerald-200 text-emerald-700'>
            {variable}
          </Badge>
        ))}
        {check.missingVariables.map((variable) => (
          <Badge key={variable} variant='outline' className='border-red-200 text-red-700'>
            {variable}
          </Badge>
        ))}
      </div>
    </div>
  );
};

const RuntimeItem = ({ item }: { item: SystemHealthRuntimeItem }) => {
  const config = toneConfig[item.tone || 'neutral'];

  return (
    <div className='rounded-lg border border-border bg-background/60 p-3'>
      <p className='text-xs text-muted-foreground'>{item.label}</p>
      <p className={cn('mt-1 break-words text-sm font-semibold', config.iconClassName)}>
        {item.value}
      </p>
    </div>
  );
};

const SystemHealthPage = async () => {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'admin') {
    redirect('/');
  }

  const snapshot = buildSystemHealthSnapshot({
    databaseCheck: await getDatabaseHealthCheck(),
  });
  const overallConfig = toneConfig[snapshot.overallStatus];
  const OverallIcon = overallConfig.icon;

  return (
    <section className='space-y-6 pb-10'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <Title>System Health</Title>
          <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>
            Review production-critical integrations and environment configuration without exposing
            secret values. Use this page when a deployment, checkout, email, or background job
            behaves differently than expected.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <Badge variant='outline' className={overallConfig.badgeClassName}>
            <OverallIcon className='size-3' />
            {overallConfig.label}
          </Badge>
          <Button asChild variant='outline' className='gap-2'>
            <Link href='/admin-dashboard/system-health'>
              <RefreshCw className='size-4' />
              Refresh
            </Link>
          </Button>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <SummaryCard
          title='Overall status'
          value={overallConfig.label}
          description={`Checked ${new Date(snapshot.checkedAt).toLocaleString()}`}
          icon={Activity}
          tone={snapshot.overallStatus}
        />
        <SummaryCard
          title='Healthy checks'
          value={snapshot.summary.success.toString()}
          description={`${snapshot.summary.total} total checks`}
          icon={CheckCircle2}
          tone='success'
        />
        <SummaryCard
          title='Warnings'
          value={snapshot.summary.warning.toString()}
          description='Recommended services or partial config'
          icon={AlertTriangle}
          tone={snapshot.summary.warning > 0 ? 'warning' : 'success'}
        />
        <SummaryCard
          title='Action needed'
          value={snapshot.summary.danger.toString()}
          description='Required checks that need attention'
          icon={XCircle}
          tone={snapshot.summary.danger > 0 ? 'danger' : 'success'}
        />
      </div>

      <Card className={overallConfig.panelClassName}>
        <CardHeader>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <CardTitle>Runtime Snapshot</CardTitle>
              <p className='mt-2 text-sm text-muted-foreground'>
                Safe runtime metadata for the current server environment.
              </p>
            </div>
            <ServerCog className='size-5 shrink-0 text-muted-foreground' />
          </div>
        </CardHeader>
        <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {snapshot.runtime.map((item) => (
            <RuntimeItem key={item.label} item={item} />
          ))}
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-2'>
        {snapshot.groups.map((group) => (
          <Card key={group.group}>
            <CardHeader>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <CardTitle>{group.group}</CardTitle>
                  <p className='mt-2 text-sm text-muted-foreground'>
                    {group.checks.length} checks in this area.
                  </p>
                </div>
                {group.group === 'Database' ? (
                  <Database className='size-5 shrink-0 text-muted-foreground' />
                ) : (
                  <ServerCog className='size-5 shrink-0 text-muted-foreground' />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {group.checks.map((check) => (
                <HealthCheckRow key={check.id} check={check} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to use this page</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 text-sm text-muted-foreground'>
          <p>
            Missing required checks usually explain broken login, checkout, uploads, or database
            behavior. Missing recommended checks do not always break the app, but they reduce
            production safety or disable a feature.
          </p>
          <p>
            In Vercel, add missing variables to the environment where the problem happens
            (Production, Preview, or Development), redeploy, then refresh this page.
          </p>
          <Button asChild variant='outline' className='gap-2'>
            <Link href='/admin-dashboard/audit-logs'>
              Open audit logs
              <ExternalLink className='size-4' />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
};

export default SystemHealthPage;
