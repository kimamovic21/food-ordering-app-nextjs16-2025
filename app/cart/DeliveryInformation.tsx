import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeliveryInformationProps {
  email: string;
  formData: {
    phone: string;
    streetAddress: string;
    postalCode: string;
    city: string;
    country: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DeliveryInformation: React.FC<DeliveryInformationProps> = ({
  email,
  formData,
  handleInputChange,
}) => (
  <div className='bg-card border rounded-xl p-4 sm:p-6 lg:max-h-[70vh] lg:overflow-y-auto'>
    <h3 className='text-lg font-bold text-foreground mb-4'>Delivery Information</h3>
    <div className='mb-4'>
      <Label className='mb-2'>Email</Label>
      <Input type='email' value={email} disabled />
    </div>
    <div className='mb-4'>
      <Label htmlFor='phone' className='mb-2'>
        Phone
      </Label>
      <Input
        type='tel'
        id='phone'
        name='phone'
        value={formData.phone}
        onChange={handleInputChange}
        placeholder='Your phone number'
      />
    </div>
    <div className='mb-4'>
      <Label htmlFor='streetAddress' className='mb-2'>
        Street Address
      </Label>
      <Input
        type='text'
        id='streetAddress'
        name='streetAddress'
        value={formData.streetAddress}
        onChange={handleInputChange}
        placeholder='Your street address'
      />
    </div>
    <div className='mb-4'>
      <Label htmlFor='postalCode' className='mb-2'>
        Postal Code
      </Label>
      <Input
        type='text'
        id='postalCode'
        name='postalCode'
        value={formData.postalCode}
        onChange={handleInputChange}
        placeholder='Your postal code'
      />
    </div>
    <div className='mb-4'>
      <Label htmlFor='city' className='mb-2'>
        City
      </Label>
      <Input
        type='text'
        id='city'
        name='city'
        value={formData.city}
        onChange={handleInputChange}
        placeholder='Your city'
      />
    </div>
    <div className='mb-6'>
      <Label htmlFor='country' className='mb-2'>
        Country
      </Label>
      <Input
        type='text'
        id='country'
        name='country'
        value={formData.country}
        onChange={handleInputChange}
        placeholder='Your country'
      />
    </div>
  </div>
);

export default DeliveryInformation;
