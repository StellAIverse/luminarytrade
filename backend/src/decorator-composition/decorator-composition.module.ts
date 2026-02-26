import { Global, Module, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/common';
import { MetadataRegistryService } from './metadata-registry.service';
import { CompositionGuard } from './guards/composition.guard';
import { CompositionInterceptor } from './interceptors/composition.interceptor';

/**
 * DecoratorCompositionModule — global module for the decorator composition system.
 *
 * Registers:
 *  - MetadataRegistryService (exported for injection in other modules)
 *  - CompositionGuard as APP_GUARD (runs on every request, no-ops when @Composable is absent)
 *  - CompositionInterceptor as APP_INTERCEPTOR (runs on every request, no-ops when @Composable is absent)
 *
 * Import once in AppModule:
 * @example
 * @Module({ imports: [DecoratorCompositionModule, ...] })
 * export class AppModule {}
 */
@Global()
@Module({
  providers: [
    MetadataRegistryService,
    {
      provide: APP_GUARD,
      useClass: CompositionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CompositionInterceptor,
    },
  ],
  exports: [MetadataRegistryService],
})
export class DecoratorCompositionModule {}
