import { type RandomSource, clamp, defaultRandom, randomInt } from '../../utils/random';

export interface ViewerCurveConfig {
  startViewers: number;
  sessionCeiling: number;
  rampDurationSec: number;
  oscillationPeriodSec: number;
  /** Oscillation amplitude as a fraction of the session ceiling. */
  oscillationAmplitudeRatio: number;
}

interface ActiveSpike {
  startedAtSec: number;
  magnitude: number;
  decaySec: number;
}

export interface ViewerCurveState {
  config: ViewerCurveConfig;
  current: number;
  peak: number;
  activeSpike?: ActiveSpike;
}

const SPIKE_CHANCE_PER_TICK = 0.01;

export function createViewerCurveConfig(rand: RandomSource = defaultRandom): ViewerCurveConfig {
  const startViewers = randomInt(8, 40, rand);
  const sessionCeiling = randomInt(200, 3000, rand);
  return {
    startViewers,
    sessionCeiling,
    rampDurationSec: randomInt(60, 90, rand),
    oscillationPeriodSec: randomInt(20, 40, rand),
    oscillationAmplitudeRatio: 0.02 + rand() * 0.03,
  };
}

export function createViewerCurveState(config: ViewerCurveConfig = createViewerCurveConfig()): ViewerCurveState {
  return { config, current: config.startViewers, peak: config.startViewers };
}

function easeOutCubic(x: number): number {
  const t = clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

/** Smooth ramp toward the session ceiling, then a gentle oscillating plateau plus any active spike bump. */
export function computeTargetViewers(state: ViewerCurveState, elapsedSec: number): number {
  const { config } = state;
  const rampProgress = easeOutCubic(elapsedSec / config.rampDurationSec);
  const rampTarget = config.startViewers + (config.sessionCeiling - config.startViewers) * rampProgress;

  const oscillation =
    rampProgress > 0.6
      ? Math.sin((elapsedSec / config.oscillationPeriodSec) * 2 * Math.PI) *
        config.sessionCeiling *
        config.oscillationAmplitudeRatio *
        rampProgress
      : 0;

  let spikeBump = 0;
  if (state.activeSpike) {
    const spikeElapsed = elapsedSec - state.activeSpike.startedAtSec;
    if (spikeElapsed >= 0 && spikeElapsed < state.activeSpike.decaySec) {
      spikeBump = state.activeSpike.magnitude * (1 - spikeElapsed / state.activeSpike.decaySec);
    }
  }

  return Math.max(1, rampTarget + oscillation + spikeBump);
}

export function isSpikeActive(state: ViewerCurveState, elapsedSec: number): boolean {
  if (!state.activeSpike) return false;
  const spikeElapsed = elapsedSec - state.activeSpike.startedAtSec;
  return spikeElapsed >= 0 && spikeElapsed < state.activeSpike.decaySec;
}

export function maybeTriggerSpike(state: ViewerCurveState, elapsedSec: number, rand: RandomSource = defaultRandom): void {
  if (isSpikeActive(state, elapsedSec)) return;
  if (elapsedSec < 15) return; // no spikes before the audience has had a moment to build
  if (rand() < SPIKE_CHANCE_PER_TICK) {
    state.activeSpike = {
      startedAtSec: elapsedSec,
      magnitude: state.config.sessionCeiling * (0.1 + rand() * 0.25),
      decaySec: randomInt(8, 20, rand),
    };
  }
}

/** Advances `current` toward the target with a damped-spring step plus small organic noise — never snaps. */
export function stepViewerCurve(
  state: ViewerCurveState,
  elapsedSec: number,
  rand: RandomSource = defaultRandom
): ViewerCurveState {
  maybeTriggerSpike(state, elapsedSec, rand);
  const target = computeTargetViewers(state, elapsedSec);
  const noise = (rand() - 0.5) * 4;
  const next = state.current + (target - state.current) * 0.15 + noise;
  state.current = Math.max(1, Math.round(next));
  state.peak = Math.max(state.peak, state.current);
  return state;
}

export function computeViewerTickGapMs(rand: RandomSource = defaultRandom): number {
  return randomInt(500, 900, rand);
}

export interface ViewerCurveEngineOptions {
  onTick: (state: { current: number; peak: number; spikeActive: boolean }) => void;
  config?: ViewerCurveConfig;
  random?: RandomSource;
  now?: () => number;
  scheduleFn?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelFn?: (handle: ReturnType<typeof setTimeout>) => void;
}

/** Self-scheduling driver that ticks the viewer curve at a ~500-900ms cadence and reports state via callback. */
export class ViewerCurveEngine {
  readonly state: ViewerCurveState;
  private readonly opts: Required<Omit<ViewerCurveEngineOptions, 'config'>>;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private startedAtMs = 0;

  constructor(options: ViewerCurveEngineOptions) {
    const random = options.random ?? defaultRandom;
    this.state = createViewerCurveState(options.config ?? createViewerCurveConfig(random));
    this.opts = {
      onTick: options.onTick,
      random,
      now: options.now ?? Date.now,
      scheduleFn: options.scheduleFn ?? setTimeout,
      cancelFn: options.cancelFn ?? clearTimeout,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAtMs = this.opts.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== undefined) {
      this.opts.cancelFn(this.timer);
      this.timer = undefined;
    }
  }

  private elapsedSec(): number {
    return (this.opts.now() - this.startedAtMs) / 1000;
  }

  private tick(): void {
    if (!this.running) return;
    const elapsedSec = this.elapsedSec();
    stepViewerCurve(this.state, elapsedSec, this.opts.random);
    this.opts.onTick({
      current: this.state.current,
      peak: this.state.peak,
      spikeActive: isSpikeActive(this.state, elapsedSec),
    });
    this.timer = this.opts.scheduleFn(() => this.tick(), computeViewerTickGapMs(this.opts.random));
  }
}
