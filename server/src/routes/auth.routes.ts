import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { login, logout, register, session } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/auth/register', authLimiter, register);
authRouter.post('/auth/login', authLimiter, login);
authRouter.get('/auth/session', session);
authRouter.post('/auth/logout', logout);
