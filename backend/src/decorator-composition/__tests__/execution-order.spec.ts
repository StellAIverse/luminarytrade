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
import { Log } from '../decorators/log.decorator';
import { Compress } from '../decorators/compress.decorator';
import { DECORATOR_PRIORITY } from '../constants';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const alwaysPass: ValidationSchema = {
  validate: () => ({ valid: true }),
};

const alwaysFail: ValidationSchema = {
  validate: () => ({ valid: false, errors: ['field is required'] }),
};

// ─── Test controller ──────────────────────────────────────────────────────────

let handlerCallCount = 0;

@Controller('order-test')
class OrderTestController {
  /** Validate pass → handler should execute */
  @Composable()
  @Validate(alwaysPass)
  @Post('validate-pass')
  validatePass(): object {
    handlerCallCount++;
    return { ok: true };
  }

  /** Validate fail → handler should NOT execute */
  @Composable()
  @Validate(alwaysFail)
  @Post('validate-fail')
  validateFail(): object {
    handlerCallCount++;
    return { ok: true };
  }

  /** Transform wraps the handler response */
  @Composable()
  @Transform((v: any) => ({ wrapped: v }))
  @Get('transform')
  transformResult(): object {
    return { original: true };
  }

  /** Compress sets the header */
  @Composable()
  @Compress()
  @Get('compress')
  compressResult(): object {
    return { data: 'compressed' };
  }

  /** Log decorator wraps async handler */
  @Composable()
  @Log('debug')
  @Get('logged')
  async loggedAsync(): Promise<object> {
    return { logged: true };
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Decorator Composition — execution order', () => {
  let app: INestApplication;
  let registry: MetadataRegistryService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderTestController],
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

  beforeEach(() => {
    handlerCallCount = 0;
  });

  // ── Priority values ────────────────────────────────────────────────────────

  it('DECORATOR_PRIORITY is monotonically increasing in canonical order', () => {
    const order = [
      DECORATOR_PRIORITY.AUTH,
      DECORATOR_PRIORITY.RATE_LIMIT,
      DECORATOR_PRIORITY.VALIDATE,
      DECORATOR_PRIORITY.CACHE,
      DECORATOR_PRIORITY.LOG,
      DECORATOR_PRIORITY.TRANSFORM,
      DECORATOR_PRIORITY.COMPRESS,
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1]);
    }
  });

  it('sorted stack has priorities in strictly ascending order', () => {
    const composed = registry.getComposedMetadata('OrderTestController', 'validatePass');
    for (let i = 1; i < composed.stack.length; i++) {
      expect(composed.stack[i].priority).toBeGreaterThan(composed.stack[i - 1].priority);
    }
  });

  // ── VALIDATE before handler ───────────────────────────────────────────────

  it('@Validate(pass) allows handler to execute → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/order-test/validate-pass')
      .send({ any: 'data' })
      .expect(HttpStatus.CREATED);

    expect(res.body.ok).toBe(true);
    expect(handlerCallCount).toBe(1);
  });

  it('@Validate(fail) stops execution → 400 before handler runs', async () => {
    const res = await request(app.getHttpServer())
      .post('/order-test/validate-fail')
      .send({ any: 'data' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toEqual(['field is required']);
    // Handler must NOT have been called
    expect(handlerCallCount).toBe(0);
  });

  // ── TRANSFORM after handler ───────────────────────────────────────────────

  it('@Transform mapper is applied to the handler response', async () => {
    const res = await request(app.getHttpServer())
      .get('/order-test/transform')
      .expect(HttpStatus.OK);

    // CompositionInterceptor wraps the response with { wrapped: ... }
    expect(res.body.wrapped).toBeDefined();
    expect(res.body.wrapped.original).toBe(true);
  });

  // ── COMPRESS header ───────────────────────────────────────────────────────

  it('@Compress sets X-Composition-Compress response header', async () => {
    const res = await request(app.getHttpServer())
      .get('/order-test/compress')
      .expect(HttpStatus.OK);

    expect(res.headers['x-composition-compress']).toBe('true');
  });

  // ── @Log wraps async handlers ─────────────────────────────────────────────

  it('@Log decorator correctly wraps an async handler', async () => {
    const res = await request(app.getHttpServer())
      .get('/order-test/logged')
      .expect(HttpStatus.OK);

    expect(res.body.logged).toBe(true);
  });
});
