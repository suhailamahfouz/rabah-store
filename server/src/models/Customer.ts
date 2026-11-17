import { Schema, model, InferSchemaType } from 'mongoose';

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

customerSchema.index({ email: 1 }, { unique: true, sparse: true });
customerSchema.index({ phone: 1 }, { unique: true, sparse: true });
customerSchema.index({ name: 1 });

export type CustomerDoc = InferSchemaType<typeof customerSchema>;
export const Customer = model('Customer', customerSchema);
