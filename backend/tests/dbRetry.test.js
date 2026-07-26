const { retryReadsOnTransient, READ_OPERATIONS, RETRYABLE } = require('../src/lib/dbRetry');

const transient = (code = 'ECONNRESET') => {
  const err = new Error('boom');
  err.code = code;
  return err;
};

function makeQuery(behaviour) {
  let calls = 0;
  const query = jest.fn(async () => {
    calls++;
    const result = behaviour(calls);
    if (result instanceof Error) throw result;
    return result;
  });
  return { query, getCalls: () => calls };
}

describe('retryReadsOnTransient', () => {
  it('retries a transient read once and succeeds', async () => {
    const { query, getCalls } = makeQuery((n) => (n === 1 ? transient() : 'ok'));
    const result = await retryReadsOnTransient({ operation: 'findMany', args: {}, query });
    expect(result).toBe('ok');
    expect(getCalls()).toBe(2);
  });

  it('does NOT retry a transient write', async () => {
    const { query, getCalls } = makeQuery(() => transient());
    await expect(
      retryReadsOnTransient({ operation: 'create', args: {}, query }),
    ).rejects.toThrow('boom');
    expect(getCalls()).toBe(1);
  });

  it('does NOT retry a transient upsert', async () => {
    const { query, getCalls } = makeQuery(() => transient());
    await expect(
      retryReadsOnTransient({ operation: 'upsert', args: {}, query }),
    ).rejects.toThrow('boom');
    expect(getCalls()).toBe(1);
  });

  it('does NOT retry a transient deleteMany', async () => {
    const { query, getCalls } = makeQuery(() => transient());
    await expect(
      retryReadsOnTransient({ operation: 'deleteMany', args: {}, query }),
    ).rejects.toThrow('boom');
    expect(getCalls()).toBe(1);
  });

  it('does NOT retry a read that fails with a non-transient code', async () => {
    const { query, getCalls } = makeQuery(() => transient('P2002'));
    await expect(
      retryReadsOnTransient({ operation: 'findMany', args: {}, query }),
    ).rejects.toThrow('boom');
    expect(getCalls()).toBe(1);
  });

  it('does NOT retry raw queries (cannot determine idempotency)', async () => {
    const { query, getCalls } = makeQuery(() => transient());
    await expect(
      retryReadsOnTransient({ operation: '$queryRaw', args: {}, query }),
    ).rejects.toThrow('boom');
    expect(getCalls()).toBe(1);
  });

  it('retries every operation in the read allowlist', async () => {
    for (const op of READ_OPERATIONS) {
      const { query, getCalls } = makeQuery((n) => (n === 1 ? transient() : 'ok'));
      await retryReadsOnTransient({ operation: op, args: {}, query });
      expect(getCalls()).toBe(2);
    }
  });

  it('reads RETRYABLE codes from error.meta.code as a fallback', async () => {
    const err = new Error('meta boom');
    err.meta = { code: 'P1001' };
    const { query, getCalls } = makeQuery((n) => (n === 1 ? err : 'ok'));
    const result = await retryReadsOnTransient({ operation: 'count', args: {}, query });
    expect(result).toBe('ok');
    expect(getCalls()).toBe(2);
  });

  it('succeeds without retry when the first attempt works', async () => {
    const { query, getCalls } = makeQuery(() => 'ok');
    const result = await retryReadsOnTransient({ operation: 'findMany', args: {}, query });
    expect(result).toBe('ok');
    expect(getCalls()).toBe(1);
  });

  it('keeps the retry to a single attempt (no infinite loop)', async () => {
    const { query, getCalls } = makeQuery(() => transient());
    await expect(
      retryReadsOnTransient({ operation: 'findFirst', args: {}, query }),
    ).rejects.toThrow('boom');
    expect(getCalls()).toBe(2); // initial + exactly one retry
  });
});

describe('retry configuration invariants', () => {
  it('read allowlist contains no mutating operations', () => {
    const forbidden = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
    for (const op of forbidden) {
      expect(READ_OPERATIONS.has(op)).toBe(false);
    }
  });

  it('RETRYABLE list contains connection-level codes', () => {
    expect(RETRYABLE).toContain('ECONNRESET');
    expect(RETRYABLE).toContain('P1001');
    expect(RETRYABLE).not.toContain('P2002'); // uniqueness violation must not retry
  });
});
