/**
 * What went wrong with a vision request, and what to do about it.
 *
 * Kept in its own module rather than inside `CommentVisionService` so the retry
 * policy is testable without dragging in the settings store and the native
 * secure-store module behind it.
 *
 * The distinction that matters is permanent vs transient. Before this existed,
 * `useAiCommentEngine` caught everything with one `.catch(() => undefined)`, so
 * a missing key, a rejected key and a dropped packet were indistinguishable —
 * and all three retried on the same fixed 20s timer forever. A key that is
 * absent or refused will still be absent or refused in 20 seconds; retrying it
 * 180 times an hour is pure noise.
 */
export type VisionFailure =
  /** No key in Settings. Permanent until the user types one. */
  | 'missing-key'
  /** The key was rejected (401/403). Permanent until the user changes it. */
  | 'auth'
  /** The request itself was refused (4xx) — most likely this model rejecting `output_config`. */
  | 'request'
  /** A blip: no connection, a rate limit, a 5xx, a snapshot that failed. Worth retrying. */
  | 'transient';

export class MissingApiKeyError extends Error {
  constructor() {
    super('No Anthropic API key configured');
    this.name = 'MissingApiKeyError';
  }
}

/** Carries the status code so failures can be classified rather than string-matched. */
export class VisionRequestError extends Error {
  constructor(
    readonly status: number,
    readonly modelId: string,
    body: string
  ) {
    // Surfacing the model matters: a 400 is most likely an `output_config`
    // field the selected model doesn't accept, and the status alone won't say
    // which model was in play.
    super(`Claude API ${status} (${modelId}): ${body}`);
    this.name = 'VisionRequestError';
  }
}

export function classifyVisionError(error: unknown): VisionFailure {
  if (error instanceof MissingApiKeyError) return 'missing-key';
  if (error instanceof VisionRequestError) {
    if (error.status === 401 || error.status === 403) return 'auth';
    // A rate limit or a server fault is the API having a moment, not the
    // request being wrong — both are worth coming back to.
    if (error.status === 429 || error.status >= 500) return 'transient';
    if (error.status >= 400) return 'request';
  }
  // Everything else reaches here: a network failure, an aborted request, a
  // snapshot that threw. Assume transient — the cost of being wrong is one
  // extra attempt on a backed-off timer.
  return 'transient';
}

/** Base interval between captures, and the floor every backoff starts from. */
export const CAPTURE_INTERVAL_MS = 20_000;
const MAX_BACKOFF_MS = 160_000;

/**
 * Delay before retrying after `attempt` consecutive transient failures.
 *
 * Doubles from the normal capture interval and caps at ~2.5 minutes. The cap is
 * the point: a session left running with no connection should keep costing one
 * cheap failed attempt every few minutes, not one every twenty seconds, and it
 * should recover on its own the moment the network returns rather than needing
 * the feature toggled off and on.
 */
export function nextBackoffMs(attempt: number): number {
  if (attempt <= 1) return CAPTURE_INTERVAL_MS;
  return Math.min(CAPTURE_INTERVAL_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}
