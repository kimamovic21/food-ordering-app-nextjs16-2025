import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { useParams } from 'next/navigation';

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const params = useParams();
  const orderId = params?.id;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setErrorMessage(null);
    // Show toast loading
    import('sonner').then(({ toast }) => toast.loading('Processing your order, please wait...'));
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message || 'Validation error');
      setLoading(false);
      return;
    }
    // Fetch client secret from the correct API endpoint for this order
    if (!orderId) {
      setErrorMessage('Order ID not found in URL.');
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/checkout/${orderId}/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      setErrorMessage('Failed to create payment intent.');
      setLoading(false);
      return;
    }
    const { client_secret: clientSecret } = await res.json();
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/${orderId}?status=success`,
      },
    });
    if (error) {
      setErrorMessage(error.message || 'Payment error');
      import('sonner').then(({ toast }) => toast.error(error.message || 'Payment error'));
      setLoading(false);
      return;
    }
    // Cart will be cleared after redirect in /checkout/[id] if needed
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <PaymentElement />
      <button
        type='submit'
        disabled={!stripe || !elements || loading}
        className='w-full bg-primary text-white py-2 rounded font-semibold mt-2'
      >
        {loading ? 'Processing...' : 'Pay'}
      </button>
      {errorMessage && <div className='text-red-500 text-sm mt-2'>{errorMessage}</div>}
    </form>
  );
};

export default CheckoutForm;
