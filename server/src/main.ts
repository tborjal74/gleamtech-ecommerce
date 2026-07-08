import 'reflect-metadata';

import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pinoHttp } from 'pino-http';

import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function getAllowedOrigins(config: ConfigService) {
  const configuredOrigins = [
    config.get<string>('FRONTEND_URL'),
    config.get<string>('FRONTEND_URLS'),
    config.get<string>('CORS_ALLOWED_ORIGINS'),
    'http://localhost:5173',
  ]
    .filter(Boolean)
    .join(',');

  return new Set(
    configuredOrigins
      .split(',')
      .map(normalizeOrigin)
      .filter(Boolean),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const allowedOrigins = getAllowedOrigins(config);
  const port = config.get<number>('PORT', 4000);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json({ limit: config.get<string>('JSON_BODY_LIMIT', '100kb') }));
  app.use(express.urlencoded({ extended: true, limit: config.get<string>('URLENCODED_BODY_LIMIT', '100kb') }));
  app.use(cookieParser());
  const uploadRoot = config.get<string>('UPLOAD_DIR', join(process.cwd(), 'uploads'));
  mkdirSync(uploadRoot, { recursive: true });
  app.use('/uploads', express.static(uploadRoot));
  app.use(new RequestIdMiddleware().use);
  app.use(
    pinoHttp({
      redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body.password'],
    }),
  );
  app.enableCors({
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS.`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(port);
  console.log(`API server running on http://localhost:${port}`);
}

void bootstrap();
