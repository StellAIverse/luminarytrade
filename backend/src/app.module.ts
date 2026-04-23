import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigModule } from './config/config.module';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { SimulatorModule } from './simulator/simulator.module';
import { SubmitterModule } from './submitter/submitter.module';
// Heavy modules will be loaded dynamically below for code splitting
const SimulatorModule = require('./simulator/simulator.module').SimulatorModule;
const SubmitterModule = require('./submitter/submitter.module').SubmitterModule;
const ComputeBridgeModule = require('./compute-bridge/compute-bridge.module').ComputeBridgeModule;
const IndexerModule = require('./agent/agent.module').IndexerModule;
const AuditLogModule = require('./audit/audit-log.module').AuditLogModule;
const WorkerModule = require('./worker/worker.module').WorkerModule;
const OracleModule = require('./oracle/oracle.module').OracleModule;
const TransactionModule = require('./transaction/transaction.module').TransactionModule;
const RateLimitingModule = require('./rate-limiting/rate-limiting.module').RateLimitingModule;
const TracingModule = require('./tracing/tracing.module').TracingModule;
const AuthModule = require('./auth/auth.module').AuthModule;
const StartupModule = require('./startup/startup.module').StartupModule;
const MaterializedViewsModule = require('./materialized-view/materialized-view.module').MaterializedViewsModule;
const PluginsModule = require('./plugins/plugins.module').PluginsModule;
const MiddlewarePipelineModule = require('./middleware-pipeline/middleware-pipeline.module').MiddlewarePipelineModule;
const DecoratorCompositionModule = require('./decorator-composition/decorator-composition.module').DecoratorCompositionModule;
const HealthModule = require('./health/health.module').HealthModule;
const EventsModule = require('./events/events.module').EventsModule;
const GraphqlApiModule = require('./graphql/graphql.module').GraphqlApiModule;
const AnalyticsModule = require('./analytics/analytics.module').AnalyticsModule;
import { GraphqlApiModule } from './graphql/graphql.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MetricsModule } from './metrics/metrics.module';
import { LoggingModule } from './logging/logging.module';
import { AlertingModule } from './alerting/alerting.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { GrowthModule } from './growth/growth.module';

// i18n
import { I18nModule } from './i18n/i18n.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ConfigModule,
    StartupModule,
    HealthModule,
    EventsModule,
    PluginsModule,
    TypeOrmModule.forRootAsync({
      useFactory: (appConfig: AppConfigService) => {
        const factory = new DatabaseConfigFactory();
        return factory.createConfig(appConfig);
      },
      inject: [AppConfigService],
    }),
    BullModule.forRootAsync({
      useFactory: () => {
        const factory = new CacheConfigFactory();
        return factory.createConfig();
      },
    }),

    // i18n — must come before any module that uses I18nService
    I18nModule,

    // Observability Stack (order matters - tracing first)
    TracingModule,
    MetricsModule,
    LoggingModule,
    AlertingModule,

    // Application Modules
    TransactionModule,
    SimulatorModule,
    SubmitterModule,
    ComputeBridgeModule,
    IndexerModule,
    AuditLogModule,
    WorkerModule,
    OracleModule,
    RateLimitingModule,
    AuthModule,
    MaterializedViewsModule,
    MiddlewarePipelineModule,
    DecoratorCompositionModule,
    GraphqlApiModule,
    AnalyticsModule,
    WaitlistModule,
    GrowthModule,
  ],
  providers: [
    AppConfigService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [AppConfigService],
  controllers: [AppController],
})
export class AppModule {}