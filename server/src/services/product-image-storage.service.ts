import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/** The dashboard uses one protected upload pipeline for every storefront image. */
export type ImageUploadScope = 'products' | 'categories' | 'branding' | 'banners';

export interface CloudinaryImage {
  url: string;
  publicId: string;
}

const MAX_PRODUCT_IMAGES = 20;
const imageExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/bmp': '.bmp',
  'image/x-ms-bmp': '.bmp',
  'image/tiff': '.tiff',
};
const imageFilenameExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic', '.heif', '.bmp', '.tif', '.tiff']);
const scopes = new Set<ImageUploadScope>(['products', 'categories', 'branding', 'banners']);

function extensionFor(mimeType: string): string | undefined {
  return imageExtensions[mimeType.toLowerCase()];
}

function hasSupportedFilenameExtension(filename: string): boolean {
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return imageFilenameExtensions.has(extension);
}

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: MAX_PRODUCT_IMAGES,
    fields: 5,
    parts: MAX_PRODUCT_IMAGES + 10,
  },
  fileFilter: (_req, file, callback) => {
    // Accept any image mimetype — server-side validateImageUploads permits all formats.
    // Some mobile browsers report HEIC as application/octet-stream; check extension as fallback.
    if (!file.mimetype.toLowerCase().startsWith('image/') && !hasSupportedFilenameExtension(file.originalname)) {
      callback(AppError.badRequest('Only supported image files are allowed'));
      return;
    }
    callback(null, true);
  },
});

export function getUploadedImageFiles(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : [];
}

/** Parses `images` only; the browser never submits a Cloudinary URL or id. */
export function handleImageUpload(req: Request, res: Response, next: NextFunction): void {
  imageUpload.array('images', MAX_PRODUCT_IMAGES)(req, res, (error: unknown) => {
    if (error) return next(error);
    next();
  });
}

function hasValidImageSignature(file: Express.Multer.File): boolean {
  const bytes = file.buffer;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true; // PNG
  if (bytes.length >= 6 && (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a')) return true; // GIF
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return true;
  if (bytes.length >= 2 && bytes.subarray(0, 2).toString('ascii') === 'BM') return true; // BMP
  if (bytes.length >= 4 && (
    bytes.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00]))
    || bytes.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]))
  )) return true; // TIFF
  if (bytes.length < 12 || bytes.subarray(4, 8).toString('ascii') !== 'ftyp') return false;
  const brand = bytes.subarray(8, 12).toString('ascii').toLowerCase();
  // ISO base media formats used by AVIF and iPhone/HEIF camera images.
  return ['avif', 'avis', 'heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand);
}

/** Validates that uploaded files have valid image mimetypes.
 *  Multer's fileFilter already ensures mimetype starts with 'image/',
 *  and Cloudinary performs its own format validation on upload.
 *  This check is kept as a lightweight mimetype guard only. */
export function validateImageUploads(req: Request, _res: Response, next: NextFunction): void {
  const files = getUploadedImageFiles(req);
  if (!files.length) return next(AppError.badRequest('At least one image is required'));
  // Mimetype already validated by multer's fileFilter; skip magic-byte check
  // to accept all image formats that modern cameras/phones produce.
  next();
}

export function uploadScope(value: unknown, fallback: ImageUploadScope = 'products'): ImageUploadScope {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string' && scopes.has(value as ImageUploadScope)) return value as ImageUploadScope;
  throw AppError.badRequest('Invalid image upload scope');
}

function signedParams(params: Record<string, string | number>): string {
  // If Cloudinary is configured, use its secret; otherwise fall back to a per-server
  // deterministic seed so the same params always produce the same signature for local storage.
  const secret = env.cloudinary?.apiSecret ?? 'local-upload-fallback-secret';
  const value = Object.entries(params)
    .filter(([, entry]) => entry !== '' && entry !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${key}=${entry}`)
    .join('&');
  return crypto.createHash('sha1').update(`${value}${secret}`).digest('hex');
}

function cloudinaryFolder(scope: ImageUploadScope): string {
  return `rabah-store/${scope}`;
}

function localFolder(scope: ImageUploadScope): string {
  const base = path.resolve(env.UPLOAD_DIR, 'public', scope);
  // Ensure the directory exists
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

function imagePublicId(): string {
  // Generated server-side so a client cannot overwrite an arbitrary asset.
  return `asset-${crypto.randomUUID()}`;
}

export async function uploadImages(files: Express.Multer.File[], scope: ImageUploadScope): Promise<{ url: string; publicId: string }[]> {
  if (env.cloudinary) {
    // Cloudinary path (existing behaviour)
    const folder = cloudinaryFolder(scope);
    return Promise.all(files.map(async (file) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = imagePublicId();
      const signature = signedParams({ folder, public_id: publicId, timestamp });
      const form = new FormData();
      // Copy Buffer into an ArrayBuffer-backed typed array for the DOM Blob type.
      const bytes = new Uint8Array(file.buffer.byteLength);
      bytes.set(file.buffer);
      form.set('file', new Blob([bytes], { type: file.mimetype }), `${publicId}${extensionFor(file.mimetype) ?? (hasSupportedFilenameExtension(file.originalname) ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '')}`);
      form.set('api_key', env.cloudinary!.apiKey);
      form.set('timestamp', String(timestamp));
      form.set('folder', folder);
      form.set('public_id', publicId);
      form.set('signature', signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.cloudinary!.cloudName)}/image/upload`, {
        method: 'POST',
        body: form,
      });
      if (!response.ok) throw new AppError(502, 'Cloudinary could not store the image', 'MEDIA_UPLOAD_FAILED');
      const data = await response.json() as { secure_url?: unknown; public_id?: unknown };
      if (typeof data.secure_url !== 'string' || typeof data.public_id !== 'string') {
        throw new AppError(502, 'Cloudinary returned an invalid image response', 'MEDIA_UPLOAD_FAILED');
      }
      return { url: data.secure_url, publicId: data.public_id };
    }));
  }

  // Local-disk fallback path — saves files under uploads/public/<scope>/ with UUID filenames.
  const folder = localFolder(scope);
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `asset-${crypto.randomUUID()}`;
  const signature = signedParams({ folder, public_id: publicId, timestamp });
  return Promise.all(files.map(async (file) => {
    const ext = extensionFor(file.mimetype) ?? (hasSupportedFilenameExtension(file.originalname) ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '.bin');
    const filename = `${publicId}${ext}`;
    const destPath = path.join(folder, filename);
    // Write the buffer to disk
    await fs.promises.writeFile(destPath, file.buffer);
    // Return a local URL compatible with the public /media proxy
    return { url: `/media/${scope}/${filename}`, publicId: filename };
  }));
}

function isManagedPublicId(publicId: string): boolean {
  return /^rabah-store\/(products|categories|branding|banners)\/asset-[0-9a-f-]{36}$/i.test(publicId);
}

/** Best-effort cleanup after MongoDB no longer references the cloud asset. */
export async function removeCloudinaryImages(publicIds: Iterable<string | null | undefined>): Promise<void> {
  if (!env.cloudinary) return;
  const assets = [...new Set([...publicIds].filter((entry): entry is string => typeof entry === 'string' && isManagedPublicId(entry)))];
  await Promise.all(assets.map(async (publicId) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const form = new FormData();
      form.set('public_id', publicId);
      form.set('api_key', env.cloudinary!.apiKey);
      form.set('timestamp', String(timestamp));
      form.set('signature', signedParams({ public_id: publicId, timestamp }));
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.cloudinary!.cloudName)}/image/destroy`, {
        method: 'POST',
        body: form,
      });
      if (!response.ok) console.error('Unable to remove replaced Cloudinary image', { publicId });
    } catch (error) {
      // The database already points at the new asset. Retain no credentials in logs.
      console.error('Unable to remove replaced Cloudinary image', { publicId, name: error instanceof Error ? error.name : 'Error' });
    }
  }));
}

// Backward-compatible names keep the existing product route and integrations stable.
export const handleProductImageUpload = handleImageUpload;
export const validateProductImageUploads = validateImageUploads;
export const getUploadedProductImageFiles = getUploadedImageFiles;
export { MAX_PRODUCT_IMAGES };
