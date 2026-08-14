import { type RandomSource, clamp, defaultRandom, logNormalJitter, randomInt } from '../../utils/random';

export interface HeartBurstEvent {
  id: string;
  count: number;
  /** Normalized 0-1 origin within the screen; omitted for the default bottom-right ambient anchor. */
  originX?: number;
  originY?: number;
  createdAt: number;
}

/** Gap before the next ambient heart burst: shorter with more viewers, log-normally jittered for natural variance. */
export function computeHeartGapMs(viewerCount: number, rand: RandomSource = defaultRandom): number {
  const base = clamp(4000 - viewerCount * 0.3, 500, 4000);
  return clamp(base * logNormalJitter(0.5, rand), 200, 10000);
}

export function heartBurstSize(rand: RandomSource = defaultRandom): number {
  return randomInt(3, 8, rand);
}

let heartBurstSeq = 0;
function makeBurst(count: number, now: number, originX?: number, originY?: number): HeartBurstEvent {
  heartBurstSeq += 1;
  return { id: `hb-${now}-${heartBurstSeq}`, count, originX, originY, createdAt: now };
}

export interface HeartSchedulerOptions {
  getViewerCount: () => number;
  onBurst: (event: HeartBurstEvent) => void;
  random?: RandomSource;
  now?: () => number;
  scheduleFn?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelFn?: (handle: ReturnType<typeof setTimeout>) => void;
}

/** Drives ambient (autonomous) heart bursts; tap-triggered bursts are fired directly via `triggerTap`. */
export class HeartScheduler {
  private readonly opts: Required<HeartSchedulerOptions>;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;

  constructor(options: HeartSchedulerOptions) {
    this.opts = {
      getViewerCount: options.getViewerCount,
      onBurst: options.onBurst,
      random: options.random ?? defaultRandom,
      now: options.now ?? Date.now,
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

  /** Immediate burst from a tap at normalized (x, y); bypasses the ambient schedule. */
  triggerTap(x: number, y: number): void {
    const count = randomInt(1, 3, this.opts.random);
    this.opts.onBurst(makeBurst(count, this.opts.now(), x, y));
  }

  private scheduleNext(): void {
    if (!this.running) return;
    const gap = computeHeartGapMs(this.opts.getViewerCount(), this.opts.random);
    this.timer = this.opts.scheduleFn(() => this.tick(), gap);
  }

  private tick(): void {
    if (!this.running) return;
    const count = heartBurstSize(this.opts.random);
    this.opts.onBurst(makeBurst(count, this.opts.now()));
    this.scheduleNext();
  }
}
