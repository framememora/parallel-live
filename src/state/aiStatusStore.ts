import { create } from 'zustand';
import type { VisionFailure } from '../services/ai/visionErrors';

/**
 * What the camera-aware comment engine did last time it ran.
 *
 * `stopped` is the state this store exists for: the engine gave up because
 * retrying could not help — no key, a rejected key, a model refusing the
 * request. Without somewhere to put that, turning the feature on with an empty
 * key looked exactly like it working, since the template bank keeps the feed
 * running either way.
 */
export type AiCommentStatus =
  | { state: 'idle' }
  | { state: 'running' }
  /** At least one batch of comments came back. */
  | { state: 'ok' }
  | { state: 'stopped'; reason: VisionFailure; at: number };

interface AiStatusStore {
  status: AiCommentStatus;
  markRunning: () => void;
  markOk: () => void;
  markStopped: (reason: VisionFailure) => void;
}

/**
 * Deliberately **not** persisted, and deliberately not a field on
 * `settingsStore`: this is an observation about the last run, not a setting, and
 * a stale "your key was rejected" surviving a restart would outlive the fact.
 * Keeping it out also leaves `settingsStore`'s `partialize` exactly the list
 * `settingsPersistence.test.ts` asserts.
 */
export const useAiStatusStore = create<AiStatusStore>((set) => ({
  status: { state: 'idle' },
  markRunning: () => set({ status: { state: 'running' } }),
  markOk: () => set({ status: { state: 'ok' } }),
  markStopped: (reason) => set({ status: { state: 'stopped', reason, at: Date.now() } }),
}));
