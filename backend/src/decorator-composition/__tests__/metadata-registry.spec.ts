import { MetadataRegistryService, bufferDecoratorEntry } from '../metadata-registry.service';
import { DecoratorEntry } from '../interfaces/composition.interface';
import { DECORATOR_PRIORITY } from '../constants';

// Helper to build a DecoratorEntry quickly
function entry(
  type: DecoratorEntry['type'],
  options: Record<string, any> = {},
): DecoratorEntry {
  return { type, priority: DECORATOR_PRIORITY[type], options };
}

describe('MetadataRegistryService', () => {
  let registry: MetadataRegistryService;

  beforeEach(() => {
    registry = new MetadataRegistryService();
    registry.clear();
  });

  // ── push / getComposedMetadata ─────────────────────────────────────────────

  it('stores and retrieves a single entry', () => {
    registry.push('MyCtrl', 'myMethod', entry('AUTH', { roles: ['admin'] }));
    const composed = registry.getComposedMetadata('MyCtrl', 'myMethod');
    expect(composed.stack).toHaveLength(1);
    expect(composed.stack[0].type).toBe('AUTH');
    expect(composed.hasAuth).toBe(true);
  });

  it('returns empty ComposedMethodMetadata for unknown method', () => {
    const composed = registry.getComposedMetadata('Unknown', 'unknown');
    expect(composed.stack).toHaveLength(0);
    expect(composed.hasAuth).toBe(false);
    expect(composed.hasCache).toBe(false);
    expect(composed.hasValidation).toBe(false);
    expect(composed.hasRateLimit).toBe(false);
    expect(composed.hasLog).toBe(false);
    expect(composed.hasTransform).toBe(false);
    expect(composed.hasCompress).toBe(false);
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  it('sorts entries ascending by priority', () => {
    // Push in reverse priority order
    registry.push('C', 'm', entry('TRANSFORM'));
    registry.push('C', 'm', entry('VALIDATE'));
    registry.push('C', 'm', entry('AUTH'));

    const composed = registry.getComposedMetadata('C', 'm');
    const types = composed.stack.map(e => e.type);
    expect(types).toEqual(['AUTH', 'VALIDATE', 'TRANSFORM']);
  });

  // ── Boolean flags ─────────────────────────────────────────────────────────

  it('sets all boolean flags correctly for a full stack', () => {
    registry.push('C', 'm', entry('AUTH'));
    registry.push('C', 'm', entry('RATE_LIMIT'));
    registry.push('C', 'm', entry('VALIDATE'));
    registry.push('C', 'm', entry('CACHE'));
    registry.push('C', 'm', entry('LOG'));
    registry.push('C', 'm', entry('TRANSFORM'));
    registry.push('C', 'm', entry('COMPRESS'));

    const composed = registry.getComposedMetadata('C', 'm');
    expect(composed.hasAuth).toBe(true);
    expect(composed.hasRateLimit).toBe(true);
    expect(composed.hasValidation).toBe(true);
    expect(composed.hasCache).toBe(true);
    expect(composed.hasLog).toBe(true);
    expect(composed.hasTransform).toBe(true);
    expect(composed.hasCompress).toBe(true);
  });

  // ── Merge strategies ──────────────────────────────────────────────────────

  it('applies last-wins merge for CACHE (duplicate entries)', () => {
    registry.push('C', 'm', entry('CACHE', { ttl: 60 }));
    registry.push('C', 'm', entry('CACHE', { ttl: 300, namespace: 'orders' }));

    const composed = registry.getComposedMetadata('C', 'm');
    // last-wins → the second entry wins
    expect(composed.stack).toHaveLength(1);
    expect(composed.stack[0].options.ttl).toBe(300);
    expect(composed.stack[0].options.namespace).toBe('orders');
  });

  it('applies last-wins merge for AUTH (duplicate entries)', () => {
    registry.push('C', 'm', entry('AUTH', { roles: ['user'] }));
    registry.push('C', 'm', entry('AUTH', { roles: ['admin'] }));

    const composed = registry.getComposedMetadata('C', 'm');
    expect(composed.stack).toHaveLength(1);
    expect(composed.stack[0].options.roles).toEqual(['admin']);
  });

  it('applies merge strategy for LOG (combines options)', () => {
    registry.push('C', 'm', entry('LOG', { level: 'debug' }));
    registry.push('C', 'm', entry('LOG', { level: 'warn' }));

    const composed = registry.getComposedMetadata('C', 'm');
    // merge strategy: shallow merge → last 'level' wins within the merged object
    expect(composed.stack).toHaveLength(1);
    expect(composed.stack[0].options.level).toBe('warn');
  });

  it('applies last-wins for VALIDATE (duplicate schemas)', () => {
    const schema1 = { validate: () => ({ valid: true }) };
    const schema2 = { validate: () => ({ valid: false, errors: ['oops'] }) };
    registry.push('C', 'm', entry('VALIDATE', { schema: schema1 }));
    registry.push('C', 'm', entry('VALIDATE', { schema: schema2 }));

    const composed = registry.getComposedMetadata('C', 'm');
    expect(composed.stack).toHaveLength(1);
    // last-wins: schema2 survives
    expect(composed.stack[0].options.schema).toBe(schema2);
  });

  // ── listAll / clear ───────────────────────────────────────────────────────

  it('listAll returns all registered methods', () => {
    registry.push('Ctrl', 'methodA', entry('AUTH'));
    registry.push('Ctrl', 'methodB', entry('CACHE'));

    const all = registry.listAll();
    expect(Object.keys(all)).toContain('Ctrl.methodA');
    expect(Object.keys(all)).toContain('Ctrl.methodB');
  });

  it('clear empties the store', () => {
    registry.push('C', 'm', entry('AUTH'));
    registry.clear();
    const composed = registry.getComposedMetadata('C', 'm');
    expect(composed.stack).toHaveLength(0);
  });

  // ── bufferDecoratorEntry ──────────────────────────────────────────────────

  it('entries pushed via bufferDecoratorEntry are drained into a new instance', () => {
    // bufferDecoratorEntry writes into the module-level PRE_INIT_BUFFER.
    // A fresh MetadataRegistryService instance drains the buffer in its constructor.
    bufferDecoratorEntry('BufferCtrl', 'bufferedMethod', entry('LOG', { level: 'verbose' }));
    const fresh = new MetadataRegistryService();
    const composed = fresh.getComposedMetadata('BufferCtrl', 'bufferedMethod');
    // The buffer may contain entries from other test runs; we just assert ours is there
    expect(composed.hasLog).toBe(true);
  });

  // ── Isolation between methods ─────────────────────────────────────────────

  it('does not mix metadata between different methods', () => {
    registry.push('C', 'methodA', entry('AUTH'));
    registry.push('C', 'methodB', entry('CACHE', { ttl: 60 }));

    const a = registry.getComposedMetadata('C', 'methodA');
    const b = registry.getComposedMetadata('C', 'methodB');

    expect(a.hasAuth).toBe(true);
    expect(a.hasCache).toBe(false);
    expect(b.hasAuth).toBe(false);
    expect(b.hasCache).toBe(true);
  });
});
