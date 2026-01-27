import { Suspense } from 'react';
import CheckoutStatusPageInner from './CheckoutStatusPageInner';

const CheckoutStatusPage = () => {
  return (
    <Suspense>
      <CheckoutStatusPageInner />
    </Suspense>
  );
};

export default CheckoutStatusPage;
