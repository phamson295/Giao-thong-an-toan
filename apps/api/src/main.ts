import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Có REDIS_URL thì dùng Redis để nhiều máy chủ API cùng phát sự kiện realtime
  if (process.env.REDIS_URL) {
    const adapter = new RedisIoAdapter(app);
    await adapter.connectToRedis(process.env.REDIS_URL);
    app.useWebSocketAdapter(adapter);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API đang chạy tại http://localhost:${port}`);
}
bootstrap();
