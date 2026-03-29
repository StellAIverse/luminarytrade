import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { VersionCheckMiddleware } from './version-check.middleware';

@Module({
  providers: [VersionCheckMiddleware],
  exports: [VersionCheckMiddleware],
})
export class VersioningModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VersionCheckMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}