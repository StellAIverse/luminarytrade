import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RateLimitGuard } from './rate-limiting/guards/rate-limit.guard';
import { SystemLoadMiddleware } from './rate-limiting/middleware/system-load.middleware';
import { TracingInterceptor } from './tracing/interceptors/tracing.interceptor';
import { TracingMiddleware } from './tracing/middleware/tracing.middleware';
import { StartupService } from './startup/services/startup.service';
import { MiddlewarePipeline } from './middleware-pipeline/pipeline';
import { wrap } from './middleware-pipeline/adapters/express-wrapper';
import { LoggingMiddleware } from './middleware-pipeline/middlewares/logging.middleware';
import { AuthenticationMiddleware } from './middleware-pipeline/middlewares/authentication.middleware';
import { ValidationMiddleware } from './middleware-pipeline/middlewares/validation.middleware';
import { ErrorHandlingMiddleware } from './middleware-pipeline/middlewares/error-handling.middleware';
import { RateLimitMiddleware } from './middleware-pipeline/middlewares/rate-limit.middleware';
import { CorsMiddleware } from './middleware-pipeline/middlewares/cors.middleware';
import { ResponseTransformInterceptor } from './middleware-pipeline/interceptors/response-transform.interceptor';
import { CorrelationIdMiddleware } from './logging/middleware/correlation-id.middleware';
import { DEFAULT_API_VERSION } from './versioning/version.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const startupService = app.get(StartupService);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ── API Versioning ────────────────────────────────────────────────────────
  // Enable URI-based versioning: /v1/*, /v2/*, etc.
  // Controllers opt in with @ApiVersion('1') or @Version('1').
  // Requests without a version prefix are routed to DEFAULT_API_VERSION.
  // Deprecation lifecycle (410 Gone, warning headers) is handled by
  // VersionCheckMiddleware registered in VersioningModule.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: DEFAULT_API_VERSION,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Note: GlobalExceptionFilter is registered via APP_FILTER in AppModule
  // (added in the i18n issue) so NestJS can inject I18nService into it.
  // Do NOT call app.useGlobalFilters(new GlobalExceptionFilter()) here.

  // Apply tracing interceptor globally
  const tracingInterceptor = app.get(TracingInterceptor);
  const responseTransform = app.get(ResponseTransformInterceptor);
  app.useGlobalInterceptors(tracingInterceptor, responseTransform);

  // Apply rate limiting guard globally
  const rateLimitGuard = app.get(RateLimitGuard);
  app.useGlobalGuards(rateLimitGuard);

  const tracingMiddleware = app.get(TracingMiddleware);
  const systemLoadMiddleware = app.get(SystemLoadMiddleware);
  const pipeline = app.get(MiddlewarePipeline);
  const logging = app.get(LoggingMiddleware);
  const auth = app.get(AuthenticationMiddleware);
  const validation = app.get(ValidationMiddleware);
  const rateLimit = app.get(RateLimitMiddleware);
  const cors = app.get(CorsMiddleware);
  const errorHandler = app.get(ErrorHandlingMiddleware);
  rateLimit.configure({ block: false });
  const correlationId = app.get(CorrelationIdMiddleware);
  pipeline
    .register(correlationId)
    .register(wrap('cookieParser', cookieParser()))
    .register(wrap('helmet', helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })))
    .register(cors)
    .register(logging)
    .register(wrap('TracingMiddleware', tracingMiddleware.use.bind(tracingMiddleware)))
    .useWhen((req) => req.path.startsWith('/auth') || !!req.headers.authorization, auth)
    .register(validation)
    .register(rateLimit)
    .register(wrap('SystemLoadMiddleware', systemLoadMiddleware.use.bind(systemLoadMiddleware)))
    .register(errorHandler);
  app.use(pipeline.build());

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;

  console.log('🔄 Waiting for startup sequence to complete...');

  const maxWaitTime = 60000;
  const checkInterval = 1000;
  let waitTime = 0;

  while (!startupService.isReady() && waitTime < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waitTime += checkInterval;
  }

  if (!startupService.isReady()) {
    console.error('❌ Startup sequence failed to complete within timeout');
    process.exit(1);
  }

  await app.listen(port);

  console.log(`🚀 ChenAIKit Backend running on port ${port}`);
  console.log(`📡 Submitter service running on http://localhost:${port}`);
  console.log(`🛡️  Rate limiting enabled with adaptive strategies`);
  console.log(`🔍 Distributed tracing enabled - Jaeger UI: http://localhost:16686`);
  console.log(`🌐 API versioning enabled — default version: v${DEFAULT_API_VERSION}`);
  console.log(`   Stable:  http://localhost:${port}/v1/`);
  console.log(`   Beta:    http://localhost:${port}/v2/`);
  console.log(`   Sunset:  http://localhost:${port}/v0/ → 410 Gone`);
  console.log(`🏥 Health endpoints available:`);
  console.log(`   - Startup:   http://localhost:${port}/health/startup`);
  console.log(`   - Readiness: http://localhost:${port}/health/readiness`);
  console.log(`   - Liveness:  http://localhost:${port}/health/liveness`);
  console.log(`   - Full:      http://localhost:${port}/health`);

  const report = startupService.getStartupReport();
  if (report) {
    console.log(`✅ Startup completed in ${report.totalDuration}ms`);
    console.log(`📊 Startup phases: ${report.phases.map(p => `${p.phase}(${p.duration}ms)`).join(', ')}`);
  }
}

bootstrap().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});