export type SystemHealthTone = 'success' | 'warning' | 'danger' | 'neutral';

export type SystemHealthRequirement = 'required' | 'recommended' | 'optional';

export type SystemHealthCheck = {
  id: string;
  label: string;
  description: string;
  group: string;
  status: SystemHealthTone;
  requirement: SystemHealthRequirement;
  configuredVariables: string[];
  missingVariables: string[];
  message: string;
};

export type SystemHealthRuntimeItem = {
  label: string;
  value: string;
  tone?: SystemHealthTone;
};

export type SystemHealthSnapshot = {
  checkedAt: string;
  overallStatus: SystemHealthTone;
  summary: {
    total: number;
    success: number;
    warning: number;
    danger: number;
    neutral: number;
  };
  groups: Array<{
    group: string;
    checks: SystemHealthCheck[];
  }>;
  runtime: SystemHealthRuntimeItem[];
};

type EnvRecord = Record<string, string | undefined>;

type EnvCheckDefinition = {
  id: string;
  label: string;
  description: string;
  group: string;
  variables: string[];
  requirement: SystemHealthRequirement;
  mode?: 'all' | 'any';
  successMessage?: string;
  missingMessage?: string;
  partialMessage?: string;
};

const envCheckDefinitions: EnvCheckDefinition[] = [
  {
    id: 'mongodb-url',
    label: 'MongoDB URL',
    description: 'Main application database connection string.',
    group: 'Database',
    variables: ['MONGODB_URL'],
    requirement: 'required',
  },
  {
    id: 'mongodb-tests-url',
    label: 'MongoDB tests URL',
    description: 'Separate database used by integration tests.',
    group: 'Database',
    variables: ['MONGODB_URL_TESTS'],
    requirement: 'optional',
    missingMessage: 'Optional. Add it when running database-backed tests locally or in CI.',
  },
  {
    id: 'nextauth-runtime',
    label: 'NextAuth runtime',
    description: 'Required for session cookies, JWT signing, and callback URLs.',
    group: 'Authentication',
    variables: ['NEXTAUTH_URL', 'NEXTAUTH_SECRET'],
    requirement: 'required',
  },
  {
    id: 'google-oauth',
    label: 'Google OAuth',
    description: 'Enables Google sign-in in addition to credentials login.',
    group: 'Authentication',
    variables: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    requirement: 'recommended',
    missingMessage: 'Credentials login can still work, but Google login is not fully configured.',
  },
  {
    id: 'super-admin-ui',
    label: 'Super admin email',
    description: 'Controls super-admin UI access and elevated platform actions.',
    group: 'Authentication',
    variables: ['NEXT_PUBLIC_SUPER_ADMIN_EMAIL'],
    requirement: 'recommended',
  },
  {
    id: 'stripe',
    label: 'Stripe payments',
    description: 'Required for checkout session creation and webhook verification.',
    group: 'Payments',
    variables: ['STRIPE_PK', 'STRIPE_SK', 'STRIPE_WEBHOOK_SECRET'],
    requirement: 'required',
  },
  {
    id: 'cloudinary',
    label: 'Cloudinary uploads',
    description: 'Required for user, restaurant, and menu item image uploads.',
    group: 'Media',
    variables: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    requirement: 'recommended',
  },
  {
    id: 'resend',
    label: 'Resend email',
    description: 'Sends verification, password reset, and receipt emails.',
    group: 'Email',
    variables: ['RESEND_API_KEY', 'SENDER_EMAIL'],
    requirement: 'recommended',
  },
  {
    id: 'resend-receiver',
    label: 'Resend receiver override',
    description: 'Optional local/testing receiver address for safe email testing.',
    group: 'Email',
    variables: ['RESEND_RECEIVER_EMAIL'],
    requirement: 'optional',
    missingMessage: 'Optional. Production can send to the real order/customer email flow.',
  },
  {
    id: 'openai',
    label: 'OpenAI menu descriptions',
    description: 'Enables the AI helper for menu item descriptions.',
    group: 'AI',
    variables: ['OPEN_AI_API_KEY'],
    requirement: 'recommended',
    missingMessage: 'AI description generation is unavailable until this is configured.',
  },
  {
    id: 'upstash-redis',
    label: 'Upstash Redis rate limits',
    description: 'Stores rate-limit counters for auth, checkout, support, and AI endpoints.',
    group: 'Automation',
    variables: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    requirement: 'recommended',
    missingMessage: 'The app can fail open, but sensitive routes are less protected.',
  },
  {
    id: 'upstash-qstash',
    label: 'Upstash QStash jobs',
    description: 'Schedules delayed order maintenance checks for unpaid orders and courier flows.',
    group: 'Automation',
    variables: ['QSTASH_TOKEN', 'QSTASH_CURRENT_SIGNING_KEY', 'QSTASH_NEXT_SIGNING_KEY'],
    requirement: 'recommended',
    missingMessage:
      'Order APIs still apply fallback checks, but delayed production jobs are disabled.',
  },
  {
    id: 'qstash-url',
    label: 'QStash base URL',
    description: 'Optional regional QStash endpoint override.',
    group: 'Automation',
    variables: ['QSTASH_URL'],
    requirement: 'optional',
    missingMessage: 'Optional. The package default endpoint can be used when this is missing.',
  },
  {
    id: 'sentry-dsn',
    label: 'Sentry monitoring',
    description: 'Captures browser/server errors and traces.',
    group: 'Observability',
    variables: ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN'],
    requirement: 'recommended',
  },
  {
    id: 'sentry-source-maps',
    label: 'Sentry source maps',
    description: 'Uploads production source maps during builds for readable stack traces.',
    group: 'Observability',
    variables: ['SENTRY_AUTH_TOKEN'],
    requirement: 'optional',
    missingMessage:
      'Optional for local development. Add it in CI/Vercel for production source maps.',
  },
];

const isConfigured = (value: string | undefined) => Boolean(value?.trim());

const getCheckStatus = (
  definition: EnvCheckDefinition,
  configuredVariables: string[],
  missingVariables: string[]
): SystemHealthTone => {
  if (missingVariables.length === 0) {
    return 'success';
  }

  if (configuredVariables.length > 0) {
    return definition.requirement === 'required' ? 'danger' : 'warning';
  }

  if (definition.requirement === 'required') {
    return 'danger';
  }

  if (definition.requirement === 'recommended') {
    return 'warning';
  }

  return 'neutral';
};

const getCheckMessage = (
  definition: EnvCheckDefinition,
  configuredVariables: string[],
  missingVariables: string[]
) => {
  if (missingVariables.length === 0) {
    return definition.successMessage || 'Configured.';
  }

  if (configuredVariables.length > 0) {
    return (
      definition.partialMessage || `Partially configured. Missing: ${missingVariables.join(', ')}.`
    );
  }

  return definition.missingMessage || `Missing: ${missingVariables.join(', ')}.`;
};

export const buildSystemHealthEnvChecks = (env: EnvRecord = process.env) =>
  envCheckDefinitions.map((definition): SystemHealthCheck => {
    const configuredVariables = definition.variables.filter((variable) =>
      isConfigured(env[variable])
    );
    const missingVariables = definition.variables.filter(
      (variable) => !isConfigured(env[variable])
    );
    const effectiveConfigured =
      definition.mode === 'any' ? configuredVariables.length > 0 : missingVariables.length === 0;
    const effectiveMissingVariables =
      definition.mode === 'any' && effectiveConfigured ? [] : missingVariables;

    return {
      id: definition.id,
      label: definition.label,
      description: definition.description,
      group: definition.group,
      status: getCheckStatus(definition, configuredVariables, effectiveMissingVariables),
      requirement: definition.requirement,
      configuredVariables,
      missingVariables: effectiveMissingVariables,
      message: getCheckMessage(definition, configuredVariables, effectiveMissingVariables),
    };
  });

const shortValue = (value: string | undefined, fallback = 'Not available') =>
  value?.trim() || fallback;

const getShortCommit = (env: EnvRecord) => {
  const sha = env.VERCEL_GIT_COMMIT_SHA?.trim();

  return sha ? sha.slice(0, 7) : 'Not available';
};

export const buildSystemHealthRuntime = (
  env: EnvRecord = process.env
): SystemHealthRuntimeItem[] => [
  {
    label: 'Node environment',
    value: shortValue(env.NODE_ENV, 'development'),
    tone: env.NODE_ENV === 'production' ? 'success' : 'neutral',
  },
  {
    label: 'Vercel environment',
    value: shortValue(env.VERCEL_ENV, 'local'),
  },
  {
    label: 'Region',
    value: shortValue(env.VERCEL_REGION, 'local'),
  },
  {
    label: 'Public app URL',
    value: shortValue(env.NEXT_PUBLIC_APP_URL),
    tone: isConfigured(env.NEXT_PUBLIC_APP_URL) ? 'success' : 'warning',
  },
  {
    label: 'NextAuth URL',
    value: shortValue(env.NEXTAUTH_URL),
    tone: isConfigured(env.NEXTAUTH_URL) ? 'success' : 'danger',
  },
  {
    label: 'Git branch',
    value: shortValue(env.VERCEL_GIT_COMMIT_REF, 'local'),
  },
  {
    label: 'Git commit',
    value: getShortCommit(env),
  },
  {
    label: 'Node version',
    value: shortValue(process.version),
  },
];

const groupChecks = (checks: SystemHealthCheck[]) => {
  const groups = new Map<string, SystemHealthCheck[]>();

  checks.forEach((check) => {
    groups.set(check.group, [...(groups.get(check.group) || []), check]);
  });

  return Array.from(groups.entries()).map(([group, groupChecks]) => ({
    group,
    checks: groupChecks,
  }));
};

const getOverallStatus = (checks: SystemHealthCheck[]): SystemHealthTone => {
  if (checks.some((check) => check.status === 'danger')) {
    return 'danger';
  }

  if (checks.some((check) => check.status === 'warning')) {
    return 'warning';
  }

  return 'success';
};

export const buildSystemHealthSnapshot = ({
  checkedAt = new Date(),
  databaseCheck,
  env = process.env,
}: {
  checkedAt?: Date;
  databaseCheck?: SystemHealthCheck;
  env?: EnvRecord;
} = {}): SystemHealthSnapshot => {
  const checks = buildSystemHealthEnvChecks(env);
  const allChecks = databaseCheck ? [databaseCheck, ...checks] : checks;

  return {
    checkedAt: checkedAt.toISOString(),
    overallStatus: getOverallStatus(allChecks),
    summary: {
      total: allChecks.length,
      success: allChecks.filter((check) => check.status === 'success').length,
      warning: allChecks.filter((check) => check.status === 'warning').length,
      danger: allChecks.filter((check) => check.status === 'danger').length,
      neutral: allChecks.filter((check) => check.status === 'neutral').length,
    },
    groups: groupChecks(allChecks),
    runtime: buildSystemHealthRuntime(env),
  };
};
