import { describeBuild, formatUpdateDate, type BuildInfoInput } from '../src/utils/buildInfo';

const RUNTIME = '814e523edbbeb391492b2262f0994539388c3a72';

function release(overrides: Partial<BuildInfoInput> = {}): BuildInfoInput {
  return {
    isDev: false,
    isEnabled: true,
    isEmbeddedLaunch: true,
    createdAt: null,
    runtimeVersion: RUNTIME,
    channel: 'preview',
    ...overrides,
  };
}

describe('describeBuild', () => {
  it('reports code that shipped inside the APK', () => {
    expect(describeBuild(release())).toEqual({
      kind: 'release',
      code: 'Built into this install',
      runtime: '814e523e',
      channel: 'preview',
    });
  });

  it('reports a downloaded update with the day it was published', () => {
    // Local-time constructor, so the expected day holds in any timezone.
    const createdAt = new Date(2026, 8, 13, 10, 30);
    const build = describeBuild(release({ isEmbeddedLaunch: false, createdAt }));

    expect(build.kind).toBe('release');
    expect(build.kind === 'release' && build.code).toBe('Update · 13 Sep 2026');
  });

  it('still says it is an update when the creation date is missing', () => {
    const build = describeBuild(release({ isEmbeddedLaunch: false, createdAt: null }));
    expect(build.kind === 'release' && build.code).toBe('Downloaded update');
  });

  // The whole point of the abbreviation is matching `eas build:list` by eye —
  // this is the value the stale phone would have shown.
  it('abbreviates the runtime version the way EAS and the README do', () => {
    const build = describeBuild(release({ runtimeVersion: 'c6db02e70a66e75ad9c94cec180875764d90a151' }));
    expect(build.kind === 'release' && build.runtime).toBe('c6db02e7');
  });

  it('never throws on missing runtime or channel', () => {
    const build = describeBuild(release({ runtimeVersion: null, channel: null }));
    expect(build).toEqual({ kind: 'release', code: 'Built into this install', runtime: 'Unknown', channel: 'None' });
  });

  it('calls a development build what it is, whatever expo-updates reports', () => {
    const build = describeBuild(release({ isDev: true, isEnabled: false, channel: null }));
    expect(build.kind).toBe('development');
  });

  // `isEnabled` is also false in a release build with broken config. Calling
  // that a development build would send someone looking in the wrong place.
  it('distinguishes updates being disabled from a development build', () => {
    const build = describeBuild(release({ isEnabled: false }));
    expect(build.kind).toBe('disabled');
  });
});

describe('formatUpdateDate', () => {
  it('formats day, short month and year without depending on locale', () => {
    expect(formatUpdateDate(new Date(2026, 0, 1))).toBe('1 Jan 2026');
    expect(formatUpdateDate(new Date(2026, 11, 31))).toBe('31 Dec 2026');
  });
});
