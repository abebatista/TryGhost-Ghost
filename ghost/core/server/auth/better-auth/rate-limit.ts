import type { BetterAuthRateLimitOptions } from 'better-auth';

type RateLimitStorage = NonNullable<BetterAuthRateLimitOptions['customStorage']>;

/** The part of Ghost's `BackoffLimiter` Better Auth's limiter runs on. */
export type Limiter = {
  consume(key: {
    ip?: string;
    key?: string;
  }): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }>;
  reset(key: { ip?: string; key?: string }): Promise<void>;
};

/** Ghost's `spam` limiters, looked up per request so a reset rebuilds them. */
export type Limiters = Record<
  'globalBlock' | 'globalReset' | 'userLogin' | 'userReset',
  () => Limiter
>;

type LimiterName = keyof Limiters;

// Each native credential route counts against its compatibility route's limiters
const ROUTE_LIMITERS: Record<string, LimiterName[]> = {
  // POST /session
  '/sign-in/email': ['globalBlock', 'userLogin'],
  // Sends an email per request, like POST /authentication/password_reset
  '/sign-in/magic-link': ['globalReset', 'userReset'],
  // POST /authentication/password_reset
  '/request-password-reset': ['globalReset', 'userReset'],
  // PUT /authentication/password_reset
  '/reset-password': ['globalBlock'],
};

// Like their Express middleware, which keys these on `req.path`
const PATH_KEYED = new Set<LimiterName>(['globalBlock', 'globalReset']);

/**
 * Better Auth rate-limit storage over Ghost's limiters. Their own `spam`
 * settings apply, so Better Auth's window and max are ignored, and paths
 * without a compatibility route are not limited.
 */
export function rateLimitStorage(limiters: Limiters): RateLimitStorage {
  return {
    async consume(rateLimitKey) {
      // Better Auth's key is `${ip}|${path}`; neither part contains `|`
      const [ip, path = ''] = rateLimitKey.split('|');

      // In order, so a blocked request stops before the next limiter counts it
      for (const name of ROUTE_LIMITERS[path] ?? []) {
        const result = await limiters[name]().consume({
          ip,
          key: PATH_KEYED.has(name) ? path : undefined,
        });
        if (!result.allowed) {
          return { allowed: false, retryAfter: Math.ceil(result.retryAfterMs / 1000) };
        }
      }

      return { allowed: true, retryAfter: null };
    },
  };
}
