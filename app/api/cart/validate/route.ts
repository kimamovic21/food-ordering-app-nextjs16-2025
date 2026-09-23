import mongoose from 'mongoose';

import { validateCartForOrder } from '@/libs/cartValidation';
import type { CartValidationRequestItem } from '@/types/cart';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cartItems = Array.isArray(body?.cartItems)
    ? (body.cartItems as CartValidationRequestItem[])
    : [];

  if (cartItems.length === 0) {
    return Response.json({
      canCheckout: false,
      items: [],
      message: 'Cart is empty.',
    });
  }

  await mongoose.connect(process.env.MONGODB_URL as string);

  const validation = await validateCartForOrder({
    cartItems,
    deliveryLatitude: body?.deliveryLatitude,
    deliveryLongitude: body?.deliveryLongitude,
    includeCourierReadiness: true,
  });

  return Response.json({
    canCheckout: validation.canCheckout,
    items: validation.items,
    message: validation.message,
    restaurant: validation.restaurant,
  });
}
