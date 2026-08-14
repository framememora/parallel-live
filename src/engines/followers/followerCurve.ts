import { type RandomSource, chance, clamp, defaultRandom, randomInt } from '../../utils/random';

export interface FollowerCurveState {
  current: number;
}

export function createFollowerCurveState(start = 0): FollowerCurveState {
  return { current: start };
}

/** Probability a follow-tick lands at all this interval, scaling with how many people are watching. */
export function computeFollowProbability(viewerCount: number): number {
  return clamp(0.15 + viewerCount / 5000, 0.15, 0.9);
}

/** Follows are monotonic (never decrease) and biased by current viewer count. */
export function computeFollowerTick(viewerCount: number, rand: RandomSource = defaultRandom): number {
  if (!chance(computeFollowProbability(viewerCount), rand)) return 0;
  return randomInt(0, 3, rand);
}

export function computeFollowerGapMs(rand: RandomSource = defaultRandom): number {
  return randomInt(4000, 12000, rand);
}

export interface FollowerCurveEngineOptions {
  getViewerCount: () => number;
  onTick: (current: number) => void;
  startFollowers?: number;
  random?: RandomSource;
  scheduleFn?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelFn?: (handle: ReturnType<typeof setTimeout>) => void;
}

export class FollowerCurveEngine {
  readonly state: FollowerCurveState;
  private readonly opts: Required<Omit<FollowerCurveEngineOptions, 'startFollowers'>>;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;

  constructor(options: FollowerCurveEngineOptions) {
    this.state = createFollowerCurveState(options.startFollowers ?? 0);
    this.opts = {
      getViewerCount: options.getViewerCount,
      onTick: options.onTick,
      random: options.random ?? defaultRandom,
      scheduleFn: options.scheduleFn ?? setTimeout,
      cancelFn: options.cancelFn ?? clearTimeout,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== undefined) {
      this.opts.cancelFn(this.timer);
      this.timer = undefined;
    }
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = this.opts.scheduleFn(() => this.tick(), computeFollowerGapMs(this.opts.random));
  }

  private tick(): void {
    if (!this.running) return;
    const delta = computeFollowerTick(this.opts.getViewerCount(), this.opts.random);
    if (delta > 0) {
      this.state.current += delta;
      this.opts.onTick(this.state.current);
    }
    this.scheduleNext();
  }
}
