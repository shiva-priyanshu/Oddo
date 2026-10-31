import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/health', healthRouter);

// Centralized Error Handling Middleware (must be registered after routes)
app.use(errorHandler);

export default app;
