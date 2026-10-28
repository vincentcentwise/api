import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

dotenv.config({
  path: fileURLToPath(
    new URL('../../../packages/database/.env', import.meta.url),
  ),
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  const port = Number(process.env.PORT) || 4000;

  await app.listen(port);

  console.log(`SchoolHub API is running at http://localhost:${port}`);
}

bootstrap();
