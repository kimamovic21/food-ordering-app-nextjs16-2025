import { createHash } from 'node:crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/libs/authOptions';
import { Coupon } from '@/models/coupon';
import { Order } from '@/models/order';
import { User } from '@/models/user';
import { calculateLoyaltyStatus } from '@/libs/loyaltyCalculator';
import { notifyOrderPlaced } from '@/libs/notifications';
import { createDeliveryPin } from '@/libs/deliveryPin';
import {
  calculateCouponDiscountAmount,
  getCouponValidationError,
  normalizeCouponCode,
} from '@/libs/coupon';
import { createAuditLog } from '@/libs/auditLog';
import { addMoney, multiplyMoney, roundMoney, subtractMoney } from '@/libs/money';
import { normalizePhoneNumberForStorage } from '@/libs/phone';
import {
  normalizeDeliveryCoordinate,
  validateCartForOrder,
} from '@/libs/cartValidation';
import {
  createRateLimitKey,
  createRateLimitResponse,
  enforceRateLimit,
  getClientIp,
} from '@/libs/rateLimit';
import { scheduleUnpaidOrderAutoCancellationCheck } from '@/libs/qstash';
import type { CartSize, CheckoutCartItemPayload } from '@/types/cart';
import mongoose from 'mongoose';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SK;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' })
  : null;

export const runtime = 'nodejs';

const DUPLICATE_CHECKOUT_WINDOW_MS = 5 * 60 * 1000;

const roundToTwoDecimals = roundMoney;

type CheckoutBlockAuditInput = {
  user?: any;
  restaurant?: any;
  restaurantId?: unknown;
  message: string;
  reason: string;
  status: number;
  metadata?: Record<string, unknown>;
};

const createCheckoutBlockResponse = async ({
  user,
  restaurant,
  restaurantId,
  message,
  reason,
  status,
  metadata = {},
}: CheckoutBlockAuditInput) => {
  const auditRestaurantId = restaurant?._id || restaurantId || null;

  if (user) {
    await createAuditLog({
      actor: user,
      action: 'checkout.blocked',
      entityType: 'checkout',
      entityId: auditRestaurantId || user._id,
      restaurantId: auditRestaurantId,
      metadata: {
        reason,
        status,
        message,
        ...metadata,
      },
    });
  }

  return Response.json({ error: message }, { status });
};

const canRecoverFromStripeSessionLookupError = (error: unknown) => {
  const stripeError = error as { code?: string; statusCode?: number };

  return stripeError?.code === 'resource_missing' || stripeError?.statusCode === 404;
};

const getCheckoutOrigin = (req: Request) =>
  req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const normalizeFingerprintText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const normalizeFingerprintCoordinate = (value: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(6)) : null;

const createCheckoutFingerprint = ({
  userId,
  restaurantId,
  verifiedItems,
  delivery,
  pricing,
}: {
  userId: unknown;
  restaurantId: unknown;
  verifiedItems: Array<CheckoutCartItemPayload & { size: CartSize }>;
  delivery: {
    phone: string;
    streetAddress: string;
    postalCode: string;
    city: string;
    country: string;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    specialInstructions: string;
  };
  pricing: {
    subtotal: number;
    taxAmount: number;
    deliveryFee: number;
    loyaltyDiscount: number;
    loyaltyDiscountPercentage: number;
    couponCode: string | null;
    couponDiscountAmount: number;
    total: number;
  };
}) => {
  const payload = {
    userId: String(userId),
    restaurantId: String(restaurantId),
    delivery: {
      phone: normalizeFingerprintText(delivery.phone),
      streetAddress: normalizeFingerprintText(delivery.streetAddress),
      postalCode: normalizeFingerprintText(delivery.postalCode),
      city: normalizeFingerprintText(delivery.city),
      country: normalizeFingerprintText(delivery.country),
      deliveryLatitude: normalizeFingerprintCoordinate(delivery.deliveryLatitude),
      deliveryLongitude: normalizeFingerprintCoordinate(delivery.deliveryLongitude),
      specialInstructions: normalizeFingerprintText(delivery.specialInstructions),
    },
    items: [...verifiedItems]
      .map((item) => ({
        productId: item._id,
        size: item.size,
        quantity: item.quantity,
        price: roundToTwoDecimals(item.price),
      }))
      .sort((firstItem, secondItem) =>
        `${firstItem.productId}:${firstItem.size}`.localeCompare(
          `${secondItem.productId}:${secondItem.size}`
        )
      ),
    pricing: {
      subtotal: roundToTwoDecimals(pricing.subtotal),
      taxAmount: roundToTwoDecimals(pricing.taxAmount),
      deliveryFee: roundToTwoDecimals(pricing.deliveryFee),
      loyaltyDiscount: roundToTwoDecimals(pricing.loyaltyDiscount),
      loyaltyDiscountPercentage: pricing.loyaltyDiscountPercentage,
      couponCode: pricing.couponCode,
      couponDiscountAmount: roundToTwoDecimals(pricing.couponDiscountAmount),
      total: roundToTwoDecimals(pricing.total),
    },
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

const createStripeLineItems = ({
  verifiedItems,
  deliveryFee,
  couponLineDiscountRate,
}: {
  verifiedItems: Array<CheckoutCartItemPayload & { size: CartSize }>;
  deliveryFee: number;
  couponLineDiscountRate: number;
}) => {
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = verifiedItems.map(
    (item) => {
      const adjustedUnitPrice = multiplyMoney(item.price, 1 - couponLineDiscountRate);

      return {
        quantity: item.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.max(0, Math.round(adjustedUnitPrice * 100)),
          product_data: {
            name: `${item.name} (${item.size})`,
          },
        },
      };
    }
  );

  stripeLineItems.push({
    quantity: 1,
    price_data: {
      currency: 'usd',
      unit_amount: Math.round(deliveryFee * 100),
      product_data: {
        name: 'Delivery Fee',
      },
    },
  });

  return stripeLineItems;
};

const createStripeCheckoutSessionForOrder = async ({
  order,
  req,
  email,
  lineItems,
}: {
  order: any;
  req: Request;
  email: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
}) =>
  stripe!.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email,
    metadata: {
      orderId: order._id.toString(),
    },
    line_items: lineItems,
    success_url: `${getCheckoutOrigin(req)}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getCheckoutOrigin(req)}/checkout?status=cancelled`,
  });

const createAndSaveCheckoutSessionResponse = async ({
  order,
  req,
  email,
  lineItems,
  reusedExistingOrder = false,
}: {
  order: any;
  req: Request;
  email: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  reusedExistingOrder?: boolean;
}) => {
  const stripeSession = await createStripeCheckoutSessionForOrder({
    order,
    req,
    email,
    lineItems,
  });

  if (!stripeSession.url) {
    throw new Error('Stripe checkout URL is missing');
  }

  order.stripeSessionId = stripeSession.id;
  await order.save();
  await scheduleUnpaidOrderAutoCancellationCheck(order._id);

  return Response.json({
    url: stripeSession.url,
    orderId: order._id.toString(),
    reusedExistingOrder,
  });
};

const getExistingCheckoutSessionResponse = async ({
  order,
  req,
  email,
  lineItems,
}: {
  order: any;
  req: Request;
  email: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
}) => {
  if (!order.stripeSessionId) {
    return createAndSaveCheckoutSessionResponse({
      order,
      req,
      email,
      lineItems,
      reusedExistingOrder: true,
    });
  }

  let stripeSession: Stripe.Checkout.Session;

  try {
    stripeSession = await stripe!.checkout.sessions.retrieve(order.stripeSessionId);
  } catch (error) {
    if (!canRecoverFromStripeSessionLookupError(error)) {
      throw error;
    }

    return createAndSaveCheckoutSessionResponse({
      order,
      req,
      email,
      lineItems,
      reusedExistingOrder: true,
    });
  }

  if (stripeSession.payment_status === 'paid') {
    order.orderPaid = true;
    order.paid = true;
    order.stripeSessionId = stripeSession.id;
    await order.save();

    return Response.json({
      paid: true,
      orderId: order._id.toString(),
      message: 'Payment was already completed. Your order has been updated.',
    });
  }

  if (stripeSession.status === 'open' && stripeSession.url) {
    return Response.json({
      url: stripeSession.url,
      orderId: order._id.toString(),
      reusedExistingOrder: true,
    });
  }

  return createAndSaveCheckoutSessionResponse({
    order,
    req,
    email,
    lineItems,
    reusedExistingOrder: true,
  });
};

export async function POST(req: Request) {
  if (!stripe) {
    return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({
    identifier: createRateLimitKey('checkout', getClientIp(req), session.user.email),
    limit: 8,
    namespace: 'checkout',
    window: '5 m',
  });

  if (!rateLimit.success) {
    return createRateLimitResponse(
      rateLimit,
      'Too many checkout attempts. Please wait a little before trying again.'
    );
  }

  const body = await req.json();
  const {
    phone,
    streetAddress,
    postalCode,
    city,
    country,
    deliveryLatitude,
    deliveryLongitude,
    specialInstructions,
    cartItems,
    loyaltyDiscountPercentage,
    couponCode,
  } = body as {
    phone?: string;
    streetAddress?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    deliveryLatitude?: number | null;
    deliveryLongitude?: number | null;
    specialInstructions?: string;
    cartItems?: CheckoutCartItemPayload[];
    loyaltyDiscountPercentage?: number;
    couponCode?: string;
  };

  if (!phone || !streetAddress || !postalCode || !city || !country) {
    return Response.json({ error: 'Missing delivery information' }, { status: 400 });
  }

  const normalizedPhone = normalizePhoneNumberForStorage(phone);

  if (!normalizedPhone) {
    return Response.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return Response.json({ error: 'Cart is empty' }, { status: 400 });
  }

  const normalizedSpecialInstructions =
    typeof specialInstructions === 'string' ? specialInstructions.trim().slice(0, 500) : '';

  await mongoose.connect(process.env.MONGODB_URL as string);

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const activeCustomerOrder = await Order.findOne({
    userId: user._id,
    orderStatus: { $nin: ['completed', 'canceled'] },
    $or: [{ orderPaid: true }, { paid: true }, { paymentStatus: true }],
  })
    .select('_id orderStatus')
    .lean();

  if (activeCustomerOrder) {
    return createCheckoutBlockResponse({
      user,
      message:
        'You already have an active order. Please wait until it is completed or canceled before starting a new checkout.',
      reason: 'active_customer_order',
      status: 400,
      metadata: {
        activeOrderId: activeCustomerOrder._id,
        activeOrderStatus: activeCustomerOrder.orderStatus,
      },
    });
  }

  const requestedCartRestaurantIds = Array.from(
    new Set(cartItems.map((item) => String(item.restaurantId || '')).filter(Boolean))
  );

  if (requestedCartRestaurantIds.length > 1) {
    return createCheckoutBlockResponse({
      user,
      restaurantId: requestedCartRestaurantIds[0],
      message: 'Cart must contain items from one restaurant only',
      reason: 'multiple_restaurants',
      status: 400,
      metadata: {
        restaurantIds: requestedCartRestaurantIds,
      },
    });
  }

  const cartValidation = await validateCartForOrder({
    cartItems,
    deliveryLatitude,
    deliveryLongitude,
  });
  const restaurantId = cartValidation.currentRestaurantId;

  if (!restaurantId) {
    return Response.json({ error: 'No restaurant found in cart' }, { status: 400 });
  }

  if (cartValidation.restaurant?.status === 'multiple_restaurants') {
    return createCheckoutBlockResponse({
      user,
      restaurantId,
      message: 'Cart must contain items from one restaurant only',
      reason: 'multiple_restaurants',
      status: 400,
      metadata: {
        restaurantIds: cartValidation.requestedRestaurantIds,
      },
    });
  }

  const restaurant = cartValidation.restaurantDocument;
  const normalizedDeliveryLatitude = normalizeDeliveryCoordinate(deliveryLatitude);
  const normalizedDeliveryLongitude = normalizeDeliveryCoordinate(deliveryLongitude);
  const hasDeliveryLocation =
    Number.isFinite(normalizedDeliveryLatitude) && Number.isFinite(normalizedDeliveryLongitude);

  if (!restaurant && cartValidation.restaurant?.status === 'missing') {
    return Response.json({ error: `Restaurant ${restaurantId} not found` }, { status: 404 });
  }

  // Business rule: users cannot place orders from their own restaurant
  if (restaurant && user.restaurantId?.toString() === String(restaurant._id)) {
    return createCheckoutBlockResponse({
      user,
      restaurant,
      message: 'You cannot order from your own restaurant',
      reason: 'own_restaurant',
      status: 403,
    });
  }

  const ownedMenuItem = cartValidation.validItems.find((item) => {
    const menuItem = cartValidation.menuItemById.get(item._id);

    return menuItem?.adminId?.toString?.() === user._id.toString();
  });

  if (ownedMenuItem) {
    return Response.json({ error: 'You cannot order your own menu items' }, { status: 403 });
  }

  if (!cartValidation.canCheckout) {
    const blockingItem = cartValidation.blockingItems[0];

    if (blockingItem) {
      const menuItem = cartValidation.menuItemById.get(blockingItem._id);

      if (blockingItem.status === 'unavailable') {
        return createCheckoutBlockResponse({
          user,
          restaurant,
          restaurantId,
          message: `${blockingItem.name || 'This menu item'} is currently unavailable`,
          reason: 'menu_item_unavailable',
          status: 400,
          metadata: {
            menuItemId: menuItem?._id || blockingItem._id,
            menuItemName: blockingItem.name,
          },
        });
      }

      if (blockingItem.status === 'invalid_size') {
        return createCheckoutBlockResponse({
          user,
          restaurant,
          restaurantId,
          message: `${blockingItem.name || 'This menu item'} is not available in that size`,
          reason: 'menu_item_size_unavailable',
          status: 400,
          metadata: {
            menuItemId: menuItem?._id || blockingItem._id,
            requestedSize: blockingItem.requestedSize,
          },
        });
      }

      if (blockingItem.status === 'quantity_limit') {
        const requestedItemQuantity = cartValidation.normalizedItems
          .filter((item) => item._id === blockingItem._id)
          .reduce((total, item) => total + Math.max(1, Number(item.quantity) || 1), 0);

        return createCheckoutBlockResponse({
          user,
          restaurant,
          restaurantId,
          message:
            blockingItem.message ||
            `${blockingItem.name || 'This menu item'} is limited to ${blockingItem.maxQuantityPerOrder} per order.`,
          reason: 'menu_item_quantity_limit_exceeded',
          status: 400,
          metadata: {
            menuItemId: menuItem?._id || blockingItem._id,
            menuItemName: blockingItem.name,
            maxQuantityPerOrder: blockingItem.maxQuantityPerOrder,
            requestedItemQuantity,
          },
        });
      }

      if (blockingItem.status === 'deleted') {
        return Response.json({ error: 'Some menu items are no longer available' }, { status: 400 });
      }

      return Response.json({ error: 'Invalid cart data' }, { status: 400 });
    }

    const restaurantValidation = cartValidation.restaurant;

    if (restaurantValidation?.status === 'busy') {
      return createCheckoutBlockResponse({
        user,
        restaurant,
        restaurantId,
        message:
          restaurantValidation.message ||
          'This restaurant is very busy at the moment. Please wait a little bit and try again.',
        reason: 'active_order_limit_reached',
        status: 409,
        metadata: {
          activeKitchenOrders: restaurantValidation.activeKitchenOrders,
          activeOrderLimit: restaurantValidation.activeOrderLimit,
        },
      });
    }

    if (restaurantValidation?.status === 'order_quantity_limit') {
      return createCheckoutBlockResponse({
        user,
        restaurant,
        restaurantId,
        message: restaurantValidation.message || 'This cart exceeds the restaurant item limit.',
        reason: 'restaurant_item_limit_exceeded',
        status: 400,
        metadata: {
          maxItemsPerOrder: restaurantValidation.maxItemsPerOrder,
          totalCartQuantity: restaurantValidation.totalCartQuantity,
        },
      });
    }

    if (restaurantValidation?.status === 'missing_delivery_location') {
      return createCheckoutBlockResponse({
        user,
        restaurant,
        restaurantId,
        message:
          restaurantValidation.message ||
          'Please use your current location so we can confirm the delivery radius.',
        reason: 'missing_delivery_location',
        status: 400,
        metadata: {
          deliveryRadiusKm: restaurantValidation.deliveryRadiusKm,
        },
      });
    }

    if (restaurantValidation?.status === 'outside_delivery_radius') {
      return createCheckoutBlockResponse({
        user,
        restaurant,
        restaurantId,
        message:
          restaurantValidation.message || 'This restaurant does not deliver to your location.',
        reason: 'outside_delivery_radius',
        status: 400,
        metadata: {
          deliveryDistanceKm: restaurantValidation.distanceKm,
          deliveryRadiusKm: restaurantValidation.deliveryRadiusKm,
          isOpen: restaurantValidation.isOpen,
          isPaused: restaurantValidation.isPaused,
          isWithinDeliveryRadius: false,
        },
      });
    }

    if (
      restaurantValidation?.status === 'closed' ||
      restaurantValidation?.status === 'paused' ||
      restaurantValidation?.status === 'closing_soon'
    ) {
      return createCheckoutBlockResponse({
        user,
        restaurant,
        restaurantId,
        message: restaurantValidation.message || 'This restaurant is not accepting orders right now.',
        reason: 'restaurant_not_accepting_orders',
        status: 409,
        metadata: {
          deliveryDistanceKm: restaurantValidation.distanceKm,
          deliveryRadiusKm: restaurantValidation.deliveryRadiusKm,
          isOpen: restaurantValidation.isOpen,
          isPaused: restaurantValidation.isPaused,
        },
      });
    }

    return Response.json(
      { error: restaurantValidation?.message || cartValidation.message || 'Invalid cart data' },
      { status: 400 }
    );
  }

  if (!restaurant) {
    return Response.json({ error: `Restaurant ${restaurantId} not found` }, { status: 404 });
  }

  const verifiedItems: Array<CheckoutCartItemPayload & { size: CartSize }> =
    cartValidation.validItems.map((item) => ({
      _id: item._id,
      name: item.name || 'Menu item',
      price: roundToTwoDecimals(Number(item.price) || 0),
      quantity: item.quantity,
      restaurantId: String(item.restaurantId),
      size: item.size as CartSize,
    }));

  // Verify loyalty discount by checking user's actual order count
  const completedOrderCount = await Order.countDocuments({
    userId: user._id,
    orderStatus: 'completed',
  });

  const loyaltyStatus = calculateLoyaltyStatus(completedOrderCount);
  const verifiedLoyaltyPercentage = loyaltyDiscountPercentage || 0;

  // Security check: ensure discount doesn't exceed what user should have
  if (verifiedLoyaltyPercentage > loyaltyStatus.discountPercentage) {
    return Response.json({ error: 'Invalid loyalty discount' }, { status: 400 });
  }

  const subtotal = roundToTwoDecimals(
    verifiedItems.reduce((sum, item) => addMoney(sum, multiplyMoney(item.price, item.quantity)), 0)
  );

  const normalizedCouponCode = couponCode ? normalizeCouponCode(couponCode) : '';
  const coupon = normalizedCouponCode
    ? await Coupon.findOne({
        code: normalizedCouponCode,
        restaurantId: restaurant._id,
      })
    : null;

  let couponDiscountAmount = 0;
  let couponDiscountPercentage = 0;

  if (normalizedCouponCode) {
    if (!coupon) {
      return Response.json({ error: 'Coupon for this restaurant not available' }, { status: 400 });
    }

    const customerCouponUsageCount = await Order.countDocuments({
      userId: user._id,
      couponId: coupon._id,
      orderStatus: { $ne: 'canceled' },
      $or: [{ orderPaid: true }, { paid: true }, { paymentStatus: true }],
    });

    const couponValidationError = getCouponValidationError({
      coupon,
      subtotal,
      completedOrderCount,
      customerCouponUsageCount,
    });
    if (couponValidationError) {
      return Response.json({ error: couponValidationError }, { status: 400 });
    }

    couponDiscountAmount = calculateCouponDiscountAmount(subtotal, coupon);
    couponDiscountPercentage = Number(coupon.discountValue) || 0;
  }

  const loyaltyDiscountBase = roundToTwoDecimals(Math.max(subtotal - couponDiscountAmount, 0));
  const verifiedLoyaltyDiscount = multiplyMoney(
    loyaltyDiscountBase,
    verifiedLoyaltyPercentage / 100
  );
  const taxAmount = multiplyMoney(subtotal, restaurant.tax / 100);
  const deliveryFee = roundToTwoDecimals(restaurant.courierFee || 5);
  const estimatedPreparationMinutes = Math.max(
    0,
    Number((restaurant as any).averagePreparationMinutes) || 25
  );
  const estimatedDeliveryMinutes = Math.max(
    0,
    Number((restaurant as any).averageDeliveryMinutes) || 20
  );
  const estimatedTotalMinutes = estimatedPreparationMinutes + estimatedDeliveryMinutes;
  const discountedSubtotal = roundToTwoDecimals(
    Math.max(subtractMoney(subtotal, couponDiscountAmount, verifiedLoyaltyDiscount), 0)
  );
  const total = addMoney(discountedSubtotal, deliveryFee);

  const couponSnapshot = coupon
    ? {
        couponId: coupon._id,
        couponCode: coupon.code,
        couponTitle: coupon.title,
        couponDiscountAmount,
        couponDiscountPercentage,
        couponMinimumOrderAmount: Number(coupon.minimumOrderAmount) || 0,
      }
    : {
        couponId: null,
        couponCode: null,
        couponTitle: null,
        couponDiscountAmount: 0,
        couponDiscountPercentage: 0,
        couponMinimumOrderAmount: 0,
      };

  const foodLineDiscountAmount = addMoney(couponDiscountAmount, verifiedLoyaltyDiscount);
  const couponLineDiscountRate = subtotal > 0 ? foodLineDiscountAmount / subtotal : 0;
  const stripeLineItems = createStripeLineItems({
    verifiedItems,
    deliveryFee,
    couponLineDiscountRate,
  });
  const checkoutFingerprint = createCheckoutFingerprint({
    userId: user._id,
    restaurantId: restaurant._id,
    verifiedItems,
    delivery: {
      phone: normalizedPhone,
      streetAddress,
      postalCode,
      city,
      country,
      deliveryLatitude: hasDeliveryLocation ? normalizedDeliveryLatitude : null,
      deliveryLongitude: hasDeliveryLocation ? normalizedDeliveryLongitude : null,
      specialInstructions: normalizedSpecialInstructions,
    },
    pricing: {
      subtotal,
      taxAmount,
      deliveryFee,
      loyaltyDiscount: verifiedLoyaltyDiscount,
      loyaltyDiscountPercentage: verifiedLoyaltyPercentage,
      couponCode: couponSnapshot.couponCode,
      couponDiscountAmount,
      total,
    },
  });
  const duplicateCheckoutCreatedAfter = new Date(Date.now() - DUPLICATE_CHECKOUT_WINDOW_MS);
  const existingCheckoutOrder = await Order.findOne({
    userId: user._id,
    restaurantId: restaurant._id,
    orderStatus: 'placed',
    checkoutFingerprint,
    createdAt: { $gte: duplicateCheckoutCreatedAfter },
    $nor: [{ orderPaid: true }, { paid: true }, { paymentStatus: true }],
  }).sort({ createdAt: -1 });

  if (existingCheckoutOrder) {
    return getExistingCheckoutSessionResponse({
      order: existingCheckoutOrder,
      req,
      email: session.user.email,
      lineItems: stripeLineItems,
    });
  }

  const order = await Order.create({
    userId: user._id,
    email: session.user.email,
    phone: normalizedPhone,
    streetAddress,
    postalCode,
    city,
    country,
    deliveryLatitude: hasDeliveryLocation ? normalizedDeliveryLatitude : null,
    deliveryLongitude: hasDeliveryLocation ? normalizedDeliveryLongitude : null,
    specialInstructions: normalizedSpecialInstructions,
    cartProducts: verifiedItems.map((item) => ({
      productId: item._id,
      name: item.name,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      restaurantId: item.restaurantId,
    })),
    restaurantId: restaurant._id,
    taxPercentage: restaurant.tax,
    taxAmount,
    deliveryFee,
    estimatedPreparationMinutes,
    estimatedDeliveryMinutes,
    estimatedTotalMinutes,
    loyaltyDiscount: verifiedLoyaltyDiscount,
    loyaltyDiscountPercentage: verifiedLoyaltyPercentage,
    loyaltyTier: loyaltyStatus.currentTier?.name || null,
    ...couponSnapshot,
    total,
    orderPaid: false,
    paid: false,
    orderStatus: 'placed',
    checkoutFingerprint,
    deliveryPin: createDeliveryPin(),
  });

  try {
    await notifyOrderPlaced({
      restaurantId: restaurant._id,
      orderId: order._id,
      customerUserId: user._id,
      customerEmail: session.user.email,
      total,
    });
  } catch (notificationError) {
    console.error('Failed to create order placed notifications:', notificationError);
  }

  await createAuditLog({
    actor: user,
    action: 'order.created',
    entityType: 'order',
    entityId: order._id,
    restaurantId: restaurant._id,
    orderId: order._id,
    metadata: {
      total,
      couponCode: couponSnapshot.couponCode,
    },
  });

  const stripeSession = await createStripeCheckoutSessionForOrder({
    order,
    req,
    email: session.user.email,
    lineItems: stripeLineItems,
  });

  if (!stripeSession.url) {
    throw new Error('Stripe checkout URL is missing');
  }

  // Update order with stripe session ID
  order.stripeSessionId = stripeSession.id;
  await order.save();
  await scheduleUnpaidOrderAutoCancellationCheck(order._id);

  return Response.json({ url: stripeSession.url });
}
