import { Schema, model, InferSchemaType } from 'mongoose';

export const ORDER_STATUSES = ['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'] as const;
export const PAYMENT_STATUSES = ['pending', 'awaiting_verification', 'paid', 'rejected'] as const;
export const PAYMENT_METHODS = ['cod', 'instapay'] as const;

const trackingEventSchema = new Schema(
  {
    kind: { type: String, enum: ['order', 'payment'], required: true },
    status: { type: String, required: true, maxlength: 40 },
    occurredAt: { type: Date, required: true },
  },
  { _id: false },
);

const itemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId },
    // Snapshots: orders must survive later product edits/deletes.
    sku: { type: String, required: true },
    name: { ar: String, en: String },
    image: String,
    note: { type: String, trim: true, maxlength: 500, default: '' },
    color: { ar: String, en: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    idempotencyKey: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customer: {
      fullName: { type: String, required: true, trim: true, maxlength: 120 },
      phone: { type: String, required: true, trim: true },
      governorate: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true, maxlength: 120 },
      address: { type: String, required: true, trim: true, maxlength: 400 },
      notes: { type: String, trim: true, maxlength: 500, default: '' },
    },
    items: { type: [itemSchema], validate: (v: unknown[]) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    shippingGovernorate: { type: String, trim: true, default: '' },
    shippingArea: { type: String, trim: true, default: '' },
    deliveryEstimate: {
      min: { type: Number, min: 1 },
      max: { type: Number, min: 1 },
    },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EGP' },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'new', index: true },
    // Customer-safe audit trail. It deliberately stores statuses only — never
    // an address, internal admin note, courier contact, or payment reference.
    trackingEvents: { type: [trackingEventSchema], default: [] },
    paymentProof: {
      transferReference: { type: String, trim: true, maxlength: 80 },
      filePath: String, // stored filename only, served through an authenticated admin route
      uploadedAt: Date,
      reviewNote: { type: String, maxlength: 300 },
    },
    stockRestored: { type: Boolean, default: false },
    // Only a one-way representation is stored for new orders. `accessToken`
    // remains optional solely to support records created before this hardening.
    accessToken: { type: String, select: false },
    accessTokenHash: { type: String, select: false },
  },
  { timestamps: true },
);
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1 });
orderSchema.index({ 'customer.phone': 1 });
// Customer order history, customer-directory lookups, and the My Orders
// endpoint all read one customer in reverse chronological order.
orderSchema.index({ customerId: 1, createdAt: -1, _id: -1 });
// Admin order filters retain their created-at ordering without a collection scan.
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, createdAt: -1 });
// Idempotency belongs to the requesting customer/guest, not to every order
// in the entire store. This also avoids a global collision becoming a DoS.
orderSchema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const Order = model('Order', orderSchema);
