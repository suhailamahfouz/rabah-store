import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { PaymentProof } from '../models/PaymentProof.js';
import { AppError } from '../utils/AppError.js';
import { hasValidProofSignature, paymentProofUpload } from '../middleware/uploadProof.js';
import { matchesOrderAccessToken } from '../services/order.service.js';

/**
 * Why a proof upload must be refused for this order, or null when it is allowed.
 * A paid order keeps its verified status, and a cancelled order takes no payment.
 * A rejected proof may be replaced, which sends the order back to review.
 */
export function proofUploadBlock(order: { paymentStatus: string; orderStatus: string }): string | null {
  if (order.orderStatus === 'cancelled') return 'This order is cancelled';
  if (order.paymentStatus === 'paid') return 'This order is already paid';
  return null;
}

const proofRequestSchema = z.object({
  accessToken: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid order access token'),
  transferReference: z.string().trim().max(80).optional(),
}).strict();

/**
 * POST /api/orders/:orderNumber/proof
 * Accepts a multipart upload (field name "proof") plus an optional
 * `transferReference`. The caller must supply the order's high-entropy
 * `accessToken` to prove ownership. Payment status is set to
 * `awaiting_verification` — never marked paid here.
 */
export async function uploadPaymentProof(req: Request, res: Response, next: NextFunction) {
  try {
    const orderNumber = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,80}$/).parse(req.params.orderNumber);
    const input = proofRequestSchema.parse(req.body);

    // accessToken is select:false, so opt in only for this verification path.
    const order = await Order.findOne({ orderNumber }).select('+accessToken +accessTokenHash');
    if (!order || !matchesOrderAccessToken(order, input.accessToken)) {
      return next(AppError.forbidden('Invalid order access token'));
    }

    if (order.paymentMethod !== 'instapay') {
      return next(AppError.badRequest('Payment proof can only be uploaded for InstaPay orders'));
    }

    const blocked = proofUploadBlock(order);
    if (blocked) return next(AppError.conflict(blocked));

    const file = (req as unknown as { file?: Express.Multer.File }).file;
    if (!file) return next(AppError.badRequest('Payment proof image is required'));
    if (!hasValidProofSignature(file)) {
      return next(AppError.badRequest('Payment proof is not a valid image file'));
    }

    const previousProofId = order.paymentProof?.proofId;
    const stored = await PaymentProof.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      mime: file.mimetype,
      size: file.size,
      data: file.buffer,
    });

    order.paymentProof = {
      transferReference: input.transferReference || undefined,
      proofId: stored._id,
      mime: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };
    // Awaiting admin review — never auto-mark as paid.
    if (order.paymentStatus !== 'awaiting_verification') {
      order.paymentStatus = 'awaiting_verification';
      order.trackingEvents.push({ kind: 'payment', status: 'awaiting_verification', occurredAt: new Date() });
    }
    await order.save();
    if (previousProofId) await PaymentProof.deleteOne({ _id: previousProofId });

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        proof: {
          id: String(stored._id),
          size: file.size,
          mime: file.mimetype,
          uploadedAt: order.paymentProof.uploadedAt?.toISOString(),
        },
      },
    });
  } catch (err) { next(err); }
}

export const paymentProofMiddleware = paymentProofUpload.single('proof');

const proofParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

/** GET /api/admin/orders/:id/proof (admin only): streams the stored screenshot. */
export async function viewPaymentProof(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = proofParams.parse(req.params);
    const order = await Order.findById(id).select('paymentProof orderNumber');
    const proofId = order?.paymentProof?.proofId;
    if (!order || !proofId) return next(AppError.notFound('No payment proof for this order'));
    const proof = await PaymentProof.findById(proofId).select('+data mime');
    if (!proof) return next(AppError.notFound('Payment proof file is missing'));
    res.set({
      'Content-Type': proof.mime,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    res.send(proof.data);
  } catch (err) { next(err); }
}
