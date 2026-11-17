import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { getSettings } from '../models/Settings.js';
import { invalidatePublicCatalogCache } from '../services/public-catalog-cache.service.js';
import { AppError } from '../utils/AppError.js';
import { cancelOrder } from '../services/order.service.js';
import {
  getUploadedImageFiles,
  removeCloudinaryImages,
  uploadImages,
  uploadScope,
} from '../services/product-image-storage.service.js';
import {
  adminCategoryCreateSchema,
  adminCategoryUpdateSchema,
  adminOrderListQuerySchema,
  adminOrderUpdateSchema,
  adminProductListQuerySchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminSettingsSchema,
} from '../validators/admin-management.js';

function recordId(req: Request): string {
  const id = req.params['id'];
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) throw AppError.badRequest('Invalid record ID');
  return id;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const { page, limit, search, status, category, minPrice, maxPrice } = adminProductListQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};

  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (category) filter.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) (filter.price as Record<string, number>).$gte = minPrice;
    if (maxPrice !== undefined) (filter.price as Record<string, number>).$lte = maxPrice;
  }
  if (search) filter.$or = [
    { sku: { $regex: escapeRegex(search), $options: 'i' } },
    { slug: { $regex: escapeRegex(search), $options: 'i' } },
    { 'name.ar': { $regex: escapeRegex(search), $options: 'i' } },
    { 'name.en': { $regex: escapeRegex(search), $options: 'i' } },
  ];

  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'slug name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, data: products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const input = adminProductCreateSchema.parse(req.body);
  if (!(await Category.exists({ _id: input.category, isActive: true }))) {
    throw AppError.badRequest('Selected category does not exist or is inactive');
  }
  const product = await Product.create(input);
  await product.populate('category', 'slug name');
  invalidatePublicCatalogCache();
  res.status(201).json({ success: true, data: product });
}

export async function uploadProductImages(req: Request, res: Response): Promise<void> {
  const files = getUploadedImageFiles(req);
  // File validation and limits run in middleware before this controller.
  res.status(201).json({
    success: true,
    data: (await uploadImages(files, 'products')).map((image) => ({ ...image, alt: '' })),
  });
}

/** Uploads a category, logo, hero, or banner image without exposing Cloudinary credentials. */
export async function uploadSiteImages(req: Request, res: Response): Promise<void> {
  const files = getUploadedImageFiles(req);
  const scope = uploadScope(req.body?.scope);
  if (scope !== 'products' && files.length !== 1) {
    throw AppError.badRequest('Only one image can be uploaded for this site section');
  }
  res.status(201).json({ success: true, data: await uploadImages(files, scope) });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const id = recordId(req);
  const input = adminProductUpdateSchema.parse(req.body);
  if (input.category && !(await Category.exists({ _id: input.category, isActive: true }))) {
    throw AppError.badRequest('Selected category does not exist or is inactive');
  }
  const current = await Product.findById(id);
  if (!current) throw AppError.notFound('Product not found');
  const nextPrice = input.price ?? current.price;
  const nextSalePrice = input.salePrice === undefined ? current.salePrice : input.salePrice;
  if (nextSalePrice != null && nextSalePrice >= nextPrice) {
    throw AppError.badRequest('Sale price must be lower than the regular price');
  }
  const updates: Record<string, unknown> = { ...input };
  // General stock is authoritative. An unrelated edit must not rewrite it.
  const product = await Product.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
    .populate('category', 'slug name');
  if (!product) throw AppError.notFound('Product not found');
  if (input.images !== undefined) {
    const nextPublicIds = new Set(input.images.map((image) => image.publicId).filter(Boolean));
    // MongoDB has committed the new image set. The old Cloudinary asset is
    // deleted only now, so a failed edit never loses the existing image.
    await removeCloudinaryImages(current.images
      .map((image) => image.publicId)
      .filter((publicId) => publicId && !nextPublicIds.has(publicId)));
  }
  invalidatePublicCatalogCache();
  res.json({ success: true, data: product });
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const product = await Product.findByIdAndUpdate(recordId(req), { isActive: false }, { new: true });
  if (!product) throw AppError.notFound('Product not found');
  invalidatePublicCatalogCache();
  res.json({ success: true, data: product });
}

export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = await Category.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
  res.json({ success: true, data: categories });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const category = await Category.create(adminCategoryCreateSchema.parse(req.body));
  invalidatePublicCatalogCache();
  res.status(201).json({ success: true, data: category });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const id = recordId(req);
  const updates = adminCategoryUpdateSchema.parse(req.body);
  if (updates.isActive === false && await Product.exists({ category: id })) {
    throw AppError.conflict('Move or remove this category’s products before deactivating it');
  }
  const current = await Category.findById(id);
  if (!current) throw AppError.notFound('Category not found');
  const category = await Category.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!category) throw AppError.notFound('Category not found');
  if (updates.image !== undefined && current.imagePublicId && current.image !== updates.image) {
    await removeCloudinaryImages([current.imagePublicId]);
  }
  invalidatePublicCatalogCache();
  res.json({ success: true, data: category });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const category = await Category.findById(recordId(req));
  if (!category) throw AppError.notFound('Category not found');
  if (await Product.exists({ category: category._id })) {
    throw AppError.conflict('Move this category\'s products before deleting it');
  }
  await Category.deleteOne({ _id: category._id });
  // MongoDB no longer references the asset, so cleanup cannot leave a broken
  // category behind if the database operation fails.
  await removeCloudinaryImages([category.imagePublicId]);
  invalidatePublicCatalogCache();
  res.json({ success: true, data: { id: String(category._id) } });
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const { search, status, paymentMethod, dateFrom, dateTo } = adminOrderListQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (status) filter.orderStatus = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (search) filter.$or = [
    { orderNumber: { $regex: escapeRegex(search), $options: 'i' } },
    { 'customer.fullName': { $regex: escapeRegex(search), $options: 'i' } },
    { 'customer.phone': { $regex: escapeRegex(search), $options: 'i' } },
  ];
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) (filter.createdAt as Record<string, Date>).$gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) {
      const end = new Date(`${dateTo}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      (filter.createdAt as Record<string, Date>).$lt = end;
    }
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200)
    .select('orderNumber customer items subtotal shippingFee total currency paymentMethod paymentStatus orderStatus createdAt')
    .lean();
  res.json({ success: true, data: orders });
}

export async function updateOrder(req: Request, res: Response): Promise<void> {
  const id = recordId(req);
  const updates = adminOrderUpdateSchema.parse(req.body);
  let order = await Order.findById(id);
  if (!order) throw AppError.notFound('Order not found');
  const trackingEvents: Array<{ kind: 'order' | 'payment'; status: string; occurredAt: Date }> = [];
  if (updates.orderStatus && updates.orderStatus !== order.orderStatus) {
    trackingEvents.push({ kind: 'order', status: updates.orderStatus, occurredAt: new Date() });
  }
  if (updates.paymentStatus && updates.paymentStatus !== order.paymentStatus) {
    trackingEvents.push({ kind: 'payment', status: updates.paymentStatus, occurredAt: new Date() });
  }
  const finalStatuses = new Set(['completed', 'cancelled']);
  if (finalStatuses.has(order.orderStatus) && updates.orderStatus && updates.orderStatus !== order.orderStatus) {
    throw AppError.conflict('Final orders cannot change status');
  }
  if (order.orderStatus === 'cancelled' && updates.orderStatus && updates.orderStatus !== 'cancelled') {
    throw AppError.conflict('Cancelled orders cannot be reopened');
  }
  if (updates.orderStatus === 'cancelled') {
    order = await cancelOrder(id);
    const { orderStatus: _ignored, ...otherUpdates } = updates;
    if (Object.keys(otherUpdates).length) {
      order = await Order.findByIdAndUpdate(id, { $set: otherUpdates }, { new: true, runValidators: true });
    }
  } else {
    order = await Order.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
  }
  if (order && trackingEvents.length) {
    order = await Order.findByIdAndUpdate(
      id,
      { $push: { trackingEvents: { $each: trackingEvents } } },
      { new: true, runValidators: true },
    );
  }
  if (!order) throw AppError.notFound('Order not found');
  res.json({ success: true, data: order });
}

export async function readSettings(_req: Request, res: Response): Promise<void> {
  const settings = await getSettings();
  res.json({ success: true, data: settings });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const input = adminSettingsSchema.parse(req.body);
  const settings = await getSettings();
  const previousImages = [
    { url: settings.logoUrl, publicId: settings.logoPublicId },
    { url: settings.hero?.posterUrl ?? '', publicId: settings.hero?.posterPublicId },
    { url: settings.promoBanner?.image ?? '', publicId: settings.promoBanner?.imagePublicId },
    { url: settings.featuredCollection?.image ?? '', publicId: settings.featuredCollection?.imagePublicId },
  ];
  settings.storeName = input.storeName;
  settings.logoUrl = input.logoUrl;
  settings.logoPublicId = input.logoPublicId ?? '';
  settings.set('hero.posterUrl', input.hero.posterUrl);
  settings.set('hero.posterPublicId', input.hero.posterPublicId ?? '');
  settings.set('promoBanner.image', input.promoBanner.image);
  settings.set('promoBanner.imagePublicId', input.promoBanner.imagePublicId ?? '');
  settings.set('promoBanner.isActive', input.promoBanner.isActive);
  settings.set('featuredCollection.image', input.featuredCollection.image);
  settings.set('featuredCollection.imagePublicId', input.featuredCollection.imagePublicId ?? '');
  settings.currency = input.currency;
  settings.deliveryFee = input.deliveryFee;
  settings.set('freeShippingThreshold', input.freeShippingThreshold);
  settings.announcement = input.announcement;
  settings.set('contact.phone', input.contact.phone);
  settings.set('contact.whatsapp', input.contact.whatsapp);
  settings.set('contact.email', input.contact.email);
  settings.set('social.instagram', input.social.instagram);
  settings.set('social.facebook', input.social.facebook);
  settings.set('social.tiktok', input.social.tiktok);
  settings.set('instapay.enabled', input.instapay.enabled);
  settings.set('instapay.identifier', input.instapay.identifier);
  settings.set('instapay.accountName', input.instapay.accountName);
  settings.set('instapay.instructions', input.instapay.instructions);
  if (input.shipping) {
    settings.set('shipping', input.shipping);
  } else {
    // Keep the legacy store-settings form compatible with the new model.
    settings.set('shipping.enabled', true);
    settings.set('shipping.freeShipping.enabled', input.freeShippingThreshold != null);
    settings.set('shipping.freeShipping.threshold', input.freeShippingThreshold ?? 0);
  }
  await settings.save();
  const nextImageUrls = [input.logoUrl, input.hero.posterUrl, input.promoBanner.image, input.featuredCollection.image];
  await removeCloudinaryImages(previousImages
    .filter((image, index) => image.url !== nextImageUrls[index])
    .map((image) => image.publicId));
  invalidatePublicCatalogCache();
  res.json({ success: true, data: settings });
}
