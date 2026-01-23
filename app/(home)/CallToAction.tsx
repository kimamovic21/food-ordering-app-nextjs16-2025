import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CallToAction = () => {
  return (
    <div className='flex justify-center py-8'>
      <Card className='max-w-2xl w-full p-4 text-center shadow-lg'>
        <h2 className='text-2xl font-bold mb-4'>Free Registration</h2>
        <p className='mb-6 text-muted-foreground'>
          Create your account in seconds and unlock exclusive benefits:
        </p>
        <ul className='mb-6 text-left list-disc list-inside text-sm text-muted-foreground'>
          <li>Track your orders and deliveries in real-time</li>
          <li>Earn loyalty points and rewards</li>
          <li>Access special offers and discounts</li>
        </ul>
        <Link href='/register'>
          <Button className='w-full' variant='default'>
            Register Now
          </Button>
        </Link>
      </Card>
    </div>
  );
};

export default CallToAction;
