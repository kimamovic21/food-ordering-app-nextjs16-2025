import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { Order } from '@/models/order';

const stripeSecretKey = process.env.STRIPE_SK;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' })
  : null;

export async function POST(req: NextRequest, context: { params: { id: string } }) {
  if (!stripe) {
    return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
  }
  let params = context.params;
  if (typeof params.then === 'function') {
    params = await params;
  }
  const orderId = params.id;
  if (!orderId) {
    return Response.json({ error: 'Order ID is required' }, { status: 400 });
  }
  await mongoose.connect(process.env.MONGODB_URL as string);
  const order = await Order.findById(orderId);
  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }
  const amount = Math.round(order.total * 100);
  const currency = 'usd';
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata: { orderId: order._id.toString() },
    automatic_payment_methods: { enabled: true },
  });
  return Response.json({ client_secret: paymentIntent.client_secret });
}
