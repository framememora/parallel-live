import { COMMENT_TEMPLATES } from '../src/engines/comments/commentBank';
import { fillTemplate } from '../src/engines/comments/commentGenerator';
import {
  computeCommentGapMs,
  createSchedulerState,
  generateNextComment,
  microBurstSize,
  selectTemplate,
  shouldMicroBurst,
} from '../src/engines/comments/commentScheduler';
import type { CommentContext } from '../src/engines/comments/types';
import { ALL_PERSONAS } from '../src/engines/comments/types';
import { createSeededRandom } from '../src/utils/random';

function baseContext(overrides: Partial<CommentContext> = {}): CommentContext {
  return {
    sessionSecond: 60,
    viewerCount: 500,
    recentMilestone: 'none',
    now: Date.now(),
    ...overrides,
  };
}

describe('fillTemplate', () => {
  it('replaces every placeholder, leaving no literal braces', () => {
    const rand = createSeededRandom(1);
    const ctx = baseContext();
    for (const tpl of COMMENT_TEMPLATES) {
      for (let i = 0; i < 5; i++) {
        const text = fillTemplate(tpl, ctx, rand);
        expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }
  });

  it('renders the {count} slot using the viewer count', () => {
    const rand = createSeededRandom(2);
    const countTemplate = COMMENT_TEMPLATES.find((tpl) => tpl.slots.includes('count'));
    expect(countTemplate).toBeDefined();
    const text = fillTemplate(countTemplate!, baseContext({ viewerCount: 12000 }), rand);
    expect(text).toMatch(/12k/);
  });
});

describe('selectTemplate gating', () => {
  it('excludes templates outside their session-second window', () => {
    const rand = createSeededRandom(3);
    const state = createSchedulerState();
    for (let i = 0; i < 200; i++) {
      const tpl = selectTemplate(COMMENT_TEMPLATES, baseContext({ sessionSecond: 5 }), state, rand);
      expect(tpl?.minSessionSecond === undefined || tpl.minSessionSecond <= 5).toBe(true);
    }
  });

  it('only selects milestone-gated templates when that milestone is active', () => {
    const rand = createSeededRandom(4);
    const state = createSchedulerState();
    for (let i = 0; i < 200; i++) {
      const tpl = selectTemplate(COMMENT_TEMPLATES, baseContext({ recentMilestone: 'none' }), state, rand);
      expect(tpl?.requiresMilestone === undefined || tpl.requiresMilestone === 'none').toBe(true);
    }
  });
});

describe('generateNextComment anti-repetition', () => {
  it('does not reuse the same template within the cooldown window', () => {
    const rand = createSeededRandom(5);
    const state = createSchedulerState();
    const usedAt: number[] = [];
    const templateOfComment: string[] = [];

    for (let i = 0; i < 300; i++) {
      const comment = generateNextComment(baseContext({ now: i * 1000 }), state, COMMENT_TEMPLATES, rand);
      if (!comment) continue;
      templateOfComment.push(comment.templateId);
    }

    // For every pair of same-template picks, they must be >=25 apart in index.
    const lastIndexByTemplate = new Map<string, number>();
    templateOfComment.forEach((templateId, index) => {
      const last = lastIndexByTemplate.get(templateId);
      if (last !== undefined) {
        expect(index - last).toBeGreaterThanOrEqual(25);
      }
      lastIndexByTemplate.set(templateId, index);
    });
    expect(usedAt.length).toBe(0); // sanity: unused var guard
  });

  it('keeps persona distribution reasonably balanced over many picks', () => {
    const rand = createSeededRandom(6);
    const state = createSchedulerState();
    const counts: Record<string, number> = Object.fromEntries(ALL_PERSONAS.map((p) => [p, 0]));

    const total = 400;
    for (let i = 0; i < total; i++) {
      const comment = generateNextComment(baseContext({ now: i * 1000 }), state, COMMENT_TEMPLATES, rand);
      if (comment) counts[comment.persona] += 1;
    }

    for (const persona of ALL_PERSONAS) {
      const share = counts[persona] / total;
      expect(share).toBeGreaterThan(0.03);
      expect(share).toBeLessThan(0.3);
    }
  });
});

describe('computeCommentGapMs', () => {
  it('stays within bounds and trends shorter as viewer count rises', () => {
    const rand = createSeededRandom(7);
    const lowViewerGaps: number[] = [];
    const highViewerGaps: number[] = [];
    for (let i = 0; i < 500; i++) {
      const gap = computeCommentGapMs(10, rand);
      expect(gap).toBeGreaterThanOrEqual(250);
      expect(gap).toBeLessThanOrEqual(20000);
      lowViewerGaps.push(gap);
    }
    for (let i = 0; i < 500; i++) {
      const gap = computeCommentGapMs(10000, rand);
      expect(gap).toBeGreaterThanOrEqual(250);
      expect(gap).toBeLessThanOrEqual(20000);
      highViewerGaps.push(gap);
    }
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    expect(avg(highViewerGaps)).toBeLessThan(avg(lowViewerGaps));
  });
});

describe('micro-burst helpers', () => {
  it('shouldMicroBurst fires at roughly the configured rate', () => {
    const rand = createSeededRandom(8);
    let fired = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      if (shouldMicroBurst(rand)) fired += 1;
    }
    const rate = fired / trials;
    expect(rate).toBeGreaterThan(0.04);
    expect(rate).toBeLessThan(0.14);
  });

  it('microBurstSize always returns 2-4', () => {
    const rand = createSeededRandom(9);
    for (let i = 0; i < 500; i++) {
      const size = microBurstSize(rand);
      expect(size).toBeGreaterThanOrEqual(2);
      expect(size).toBeLessThanOrEqual(4);
    }
  });
});
