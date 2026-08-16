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

/** The envelope `persist` writes: the partialized state plus its schema version. */
function stored(state: Record<string, unknown>) {
  return JSON.stringify({ state, version: 1 });
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
    expect(state.aiCommentsEnabled).toBe(true);
    expect(state.apiKey).toBe('sk-ant-test');
    expect(state.visionModel).toBe('claude-sonnet-5');
  });

  it('writes only the seven settings fields, never the setters', async () => {
    const { useSettingsStore } = loadStore(null);

    useSettingsStore.getState().setHandle('Broadcaster');
    await Promise.resolve();

    expect(mockSetItemAsync).toHaveBeenCalled();
    const [key, value] = mockSetItemAsync.mock.calls.at(-1) as [string, string];
    expect(key).toBe('parallel-live.settings');

    const written = JSON.parse(value) as { state: Record<string, unknown>; version: number };
    expect(written.version).toBe(1);
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
        // Not a boolean, so it must not survive — and its default is `true`,
        // which makes this the one field where a silent pass-through would be
        // invisible in the common case.
        recordMicAudio: 'off',
        visionModel: 'claude-from-an-older-build',
        somethingRemovedLastVersion: true,
      })
    );

    const state = useSettingsStore.getState();
    expect(state.handle).toBe('nova');
    expect(state.startingFollowers).toBe(0);
    expect(state.recordSession).toBe(false);
    expect(state.recordMicAudio).toBe(true);
    expect(state.visionModel).toBe(DEFAULT_VISION_MODEL);
    expect(state).not.toHaveProperty('somethingRemovedLastVersion');
  });

  it('round-trips the microphone setting', () => {
    const { useSettingsStore } = loadStore(stored({ recordSession: true, recordMicAudio: false }));

    const state = useSettingsStore.getState();
    expect(state.recordSession).toBe(true);
    expect(state.recordMicAudio).toBe(false);
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
