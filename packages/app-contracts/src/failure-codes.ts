/**
 * Every code Ghost's app installations service answers Admin with when something about an
 * app stops a request: reviewing an install link, installing, approving, uninstalling or
 * starting a session. Admin decides what each one tells the publisher, so a code missing
 * from here can't reach a screen as anything but an unknown error. Ghost core's tests check
 * this list against the codes the service throws.
 *
 * The codes for an app Ghost couldn't confirm are also listed, apart, in
 * `UNCONFIRMED_APP_CODES`.
 *
 * Free of jose and zod, so Admin reads it from the root entry point.
 */
export const APP_FAILURE_CODES = [
  // Loading the manifest

  /** The manifest URL isn't one Ghost fetches. */
  'APP_MANIFEST_URL_INVALID',
  /** The app didn't answer, or answered the manifest URL with an error or a bad redirect. */
  'APP_MANIFEST_UNREACHABLE',
  /** The manifest URL redirects to another host. */
  'APP_MANIFEST_REDIRECTED',
  /** The signed manifest is larger than Ghost reads, or the manifest than it stores. */
  'APP_MANIFEST_TOO_LARGE',
  /** The signed manifest, or the manifest inside it, isn't JSON. */
  'APP_MANIFEST_NOT_JSON',
  /** The manifest isn't served as a signed manifest. */
  'APP_MANIFEST_UNSIGNED',
  /** The manifest names another address than the one it was fetched from. */
  'APP_MANIFEST_URL_MISMATCH',
  /** The manifest, or the icon it names, isn't valid. The details list each problem. */
  'APP_MANIFEST_INVALID',
  /** The manifest is for another app than the installed one. */
  'APP_MANIFEST_OTHER_APP',

  // The identity check

  /** The signature wasn't made with the identity key the manifest names. */
  'APP_MANIFEST_SIGNATURE_INVALID',
  /** The manifest is signed with another key than the one the app was installed with. */
  'APP_IDENTITY_MISMATCH',
  /** The manifest names a backend key a newer manifest from the same developer replaced. */
  'APP_BACKEND_KEY_RETIRED',
  /** The app's origin couldn't be reached to answer the challenge. */
  'APP_CHALLENGE_UNREACHABLE',
  /** The app's origin didn't answer the challenge with the manifest's backend key. */
  'APP_CHALLENGE_FAILED',

  // The review is out of date

  /** The manifest changed since the publisher reviewed it. The details hold the new review. */
  'APP_MANIFEST_CHANGED',
  /**
   * The installation changed since the publisher reviewed it. The details hold the new review.
   */
  'APP_INSTALLATION_CHANGED',
  /** The app was installed since the publisher reviewed it. */
  'APP_ALREADY_INSTALLED',
  /** The installation was uninstalled since the publisher reviewed it. */
  'APP_INSTALLATION_UNINSTALLED',

  // The installation

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
