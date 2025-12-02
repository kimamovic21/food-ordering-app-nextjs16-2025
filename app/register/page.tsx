'use client';

import { useState } from 'react';
import GoogleIcon from '@/public/google.png';
import Image from 'next/image';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  return (
    <section className='mt-8 '>
      <h2 className='text-center text-primary text-4xl mb-4'>
        Register
      </h2>

      <form
        className='block max-w-xs mx-auto'
        onSubmit={handleFormSubmit}
      >
        <input
          type='text'
          placeholder='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type='password'
          placeholder='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button type='submit'>
          Register
        </button>
        <p className='my-4 text-center text-gray-500'>
          or login with provider
        </p>
        <button className='flex items-center gap-4'>
          <Image
            src={GoogleIcon}
            alt='Google Icon'
            width={24}
            height={24}
          />
          Login with Google
        </button>
      </form>
    </section>
  );
};

export default RegisterPage;