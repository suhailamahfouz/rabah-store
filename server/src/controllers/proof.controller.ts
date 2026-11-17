import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { Order } from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { hasValidProofSignature, paymentProofUpload, proofExtension } from '../middleware/uploadProof.js';
import { matchesOrderAccessToken } from '../services/order.service.js';

/** Directory where InstaPay screenshots are persisted. */
const PROOF_DIR = path.resolve(env.UPLOAD_DIR, 'instapay');

const proofRequestSchema = z.object({
  accessToken: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid order access token'),
  transferReference: z.string().trim().max(80).optional(),
}).strict();

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

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

    const file = (req as unknown as { file?: Express.Multer.File }).file;
    if (!file) return next(AppError.badRequest('Payment proof image is required'));
    if (!hasValidProofSignature(file)) {
      return next(AppError.badRequest('Payment proof is not a valid image file'));
    }

    ensureDir(PROOF_DIR);
    const ext = proofExtension(file);
    const filename = `${order.orderNumber}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(PROOF_DIR, filename);
    fs.writeFileSync(filePath, file.buffer);

    order.paymentProof = {
      transferReference: input.transferReference || undefined,
      filePath: filename,
      uploadedAt: new Date(),
    };
    // Awaiting admin review — never auto-mark as paid.
    if (order.paymentStatus !== 'awaiting_verification') {
      order.paymentStatus = 'awaiting_verification';
      order.trackingEvents.push({ kind: 'payment', status: 'awaiting_verification', occurredAt: new Date() });
    }
    await order.save();

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        proof: {
          filename,
          size: file.size,
          mime: file.mimetype,
          uploadedAt: order.paymentProof.uploadedAt?.toISOString(),
        },
      },
    });
  } catch (err) { next(err); }
}

export const paymentProofMiddleware = paymentProofUpload.single('proof');
