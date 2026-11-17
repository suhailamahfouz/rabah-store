import { Router } from 'express';
import { getProduct, getProducts, getCategories, getStoreSettings } from '../controllers/catalog.controller.js';

export const catalogRouter = Router();

catalogRouter.get('/categories', getCategories);
catalogRouter.get('/store-settings', getStoreSettings);
catalogRouter.get('/products', getProducts);
catalogRouter.get('/products/:slug', getProduct);