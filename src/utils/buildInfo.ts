/**
 * Which code this install is actually running, in terms a person can check.
 *
 * This exists because the question had no answer on the device. The phone ran a
 * 16 August build for four weeks while every change since landed on GitHub, and
 * the only way to find that out was to query EAS from a computer and compare
 * runtime versions by hand. Both symptoms that prompted it — "0 followers", no
 * photos on comments — were already fixed in code that simply wasn't installed.
 *
 * Takes the `expo-updates` constants as plain input rather than importing the
 * module, so it can be tested without the native side — the same reason
 * `visionErrors.ts` lives apart from the service that uses it.
 */
export interface BuildInfoInput {
  /** `__DEV__`. A development build serves JavaScript from Metro, so updates don't apply to it. */
  isDev: boolean;
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  createdAt: Date | null;
  runtimeVersion: string | null;
  channel: string | null;
}

export type BuildDescription =
  | { kind: 'development'; summary: string }
  | { kind: 'disabled'; summary: string }
  | { kind: 'release'; code: string; runtime: string; channel: string };

/**
 * Runtime versions are 40-character fingerprint hashes. Eight is the
 * abbreviation EAS and the README already use (`c6db02e7`), so the value shown
 * here can be matched against `eas build:list` by eye.
 */
const RUNTIME_ABBREVIATION = 8;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "13 Sep 2026". Built by hand rather than with `toLocaleDateString`, whose
 * output depends on the device locale and on how much of `Intl` the JS engine
 * ships — Hermes on a phone and Node under jest disagree, and a label that reads
 * differently in tests than on the device is the kind that hides a bug.
 */
export function formatUpdateDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function describeBuild(input: BuildInfoInput): BuildDescription {
  if (input.isDev) {
    return {
      kind: 'development',
      summary: 'Development build — the code is served from your computer, so updates don’t apply here.',
    };
  }

  // Per the SDK 57 docs, `isEnabled` is also false when configuration is missing
  // or update storage failed — so this is not the same as a development build,
  // and saying so would send someone looking in the wrong place.
  if (!input.isEnabled) {
    return {
      kind: 'disabled',
      summary: 'Updates are off in this build, so it will only ever run the code it was built with.',
    };
  }

  return {
    kind: 'release',
    code: input.isEmbeddedLaunch
      ? 'Built into this install'
      : input.createdAt
        ? `Update · ${formatUpdateDate(input.createdAt)}`
        : 'Downloaded update',
    runtime: input.runtimeVersion ? input.runtimeVersion.slice(0, RUNTIME_ABBREVIATION) : 'Unknown',
    channel: input.channel ?? 'None',
  };
}
