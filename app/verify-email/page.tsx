import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

type VerifyEmailPageProps = {
  searchParams?: Promise<{ email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const defaultEmail = resolvedSearchParams?.email || '';

  return (
    <Suspense fallback={null}>
      <VerifyEmailClient defaultEmail={defaultEmail} />
    </Suspense>
  );
}
