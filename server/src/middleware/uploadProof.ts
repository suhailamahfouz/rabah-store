import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

/** Same limit the checkout page shows to customers. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

/** Allowed MIME types and server-controlled filename extensions for proofs. */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!Object.hasOwn(ALLOWED_IMAGE_TYPES, file.mimetype)) {
    cb(AppError.badRequest('Only image files (PNG, JPG, WEBP, HEIC) are accepted as payment proof'));
    return;
  }
  cb(null, true);
}

/**
 * Payment-proof upload. Memory storage keeps the file out of the public
 * `uploads/public` directory; the proof handler stores the bytes in MongoDB.
 */
export const paymentProofUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROOF_BYTES,
    files: 1,
    fields: 2,
    parts: 3,
  },
  fileFilter,
});

export function proofExtension(file: Express.Multer.File): string {
  return ALLOWED_IMAGE_TYPES[file.mimetype] ?? 'bin';
}

/** Reject MIME spoofing before a payment proof is ever persisted. */
export function hasValidProofSignature(file: Express.Multer.File): boolean {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === 'image/webp') {
    return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  // HEIC is an ISO Base Media file. Restrict the major brand to known HEIC
  // variants rather than accepting any arbitrary MP4-family container.
  if (file.mimetype === 'image/heic' && bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    return new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']).has(bytes.subarray(8, 12).toString('ascii'));
  }
  return false;
}

export function handleUploadError(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(AppError.badRequest(`File is too large. Maximum size is 5 MB`));
    }
    return next(AppError.badRequest('Upload failed'));
  }
  next(err);
}
