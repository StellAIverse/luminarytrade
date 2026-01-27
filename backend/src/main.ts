import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 ChenAIKit Backend running on port ${process.env.PORT || 3000}`);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  await app.listen(3000);
  console.log('Submitter service running on http://localhost:3000');
}

bootstrap();
