import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { Order } from '@/models/order';
import { mongoConnect } from '@/libs/mongoConnect';
import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SK || '', {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[Webhook] Incoming request:', req.method, req.url);
  if (req.method !== 'POST') {
    console.error('[Webhook] Method Not Allowed:', req.method);
    return res.status(405).send('Method Not Allowed');
  }

  let rawBody;
  let sig;
  try {
    rawBody = await buffer(req);
    sig = req.headers['stripe-signature'] as string;
    console.log('[Webhook] Stripe signature:', sig);
  } catch (err) {
    console.error('[Webhook] Error reading raw body or signature:', err);
    return res.status(400).send('Webhook Error: Unable to read body or signature');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('[Webhook] Stripe event constructed:', event.type);
  } catch (err: any) {
    console.error('[Webhook] Stripe event construction error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    console.log('[Webhook] checkout.session.completed:', { orderId, sessionId: session.id });
    if (orderId) {
      try {
        await mongoConnect();
        const order = await Order.findById(orderId);
        if (order) {
          order.orderPaid = true;
          order.paid = true;
          if (!order.orderStatus) {
            order.orderStatus = 'pending';
          }
          order.stripeSessionId = session.id;
          await order.save();
          console.log('[Webhook] Order updated (checkout.session.completed):', orderId);
        } else {
          console.error('[Webhook] Order not found (checkout.session.completed):', orderId);
        }
      } catch (err) {
        console.error('[Webhook] Error updating order (checkout.session.completed):', err);
      }
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;
    console.log('[Webhook] payment_intent.succeeded:', { orderId, intentId: intent.id });
    if (orderId) {
      try {
        await mongoConnect();
        const order = await Order.findById(orderId);
        if (order) {
          order.orderPaid = true;
          order.paid = true;
          if (!order.orderStatus) {
            order.orderStatus = 'pending';
          }
          order.stripeSessionId = intent.id;
          await order.save();
          console.log('[Webhook] Order updated (payment_intent.succeeded):', orderId);
        } else {
          console.error('[Webhook] Order not found (payment_intent.succeeded):', orderId);
        }
      } catch (err) {
        console.error('[Webhook] Error updating order (payment_intent.succeeded):', err);
      }
    }
  }

  console.log('[Webhook] Webhook processing complete.');
  res.status(200).json({ received: true });
}
