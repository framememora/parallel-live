import { create } from 'zustand';

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
 * Deliberately **not persisted**: every storage option in this ecosystem
 * (@react-native-async-storage/async-storage, expo-secure-store, expo-sqlite)
 * is a native module and would force a dev-client rebuild. Settings reset on
 * app restart until that rebuild is worth doing.
 */
export interface SettingsState {
  /** Broadcaster handle shown in the header and used for the user's own comments. */
  handle: string;
  /** Follower count the session starts from, instead of 0. */
  startingFollowers: number;
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
  setStartingFollowers: (count: number) => void;
  setAiCommentsEnabled: (enabled: boolean) => void;
  setApiKey: (key: string) => void;
  setVisionModel: (model: VisionModelId) => void;
}

export const DEFAULT_HANDLE = 'you';

const initialState: SettingsState = {
  handle: DEFAULT_HANDLE,
  startingFollowers: 0,
  aiCommentsEnabled: false,
  apiKey: '',
  visionModel: DEFAULT_VISION_MODEL,
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...initialState,

  // Trimmed and lowercased: a handle with spaces or capitals doesn't read as a
  // real social handle in the header.
  setHandle: (handle) => set({ handle: handle.trim().toLowerCase() || DEFAULT_HANDLE }),

  setStartingFollowers: (count) => set({ startingFollowers: Math.max(0, Math.floor(count) || 0) }),

  setAiCommentsEnabled: (aiCommentsEnabled) => set({ aiCommentsEnabled }),

  setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),

  setVisionModel: (visionModel) => set({ visionModel }),
}));

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
