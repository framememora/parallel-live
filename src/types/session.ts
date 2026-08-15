import type { GeneratedComment } from '../engines/comments/types';

export type SessionStatus = 'idle' | 'live' | 'processing' | 'ended';

export interface SessionSummary {
  peakViewers: number;
  totalHearts: number;
  durationSec: number;
  finalVideoPath?: string;
  /**
   * Whether the user asked for a recording at all. Without this a missing
   * `finalVideoPath` is ambiguous, and `SessionEndScreen` would report a
   * failure for a video that was never meant to exist.
   */
  recordingRequested: boolean;
}

export interface SessionState {
  status: SessionStatus;
  startedAtMs?: number;
  currentViewers: number;
  peakViewers: number;
  followers: number;
  totalHearts: number;
  comments: GeneratedComment[];
  summary?: SessionSummary;
}

export type { GeneratedComment };
