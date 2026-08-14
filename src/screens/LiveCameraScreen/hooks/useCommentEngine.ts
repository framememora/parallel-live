import { useEffect } from 'react';
import { CommentScheduler } from '../../../engines/comments/commentScheduler';
import type { GeneratedComment } from '../../../engines/comments/types';
import type { MilestoneTracker } from '../../../engines/milestoneTracker';
import { useSessionStore } from '../../../state/sessionStore';

export function useCommentEngine(
  active: boolean,
  milestoneTracker: MilestoneTracker,
  /** Optional non-template source (the camera-aware AI batch), drained first on each emit. */
  externalSource?: () => GeneratedComment | undefined
) {
  const addComment = useSessionStore((s) => s.addComment);

  useEffect(() => {
    if (!active) return;
    const startedAtMs = useSessionStore.getState().startedAtMs ?? Date.now();
    const scheduler = new CommentScheduler({
      getViewerCount: () => useSessionStore.getState().currentViewers,
      getSessionSecond: () => (Date.now() - startedAtMs) / 1000,
      getRecentMilestone: () => milestoneTracker.get(),
      onComment: (comment) => addComment(comment),
      externalSource,
    });
    scheduler.start();
    return () => scheduler.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
