import { GIFT_TIERS, type GiftTier } from './giftBank';
import { NAMES } from '../comments/slotPools';
import { type RandomSource, clamp, defaultRandom, logNormalJitter, randomPick, weightedPick } from '../../utils/random';

export interface GiftEvent {
  id: string;
  tier: GiftTier;
  /** Handle of the viewer who sent it, drawn from the same roster as commenters. */
  sender: string;
  createdAt: number;
}

/**
 * Gap before the next gift: shorter with more viewers, log-normally jittered the
 * same way comment and heart gaps are.
 *
 * An order of magnitude rarer than hearts on purpose (`computeHeartGapMs` tops
 * out at a 4s base, this one at 90s). Hearts are ambient texture and can pour;
 * a gift is an event, and an event that happens every few seconds stops being
 * one. Early in a session that means roughly one a minute and a half.
 */
export function computeGiftGapMs(viewerCount: number, rand: RandomSource = defaultRandom): number {
  const base = clamp(90_000 - viewerCount * 6, 25_000, 90_000);
  return clamp(base * logNormalJitter(0.45, rand), 10_000, 240_000);
}

export function pickGiftTier(rand: RandomSource = defaultRandom): GiftTier {
  return weightedPick(GIFT_TIERS, (tier) => tier.weight, rand);
}

/**
 * Senders come from the comment roster rather than a pool of their own, so a
 * gift arrives from someone the feed has plausibly been hearing from — and so
 * the sender is dealt a real portrait by `remoteAvatarUrlFor`'s roster rule
 * instead of hashing into a collision.
 */
export function pickGiftSender(rand: RandomSource = defaultRandom): string {
  return randomPick(NAMES, rand);
}

let giftSeq = 0;
function makeGift(tier: GiftTier, sender: string, now: number): GiftEvent {
  giftSeq += 1;
  return { id: `gift-${now}-${giftSeq}`, tier, sender, createdAt: now };
}

export interface GiftSchedulerOptions {
  getViewerCount: () => number;
  onGift: (event: GiftEvent) => void;
  random?: RandomSource;
  now?: () => number;
  scheduleFn?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelFn?: (handle: ReturnType<typeof setTimeout>) => void;
}

/**
 * Drives the arrival of simulated gifts. Deliberately the same shape as
 * `HeartScheduler` — including the injectable clock and scheduler — so it can be
 * unit-tested by stepping it by hand rather than by waiting on real timers.
 */
export class GiftScheduler {
  private readonly opts: Required<GiftSchedulerOptions>;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;

  constructor(options: GiftSchedulerOptions) {
    this.opts = {
      getViewerCount: options.getViewerCount,
      onGift: options.onGift,
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

  private scheduleNext(): void {
    if (!this.running) return;
    const gap = computeGiftGapMs(this.opts.getViewerCount(), this.opts.random);
    this.timer = this.opts.scheduleFn(() => this.tick(), gap);
  }

  private tick(): void {
    if (!this.running) return;
    const tier = pickGiftTier(this.opts.random);
    const sender = pickGiftSender(this.opts.random);
    this.opts.onGift(makeGift(tier, sender, this.opts.now()));
    this.scheduleNext();
  }
}
