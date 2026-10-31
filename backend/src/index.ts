import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';

const PORT = Number(process.env.PORT) || 5001;

const server = app.listen(PORT, () => {
  console.log(`[SubscriptIQ] Backend API running on port ${PORT}`);
  console.log(`[SubscriptIQ] Health probe available at http://localhost:${PORT}/api/health`);
});

process.on('SIGTERM', () => {
  console.log('[SubscriptIQ] SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('[SubscriptIQ] HTTP server closed.');
  });
});
