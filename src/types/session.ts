import type { GeneratedComment } from '../engines/comments/types';

export type SessionStatus = 'idle' | 'live' | 'processing' | 'ended';

export interface SessionSummary {
  peakViewers: number;
  totalHearts: number;
  durationSec: number;
  finalVideoPath?: string;
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
