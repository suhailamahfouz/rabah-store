import { z } from "zod";

/** Item in a checkout request. Product identity is always the server's source of truth. */
export const orderItemSchema = z
  .object({
    productId: z.string().min(1).optional(),
    productSlug: z.string().trim().min(1).max(120).optional(),
    quantity: z.number().int().min(1).max(100),
    note: z.string().trim().max(500).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).transform(value => value.toUpperCase()).optional(),
  })
  .refine((item) => Boolean(item.productId || item.productSlug), {
    message: "A product ID or slug is required",
  });

/** Checkout payload from the storefront. Prices/shipping are re-derived server-side. */
export const createOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(120),
  customer: z.object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(5).max(30),
    governorate: z.string().trim().min(2).max(120).default("Cairo"),
    city: z.string().trim().min(2).max(120),
    address: z.string().trim().min(5).max(400),
    notes: z.string().trim().max(500).optional().default(""),
  }),
  items: z.array(orderItemSchema).min(1).max(50),
  paymentMethod: z.enum(['cod', 'instapay']),
  // Accepted for backwards compatibility only; the server always recalculates it.
  shippingFee: z.number().min(0).optional(),
  currency: z.string().trim().length(3).default("EGP"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

/**
 * Public tracking is intentionally limited to an order number plus one proof
 * of ownership. The controller returns the same generic response for an
 * unknown order and a failed verification, preventing order enumeration.
 */
export const orderTrackingSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,80}$/, 'Invalid order number'),
  phone: z.string().trim().min(5).max(30).optional(),
  accessCode: z.string().trim().regex(/^[a-f\d]{64}$/i, 'Invalid access code').optional(),
}).superRefine((value, ctx) => {
  if (!value.phone && !value.accessCode) {
    ctx.addIssue({ code: 'custom', message: 'Phone number or access code is required', path: ['phone'] });
  }
});

export type OrderTrackingInput = z.infer<typeof orderTrackingSchema>;
