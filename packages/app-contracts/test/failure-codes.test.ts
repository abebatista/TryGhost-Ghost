import { describe, expect, it } from 'vitest';

import { APP_FAILURE_CODES, isAppFailureCode, isOutdatedReviewCode } from '../src/index.ts';

describe('APP_FAILURE_CODES', () => {
  it('puts each code in one set only', () => {
    expect(new Set(APP_FAILURE_CODES).size).toBe(APP_FAILURE_CODES.length);
  });
});

describe('isOutdatedReviewCode', () => {
  it('tells a review that is out of date from a failure', () => {
    expect(isOutdatedReviewCode('APP_MANIFEST_CHANGED')).toBe(true);
    expect(isOutdatedReviewCode('APP_INSTALLATION_UNINSTALLED')).toBe(true);
    expect(isOutdatedReviewCode('APP_MANIFEST_INVALID')).toBe(false);
    expect(isOutdatedReviewCode('constructor')).toBe(false);
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
