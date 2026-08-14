import { COMMENT_TEMPLATES } from './commentBank';
import { renderComment } from './commentGenerator';
import type { CommentContext, CommentTemplate, GeneratedComment, Persona } from './types';
import { ALL_PERSONAS } from './types';
import { type RandomSource, clamp, chance, defaultRandom, logNormalJitter, randomInt, weightedPick } from '../../utils/random';

/** Template becomes reusable again once BOTH this many comments and this much time have passed. */
const COOLDOWN_COMMENT_COUNT = 25;
const COOLDOWN_MS = 3 * 60 * 1000;
/** How many of the most-recently-rendered exact strings we refuse to repeat verbatim. */
const RECENT_TEXT_BUFFER_SIZE = 40;
/** Window (in picks) used to bias selection away from an over-represented persona. */
const PERSONA_ROTATION_WINDOW = 15;
const MICRO_BURST_CHANCE = 0.08;

export interface CommentSchedulerState {
  commentIndex: number;
  templateLastUsedIndex: Map<string, number>;
  templateLastUsedTime: Map<string, number>;
  recentTexts: string[];
  recentPersonas: Persona[];
}

export function createSchedulerState(): CommentSchedulerState {
  return {
    commentIndex: 0,
    templateLastUsedIndex: new Map(),
    templateLastUsedTime: new Map(),
    recentTexts: [],
    recentPersonas: [],
  };
}

function isGateEligible(template: CommentTemplate, ctx: CommentContext): boolean {
  if (template.minSessionSecond !== undefined && ctx.sessionSecond < template.minSessionSecond) return false;
  if (template.maxSessionSecond !== undefined && ctx.sessionSecond > template.maxSessionSecond) return false;
  if (template.requiresMilestone && template.requiresMilestone !== 'none') {
    if (ctx.recentMilestone !== template.requiresMilestone) return false;
  }
  return true;
}

function isOffCooldown(template: CommentTemplate, state: CommentSchedulerState, now: number): boolean {
  const lastIndex = state.templateLastUsedIndex.get(template.id);
  const lastTime = state.templateLastUsedTime.get(template.id);
  if (lastIndex === undefined || lastTime === undefined) return true;
  const countOk = state.commentIndex - lastIndex >= COOLDOWN_COMMENT_COUNT;
  const timeOk = now - lastTime >= COOLDOWN_MS;
  return countOk && timeOk;
}

function personaRotationWeight(persona: Persona, state: CommentSchedulerState): number {
  const window = state.recentPersonas.slice(-PERSONA_ROTATION_WINDOW);
  const countInWindow = window.filter((p) => p === persona).length;
  return 1 / (1 + countInWindow);
}

function templateStaleness(tpl: CommentTemplate, state: CommentSchedulerState): number {
  const lastIndex = state.templateLastUsedIndex.get(tpl.id);
  if (lastIndex === undefined) return Number.POSITIVE_INFINITY;
  return state.commentIndex - lastIndex;
}

/** Picks the next template to render, given gating rules, cooldown, and persona-rotation bias. */
export function selectTemplate(
  templates: readonly CommentTemplate[],
  ctx: CommentContext,
  state: CommentSchedulerState,
  rand: RandomSource = defaultRandom
): CommentTemplate | undefined {
  const gated = templates.filter((tpl) => isGateEligible(tpl, ctx));
  if (gated.length === 0) return undefined;

  const offCooldown = gated.filter((tpl) => isOffCooldown(tpl, state, ctx.now));

  let pool: readonly CommentTemplate[];
  if (offCooldown.length > 0) {
    pool = offCooldown;
  } else {
    // Every eligible template is on cooldown (a long/high-volume session has cycled through
    // the whole gated pool). Rather than falling back to unrestricted random reuse — which
    // could replay a template just seen a few comments ago — degrade gracefully by only
    // reusing from the stalest third of the pool, so even "exhausted" sessions keep a
    // meaningful minimum gap between repeats.
    const sorted = [...gated].sort((a, b) => templateStaleness(b, state) - templateStaleness(a, state));
    pool = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
  }

  return weightedPick(pool, (tpl) => tpl.weight * personaRotationWeight(tpl.persona, state), rand);
}

function pushRingBuffer(buffer: string[], value: string, maxSize: number): void {
  buffer.push(value);
  if (buffer.length > maxSize) buffer.shift();
}

/** Selects a template, renders it (retrying a few times to avoid an exact-duplicate string), and records state. */
export function generateNextComment(
  ctx: CommentContext,
  state: CommentSchedulerState,
  templates: readonly CommentTemplate[] = COMMENT_TEMPLATES,
  rand: RandomSource = defaultRandom
): GeneratedComment | undefined {
  const template = selectTemplate(templates, ctx, state, rand);
  if (!template) return undefined;

  let comment: GeneratedComment | undefined;
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = renderComment(template, ctx, rand);
    if (!state.recentTexts.includes(candidate.text)) {
      comment = candidate;
      break;
    }
    comment = candidate; // fall back to last attempt if all collide
  }
  if (!comment) return undefined;

  state.commentIndex += 1;
  state.templateLastUsedIndex.set(template.id, state.commentIndex);
  state.templateLastUsedTime.set(template.id, ctx.now);
  pushRingBuffer(state.recentTexts, comment.text, RECENT_TEXT_BUFFER_SIZE);
  state.recentPersonas.push(template.persona);
  if (state.recentPersonas.length > PERSONA_ROTATION_WINDOW * 2) {
    state.recentPersonas = state.recentPersonas.slice(-PERSONA_ROTATION_WINDOW);
  }

  return comment;
}

/**
 * Gap before the next comment: shorter with more viewers, jittered log-normally
 * so gaps cluster around a mean but naturally vary (quick back-to-back moments,
 * longer lulls) instead of ticking like a metronome.
 */
export function computeCommentGapMs(viewerCount: number, rand: RandomSource = defaultRandom): number {
  const baseGapMs = clamp(6000 - viewerCount * 0.4, 900, 6000);
  return clamp(baseGapMs * logNormalJitter(0.6, rand), 250, 20000);
}

export function shouldMicroBurst(rand: RandomSource = defaultRandom): boolean {
  return chance(MICRO_BURST_CHANCE, rand);
}

export function microBurstSize(rand: RandomSource = defaultRandom): number {
  return randomInt(2, 4, rand);
}

export interface CommentSchedulerOptions {
  getViewerCount: () => number;
  getSessionSecond: () => number;
  getRecentMilestone: () => CommentContext['recentMilestone'];
  onComment: (comment: GeneratedComment) => void;
  templates?: readonly CommentTemplate[];
  random?: RandomSource;
  now?: () => number;
  scheduleFn?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelFn?: (handle: ReturnType<typeof setTimeout>) => void;
  /**
   * An extra, non-template source of comments — currently the camera-aware AI
   * batch. Consulted first on each emit; returning `undefined` falls through to
   * the template bank as normal.
   *
   * **Must be synchronous and non-blocking.** Anything async belongs in a
   * buffer the source drains, so `tick()` stays synchronous and the injectable
   * `scheduleFn` keeps working for deterministic tests.
   *
   * Routing external comments through here rather than writing them straight to
   * the store is what keeps the anti-repetition state honest: they consume a
   * `commentIndex` and land in `recentTexts`, so a template can't immediately
   * echo one.
   */
  externalSource?: () => GeneratedComment | undefined;
}

/** Drives the comment feed in real time via a self-rescheduling timer (not setInterval, so each gap is freshly computed from current state). */
export class CommentScheduler {
  private readonly opts: Required<Omit<CommentSchedulerOptions, 'templates' | 'externalSource'>> & {
    templates: readonly CommentTemplate[];
    externalSource: CommentSchedulerOptions['externalSource'];
  };
  private readonly state = createSchedulerState();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;

  constructor(options: CommentSchedulerOptions) {
    this.opts = {
      templates: options.templates ?? COMMENT_TEMPLATES,
      random: options.random ?? defaultRandom,
      now: options.now ?? Date.now,
      scheduleFn: options.scheduleFn ?? setTimeout,
      cancelFn: options.cancelFn ?? clearTimeout,
      getViewerCount: options.getViewerCount,
      getSessionSecond: options.getSessionSecond,
      getRecentMilestone: options.getRecentMilestone,
      onComment: options.onComment,
      externalSource: options.externalSource,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext(false);
  }

  stop(): void {
    this.running = false;
    if (this.timer !== undefined) {
      this.opts.cancelFn(this.timer);
      this.timer = undefined;
    }
  }

  private buildContext(): CommentContext {
    return {
      sessionSecond: this.opts.getSessionSecond(),
      viewerCount: this.opts.getViewerCount(),
      recentMilestone: this.opts.getRecentMilestone(),
      now: this.opts.now(),
    };
  }

  private scheduleNext(afterBurstPause: boolean): void {
    if (!this.running) return;
    const { random } = this.opts;
    let gap = computeCommentGapMs(this.opts.getViewerCount(), random);
    if (afterBurstPause) gap *= randomInt(18, 25, random) / 10; // longer-than-average pause after a burst

    this.timer = this.opts.scheduleFn(() => this.tick(), gap);
  }

  private tick(): void {
    if (!this.running) return;
    const isBurst = shouldMicroBurst(this.opts.random);
    const count = isBurst ? microBurstSize(this.opts.random) : 1;

    this.emitOne();
    if (isBurst) {
      this.emitBurstRemainder(count - 1);
    } else {
      this.scheduleNext(false);
    }
  }

  private emitOne(): void {
    const external = this.opts.externalSource?.();
    if (external) {
      // Record it in the same anti-repetition state a template pick would
      // consume, so the two sources can't talk over each other.
      this.state.commentIndex += 1;
      pushRingBuffer(this.state.recentTexts, external.text, RECENT_TEXT_BUFFER_SIZE);
      this.opts.onComment(external);
      return;
    }

    const comment = generateNextComment(this.buildContext(), this.state, this.opts.templates, this.opts.random);
    if (comment) this.opts.onComment(comment);
  }

  private emitBurstRemainder(remaining: number): void {
    if (!this.running) return;
    if (remaining <= 0) {
      this.scheduleNext(true);
      return;
    }
    const microGap = randomInt(150, 400, this.opts.random);
    this.timer = this.opts.scheduleFn(() => {
      this.emitOne();
      this.emitBurstRemainder(remaining - 1);
    }, microGap);
  }
}

export { ALL_PERSONAS };
