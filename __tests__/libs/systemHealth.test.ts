import { describe, expect, it } from 'vitest';
import {
  buildSystemHealthEnvChecks,
  buildSystemHealthRuntime,
  buildSystemHealthSnapshot,
  type SystemHealthCheck,
} from '@/libs/systemHealth';

const completeEnv = {
  NODE_ENV: 'production',
  MONGODB_URL: 'mongodb://example',
  MONGODB_URL_TESTS: 'mongodb://example-tests',
  NEXTAUTH_URL: 'https://example.com',
  NEXTAUTH_SECRET: 'secret',
  GOOGLE_CLIENT_ID: 'google-client',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  NEXT_PUBLIC_SUPER_ADMIN_EMAIL: 'admin@example.com',
  STRIPE_PK: 'pk_test_example',
  STRIPE_SK: 'sk_test_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  RESEND_API_KEY: 'resend',
  SENDER_EMAIL: 'sender@example.com',
  RESEND_RECEIVER_EMAIL: 'receiver@example.com',
  OPEN_AI_API_KEY: 'openai',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  QSTASH_URL: 'https://qstash.example.com',
  QSTASH_TOKEN: 'qstash-token',
  QSTASH_CURRENT_SIGNING_KEY: 'current',
  QSTASH_NEXT_SIGNING_KEY: 'next',
  NEXT_PUBLIC_SENTRY_DSN: 'https://public@example.com/1',
  SENTRY_DSN: 'https://server@example.com/1',
  SENTRY_AUTH_TOKEN: 'sentry-token',
  NEXT_PUBLIC_APP_URL: 'https://example.com',
  VERCEL_ENV: 'production',
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890',
  VERCEL_REGION: 'fra1',
};

const databaseCheck: SystemHealthCheck = {
  id: 'mongodb-live',
  label: 'MongoDB live connection',
  description: 'Pings MongoDB.',
  group: 'Database',
  status: 'success',
  requirement: 'required',
  configuredVariables: ['MONGODB_URL'],
  missingVariables: [],
  message: 'Connected.',
};

describe('systemHealth', () => {
  it('marks fully configured required integrations as healthy', () => {
    const checks = buildSystemHealthEnvChecks(completeEnv);

    expect(checks.find((check) => check.id === 'stripe')?.status).toBe('success');
    expect(checks.find((check) => check.id === 'nextauth-runtime')?.status).toBe('success');
    expect(checks.find((check) => check.id === 'upstash-qstash')?.status).toBe('success');
  });

  it('marks missing required integrations as danger without exposing values', () => {
    const checks = buildSystemHealthEnvChecks({
      NODE_ENV: 'production',
      NEXTAUTH_URL: 'https://example.com',
    });
    const stripeCheck = checks.find((check) => check.id === 'stripe');

    expect(stripeCheck?.status).toBe('danger');
    expect(stripeCheck?.missingVariables).toEqual([
      'STRIPE_PK',
      'STRIPE_SK',
      'STRIPE_WEBHOOK_SECRET',
    ]);
    expect(stripeCheck?.message).toContain('STRIPE_PK');
    expect(stripeCheck?.message).not.toContain('sk_test');
  });

  it('builds an overall snapshot from env and live database checks', () => {
    const snapshot = buildSystemHealthSnapshot({
      checkedAt: new Date('2026-09-10T10:00:00.000Z'),
      databaseCheck,
      env: completeEnv,
    });

    expect(snapshot.overallStatus).toBe('success');
    expect(snapshot.checkedAt).toBe('2026-09-10T10:00:00.000Z');
    expect(snapshot.summary.danger).toBe(0);
    expect(snapshot.groups.find((group) => group.group === 'Database')?.checks[0]).toEqual(
      databaseCheck
    );
  });

  it('keeps runtime metadata safe and short', () => {
    const runtime = buildSystemHealthRuntime(completeEnv);

    expect(runtime.find((item) => item.label === 'Git commit')?.value).toBe('abcdef1');
    expect(runtime.find((item) => item.label === 'Public app URL')?.value).toBe(
      'https://example.com'
    );
  });
});
