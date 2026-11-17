import { Router } from 'express';
import { orderLimiter, trackingLimiter } from '../middleware/rateLimit.js';
import { create, confirm, listMine, shippingQuote, track } from '../controllers/order.controller.js';
import { optionalCustomer, requireCustomer } from '../middleware/auth.js';
import { paymentProofMiddleware, uploadPaymentProof } from '../controllers/proof.controller.js';

export const orderRouter = Router();

// Public checkout returns a high-entropy guest capability for confirmation and proof upload.
orderRouter.post('/orders', orderLimiter, optionalCustomer, create);
orderRouter.post('/orders/shipping-quote', orderLimiter, shippingQuote);
orderRouter.get('/orders/mine', requireCustomer, listMine);
orderRouter.post('/orders/track', trackingLimiter, track);
orderRouter.get('/orders/confirm/:token', confirm);
// InstaPay transfer screenshot. Guest must pass the order's high-entropy access token.
orderRouter.post('/orders/:orderNumber/proof', orderLimiter, paymentProofMiddleware, uploadPaymentProof);
