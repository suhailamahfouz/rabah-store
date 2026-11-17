import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { adminCustomerListQuerySchema } from '../validators/admin-management.js';

type CustomerOrderSummary = {
  orderCount: number;
  totalSpent: number;
  latestOrderAt?: Date;
};

function customerId(req: Request): string {
  const id = req.params['id'];
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) throw AppError.badRequest('Invalid customer ID');
  return id;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function orderSummaryPipeline(customerObjectId: mongoose.Types.ObjectId) {
  return [
    { $match: { customerId: customerObjectId } },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        // Cancelled orders remain in the history but never contribute to spend.
        totalSpent: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$total', 0] } },
        latestOrderAt: { $max: '$createdAt' },
      },
    },
    { $project: { _id: 0, orderCount: 1, totalSpent: 1, latestOrderAt: 1 } },
  ];
}

/**
 * Admin-only customer directory. Its explicit projection is intentional: no
 * password hash, session token, or other authentication material can enter
 * this response if the Customer model grows in the future.
 */
export async function listCustomers(req: Request, res: Response): Promise<void> {
  const { name = '', email = '', phone = '', page, limit } = adminCustomerListQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (name) filter.name = { $regex: escapeRegex(name), $options: 'i' };
  if (email) filter.email = { $regex: escapeRegex(email), $options: 'i' };
  if (phone) filter.phone = { $regex: escapeRegex(phone), $options: 'i' };

  const [customers, total] = await Promise.all([
    Customer.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: Order.collection.name,
          let: { customerId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$customerId', '$$customerId'] } } },
            {
              $group: {
                _id: null,
                orderCount: { $sum: 1 },
                totalSpent: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$total', 0] } },
                latestOrderAt: { $max: '$createdAt' },
              },
            },
          ],
          as: 'orderSummary',
        },
      },
      {
        $project: {
          // Keep this allow-list in sync with the public AdminCustomer type.
          name: 1,
          email: 1,
          phone: 1,
          createdAt: 1,
          orderCount: { $ifNull: [{ $arrayElemAt: ['$orderSummary.orderCount', 0] }, 0] },
          totalSpent: { $ifNull: [{ $arrayElemAt: ['$orderSummary.totalSpent', 0] }, 0] },
          latestOrderAt: { $arrayElemAt: ['$orderSummary.latestOrderAt', 0] },
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]),
    Customer.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: customers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

/**
 * Admin-only customer details and order history. Order projections exclude
 * shipping addresses, payment proofs, access tokens, and authentication data.
 */
export async function readCustomer(req: Request, res: Response): Promise<void> {
  const id = customerId(req);
  const objectId = new mongoose.Types.ObjectId(id);
  const [customer, summaries, orders] = await Promise.all([
    Customer.findById(id).select('_id name email phone createdAt').lean(),
    Order.aggregate<CustomerOrderSummary>(orderSummaryPipeline(objectId)),
    Order.find({ customerId: objectId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('orderNumber items.name items.sku items.quantity items.unitPrice items.note total currency paymentMethod paymentStatus orderStatus createdAt')
      .lean(),
  ]);
  if (!customer) throw AppError.notFound('Customer not found');

  const summary = summaries[0] ?? { orderCount: 0, totalSpent: 0 };
  res.json({ success: true, data: { customer, summary, orders } });
}
