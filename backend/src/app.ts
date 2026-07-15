import path from 'path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import routeRoutes from './routes/routes';
import busRoutes from './routes/buses';
import userRoutes from './routes/users';
import docsRoutes from './routes/docs';
import configRoutes from './routes/config';

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use('/dashboard', express.static(path.join(__dirname, '../public')));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'bustrack-api',
      version: '1.0.0',
      docs: '/docs',
    },
  });
});

app.use('/docs', docsRoutes);
app.use('/v1', apiLimiter);
app.use('/v1/health', healthRoutes);
app.use('/v1/auth', authRoutes);
app.use('/v1/routes', routeRoutes);
app.use('/v1/buses', busRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/config', configRoutes);
app.use(errorHandler);
