import assert from 'node:assert/strict';
import {
  rateLimitStorage,
  type Limiter,
  type Limiters,
} from '../../../../../core/server/auth/better-auth/rate-limit';

const RULE = { window: 10, max: 3 };

function recordingLimiters(blocked: Partial<Record<keyof Limiters, number>> = {}) {
  const calls: { name: string; ip?: string; key?: string }[] = [];
  const limiter = (name: keyof Limiters) => (): Limiter => ({
    async consume({ ip, key }) {
      calls.push({ name, ip, key });
      const retryAfterMs = blocked[name];
      return retryAfterMs === undefined ? { allowed: true } : { allowed: false, retryAfterMs };
    },
    async reset() {},
  });

  return {
    calls,
    limiters: {
      globalBlock: limiter('globalBlock'),
      globalReset: limiter('globalReset'),
      userLogin: limiter('userLogin'),
      userReset: limiter('userReset'),
    },
  };
}

describe('Better Auth rate-limit storage', function () {
  it('counts a sign-in against globalBlock by path, then userLogin by IP', async function () {
    const { calls, limiters } = recordingLimiters();

    const result = await rateLimitStorage(limiters).consume('203.0.113.7|/sign-in/email', RULE);

    assert.deepEqual(result, { allowed: true, retryAfter: null });
    assert.deepEqual(calls, [
      { name: 'globalBlock', ip: '203.0.113.7', key: '/sign-in/email' },
      { name: 'userLogin', ip: '203.0.113.7', key: undefined },
    ]);
  });

  it('keeps an expanded IPv6 address whole', async function () {
    const { calls, limiters } = recordingLimiters();

    await rateLimitStorage(limiters).consume(
      '2001:0db8:0000:0000:0000:0000:0000:0000|/request-password-reset',
      RULE,
    );

    assert.deepEqual(calls, [
      {
        name: 'globalReset',
        ip: '2001:0db8:0000:0000:0000:0000:0000:0000',
        key: '/request-password-reset',
      },
      { name: 'userReset', ip: '2001:0db8:0000:0000:0000:0000:0000:0000', key: undefined },
    ]);
  });

  it('stops at the first limiter that blocks and reports whole seconds', async function () {
    const { calls, limiters } = recordingLimiters({ globalBlock: 1500 });

    const result = await rateLimitStorage(limiters).consume('203.0.113.7|/sign-in/email', RULE);

    assert.deepEqual(result, { allowed: false, retryAfter: 2 });
    assert.deepEqual(
      calls.map(({ name }) => name),
      ['globalBlock'],
    );
  });

  it('does not limit routes without a compatibility route', async function () {
    const { calls, limiters } = recordingLimiters({ globalBlock: 1000, userLogin: 1000 });

    const result = await rateLimitStorage(limiters).consume('203.0.113.7|/get-session', RULE);

    assert.deepEqual(result, { allowed: true, retryAfter: null });
    assert.deepEqual(calls, []);
  });
});
