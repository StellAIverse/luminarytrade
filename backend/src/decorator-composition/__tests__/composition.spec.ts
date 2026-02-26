import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MetadataRegistryService } from '../metadata-registry.service';
import { CompositionGuard } from '../guards/composition.guard';
import { CompositionInterceptor } from '../interceptors/composition.interceptor';
import { Composable } from '../decorators/composable.decorator';
import { Cache } from '../decorators/cache.decorator';
import { Log } from '../decorators/log.decorator';
import { Transform } from '../decorators/transform.decorator';
import { Compress } from '../decorators/compress.decorator';
import { Validate, ValidationSchema } from '../decorators/validate.decorator';
import {
  COMPOSABLE_METADATA_KEY,
  COMPOSITION_STACK_KEY,
  DECORATOR_PRIORITY,
} from '../constants';

// ─── Test controller ──────────────────────────────────────────────────────────

const passSchema: ValidationSchema = {
  validate: () => ({ valid: true }),
};

@Controller('composition-test')
class TestController {
  @Composable()
  @Cache(300, 'test-ns')
  @Log('debug')
  @Get('cached-logged')
  cachedLogged(): string {
    return 'hello';
  }

  @Composable()
  @Validate(passSchema)
  @Transform((v: string) => ({ value: v }))
  @Get('validate-transform')
  validateTransform(): string {
    return 'world';
  }

  @Composable()
  @Compress()
  @Get('compressed')
  compressed(): string {
    return 'compressed';
  }

  // Method without @Composable — composition system should not interfere
  @Get('plain')
  plain(): string {
    return 'plain';
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Decorator Composition — end-to-end', () => {
  let app: INestApplication;
  let registry: MetadataRegistryService;
  let reflector: Reflector;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        MetadataRegistryService,
        Reflector,
        CompositionGuard,
        CompositionInterceptor,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalGuards(module.get(CompositionGuard));
    app.useGlobalInterceptors(module.get(CompositionInterceptor));
    await app.init();

    registry = module.get(MetadataRegistryService);
    reflector = module.get(Reflector);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── @Composable ───────────────────────────────────────────────────────────

  it('@Composable marks the method with COMPOSABLE_METADATA_KEY', () => {
    // NestJS SetMetadata stores metadata on the method function (descriptor.value),
    // not on the target+propertyKey pair.
    const meta = Reflect.getMetadata(
      COMPOSABLE_METADATA_KEY,
      TestController.prototype.cachedLogged,
    );
    expect(meta).toBeDefined();
    expect(meta.composable).toBe(true);
  });

  // ── Parallel composition: @Cache + @Log ──────────────────────────────────

  it('stacking @Cache and @Log produces both entries in the registry', () => {
    const composed = registry.getComposedMetadata('TestController', 'cachedLogged');
    expect(composed.hasCache).toBe(true);
    expect(composed.hasLog).toBe(true);
    expect(composed.hasAuth).toBe(false);
  });

  it('@Cache entry has correct priority (40)', () => {
    const composed = registry.getComposedMetadata('TestController', 'cachedLogged');
    const cacheEntry = composed.stack.find(e => e.type === 'CACHE');
    expect(cacheEntry?.priority).toBe(DECORATOR_PRIORITY.CACHE);
    expect(cacheEntry?.options.ttl).toBe(300);
    expect(cacheEntry?.options.namespace).toBe('test-ns');
  });

  it('@Log entry has correct priority (50) and level', () => {
    const composed = registry.getComposedMetadata('TestController', 'cachedLogged');
    const logEntry = composed.stack.find(e => e.type === 'LOG');
    expect(logEntry?.priority).toBe(DECORATOR_PRIORITY.LOG);
    expect(logEntry?.options.level).toBe('debug');
  });

  it('stack is sorted ascending by priority (CACHE before LOG)', () => {
    const composed = registry.getComposedMetadata('TestController', 'cachedLogged');
    const types = composed.stack.map(e => e.type);
    const cacheIdx = types.indexOf('CACHE');
    const logIdx = types.indexOf('LOG');
    expect(cacheIdx).toBeLessThan(logIdx);
  });

  // ── Serial composition: @Validate → @Transform ───────────────────────────

  it('@Validate and @Transform produce both entries with correct ordering', () => {
    const composed = registry.getComposedMetadata('TestController', 'validateTransform');
    expect(composed.hasValidation).toBe(true);
    expect(composed.hasTransform).toBe(true);

    const types = composed.stack.map(e => e.type);
    expect(types.indexOf('VALIDATE')).toBeLessThan(types.indexOf('TRANSFORM'));
  });

  it('@Transform entry stores the mapper function', () => {
    const composed = registry.getComposedMetadata('TestController', 'validateTransform');
    const transformEntry = composed.stack.find(e => e.type === 'TRANSFORM');
    expect(typeof transformEntry?.options.mapper).toBe('function');
    expect(transformEntry?.options.mapper('test')).toEqual({ value: 'test' });
  });

  // ── @Compress ─────────────────────────────────────────────────────────────

  it('@Compress produces a COMPRESS entry with priority 70', () => {
    const composed = registry.getComposedMetadata('TestController', 'compressed');
    expect(composed.hasCompress).toBe(true);
    const compressEntry = composed.stack.find(e => e.type === 'COMPRESS');
    expect(compressEntry?.priority).toBe(DECORATOR_PRIORITY.COMPRESS);
    expect(compressEntry?.options.compress).toBe(true);
  });

  // ── Non-composable method ─────────────────────────────────────────────────

  it('plain method has no COMPOSABLE_METADATA_KEY', () => {
    const meta = Reflect.getMetadata(
      COMPOSABLE_METADATA_KEY,
      TestController.prototype.plain,
    );
    expect(meta).toBeUndefined();
  });

  it('plain method has an empty registry entry', () => {
    const composed = registry.getComposedMetadata('TestController', 'plain');
    expect(composed.stack).toHaveLength(0);
  });

  // ── COMPOSITION_STACK_KEY on prototype ────────────────────────────────────

  it('COMPOSITION_STACK_KEY is written to the prototype for Reflector access', () => {
    const proto = TestController.prototype;
    const stack = Reflect.getMetadata(COMPOSITION_STACK_KEY, proto, 'cachedLogged');
    expect(Array.isArray(stack)).toBe(true);
    expect(stack.length).toBeGreaterThan(0);
  });
});
