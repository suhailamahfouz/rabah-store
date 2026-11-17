import { Request, Response, NextFunction } from 'express';
import { createOrderSchema, orderListQuerySchema, orderTrackingSchema } from '../validators/order.js';
import { shippingQuoteSchema } from '../validators/admin-management.js';
import { createOrder, getOrderByToken, getOrderForTracking, toCustomerOrderSummary } from '../services/order.service.js';
import { quoteShipping } from '../services/shipping.service.js';
import { AppError } from '../utils/AppError.js';
import { CustomerRequest } from '../middleware/auth.js';
import { Order } from '../models/Order.js';

export async function create(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await createOrder(input, req.customerId);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req: CustomerRequest, res: Response): Promise<void> {
  const query = orderListQuerySchema.parse(req.query);
  const filter = { customerId: req.customerId! };
  const projection = '_id orderNumber orderStatus paymentStatus paymentMethod currency subtotal shippingFee shippingGovernorate shippingArea deliveryEstimate total createdAt items';
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .select(projection)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders.map(order => ({
      id: String(order._id),
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      currency: order.currency,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt ?? ''),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.params.token ?? '').trim();
    if (!token) return next(AppError.badRequest('Order token required'));
    const order = await getOrderByToken(token);
    if (!order) return next(AppError.notFound('Order not found'));
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

/** Public but ownership-verified order tracking. The failure is intentionally generic. */
export async function track(req: Request, res: Response, next: NextFunction) {
  try {
    const input = orderTrackingSchema.parse(req.body);
    const order = await getOrderForTracking(input);
    if (!order) return next(AppError.notFound('Order not found or verification failed'));
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function shippingQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const input = shippingQuoteSchema.parse(req.body);
    const quote = await quoteShipping(input.subtotal, input.governorate, input.area);
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
}
