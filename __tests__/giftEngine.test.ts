import { GIFT_TIERS } from '../src/engines/gifts/giftBank';
import {
  GiftScheduler,
  computeGiftGapMs,
  pickGiftSender,
  pickGiftTier,
} from '../src/engines/gifts/giftScheduler';
import { NAMES } from '../src/engines/comments/slotPools';
import { createSeededRandom } from '../src/utils/random';

describe('computeGiftGapMs', () => {
  it('stays inside its clamp across the whole viewer range', () => {
    const rand = createSeededRandom(11);
    for (const viewers of [0, 1, 50, 500, 5_000, 50_000, 1_000_000]) {
      for (let i = 0; i < 50; i++) {
        const gap = computeGiftGapMs(viewers, rand);
        expect(Number.isFinite(gap)).toBe(true);
        expect(gap).toBeGreaterThanOrEqual(10_000);
        expect(gap).toBeLessThanOrEqual(240_000);
      }
    }
  });

  it('arrives faster with a bigger audience', () => {
    const median = (viewers: number) => {
      const rand = createSeededRandom(12);
      const gaps = Array.from({ length: 400 }, () => computeGiftGapMs(viewers, rand)).sort((a, b) => a - b);
      return gaps[Math.floor(gaps.length / 2)];
    };

    expect(median(5_000)).toBeLessThan(median(10));
  });

  // A gift landing every few seconds stops being an event. This is the property
  // that keeps it rare, and it is invisible in the UI until it's wrong.
  it('is an order of magnitude rarer than a heart burst early on', () => {
    const rand = createSeededRandom(13);
    const gaps = Array.from({ length: 200 }, () => computeGiftGapMs(20, rand));
    const mean = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    expect(mean).toBeGreaterThan(40_000);
  });
});

describe('pickGiftTier', () => {
  it('respects the weighting: roses are common, rockets are not', () => {
    const rand = createSeededRandom(14);
    const counts = new Map<string, number>();
    const runs = 4000;
    for (let i = 0; i < runs; i++) {
      const tier = pickGiftTier(rand);
      counts.set(tier.id, (counts.get(tier.id) ?? 0) + 1);
    }

    const rose = counts.get('rose') ?? 0;
    const rocket = counts.get('rocket') ?? 0;
    expect(rose).toBeGreaterThan(rocket * 10);
    // Every tier should still be reachable, or a weight has been zeroed by accident.
    for (const tier of GIFT_TIERS) {
      expect(counts.get(tier.id) ?? 0).toBeGreaterThan(0);
    }
  });

  it('keeps the headline tiers rare enough to stay events', () => {
    const rand = createSeededRandom(15);
    const runs = 4000;
    let headline = 0;
    for (let i = 0; i < runs; i++) {
      if (pickGiftTier(rand).headline) headline += 1;
    }
    expect(headline / runs).toBeLessThan(0.15);
  });
});

describe('pickGiftSender', () => {
  it('only ever names someone from the comment roster', () => {
    const rand = createSeededRandom(16);
    for (let i = 0; i < 200; i++) {
      expect(NAMES).toContain(pickGiftSender(rand));
    }
  });
});

describe('GiftScheduler', () => {
  /** Drives the scheduler by hand: each `run()` fires whatever it queued last. */
  function harness(viewerCount = 500) {
    const pending: Array<() => void> = [];
    const events: Array<{ id: string; tierId: string; sender: string; createdAt: number }> = [];
    let clock = 1_000;

    const scheduler = new GiftScheduler({
      getViewerCount: () => viewerCount,
      onGift: (event) =>
        events.push({
          id: event.id,
          tierId: event.tier.id,
          sender: event.sender,
          createdAt: event.createdAt,
        }),
      random: createSeededRandom(17),
      now: () => (clock += 1000),
      scheduleFn: (cb) => {
        pending.push(cb);
        return pending.length as unknown as ReturnType<typeof setTimeout>;
      },
      cancelFn: () => undefined,
    });

    return {
      scheduler,
      events,
      run() {
        const next = pending.pop();
        pending.length = 0;
        next?.();
      },
    };
  }

  it('emits a gift per tick and keeps scheduling', () => {
    const { scheduler, events, run } = harness();
    scheduler.start();

    for (let i = 0; i < 5; i++) run();

    expect(events).toHaveLength(5);
    for (const event of events) {
      expect(GIFT_TIERS.map((t) => t.id)).toContain(event.tierId);
      expect(NAMES).toContain(event.sender);
    }
  });

  it('gives every gift a distinct id, so feed rows never collide', () => {
    const { scheduler, events, run } = harness();
    scheduler.start();
    for (let i = 0; i < 30; i++) run();

    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it('emits nothing after stop()', () => {
    const { scheduler, events, run } = harness();
    scheduler.start();
    run();
    expect(events).toHaveLength(1);

    scheduler.stop();
    run();
    expect(events).toHaveLength(1);
  });

  it('start() twice does not double the stream', () => {
    const { scheduler, events, run } = harness();
    scheduler.start();
    scheduler.start();
    run();
    expect(events).toHaveLength(1);
  });
});
