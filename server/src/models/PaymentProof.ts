import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * InstaPay transfer screenshots live in MongoDB (one document per upload, at
 * most 5 MB) instead of the web server's disk, so they survive restarts and
 * redeploys on hosts with an ephemeral filesystem. The bytes are never selected
 * by default and are only served through the authenticated admin route.
 */
const paymentProofSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true },
);

export const PaymentProof = model('PaymentProof', paymentProofSchema);
export type PaymentProofDoc = InferSchemaType<typeof paymentProofSchema>;
