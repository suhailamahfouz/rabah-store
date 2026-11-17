import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { handleImageUpload, handleProductImageUpload, validateImageUploads, validateProductImageUploads } from '../services/product-image-storage.service.js';
import { dashboard, logout, session } from '../controllers/admin.controller.js';
import { listCustomers, readCustomer } from '../controllers/admin-customers.controller.js';
import {
  createCategory, createProduct, deleteCategory, deleteProduct, listCategories, listOrders, listProducts,
  readSettings, updateCategory, updateOrder, updateProduct, updateSettings, uploadProductImages, uploadSiteImages,
} from '../controllers/admin-management.controller.js';

export const adminRouter = Router();

adminRouter.get('/admin/session', requireAdmin, session);
adminRouter.get('/admin/dashboard', requireAdmin, dashboard);
adminRouter.get('/admin/products', requireAdmin, listProducts);
adminRouter.post(
  '/admin/product-images',
  requireAdmin,
  handleProductImageUpload,
  validateProductImageUploads,
  uploadProductImages,
);
adminRouter.post('/admin/images', requireAdmin, handleImageUpload, validateImageUploads, uploadSiteImages);
adminRouter.post('/admin/products', requireAdmin, createProduct);
adminRouter.patch('/admin/products/:id', requireAdmin, updateProduct);
adminRouter.delete('/admin/products/:id', requireAdmin, deleteProduct);
adminRouter.get('/admin/categories', requireAdmin, listCategories);
adminRouter.post('/admin/categories', requireAdmin, createCategory);
adminRouter.patch('/admin/categories/:id', requireAdmin, updateCategory);
adminRouter.delete('/admin/categories/:id', requireAdmin, deleteCategory);
adminRouter.get('/admin/orders', requireAdmin, listOrders);
adminRouter.patch('/admin/orders/:id', requireAdmin, updateOrder);
adminRouter.get('/admin/customers', requireAdmin, listCustomers);
adminRouter.get('/admin/customers/:id', requireAdmin, readCustomer);
adminRouter.get('/admin/settings', requireAdmin, readSettings);
adminRouter.patch('/admin/settings', requireAdmin, updateSettings);
adminRouter.post('/admin/logout', requireAdmin, logout);
