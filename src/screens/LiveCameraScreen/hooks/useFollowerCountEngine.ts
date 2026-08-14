import { useEffect } from 'react';
import { FollowerCurveEngine } from '../../../engines/followers/followerCurve';
import { useSessionStore } from '../../../state/sessionStore';
import { useSettingsStore } from '../../../state/settingsStore';

export function useFollowerCountEngine(active: boolean) {
  const updateFollowers = useSessionStore((s) => s.updateFollowers);

  useEffect(() => {
    if (!active) return;
    const start = useSettingsStore.getState().startingFollowers;
    // Publish the starting value immediately — the engine only reports on a
    // tick that actually lands, so the header would otherwise read 0 for
    // several seconds after going live.
    updateFollowers(start);
    const engine = new FollowerCurveEngine({
      getViewerCount: () => useSessionStore.getState().currentViewers,
      onTick: (current) => updateFollowers(current),
      startFollowers: start,
    });
    engine.start();
    return () => engine.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
