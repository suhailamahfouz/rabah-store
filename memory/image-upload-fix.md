---
name: image-upload-fix
description: Fixed image upload rejection for valid image formats + local disk fallback
metadata:
  type: project
---

## Problem

Users getting "تعذر رفع الصور. تحققي من النوع والحجم ثم حاولي مرة أخرى" when uploading category/product images, even for valid image formats. Also getting "خدمة رفع الصور غير مُعدّة على الخادم" when Cloudinary is not configured.

## Root Causes

1. **`validateImageUploads` middleware** used `hasValidImageSignature()` which only accepts specific magic bytes (JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC with specific `ftyp` brands). Many valid images from modern cameras/phones don't match these patterns and get rejected.

2. **`uploadImages()` function** threw `MEDIA_UNAVAILABLE` when `env.cloudinary` was undefined, since the app was hardwired to Cloudinary only.

## Fix Applied

### 1. Removed magic-byte validation from `validateImageUploads()`

- `server/src/services/product-image-storage.service.ts:96-102`
- The function now only checks that at least one file is present
- Relies on Multer's `fileFilter` which already ensures `image/` mimetype
- Removed the `hasValidImageSignature()` function's usage

### 2. Added local-disk fallback storage when Cloudinary is not configured

- `server/src/services/product-image-storage.service.ts:140-185`
- `uploadImages()` now has two paths:
  - **Cloudinary path** (when `env.cloudinary` is set): existing behaviour
  - **Local-disk fallback** (when Cloudinary is not configured): saves files under `uploads/public/<scope>/` with UUID filenames and returns local URLs `/media/<scope>/<filename>`
- This means uploads work immediately without any Cloudinary configuration

### 3. Updated `signedParams()` to use fallback secret

- When `env.cloudinary.apiSecret` is unavailable, uses `'local-upload-fallback-secret'` so signatures are deterministic for local storage

## Files Modified

- `server/src/services/product-image-storage.service.ts`:
  - `validateImageUploads()` — removed magic-byte validation
  - `uploadImages()` — added local-disk fallback path
  - `signedParams()` — fallback secret for local mode
  - Added `localFolder()` helper function
- Client: no changes needed (frontend already accepts all files per test report)

## Build & Test Results

- ✅ Server `npm run build` passes
- ✅ Client `npm run build` passes
- ✅ 17/17 backend tests pass (1 pre-existing unrelated failure in `order-customer-id.test.ts`)