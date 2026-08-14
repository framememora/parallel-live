import { computeFollowerGapMs, computeFollowerTick, computeFollowProbability } from '../src/engines/followers/followerCurve';
import { computeHeartGapMs, heartBurstSize } from '../src/engines/hearts/heartScheduler';
import {
  computeTargetViewers,
  createViewerCurveConfig,
  createViewerCurveState,
  isSpikeActive,
  stepViewerCurve,
} from '../src/engines/viewers/viewerCurve';
import { createSeededRandom } from '../src/utils/random';

describe('viewerCurve', () => {
  it('ramps toward the ceiling, tracks peak, and never goes negative or NaN', () => {
    const rand = createSeededRandom(101);
    const config = createViewerCurveConfig(rand);
    const state = createViewerCurveState(config);

    let peakSeen = 0;
    for (let sec = 0; sec < 400; sec += 0.7) {
      stepViewerCurve(state, sec, rand);
      expect(Number.isFinite(state.current)).toBe(true);
      expect(state.current).toBeGreaterThanOrEqual(1);
      expect(state.peak).toBeGreaterThanOrEqual(peakSeen);
      peakSeen = state.peak;
    }

    // After the ramp window, the value should be in the neighborhood of the ceiling
    // (allowing for oscillation/spikes), not stuck near the tiny starting value.
    expect(state.current).toBeGreaterThan(config.startViewers);
  });

  it('computeTargetViewers stays positive across the ramp', () => {
    const rand = createSeededRandom(102);
    const config = createViewerCurveConfig(rand);
    const state = createViewerCurveState(config);
    for (let sec = 0; sec < 200; sec += 5) {
      expect(computeTargetViewers(state, sec)).toBeGreaterThan(0);
    }
  });

  it('spike state expires after its decay window', () => {
    const rand = createSeededRandom(103);
    const config = createViewerCurveConfig(rand);
    const state = createViewerCurveState(config);
    state.activeSpike = { startedAtSec: 50, magnitude: 100, decaySec: 10 };
    expect(isSpikeActive(state, 55)).toBe(true);
    expect(isSpikeActive(state, 61)).toBe(false);
  });
});

describe('followerCurve', () => {
  it('follow probability increases with viewer count and stays within [0,1]', () => {
    expect(computeFollowProbability(0)).toBeCloseTo(0.15, 5);
    expect(computeFollowProbability(100000)).toBeLessThanOrEqual(0.9);
    expect(computeFollowProbability(2000)).toBeGreaterThan(computeFollowProbability(0));
  });

  it('computeFollowerTick never returns a negative delta', () => {
    const rand = createSeededRandom(104);
    for (let i = 0; i < 500; i++) {
      expect(computeFollowerTick(500, rand)).toBeGreaterThanOrEqual(0);
    }
  });

  it('computeFollowerGapMs stays within the documented 4-12s bounds', () => {
    const rand = createSeededRandom(105);
    for (let i = 0; i < 500; i++) {
      const gap = computeFollowerGapMs(rand);
      expect(gap).toBeGreaterThanOrEqual(4000);
      expect(gap).toBeLessThanOrEqual(12000);
    }
  });
});

describe('heartScheduler', () => {
  it('computeHeartGapMs stays within bounds and trends shorter with more viewers', () => {
    const rand = createSeededRandom(106);
    const lowGaps: number[] = [];
    const highGaps: number[] = [];
    for (let i = 0; i < 500; i++) {
      const gap = computeHeartGapMs(5, rand);
      expect(gap).toBeGreaterThanOrEqual(200);
      expect(gap).toBeLessThanOrEqual(10000);
      lowGaps.push(gap);
    }
    for (let i = 0; i < 500; i++) {
      const gap = computeHeartGapMs(8000, rand);
      expect(gap).toBeGreaterThanOrEqual(200);
      expect(gap).toBeLessThanOrEqual(10000);
      highGaps.push(gap);
    }
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    expect(avg(highGaps)).toBeLessThan(avg(lowGaps));
  });

  it('heartBurstSize always returns 3-8', () => {
    const rand = createSeededRandom(107);
    for (let i = 0; i < 500; i++) {
      const size = heartBurstSize(rand);
      expect(size).toBeGreaterThanOrEqual(3);
      expect(size).toBeLessThanOrEqual(8);
    }
  });
});
