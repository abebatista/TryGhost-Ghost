import { UNCONFIRMED_APP_CODES } from './identity/codes.ts';

/** The app couldn't be reached, so trying again may work. */
const UNREACHABLE_APP_CODES = [
  /** The app didn't answer, or answered the manifest URL with an error or a bad redirect. */
  'APP_MANIFEST_UNREACHABLE',
  /** The app's origin couldn't be reached to answer the challenge. */
  'APP_CHALLENGE_UNREACHABLE',
] as const;

/** Ghost can't use the manifest URL, or what it serves, until the developer fixes it. */
const UNUSABLE_MANIFEST_CODES = [
  /** The manifest URL isn't one Ghost fetches. */
  'APP_MANIFEST_URL_INVALID',
  /** The manifest URL redirects to another host. */
  'APP_MANIFEST_REDIRECTED',
  /** The signed manifest is larger than Ghost reads, or the manifest than it stores. */
  'APP_MANIFEST_TOO_LARGE',
  /** The signed manifest, or the manifest inside it, isn't JSON. */
  'APP_MANIFEST_NOT_JSON',
  /** The manifest isn't served as a signed manifest. */
  'APP_MANIFEST_UNSIGNED',
  /** The manifest, or the icon it names, isn't valid. The details list each problem. */
  'APP_MANIFEST_INVALID',
  /** The manifest is for another app than the installed one. */
  'APP_MANIFEST_OTHER_APP',
] as const;

/**
 * What the publisher reviewed is out of date, so installing or approving it was refused. When
 * Ghost has a review as things stand now, it sends it in the error's details.
 */
export const OUTDATED_REVIEW_CODES = [
  /** The manifest changed since the publisher reviewed it. */
  'APP_MANIFEST_CHANGED',
  /** The installation changed since the publisher reviewed it. */
  'APP_INSTALLATION_CHANGED',
  /** The app was installed since the publisher reviewed it. */
  'APP_ALREADY_INSTALLED',
  /** The installation was uninstalled since the publisher reviewed it. */
  'APP_INSTALLATION_UNINSTALLED',
] as const;

/**
 * Every code Ghost's app installations service answers Admin with when something about an
 * app stops a request: reviewing an install link, installing, approving, uninstalling or
 * starting a session. Admin decides what each one tells the publisher, so a code missing
 * from here can't reach a screen as anything but an unknown error. Ghost core's tests check
 * this list against the codes the service throws.
 *
 * Free of jose and zod, so Admin reads it from the root entry point.
 */
export const APP_FAILURE_CODES = [
  ...UNREACHABLE_APP_CODES,
  ...UNCONFIRMED_APP_CODES,
  ...UNUSABLE_MANIFEST_CODES,
  ...OUTDATED_REVIEW_CODES,
  /** The installation doesn't exist, or has been uninstalled. */
  'APP_NOT_INSTALLED',
  /** A session couldn't start because of the app, for a reason without a code of its own. */
  'APP_UNAVAILABLE',
] as const;

export type AppFailureCode = (typeof APP_FAILURE_CODES)[number];

const FAILURE_CODES: ReadonlySet<unknown> = new Set(APP_FAILURE_CODES);

/** Whether a code from Ghost is one of `APP_FAILURE_CODES`, so it can be looked up safely. */
export function isAppFailureCode(code: unknown): code is AppFailureCode {
  return FAILURE_CODES.has(code);
}

const OUTDATED_REVIEW: ReadonlySet<unknown> = new Set(OUTDATED_REVIEW_CODES);

/** Whether installing or approving was refused because the review is out of date. */
export function isOutdatedReviewCode(
  code: unknown,
): code is (typeof OUTDATED_REVIEW_CODES)[number] {
  return OUTDATED_REVIEW.has(code);
}
