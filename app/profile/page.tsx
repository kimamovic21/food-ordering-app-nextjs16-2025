'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Image from 'next/image';

const ProfilePage = () => {
  const session = useSession();

  const [userName, setUserName] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { status } = session;

  useEffect(() => {
    if (status === 'authenticated') {
      setUserName(session?.data?.user?.name || '');
    };
  }, [status, session]);

  if (status === 'loading') {
    return 'Loading...';
  };

  if (status === 'unauthenticated') {
    return redirect('/login');
  };

  const userImage = session?.data?.user?.image;

  const handleProfileInfoUpdate = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setSaved(false);
    setIsSaving(true);

    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: userName }),
    });

    setIsSaving(false);

    if (response.ok) {
      setSaved(true);
    };
  };

  return (
    <section className='mt-8 w-lg'>
      <h2 className='text-center text-primary text-4xl mb-4'>
        Profile
      </h2>

      <div className='max-w-md mx-auto'>
        {saved && (
          <h2 className='text-center bg-green-200 p-4 rounded-lg border-green-300 border-4'>
            Profile saved!
          </h2>
        )}

        {isSaving && (
          <h2 className='text-center bg-blue-200 p-4 rounded-lg border-blue-300 border-4'>
            Saving...
          </h2>
        )}

        <div className='flex gap-4 items-center'>
          <div>
            <div className='p-4 rounded-lg relative'>
              <Image
                src={userImage || ''}
                alt='User image'
                width={250}
                height={250}
                className='rounded-lg w-full h-full mb-2'
              />
              <button type='button'>
                Edit
              </button>
            </div>
          </div>

          <form className='grow' onSubmit={handleProfileInfoUpdate}>
            <input
              type='text'
              placeholder='First and last name'
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isSaving}
            />

            <input
              type='email'
              placeholder='First and last name'
              disabled
              value={session?.data?.user?.email || ''}
            />

            <button type='submit'>
              Save
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;