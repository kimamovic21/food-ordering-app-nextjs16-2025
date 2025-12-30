'use client';

import { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UserProfileFormProps = {
  userName: string;
  email?: string | null;
  phone: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  isSaving?: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onStreetAddressChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
};

const UserProfileForm = ({
  userName,
  email,
  phone,
  streetAddress,
  postalCode,
  city,
  country,
  isSaving,
  onSubmit,
  onNameChange,
  onPhoneChange,
  onStreetAddressChange,
  onPostalCodeChange,
  onCityChange,
  onCountryChange,
}: UserProfileFormProps) => {
  return (
    <form className='grow space-y-4' onSubmit={onSubmit}>
      <div className='space-y-2'>
        <Label htmlFor='name'>Full name</Label>
        <Input
          id='name'
          type='text'
          placeholder='First and last name'
          value={userName}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='email'>Email</Label>
        <Input id='email' type='email' disabled value={email || ''} />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='phone'>Phone number</Label>
        <Input
          id='phone'
          type='tel'
          placeholder='Phone number'
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='streetAddress'>Street address</Label>
        <Input
          id='streetAddress'
          type='text'
          placeholder='Street address'
          value={streetAddress}
          onChange={(e) => onStreetAddressChange(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='city'>City</Label>
          <Input
            id='city'
            type='text'
            placeholder='City'
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='postalCode'>Postal code</Label>
          <Input
            id='postalCode'
            type='text'
            placeholder='Postal code'
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='country'>Country</Label>
        <Input
          id='country'
          type='text'
          placeholder='Country'
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <Button type='submit' disabled={isSaving} className='w-full'>
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
};

export default UserProfileForm;
