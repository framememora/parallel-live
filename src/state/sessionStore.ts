import { create } from 'zustand';
import type { GeneratedComment, SessionState, SessionStatus, SessionSummary } from '../types/session';

/** How many comment bubbles the feed keeps mounted at once (matches TikTok Live's visual density). */
const VISIBLE_COMMENT_CAP = 8;

interface SessionStore extends SessionState {
  startSession: () => void;
  addComment: (comment: GeneratedComment) => void;
  updateViewers: (current: number, peak: number) => void;
  updateFollowers: (current: number) => void;
  addHearts: (count: number) => void;
  setStatus: (status: SessionStatus) => void;
  endSession: (summary: SessionSummary) => void;
  reset: () => void;
}

const initialState: SessionState = {
  status: 'idle',
  currentViewers: 0,
  peakViewers: 0,
  followers: 0,
  totalHearts: 0,
  comments: [],
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  startSession: () =>
    set({
      ...initialState,
      status: 'live',
      startedAtMs: Date.now(),
    }),

  addComment: (comment) =>
    set((state) => ({
      comments: [...state.comments, comment].slice(-VISIBLE_COMMENT_CAP),
    })),

  updateViewers: (current, peak) => set({ currentViewers: current, peakViewers: peak }),

  updateFollowers: (current) => set({ followers: current }),

  addHearts: (count) => set((state) => ({ totalHearts: state.totalHearts + count })),

  setStatus: (status) => set({ status }),

  endSession: (summary) => set({ status: 'ended', summary }),

  reset: () => set(initialState),
}));
