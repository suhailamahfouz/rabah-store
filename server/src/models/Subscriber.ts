import { Schema, model, InferSchemaType } from 'mongoose';

const subscriberSchema = new Schema(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 }, lang: { type: String, enum: ['ar', 'en'], default: 'ar' } },
  { timestamps: true },
);

export type SubscriberDoc = InferSchemaType<typeof subscriberSchema>;
export const Subscriber = model('Subscriber', subscriberSchema);
