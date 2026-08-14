import { ALL_EMOJI, COMPLIMENTS, NAMES, QUESTIONS, TIME_PHRASES } from './slotPools';
import type { CommentContext, CommentTemplate, GeneratedComment, SlotKind } from './types';
import { type RandomSource, defaultRandom, randomInt, randomPick } from '../../utils/random';
import { formatCompactNumber } from '../../utils/format';

function pickSlotValue(slot: SlotKind, ctx: CommentContext, rand: RandomSource): string {
  switch (slot) {
    case 'name':
      return randomPick(NAMES, rand);
    case 'emoji':
      return randomPick(ALL_EMOJI, rand);
    case 'compliment':
      return randomPick(COMPLIMENTS, rand);
    case 'question':
      return randomPick(QUESTIONS, rand);
    case 'timePhrase':
      return randomPick(TIME_PHRASES, rand);
    case 'count':
      return formatCompactNumber(ctx.viewerCount);
    default:
      return '';
  }
}

/**
 * Fills every `{slotKind}` placeholder in a template's text, left to right,
 * consuming `template.slots` in order (a template with `{emoji}` twice lists
 * 'emoji' twice in `slots` so each occurrence can render a different emoji).
 */
export function fillTemplate(
  template: CommentTemplate,
  ctx: CommentContext,
  rand: RandomSource = defaultRandom
): string {
  let slotIndex = 0;
  return template.text.replace(/\{(\w+)\}/g, () => {
    const slot = template.slots[slotIndex];
    slotIndex += 1;
    if (!slot) return '';
    return pickSlotValue(slot, ctx, rand);
  });
}

let commentSeq = 0;
export function renderComment(
  template: CommentTemplate,
  ctx: CommentContext,
  rand: RandomSource = defaultRandom
): GeneratedComment {
  commentSeq += 1;
  return {
    id: `c-${ctx.now}-${commentSeq}-${randomInt(0, 99999, rand)}`,
    templateId: template.id,
    persona: template.persona,
    author: randomPick(NAMES, rand),
    text: fillTemplate(template, ctx, rand),
    createdAt: ctx.now,
  };
}
