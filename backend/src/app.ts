import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { plansRouter } from './routes/plans';
import { customersRouter } from './routes/customers';
import { subscriptionsRouter } from './routes/subscriptions';
import { invoicesRouter } from './routes/invoices';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/plans', plansRouter);
app.use('/api/customers', customersRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/invoices', invoicesRouter);

// Centralized Error Handling Middleware (must be registered after routes)
app.use(errorHandler);

export default app;
