import { describe, expect, it } from 'vitest';

import { APP_FAILURE_CODES, UNCONFIRMED_APP_CODES, isAppFailureCode } from '../src/index.ts';

describe('APP_FAILURE_CODES', () => {
  it('lists each code once', () => {
    expect(new Set(APP_FAILURE_CODES).size).toBe(APP_FAILURE_CODES.length);
  });

  it('includes every code for an app Ghost couldn’t confirm', () => {
    expect(APP_FAILURE_CODES).toEqual(expect.arrayContaining([...UNCONFIRMED_APP_CODES]));
  });
});

describe('isAppFailureCode', () => {
  it('knows the codes Ghost answers Admin with', () => {
    expect(isAppFailureCode('APP_MANIFEST_UNREACHABLE')).toBe(true);
    expect(isAppFailureCode('APP_NOT_INSTALLED')).toBe(true);
  });

  it('refuses anything else, including names every object has', () => {
    expect(isAppFailureCode('APP_SOMETHING_NEW')).toBe(false);
    expect(isAppFailureCode('constructor')).toBe(false);
    expect(isAppFailureCode('__proto__')).toBe(false);
    expect(isAppFailureCode(undefined)).toBe(false);
  });
});
