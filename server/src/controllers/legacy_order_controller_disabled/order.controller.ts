import { Request, Response, NextFunction } from 'express';
import { createOrderSchema } from '../../validators/order.js';
import { createOrder, getOrderByToken } from '../../services/order.service.js';
import { AppError } from '../../utils/AppError.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await createOrder(input);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
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