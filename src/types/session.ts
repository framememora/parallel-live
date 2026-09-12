import type { GeneratedComment } from '../engines/comments/types';

export type SessionStatus = 'idle' | 'live' | 'processing' | 'ended';

export interface SessionSummary {
  peakViewers: number;
  totalHearts: number;
  /** Simulated gifts received over the session. */
  totalGifts: number;
  durationSec: number;
  finalVideoPath?: string;
  /**
   * Whether the user asked for a recording at all. Without this a missing
   * `finalVideoPath` is ambiguous, and `SessionEndScreen` would report a
   * failure for a video that was never meant to exist.
   */
  recordingRequested: boolean;
  /**
   * Why there is no video, when one was asked for. `recordingRequested` says a
   * recording was meant to exist; this says what became of it, so the end screen
   * can name the failure instead of reporting the same sentence for all three.
   *
   * - `capture-failed` — the OS ended the capture session mid-broadcast.
   * - `processing-failed` — stopping the recorder threw.
   * - `no-file` — it stopped cleanly and handed back nothing.
   */
  recordingIssue?: 'capture-failed' | 'processing-failed' | 'no-file';
  /**
   * Mic audio was requested and the permission was refused, so the clip saved
   * silent. Independent of the failures above — this one still has a video.
   */
  micDropped?: boolean;
}

export interface SessionState {
  status: SessionStatus;
  startedAtMs?: number;
  currentViewers: number;
  peakViewers: number;
  followers: number;
  totalHearts: number;
  totalGifts: number;
  comments: GeneratedComment[];
  summary?: SessionSummary;
}

export type { GeneratedComment };
