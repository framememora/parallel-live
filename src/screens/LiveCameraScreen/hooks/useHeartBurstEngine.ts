import { type RefObject, useEffect, useRef } from 'react';
import { HeartScheduler } from '../../../engines/hearts/heartScheduler';
import type { MilestoneTracker } from '../../../engines/milestoneTracker';
import { useSessionStore } from '../../../state/sessionStore';
import type { HeartBurstLayerHandle } from '../components/HeartBurstLayer';

const HEART_BURST_MILESTONE_MS = 6000;
const BIG_BURST_THRESHOLD = 6;

export function useHeartBurstEngine(
  active: boolean,
  layerRef: RefObject<HeartBurstLayerHandle | null>,
  milestoneTracker: MilestoneTracker
) {
  const addHearts = useSessionStore((s) => s.addHearts);
  const schedulerRef = useRef<HeartScheduler | null>(null);

  useEffect(() => {
    if (!active) return;
    const scheduler = new HeartScheduler({
      getViewerCount: () => useSessionStore.getState().currentViewers,
      onBurst: (event) => {
        addHearts(event.count);
        if (event.count >= BIG_BURST_THRESHOLD) {
          milestoneTracker.trigger('heartBurst', HEART_BURST_MILESTONE_MS);
        }
        layerRef.current?.spawnBurst(event.count, event.originX, event.originY);
      },
    });
    schedulerRef.current = scheduler;
    scheduler.start();
    return () => {
      scheduler.stop();
      schedulerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return {
    triggerTap: (x: number, y: number) => schedulerRef.current?.triggerTap(x, y),
  };
}
