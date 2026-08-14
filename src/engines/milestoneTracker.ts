import type { Milestone } from './comments/types';

/**
 * Short-lived flag other engines can raise (a viewer spike just happened, a big
 * heart burst just landed) so the comment scheduler can react with milestone-gated
 * templates ("whoa did we just get a bunch of people at once"). Auto-expires so a
 * one-off event doesn't keep gating comments indefinitely.
 */
export interface MilestoneTracker {
  trigger: (milestone: Milestone, durationMs: number) => void;
  get: () => Milestone;
}

export function createMilestoneTracker(): MilestoneTracker {
  let current: Milestone = 'none';
  let expiresAtMs = 0;

  return {
    trigger(milestone, durationMs) {
      current = milestone;
      expiresAtMs = Date.now() + durationMs;
    },
    get() {
      return Date.now() > expiresAtMs ? 'none' : current;
    },
  };
}
