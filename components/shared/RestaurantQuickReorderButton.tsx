'use client';

import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReorderCart } from '@/hooks/useReorderCart';
import { cn } from '@/libs/utils';

type RestaurantQuickReorderButtonProps = {
  restaurantId: string;
  restaurantName?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
};

const RestaurantQuickReorderButton = ({
  restaurantId,
  restaurantName = 'this restaurant',
  className,
  variant = 'default',
}: RestaurantQuickReorderButtonProps) => {
  const { reorder, isReordering: loading } = useReorderCart();

  const handleQuickReorder = async () => {
    if (!restaurantId) return;

    await reorder({ restaurantId, restaurantName });
  };

  return (
    <Button
      type='button'
      variant={variant}
      onClick={handleQuickReorder}
      disabled={loading}
      className={cn('gap-2', className)}
    >
      <RefreshCcw className='size-4' />
      {loading ? 'Checking...' : 'Order again'}
    </Button>
  );
};

export default RestaurantQuickReorderButton;
