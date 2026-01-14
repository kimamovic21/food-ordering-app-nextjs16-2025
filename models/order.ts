import { model, models, Schema } from 'mongoose';
import mongoose from 'mongoose';

const CartProductSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    streetAddress: { type: String, required: true },
    postalCode: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    cartProducts: { type: [CartProductSchema], required: true },
    total: { type: Number, required: true },
    orderPaid: { type: Boolean, default: false },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed'],
      default: 'pending',
      required: true,
    },
    stripeSessionId: { type: String },
  },
  { timestamps: true }
);

// In dev, Next.js hot-reloads can retain old models. Ensure schema updates take effect.
try {
  if (mongoose.models.Order) {
    mongoose.deleteModel('Order');
  }
} catch {}

export const Order = models?.Order || model('Order', OrderSchema);
