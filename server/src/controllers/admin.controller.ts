import type { Request, Response } from 'express';
import { Category } from '../models/Category.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { COOKIE_NAME, cookieOptions, type AuthedRequest } from '../middleware/auth.js';

const STORE_TIME_ZONE = 'Africa/Cairo';
const EXCLUDED_SALES_STATUS = 'cancelled';

interface SalesPeriod {
  current: number;
  previous: number;
  changePercent: number | null;
}

function cairoDateParts(date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function cairoPeriodKey(unit: 'day' | 'month', offset = 0): string {
  const { year, month, day } = cairoDateParts();
  const base = unit === 'day'
    ? new Date(Date.UTC(year, month - 1, day + offset))
    : new Date(Date.UTC(year, month - 1 + offset, 1));
  return base.toISOString().slice(0, unit === 'day' ? 10 : 7);
}

function comparison(current: number, previous: number): SalesPeriod {
  return {
    current,
    previous,
    // A percentage is undefined when the preceding period has no sales.
    changePercent: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
  };
}

export function session(req: AuthedRequest, res: Response): void {
  res.json({ success: true, admin: req.admin });
}

export async function dashboard(_req: Request, res: Response): Promise<void> {
  const today = cairoPeriodKey('day');
  const yesterday = cairoPeriodKey('day', -1);
  const currentMonth = cairoPeriodKey('month');
  const previousMonth = cairoPeriodKey('month', -1);
  const salesMatch = { orderStatus: { $ne: EXCLUDED_SALES_STATUS } };

  const [summary, products, categories, customers, dailySales, monthlySales, latestOrders] = await Promise.all([
    Order.aggregate<{
      orders: number;
      sales: number;
      newOrders: number;
      pendingOrders: number;
      completedOrders: number;
      cancelledOrders: number;
    }>([
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          sales: { $sum: { $cond: [{ $ne: ['$orderStatus', EXCLUDED_SALES_STATUS] }, '$total', 0] } },
          newOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'new'] }, 1, 0] } },
          // The order model has no "pending" state. These are the active orders
          // that have moved beyond new and have not reached a final state.
          pendingOrders: { $sum: { $cond: [{ $in: ['$orderStatus', ['confirmed', 'preparing', 'shipped']] }, 1, 0] } },
          completedOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'completed'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] } },
        },
      },
      { $project: { _id: 0 } },
    ]),
    Product.countDocuments(),
    Category.countDocuments(),
    Customer.countDocuments(),
    Order.aggregate<{ _id: string; total: number }>([
      { $match: salesMatch },
      {
        $group: {
          _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: STORE_TIME_ZONE } },
          total: { $sum: '$total' },
        },
      },
      { $match: { _id: { $in: [today, yesterday] } } },
    ]),
    Order.aggregate<{ _id: string; total: number }>([
      { $match: salesMatch },
      {
        $group: {
          _id: { $dateToString: { date: '$createdAt', format: '%Y-%m', timezone: STORE_TIME_ZONE } },
          total: { $sum: '$total' },
        },
      },
      { $match: { _id: { $in: [currentMonth, previousMonth] } } },
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select('orderNumber customer.fullName customer.phone total currency orderStatus paymentStatus createdAt')
      .lean(),
  ]);

  const summaryValues = summary[0] ?? {
    orders: 0,
    sales: 0,
    newOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  };
  const dailyTotals = new Map(dailySales.map((period) => [period._id, period.total]));
  const monthlyTotals = new Map(monthlySales.map((period) => [period._id, period.total]));

  res.json({
    success: true,
    data: {
      summary: { ...summaryValues, products, categories, customers },
      dailySales: comparison(dailyTotals.get(today) ?? 0, dailyTotals.get(yesterday) ?? 0),
      monthlySales: comparison(monthlyTotals.get(currentMonth) ?? 0, monthlyTotals.get(previousMonth) ?? 0),
      latestOrders,
    },
  });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ success: true });
}
