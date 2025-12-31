'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Title from '@/components/shared/Title';
import LoginUserForm from './LoginUserForm';
import LoginLoading from './loading';

const LoginPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <LoginLoading />;
  }

  if (status === 'authenticated') {
    return null;
  }

  return (
    <section className='mt-8 w-full sm:w-xl md:w-2xl lg:w-3xl max-w-3xl mx-auto px-4'>
      <div className='text-center mb-8'>
        <Title className='text-4xl'>Login</Title>
      </div>
      <LoginUserForm />
    </section>
  );
};

export default LoginPage;
