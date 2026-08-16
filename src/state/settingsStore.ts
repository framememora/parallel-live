import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * Models offered for camera-aware comments, cheapest first.
 *
 * `supportsEffort` is not a preference — the `output_config.effort` parameter
 * is rejected outright by models that don't support it, so sending it to
 * Haiku 4.5 fails the request. `costPerHour` is the estimated spend per hour of
 * broadcast at one capture every 20s (~180 requests), from ~720 input tokens
 * and ~130 output tokens plus thinking where the model has it.
 */
export const VISION_MODELS = [
  {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5',
    blurb: 'Fastest and cheapest. Recommended — this task is short casual writing, not reasoning.',
    costPerHour: '~$0.25/hr live',
    supportsEffort: false,
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    blurb: 'Step up if Haiku’s comments read generic on your camera.',
    costPerHour: '~$0.94/hr live',
    supportsEffort: true,
  },
  {
    id: 'claude-opus-5',
    label: 'Opus 5',
    blurb: 'Most capable, ~10x the cost. Useful for comparison, hard to justify in production.',
    costPerHour: '~$2.36/hr live',
    supportsEffort: true,
  },
] as const;

export type VisionModelId = (typeof VISION_MODELS)[number]['id'];

export const DEFAULT_VISION_MODEL: VisionModelId = 'claude-haiku-4-5';

/**
 * User-configurable settings, reachable by tapping the avatar in `LiveHeader`
 * while idle.
 *
 * These **persist across restarts**, in a single JSON blob under one
 * `expo-secure-store` key. One store rather than a keychain for the API key and
 * AsyncStorage for the rest: that split costs a second native module and buys
 * nothing here, since the whole blob is a few hundred bytes — well inside the
 * ~2KB ceiling the platform historically enforces.
 *
 * The tradeoff worth naming: the API key now sits **at rest** rather than dying
 * with the process. On Android that means the Keystore-encrypted store, which
 * is strictly better than the `EXPO_PUBLIC_ANTHROPIC_API_KEY` alternative
 * (cleartext, inlined into the bundle) — but it is a change, not a free win.
 */
export interface SettingsState {
  /** Broadcaster handle shown in the header and used for the user's own comments. */
  handle: string;
  /**
   * Profile picture, as a `content://` or `file://` URI into the device's media
   * store. `null` falls back to the letter disc derived from the handle.
   *
   * Only the reference is held here — the photo itself is never copied into the
   * app. Persisting a reference rather than a copy means the URI can outlive
   * what it points at: the photo is deleted, or Android's "selected photos"
   * grant changes and the app loses sight of it. `Avatar` treats a URI that
   * fails to load as absent and draws the letter disc, which is the only reason
   * storing the reference alone is safe.
   */
  avatarUri: string | null;
  /** Follower count the session starts from, instead of 0. */
  startingFollowers: number;
  /**
   * Opt-in for screen-recording the session so it can be saved as a clip.
   *
   * Off by default. Recording is the only reason the app needs Android's
   * MediaProjection consent, and Android deliberately re-asks every single
   * session — there is no way to suppress that. The simulation itself needs no
   * capture at all, so making this opt-in means going live is instant and
   * dialog-free unless you actually want a video out of it.
   */
  recordSession: boolean;
  /**
   * Opt-in for sending camera frames to the Claude API for context-aware
   * comments. Off by default — this uploads pictures of the user and their
   * surroundings to a third party.
   */
  aiCommentsEnabled: boolean;
  /**
   * Runtime override for the API key. Falls back to
   * `EXPO_PUBLIC_ANTHROPIC_API_KEY`, which Metro inlines into the bundle in
   * cleartext — fine for a personal dev build, not safe for distribution.
   */
  apiKey: string;
  /** Which model generates the camera-aware comments. */
  visionModel: VisionModelId;
}

interface SettingsStore extends SettingsState {
  setHandle: (handle: string) => void;
  setAvatarUri: (uri: string | null) => void;
  setStartingFollowers: (count: number) => void;
  setRecordSession: (enabled: boolean) => void;
  setAiCommentsEnabled: (enabled: boolean) => void;
  setApiKey: (key: string) => void;
  setVisionModel: (model: VisionModelId) => void;
}

export const DEFAULT_HANDLE = 'you';

const initialState: SettingsState = {
  handle: DEFAULT_HANDLE,
  avatarUri: null,
  startingFollowers: 0,
  recordSession: false,
  aiCommentsEnabled: false,
  apiKey: '',
  visionModel: DEFAULT_VISION_MODEL,
};

/** Single SecureStore key holding the whole blob. Must match `/^[\w.-]+$/`. */
const STORAGE_KEY = 'parallel-live.settings';

/**
 * Reads synchronously, writes asynchronously — both halves are deliberate.
 *
 * The **sync read** is what makes settings available before the first paint.
 * zustand's `persist` runs its rehydrate chain through `toThenable`, which stays
 * synchronous as long as storage hands back a plain value instead of a Promise,
 * and `createJSONStorage` parses it inline in that case. So the header renders
 * the right handle and photo immediately, with no flash of defaults and no
 * `hasHydrated` gate in the UI. AsyncStorage has no sync read and would have
 * forced both.
 *
 * The **async writes** keep an encrypted Keystore round-trip off the JS thread.
 * `persist` writes on every state change, so a sync write would land on the
 * keyboard's critical path while a key is being typed.
 *
 * Nothing here catches: if the native module is missing or a value can't be
 * decrypted after a reinstall, `getItem` throws, `toThenable` short-circuits the
 * chain, and the store keeps `initialState`. Falling back to defaults is exactly
 * the wanted behaviour, and a try/catch would only make it wordier.
 */
const secureStorage: StateStorage = {
  getItem: (name) => SecureStore.getItem(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

/**
 * Re-validates a stored blob on the way in.
 *
 * Hydration assigns straight into the store, so it bypasses every setter below
 * and their normalization with it. Each field is picked and checked explicitly
 * rather than spread: a blob written by an older build can hold a field this
 * version has since dropped or retyped, and spreading would seat it in state
 * unexamined. Anything missing or malformed is simply omitted, leaving that
 * field at its default.
 */
function sanitize(persisted: unknown): Partial<SettingsState> {
  if (typeof persisted !== 'object' || persisted === null) return {};
  const p = persisted as Record<string, unknown>;
  const out: Partial<SettingsState> = {};

  if (typeof p.handle === 'string') out.handle = p.handle.trim().toLowerCase() || DEFAULT_HANDLE;
  if (typeof p.avatarUri === 'string' || p.avatarUri === null) {
    out.avatarUri = p.avatarUri as string | null;
  }
  if (typeof p.startingFollowers === 'number' && Number.isFinite(p.startingFollowers)) {
    out.startingFollowers = Math.max(0, Math.floor(p.startingFollowers));
  }
  if (typeof p.recordSession === 'boolean') out.recordSession = p.recordSession;
  if (typeof p.aiCommentsEnabled === 'boolean') out.aiCommentsEnabled = p.aiCommentsEnabled;
  if (typeof p.apiKey === 'string') out.apiKey = p.apiKey.trim();
  // `resolveVisionModel` already falls back for an unknown id, but dropping it
  // here too keeps the Settings radio group from rendering with nothing selected.
  if (typeof p.visionModel === 'string' && VISION_MODELS.some((m) => m.id === p.visionModel)) {
    out.visionModel = p.visionModel as VisionModelId;
  }

  return out;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,

      // Trimmed and lowercased: a handle with spaces or capitals doesn't read as a
      // real social handle in the header.
      setHandle: (handle) => set({ handle: handle.trim().toLowerCase() || DEFAULT_HANDLE }),

      setAvatarUri: (avatarUri) => set({ avatarUri }),

      setStartingFollowers: (count) =>
        set({ startingFollowers: Math.max(0, Math.floor(count) || 0) }),

      setRecordSession: (recordSession) => set({ recordSession }),

      setAiCommentsEnabled: (aiCommentsEnabled) => set({ aiCommentsEnabled }),

      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),

      setVisionModel: (visionModel) => set({ visionModel }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      version: 1,
      // Listed field by field rather than spread, so adding a setter later can
      // never start quietly persisting a function.
      partialize: (s): SettingsState => ({
        handle: s.handle,
        avatarUri: s.avatarUri,
        startingFollowers: s.startingFollowers,
        recordSession: s.recordSession,
        aiCommentsEnabled: s.aiCommentsEnabled,
        apiKey: s.apiKey,
        visionModel: s.visionModel,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
    }
  )
);

/** The key actually used for requests: runtime override first, then the build-time env var. */
export function resolveApiKey(): string {
  const runtime = useSettingsStore.getState().apiKey;
  if (runtime) return runtime;
  return process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
}

/** The selected model plus the capability flags the request shape depends on. */
export function resolveVisionModel(): (typeof VISION_MODELS)[number] {
  const id = useSettingsStore.getState().visionModel;
  return VISION_MODELS.find((m) => m.id === id) ?? VISION_MODELS[0];
}
