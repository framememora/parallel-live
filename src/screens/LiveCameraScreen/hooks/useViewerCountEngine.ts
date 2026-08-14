import { useEffect } from 'react';
import { ViewerCurveEngine } from '../../../engines/viewers/viewerCurve';
import type { MilestoneTracker } from '../../../engines/milestoneTracker';
import { useSessionStore } from '../../../state/sessionStore';

const VIEWER_SPIKE_MILESTONE_MS = 8000;

export function useViewerCountEngine(active: boolean, milestoneTracker: MilestoneTracker) {
  const updateViewers = useSessionStore((s) => s.updateViewers);

  useEffect(() => {
    if (!active) return;
    const engine = new ViewerCurveEngine({
      onTick: ({ current, peak, spikeActive }) => {
        updateViewers(current, peak);
        if (spikeActive) milestoneTracker.trigger('viewerSpike', VIEWER_SPIKE_MILESTONE_MS);
      },
    });
    engine.start();
    return () => engine.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
