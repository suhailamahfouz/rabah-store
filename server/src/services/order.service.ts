import { AppError } from "../utils/AppError.js";
import { Order, Product, nextSequence } from "../models/index.js";
import { CreateOrderInput, OrderItemInput, OrderTrackingInput } from "../validators/order.js";
import { getSettings } from "../models/Settings.js";
import { calculateShipping } from './shipping.service.js';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { invalidatePublicCatalogCache } from './public-catalog-cache.service.js';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  currency: string;
  subtotal: number;
  shippingFee: number;
  shippingGovernorate: string;
  shippingArea: string;
  deliveryEstimate?: { min?: number; max?: number };
  total: number;
  createdAt: string;
  /** Single-use token that lets a guest upload their InstaPay proof. */
  accessToken?: string;
}

export interface CustomerOrderItemSummary {
  name: { ar: string; en: string };
  image: string;
  note?: string;
  color?: { ar: string; en: string };
  quantity: number;
  lineTotal: number;
}

export interface CustomerOrderSummary extends OrderSummary {
  items: CustomerOrderItemSummary[];
}

export interface TrackingEvent {
  kind: 'order' | 'payment';
  status: string;
  occurredAt: string;
}

/** The only order data that can ever leave the public tracking endpoint. */
export interface TrackingOrder {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  shippingStatus: 'pending' | 'preparing' | 'in_transit' | 'delivered' | 'cancelled';
  estimatedDelivery?: { from: string; to: string };
  timeline: TrackingEvent[];
}

async function buildOrderNumber(): Promise<string> {
  const seq = await nextSequence("order");
  return `RBAH-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
}

function hashOrderAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * The browser already owns the idempotency key for a checkout attempt. Derive
 * its order capability server-side so a retry can safely recover it while the
 * database keeps only a non-reversible hash of the actual capability.
 */
function deriveOrderAccessToken(idempotencyKey: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`order-access:${idempotencyKey}`).digest('hex');
}

export function matchesOrderAccessToken(order: any, token: string): boolean {
  const expectedHash = order?.accessTokenHash
    ? String(order.accessTokenHash)
    : order?.accessToken
      ? hashOrderAccessToken(String(order.accessToken))
      : '';
  return Boolean(expectedHash) && secureEquals(expectedHash, hashOrderAccessToken(token));
}

interface StockReservation {
  productId: unknown;
  variantId?: unknown;
  color?: { ar?: string; en?: string };
  quantity: number;
}

interface ResolvedOrderItem {
  product: any;
  variant?: any;
}

async function restoreReservedStock(reservations: StockReservation[]): Promise<void> {
  await Promise.all(reservations.map(async (reservation) => {
    if (!reservation.variantId) {
      await Product.updateOne({ _id: reservation.productId }, { $inc: { stock: reservation.quantity } });
      return;
    }

    const restoredById = await Product.updateOne(
      { _id: reservation.productId, 'variants._id': reservation.variantId },
      { $inc: { 'variants.$.stock': reservation.quantity, stock: reservation.quantity } },
    );
    if (restoredById.matchedCount === 0) {
      // Orders placed before color removal must restore into general stock.
      const restoredGeneral = await Product.updateOne(
        { _id: reservation.productId, 'variants.0': { $exists: false } },
        { $inc: { stock: reservation.quantity } },
      );
      if (restoredGeneral.matchedCount > 0) return;
    }
    const colorMatches = reservation.color
      ? [reservation.color.ar, reservation.color.en]
          .filter((value): value is string => Boolean(value?.trim()))
          .map((value) => ({
            [`color.name.${reservation.color?.ar === value ? 'ar' : 'en'}`]: value,
          }))
      : [];
    if (restoredById.matchedCount > 0 || colorMatches.length === 0) return;

    // A legacy order may point to a size-specific variant removed by the
    // color migration. Its immutable color snapshot is the safe fallback.
    await Product.updateOne(
      {
        _id: reservation.productId,
        variants: { $elemMatch: {
          $or: colorMatches,
        } },
      },
      { $inc: { 'variants.$.stock': reservation.quantity, stock: reservation.quantity } },
    );
  }));
}

async function decrementStock(items: OrderItemInput[]): Promise<{
  resolved: ResolvedOrderItem[];
  reservations: StockReservation[];
}> {
  const resolved: ResolvedOrderItem[] = [];
  const reservations: StockReservation[] = [];

  try {
    for (const item of items) {
      const product = item.productSlug
        ? await Product.findOne({ slug: item.productSlug, isActive: true, isDemo: { $ne: true } })
        : await Product.findOne({ _id: item.productId, isActive: true, isDemo: { $ne: true } });
      if (!product) {
        throw AppError.badRequest(`Product not found: ${item.productSlug ?? item.productId}`);
      }
      const colors = product.colorOptions ?? [];
      if ((colors.length && !item.color) || (item.color && !colors.some(color => color.hex?.toUpperCase() === item.color))) {
        throw AppError.badRequest(`Choose an available color for ${product.slug}`);
      }

      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );
      if (!updated || Number(updated.stock ?? 0) < 0) {
        throw AppError.badRequest(`Insufficient stock for ${product.slug}`);
      }
      reservations.push({ productId: product._id, quantity: item.quantity });
      resolved.push({ product });
    }
  } catch (error) {
    await restoreReservedStock(reservations);
    throw error;
  }

  return { resolved, reservations };
}

export async function createOrder(
  input: CreateOrderInput,
  customerId?: string,
): Promise<OrderSummary> {
  const existing = await Order.findOne({
    idempotencyKey: input.idempotencyKey,
    customerId,
  }).select('+accessToken +accessTokenHash');
  if (existing) {
    return toSummary(
      existing,
      existing.accessTokenHash ? deriveOrderAccessToken(input.idempotencyKey) : undefined,
    );
  }

  const settings = await getSettings();
  if (input.paymentMethod === 'instapay' && (!settings.instapay?.enabled || !settings.instapay.identifier?.trim())) {
    throw AppError.badRequest('InstaPay is not available');
  }
  // Validate delivery availability before reserving/decrementing inventory.
  // This prevents an unavailable destination from consuming stock.
  calculateShipping(settings, 0, input.customer.governorate, input.customer.city);
  const { resolved: products, reservations } = await decrementStock(input.items);
  let accessToken = '';
  let order;
  try {

    let subtotal = 0;
    const orderItems = input.items.map((item, index) => {
      const { product, variant } = products[index];
      const unitPrice = Number(product.salePrice ?? product.price ?? 0);
      subtotal += unitPrice * item.quantity;

      return {
        product: product._id,
        sku: product.sku,
        name: product.name,
        image: product.images?.[0]?.url ?? "",
        note: item.note ?? '',
        variantId: variant?._id,
        color: item.color
          ? product.colorOptions?.find((color: { hex: string; name: { ar: string; en: string } }) => color.hex?.toUpperCase() === item.color)?.name
          : variant
          ? {
              ar: String(variant.color?.name?.ar ?? ''),
              en: String(variant.color?.name?.en ?? ''),
            }
          : undefined,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      };
    });

    // Never trust the client-provided shipping amount. Recalculate it from the
    // persisted settings and the normalized customer address on every order.
    const shippingQuote = calculateShipping(settings, subtotal, input.customer.governorate, input.customer.city);
    const shippingFee = shippingQuote.fee;
    const total = subtotal + shippingFee;
    const orderNumber = await buildOrderNumber();
    accessToken = deriveOrderAccessToken(input.idempotencyKey);
    const placedAt = new Date();

    order = await Order.create({
      orderNumber,
      idempotencyKey: input.idempotencyKey,
      customerId,
      customer: input.customer,
      items: orderItems,
      subtotal,
      shippingFee,
      shippingGovernorate: input.customer.governorate,
      shippingArea: input.customer.city,
      deliveryEstimate: { min: shippingQuote.estimatedDaysMin, max: shippingQuote.estimatedDaysMax },
      total,
      currency: settings.currency,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "cod" ? "pending" : "awaiting_verification",
      orderStatus: "new",
      trackingEvents: [
        { kind: 'order', status: 'new', occurredAt: placedAt },
        { kind: 'payment', status: input.paymentMethod === 'cod' ? 'pending' : 'awaiting_verification', occurredAt: placedAt },
      ],
      accessTokenHash: hashOrderAccessToken(accessToken),
    });
  } catch (error: any) {
    await restoreReservedStock(reservations);
    if (error?.code === 11000) {
      const duplicate = await Order.findOne({ idempotencyKey: input.idempotencyKey, customerId }).select('+accessTokenHash');
      if (duplicate) return toSummary(duplicate, duplicate.accessTokenHash ? accessToken : undefined);
    }
    throw error;
  }

  invalidatePublicCatalogCache();
  return toSummary(order, accessToken);
}

/** Cancel an order and restore exactly the stock reserved by that order once. */
export async function cancelOrder(orderId: string): Promise<any> {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, stockRestored: false },
    { $set: { orderStatus: 'cancelled', stockRestored: true } },
    { new: true },
  );
  if (!claimed) {
    const existing = await Order.findById(orderId);
    if (!existing) throw AppError.notFound('Order not found');
    if (existing.orderStatus !== 'cancelled') throw AppError.conflict('Order could not be cancelled');
    return existing;
  }

  try {
    await restoreReservedStock(claimed.items.map((item: any) => ({
      productId: item.product,
      variantId: item.variantId,
      color: item.color,
      quantity: item.quantity,
    })));
  } catch (error) {
    await Order.updateOne({ _id: claimed._id, stockRestored: true }, { $set: { stockRestored: false } });
    throw error;
  }
  invalidatePublicCatalogCache();
  return claimed;
}

export async function getOrderByToken(
  token: string,
): Promise<OrderSummary | null> {
  const tokenHash = hashOrderAccessToken(token);
  const order = await Order.findOne({ accessTokenHash: tokenHash })
    ?? await Order.findOne({ accessToken: token }).select('+accessToken');
  return order ? toSummary(order) : null;
}

function normalizePhone(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/\D/g, '');
}

function secureEquals(left: string, right: string): boolean {
  const leftValue = Buffer.from(left);
  const rightValue = Buffer.from(right);
  return leftValue.length === rightValue.length && timingSafeEqual(leftValue, rightValue);
}

function shippingStatus(orderStatus: string): TrackingOrder['shippingStatus'] {
  switch (orderStatus) {
    case 'preparing': return 'preparing';
    case 'shipped': return 'in_transit';
    case 'completed': return 'delivered';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function toTrackingOrder(order: any): TrackingOrder {
  const obj = typeof order?.toObject === 'function' ? order.toObject() : order;
  const createdAt = new Date(obj.createdAt);
  const min = Number(obj.deliveryEstimate?.min);
  const max = Number(obj.deliveryEstimate?.max);
  const timeline = Array.isArray(obj.trackingEvents) && obj.trackingEvents.length
    ? obj.trackingEvents
    : [
        { kind: 'order', status: 'new', occurredAt: obj.createdAt },
        ...(obj.orderStatus && obj.orderStatus !== 'new'
          ? [{ kind: 'order', status: obj.orderStatus, occurredAt: obj.updatedAt ?? obj.createdAt }]
          : []),
      ];

  return {
    orderNumber: String(obj.orderNumber),
    createdAt: createdAt.toISOString(),
    status: String(obj.orderStatus),
    paymentStatus: String(obj.paymentStatus),
    shippingStatus: shippingStatus(String(obj.orderStatus)),
    ...(Number.isFinite(min) && Number.isFinite(max) ? {
      estimatedDelivery: {
        from: new Date(createdAt.getTime() + min * 86_400_000).toISOString(),
        to: new Date(createdAt.getTime() + max * 86_400_000).toISOString(),
      },
    } : {}),
    timeline: timeline.map((event: any) => ({
      kind: event.kind === 'payment' ? 'payment' : 'order',
      status: String(event.status),
      occurredAt: new Date(event.occurredAt).toISOString(),
    })),
  };
}

/**
 * Verifies an order before mapping it to the deliberately small public view.
 * Do not replace this with a find-by-phone query: that would create an order
 * enumeration side channel and risks accidentally serialising the customer.
 */
export async function getOrderForTracking(input: OrderTrackingInput): Promise<TrackingOrder | null> {
  const order = await Order.findOne({ orderNumber: input.orderNumber })
    .select('+accessToken +accessTokenHash orderNumber customer.phone orderStatus paymentStatus deliveryEstimate trackingEvents createdAt updatedAt')
    .lean();
  if (!order) return null;

  const verifiedByCode = Boolean(input.accessCode && matchesOrderAccessToken(order, input.accessCode));
  const verifiedByPhone = Boolean(input.phone && order.customer?.phone && secureEquals(normalizePhone(String(order.customer.phone)), normalizePhone(input.phone)));
  if (!verifiedByCode && !verifiedByPhone) return null;

  return toTrackingOrder(order);
}

export function toSummary(order: any, accessToken?: string): OrderSummary {
  const obj = typeof order?.toObject === "function" ? order.toObject() : order;
  return {
    id: String(obj?._id ?? ""),
    orderNumber: String(obj?.orderNumber ?? ""),
    status: String(obj?.orderStatus ?? ""),
    paymentStatus: String(obj?.paymentStatus ?? ""),
    paymentMethod: String(obj?.paymentMethod ?? ""),
    currency: String(obj?.currency ?? "EGP"),
    subtotal: Number(obj?.subtotal ?? 0),
    shippingFee: Number(obj?.shippingFee ?? 0),
    shippingGovernorate: String(obj?.shippingGovernorate ?? obj?.customer?.governorate ?? ''),
    shippingArea: String(obj?.shippingArea ?? obj?.customer?.city ?? ''),
    deliveryEstimate: obj?.deliveryEstimate ? { min: obj.deliveryEstimate.min, max: obj.deliveryEstimate.max } : undefined,
    total: Number(obj?.total ?? 0),
    createdAt: obj?.createdAt
      ? new Date(obj.createdAt).toISOString()
      : new Date().toISOString(),
    ...(accessToken ? { accessToken } : {}),
  };
}

export function toCustomerOrderSummary(order: any): CustomerOrderSummary {
  const summary = toSummary(order);
  const obj = typeof order?.toObject === "function" ? order.toObject() : order;
  return {
    ...summary,
    items: Array.isArray(obj?.items) ? obj.items.map((item: any) => ({
      name: {
        ar: String(item?.name?.ar ?? ''),
        en: String(item?.name?.en ?? ''),
      },
      image: String(item?.image ?? ''),
      note: String(item?.note ?? ''),
      color: item?.color ? {
        ar: String(item.color.ar ?? ''),
        en: String(item.color.en ?? ''),
      } : undefined,
      quantity: Number(item?.quantity ?? 0),
      lineTotal: Number(item?.lineTotal ?? 0),
    })) : [],
  };
}
