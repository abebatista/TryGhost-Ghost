import { type AppFailureCode, isAppFailureCode } from '@tryghost/app-contracts';
import { JSONError, getErrorMessage } from '@tryghost/admin-x-framework/errors';

/** Something the app's developer has to fix, with what Ghost said about it. */
export interface InstallProblem {
  title: string;
  detail: string;
}

/** Why an app couldn't be reviewed or installed, as the install screen shows it. */
export type InstallFailure =
  /** The app didn't answer as expected. Trying again may work. */
  | { kind: 'unreachable'; detail: string }
  /**
   * The link is for an app the site has, from another developer. Nothing can approve it, and
   * nothing more is said, so the publisher isn't drawn into the details.
   */
  | { kind: 'another-developer' }
  /**
   * Ghost couldn't confirm the app comes from its developer. Its explanation, the detail,
   * starts by saying so.
   */
  | { kind: 'unconfirmed'; detail: string }
  /** What the install link points at can't be installed until its developer fixes it. */
  | { kind: 'problems'; problems: InstallProblem[] }
  /** The install link doesn't say which app to install, so there is nothing to check. */
  | { kind: 'incomplete-link' }
  /** Anything else, such as Ghost itself being unreachable. */
  | { kind: 'error'; message: string };

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/** The first error of an Admin API error response, if that's what was thrown. */
export function apiErrorOf(error: unknown) {
  return error instanceof JSONError ? error.data?.errors?.[0] : undefined;
}

function problemsOf(details: unknown): InstallProblem[] {
  if (!Array.isArray(details)) {
    return [];
  }
  return details.flatMap((entry: unknown) => {
    const { path, message } = (entry ?? {}) as { path?: unknown; message?: unknown };
    return typeof message === 'string'
      ? [{ title: typeof path === 'string' && path ? path : 'Manifest', detail: message }]
      : [];
  });
}

/**
 * What the install screen makes of a code, from Ghost's explanation and the error's details.
 * Nothing means it isn't a failure the screen explains, so it says what went wrong instead.
 */
type Reading = (detail: string, details: unknown) => InstallFailure | undefined;

const unreachable: Reading = (detail) => ({ kind: 'unreachable', detail });
const unconfirmed: Reading = (detail) => ({ kind: 'unconfirmed', detail });
const problem =
  (title: string): Reading =>
  (detail) => ({ kind: 'problems', problems: [{ title, detail }] });
const notExplained: Reading = () => undefined;

/**
 * Every code Ghost can answer with, so a new one doesn't type-check until this screen decides
 * how to show it. The session screen reads the unconfirmed codes on its own, and shows them
 * all as an app Ghost couldn't confirm; here two of them read differently, as noted.
 */
const READINGS: Record<AppFailureCode, Reading> = {
  APP_MANIFEST_UNREACHABLE: unreachable,
  APP_CHALLENGE_UNREACHABLE: unreachable,

  // At install the link is the newcomer, so it's refused without saying more, and the
  // publisher isn't drawn into the details.
  APP_IDENTITY_MISMATCH: () => ({ kind: 'another-developer' }),
  APP_MANIFEST_SIGNATURE_INVALID: unconfirmed,
  APP_BACKEND_KEY_RETIRED: unconfirmed,
  APP_CHALLENGE_FAILED: unconfirmed,
  // Refused while the manifest is read, before its signature is checked, so it's listed for
  // the developer like the manifest's other problems.
  APP_MANIFEST_URL_MISMATCH: problem('The app’s details are for another install link'),

  APP_MANIFEST_UNSIGNED: problem('The app’s details aren’t signed'),
  APP_MANIFEST_URL_INVALID: problem('The install link isn’t valid'),
  APP_MANIFEST_REDIRECTED: problem('The app’s details redirect to another site'),
  APP_MANIFEST_NOT_JSON: problem('The app’s details aren’t in the expected format'),
  APP_MANIFEST_TOO_LARGE: problem('The app’s details are too large'),
  APP_MANIFEST_OTHER_APP: problem('This install link is for a different app'),
  APP_MANIFEST_INVALID: (detail, details) => {
    const problems = problemsOf(details);
    return {
      kind: 'problems',
      problems: problems.length ? problems : [{ title: 'The app’s details aren’t valid', detail }],
    };
  },

  // The install dialog answers a review that's out of date with a fresh one.
  APP_MANIFEST_CHANGED: notExplained,
  APP_INSTALLATION_CHANGED: notExplained,
  APP_ALREADY_INSTALLED: notExplained,
  APP_INSTALLATION_UNINSTALLED: notExplained,
  // Answers to reading an installation or starting a session, not to a review.
  APP_NOT_INSTALLED: notExplained,
  APP_UNAVAILABLE: notExplained,
};

/** Turns an error from previewing, installing or approving into what the screen shows. */
export function installFailureOf(error: unknown): InstallFailure {
  const apiError = apiErrorOf(error);
  const code = apiError?.code;
  const failure = isAppFailureCode(code)
    ? READINGS[code](apiError?.context ?? '', apiError?.details)
    : undefined;
  return failure ?? { kind: 'error', message: getErrorMessage(error, FALLBACK_MESSAGE) };
}
