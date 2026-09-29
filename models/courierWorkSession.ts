import { model, models, Schema } from 'mongoose';

const CourierBreakSchema = new Schema(
  {
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0, min: 0 },
    reason: { type: String, default: 'scheduled_break', trim: true, maxlength: 80 },
  },
  { _id: false }
);

const CourierWorkSessionSchema = new Schema(
  {
    courierId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
      index: true,
    },
    breaks: {
      type: [CourierBreakSchema],
      default: [],
    },
    grossMinutes: { type: Number, default: 0, min: 0 },
    breakMinutes: { type: Number, default: 0, min: 0 },
    netWorkMinutes: { type: Number, default: 0, min: 0 },
    autoClosedReason: { type: String, default: '', trim: true, maxlength: 120 },
  },
  { collection: 'courier_work_sessions', timestamps: true }
);

CourierWorkSessionSchema.index({ courierId: 1, startedAt: -1 });
CourierWorkSessionSchema.index({ courierId: 1, status: 1, startedAt: -1 });
CourierWorkSessionSchema.index({ courierId: 1, endedAt: -1 });

export const CourierWorkSession =
  models?.CourierWorkSession ||
  model('CourierWorkSession', CourierWorkSessionSchema, 'courier_work_sessions');
