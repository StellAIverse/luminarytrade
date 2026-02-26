import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  Post,
  INestApplication,
  HttpStatus,
} from '@nestjs/common';
import * as request from 'supertest';
import { Reflector } from '@nestjs/core';
import { MetadataRegistryService } from '../metadata-registry.service';
import { CompositionGuard } from '../guards/composition.guard';
import { CompositionInterceptor } from '../interceptors/composition.interceptor';
import { Composable } from '../decorators/composable.decorator';
import { Validate, ValidationSchema } from '../decorators/validate.decorator';
import { Transform } from '../decorators/transform.decorator';
import { Cache } from '../decorators/cache.decorator';
import { Log } from '../decorators/log.decorator';

// ─── Test schema helpers ──────────────────────────────────────────────────────

const throwingSchema: ValidationSchema = {
  validate(_data: unknown): { valid: boolean; errors?: string[] } {
    throw new Error('Schema internal error');
  },
};

const failSchema: ValidationSchema = {
  validate: () => ({ valid: false, errors: ['bad input'] }),
};

// ─── Test controller ──────────────────────────────────────────────────────────

@Controller('error-test')
class ErrorTestController {
  /** @Validate schema throws internally */
  @Composable()
  @Validate(throwingSchema)
  @Post('schema-throws')
  schemaThrows(): object {
    return { reached: true };
  }

  /** @Validate fails → 400 */
  @Composable()
  @Validate(failSchema)
  @Post('validate-fail')
  validateFail(): object {
    return { reached: true };
  }

  /** @Transform mapper throws */
  @Composable()
  @Transform((_v: any) => {
    throw new Error('Mapper error');
  })
  @Get('transform-throws')
  transformThrows(): object {
    return { data: 'original' };
  }

  /** @Cache duplicate → last-wins merge survives */
  @Composable()
  @Cache(60)
  @Cache(300)
  @Get('dual-cache')
  dualCache(): object {
    return { ttl: 'varies' };
  }

  /** @Log duplicate → merge strategy */
  @Composable()
  @Log('debug')
  @Log('warn')
  @Get('dual-log')
  dualLog(): object {
    return { logged: true };
  }

  /** No @Composable — system should pass through transparently */
  @Get('no-composable')
  noComposable(): object {
    return { plain: true };
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Decorator Composition — error scenarios', () => {
  let app: INestApplication;
  let registry: MetadataRegistryService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErrorTestController],
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
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Schema throws internally ───────────────────────────────────────────────

  it('schema.validate() that throws internally propagates as 500', async () => {
    const res = await request(app.getHttpServer())
      .post('/error-test/schema-throws')
      .send({})
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(res.body).toBeDefined();
  });

  // ── @Validate fails → 400 ─────────────────────────────────────────────────

  it('@Validate failure returns 400 BadRequestException', async () => {
    const res = await request(app.getHttpServer())
      .post('/error-test/validate-fail')
      .send({})
      .expect(HttpStatus.BAD_REQUEST);

    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toEqual(['bad input']);
  });

  // ── @Transform mapper throws ───────────────────────────────────────────────

  it('@Transform mapper that throws propagates through RxJS pipeline as 500', async () => {
    await request(app.getHttpServer())
      .get('/error-test/transform-throws')
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  // ── Duplicate @Cache → last-wins ──────────────────────────────────────────

  it('duplicate @Cache → last-wins: only one CACHE entry remains', () => {
    const composed = registry.getComposedMetadata('ErrorTestController', 'dualCache');
    const cacheEntries = composed.stack.filter(e => e.type === 'CACHE');
    expect(cacheEntries).toHaveLength(1);
    // TypeScript applies decorators bottom-to-top, so @Cache(300) runs first
    // and @Cache(60) runs last → last-wins means @Cache(60) survives.
    expect(cacheEntries[0].options.ttl).toBe(60);
  });

  // ── Duplicate @Log → merge ────────────────────────────────────────────────

  it('duplicate @Log → merge strategy: options are merged (last level wins within merge)', () => {
    const composed = registry.getComposedMetadata('ErrorTestController', 'dualLog');
    const logEntries = composed.stack.filter(e => e.type === 'LOG');
    expect(logEntries).toHaveLength(1);
    // TypeScript applies decorators bottom-to-top: @Log('warn') runs first, @Log('debug') last.
    // merge strategy: shallow merge → last 'level' key wins: 'debug'.
    expect(logEntries[0].options.level).toBe('debug');
  });

  // ── Route without @Composable passes through ───────────────────────────────

  it('route without @Composable returns 200 unaffected', async () => {
    const res = await request(app.getHttpServer())
      .get('/error-test/no-composable')
      .expect(HttpStatus.OK);

    expect(res.body.plain).toBe(true);
  });

  it('route without @Composable has no registry entry', () => {
    const composed = registry.getComposedMetadata('ErrorTestController', 'noComposable');
    expect(composed.stack).toHaveLength(0);
  });

  // ── CompositionGuard returns true when COMPOSABLE_METADATA_KEY absent ──────

  it('MetadataRegistryService returns empty metadata for unknown handler', () => {
    const composed = registry.getComposedMetadata('NonExistent', 'nonExistent');
    expect(composed.stack).toHaveLength(0);
    expect(composed.hasAuth).toBe(false);
    expect(composed.hasCache).toBe(false);
  });
});
