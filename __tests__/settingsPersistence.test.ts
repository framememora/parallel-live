import * as SecureStore from 'expo-secure-store';

// The real module is a native binding with no JS fallback under jest. Only the
// three entry points `secureStorage` actually uses are stubbed.
jest.mock('expo-secure-store', () => ({
  getItem: jest.fn(),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockGetItem = SecureStore.getItem as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;

/**
 * The envelope `persist` writes: the partialized state plus its schema version.
 * Defaults to the pre-migration version, since that is what every blob written
 * by a shipped build so far actually carries.
 */
function stored(state: Record<string, unknown>, version = 1) {
  return JSON.stringify({ state, version });
}

/**
 * Re-imports the store with `getItem` primed, since hydration runs once at
 * module load and there is no way to re-trigger it on an already-imported store.
 */
function loadStore(raw: string | null | (() => never)) {
  if (typeof raw === 'function') {
    mockGetItem.mockImplementation(raw);
  } else {
    mockGetItem.mockReturnValue(raw);
  }

  let mod!: typeof import('../src/state/settingsStore');
  jest.isolateModules(() => {
    mod = require('../src/state/settingsStore');
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockReset();
  mockSetItemAsync.mockImplementation(() => Promise.resolve());
});

describe('settings persistence', () => {
  it('hydrates synchronously — values are readable with no await', () => {
    const { useSettingsStore } = loadStore(
      stored({
        handle: 'nova',
        avatarUri: 'content://media/external/images/media/42',
        startingFollowers: 1200,
        recordSession: true,
        // Stored `false` on purpose: `recordMicAudio` is the one field whose
        // default is `true`, so storing `true` would pass even if hydration
        // dropped it entirely.
        recordMicAudio: false,
        aiCommentsEnabled: true,
        apiKey: 'sk-ant-test',
        visionModel: 'claude-sonnet-5',
      })
    );

    // No `await`, no `hasHydrated` wait: this is the property the whole
    // sync-read design exists for. If it ever regresses, the header renders
    // defaults on first paint and then visibly snaps to the real values.
    const state = useSettingsStore.getState();
    expect(state.handle).toBe('nova');
    expect(state.avatarUri).toBe('content://media/external/images/media/42');
    expect(state.startingFollowers).toBe(1200);
    expect(state.recordSession).toBe(true);
    expect(state.recordMicAudio).toBe(false);
    expect(state.aiCommentsEnabled).toBe(true);
    expect(state.apiKey).toBe('sk-ant-test');
    expect(state.visionModel).toBe('claude-sonnet-5');
  });

  it('writes only the eight settings fields, never the setters', async () => {
    const { useSettingsStore } = loadStore(null);

    useSettingsStore.getState().setHandle('Broadcaster');
    await Promise.resolve();

    expect(mockSetItemAsync).toHaveBeenCalled();
    const [key, value] = mockSetItemAsync.mock.calls.at(-1) as [string, string];
    expect(key).toBe('parallel-live.settings');

    const written = JSON.parse(value) as { state: Record<string, unknown>; version: number };
    expect(written.version).toBe(2);
    expect(Object.keys(written.state).sort()).toEqual([
      'aiCommentsEnabled',
      'apiKey',
      'avatarUri',
      'handle',
      'recordMicAudio',
      'recordSession',
      'startingFollowers',
      'visionModel',
    ]);
    // The setter's own normalization still applies before the write.
    expect(written.state.handle).toBe('broadcaster');
  });

  it('falls back to the default handle when the stored one is empty', () => {
    // Hydration assigns straight into the store, so `setHandle`'s guard is
    // bypassed and `sanitize` is the only thing standing between an empty
    // string and `initialFor()`.
    const { useSettingsStore, DEFAULT_HANDLE } = loadStore(stored({ handle: '   ' }));

    expect(useSettingsStore.getState().handle).toBe(DEFAULT_HANDLE);
  });

  it('drops malformed fields instead of seating them in state', () => {
    const { useSettingsStore, DEFAULT_VISION_MODEL } = loadStore(
      stored({
        handle: 'nova',
        startingFollowers: -40,
        recordSession: 'yes',
        visionModel: 'claude-from-an-older-build',
        somethingRemovedLastVersion: true,
      })
    );

    const state = useSettingsStore.getState();
    expect(state.handle).toBe('nova');
    expect(state.startingFollowers).toBe(0);
    expect(state.recordSession).toBe(false);
    expect(state.visionModel).toBe(DEFAULT_VISION_MODEL);
    expect(state).not.toHaveProperty('somethingRemovedLastVersion');
  });

  it('lifts a v1 stored 0 to the new starting-follower default', () => {
    // Every install from before v2 has a stored 0, which `merge` would
    // otherwise keep seating over the default and leave the header at "0".
    const { useSettingsStore, DEFAULT_STARTING_FOLLOWERS } = loadStore(
      stored({ handle: 'nova', startingFollowers: 0 })
    );

    const state = useSettingsStore.getState();
    expect(state.startingFollowers).toBe(DEFAULT_STARTING_FOLLOWERS);
    // The rest of the blob still comes through the migration untouched.
    expect(state.handle).toBe('nova');
  });

  it('leaves a deliberate non-zero starting-follower count alone', () => {
    const { useSettingsStore } = loadStore(stored({ startingFollowers: 1200 }));

    expect(useSettingsStore.getState().startingFollowers).toBe(1200);
  });

  it('leaves a v2 blob alone, including one that stores 0 on purpose', () => {
    // Past the migration, 0 is a choice the user made with the new default in
    // place, so it has to survive.
    const { useSettingsStore } = loadStore(stored({ startingFollowers: 0 }, 2));

    expect(useSettingsStore.getState().startingFollowers).toBe(0);
  });

  it('keeps defaults when the store cannot be read at all', () => {
    // A missing native module or a value left undecryptable by a reinstall. The
    // app must still open.
    const { useSettingsStore, DEFAULT_HANDLE, DEFAULT_VISION_MODEL } = loadStore(() => {
      throw new Error('Could not decrypt the value for key');
    });

    const state = useSettingsStore.getState();
    expect(state.handle).toBe(DEFAULT_HANDLE);
    expect(state.apiKey).toBe('');
    expect(state.aiCommentsEnabled).toBe(false);
    expect(state.visionModel).toBe(DEFAULT_VISION_MODEL);
  });

  it('keeps defaults when the stored blob is not valid JSON', () => {
    const { useSettingsStore, DEFAULT_HANDLE } = loadStore('{ truncated');

    expect(useSettingsStore.getState().handle).toBe(DEFAULT_HANDLE);
  });
});
