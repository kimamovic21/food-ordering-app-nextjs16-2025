import { model, models, Schema } from 'mongoose';

const MenuItemSchema = new Schema({
  image: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  priceSmall: { type: Number, required: true },
  priceMedium: { type: Number, required: true },
  priceLarge: { type: Number, required: true },
}, { timestamps: true });

export const MenuItem = models?.MenuItem || model('MenuItem', MenuItemSchema);