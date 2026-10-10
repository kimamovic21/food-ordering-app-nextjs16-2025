import { headers } from 'next/headers';
import { Coupon } from '@/models/coupon';
import { Order } from '@/models/order';
import { MenuItem } from '@/models/menuItem';
import { applyPaidOrderInventoryAdjustment } from '@/libs/menuItemInventoryServer';
import { Restaurant } from '@/models/restaurant';
import {
  notifyRestaurantAdminsAboutInventoryAlert,
  notifyRestaurantAdminsAboutPaidOrder,
} from '@/libs/notifications';
import { sendPurchaseReceiptEmail } from './sendPurchaseReceiptEmail';
import { createAuditLog } from '@/libs/auditLog';
import mongoose from 'mongoose';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SK;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' })
  : null;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!stripe) {
    return new Response('Stripe is not configured', { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response('Webhook secret is not set', { status: 500 });
  }

  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  if (!signature) {
    return new Response('Missing Stripe signature', { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      await mongoose.connect(process.env.MONGODB_URL as string);
      const order = await Order.findById(orderId);
      if (order) {
        if ((order as any).orderStatus === 'canceled') {
          return new Response(JSON.stringify({ received: true }), { status: 200 });
        }

        const wasPaid = Boolean((order as any).orderPaid ?? (order as any).paid);
        let inventoryResult: Awaited<ReturnType<typeof applyPaidOrderInventoryAdjustment>> | null =
          null;

        if (!wasPaid) {
          inventoryResult = await applyPaidOrderInventoryAdjustment(order);

          if (!inventoryResult.ok) {
            const firstViolation = inventoryResult.violations[0];
            const reason = firstViolation
              ? `${firstViolation.menuItemName} has only ${firstViolation.stockQuantity} left, but the paid order requested ${firstViolation.requestedQuantity}.`
              : 'Inventory was unavailable after payment.';

            (order as any).orderPaid = true;
            (order as any).paid = true;
            (order as any).orderStatus = 'canceled';
            (order as any).stripeSessionId = session.id;
            (order as any).canceledBy = 'system';
            (order as any).canceledAt = new Date();
            (order as any).cancellationReason =
              'Inventory changed before payment confirmation. Refund review required.';
            (order as any).refundStatus = 'review_required';
            (order as any).refundReason = reason;
            (order as any).refundAmount = Number((order as any).total) || 0;
            (order as any).refundRequestedAt = new Date();
            (order as any).inventoryAdjustmentError = reason;
            if ((order as any).inventoryReservationStatus === 'reserved') {
              (order as any).inventoryReservationStatus = 'failed';
            }
            await order.save();

            return new Response(JSON.stringify({ received: true }), { status: 200 });
          }

          if (inventoryResult.adjusted) {
            (order as any).inventoryAdjustedAt = new Date();
            if ((order as any).inventoryReservationStatus === 'reserved') {
              (order as any).inventoryReservationStatus = 'captured';
            }
          }
        }

        (order as any).orderPaid = true;
        (order as any).paid = true; // keep legacy flag in sync
        if (!(order as any).orderStatus) {
          (order as any).orderStatus = 'processing';
        }
        order.stripeSessionId = session.id;
        await order.save();

        if (!wasPaid) {
          if (inventoryResult?.alerts?.length) {
            try {
              await Promise.all(
                inventoryResult.alerts.map(async (alert) => {
                  await createAuditLog({
                    actor: null,
                    action: 'menu_item.inventory_alert',
                    entityType: 'menu_item',
                    entityId: alert.menuItemId,
                    restaurantId: alert.restaurantId || order.restaurantId,
                    orderId: order._id,
                    metadata: {
                      inventoryStatus: alert.status,
                      lowStockThreshold: alert.lowStockThreshold,
                      menuItemName: alert.menuItemName,
                      requestedQuantity: alert.requestedQuantity,
                      stockQuantity: alert.stockQuantity,
                    },
                  });

                  await notifyRestaurantAdminsAboutInventoryAlert({
                    lowStockThreshold: alert.lowStockThreshold,
                    menuItemId: alert.menuItemId,
                    menuItemName: alert.menuItemName,
                    orderId: order._id,
                    restaurantId: alert.restaurantId || order.restaurantId,
                    status: alert.status,
                    stockQuantity: alert.stockQuantity,
                  });
                })
              );
            } catch (inventoryAlertError) {
              console.error(
                'Failed to create inventory alert after paid order:',
                inventoryAlertError
              );
            }
          }

          try {
            await notifyRestaurantAdminsAboutPaidOrder({
              restaurantId: order.restaurantId,
              orderId: order._id,
              customerEmail: order.email,
              total: Number((order as any).total) || 0,
            });
          } catch (notificationError) {
            console.error('Failed to create admin notification for paid order:', notificationError);
          }
        }

        if (!wasPaid && order.couponId && Number((order as any).couponDiscountAmount || 0) > 0) {
          try {
            await Coupon.findByIdAndUpdate(order.couponId, {
              $inc: { usageCount: 1 },
              $set: { lastUsedAt: new Date() },
            });
          } catch (couponError) {
            console.error('Failed to increment coupon usage:', couponError);
          }
        }

        const shouldSendReceipt = !wasPaid || !(order as any).receiptEmailSentAt;

        if (shouldSendReceipt) {
          const restaurant = await Restaurant.findById(order.restaurantId)
            .select('name contact email street city postalCode country')
            .lean();

          const productIds = ((order as any).cartProducts || [])
            .map((item: any) => String(item.productId))
            .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
            .map((id: string) => new mongoose.Types.ObjectId(id));

          const menuItems = await MenuItem.find({ _id: { $in: productIds } })
            .select('_id image')
            .lean();

          const imageMap = new Map(menuItems.map((item) => [item._id.toString(), item.image]));
          const items = ((order as any).cartProducts || []).map((item: any) => ({
            name: item.name,
            note: item.note || null,
            size: item.size,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
            image: imageMap.get(String(item.productId)) || null,
          }));

          const emailResult = await sendPurchaseReceiptEmail({
            orderId: order._id.toString(),
            couponCode: (order as any).couponCode || null,
            couponDiscountAmount: Number((order as any).couponDiscountAmount) || 0,
            couponDiscountPercentage: Number((order as any).couponDiscountPercentage) || 0,
            specialInstructions: (order as any).specialInstructions || null,
            customerEmail: order.email,
            purchasedOn: order.updatedAt,
            restaurant: restaurant
              ? {
                  name: restaurant.name,
                  contact: restaurant.contact || null,
                  email: restaurant.email || null,
                  street: restaurant.street || null,
                  city: restaurant.city || null,
                  postalCode: restaurant.postalCode || null,
                  country: restaurant.country || null,
                }
              : null,
            items,
            taxAmount: Number((order as any).taxAmount) || 0,
            deliveryFee: Number((order as any).deliveryFee) || 0,
            total: Number((order as any).total) || 0,
          });

          if (emailResult.sent) {
            (order as any).receiptEmailSentAt = new Date();
            await order.save();
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
