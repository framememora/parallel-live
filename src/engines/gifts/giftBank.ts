/**
 * The gifts simulated viewers send during a broadcast.
 *
 * Nothing is bought and no money moves — this is the same kind of prop as the
 * "Buy a badge to support…" strip above the comment bar, which is chrome with no
 * commerce behind it. What a gift buys is realism: a live feed where nothing but
 * text ever arrives reads as a chat window, not a broadcast.
 *
 * Modelled on Instagram Live's badges rather than TikTok's gift catalogue, since
 * the rest of this UI is Instagram's.
 */
export interface GiftTier {
  id: string;
  /** Shown in the feed row, before the label. */
  emoji: string;
  /** Completes "‹sender› sent ‹label›". */
  label: string;
  /** Relative selection frequency. The expensive-looking ones are deliberately rare. */
  weight: number;
  /**
   * Whether this tier is worth a reaction from the rest of the feed. Only the
   * top tiers raise the `giftReceived` milestone — commenters gasping at every
   * single rose is what would give the simulation away, since a real chat
   * ignores the small ones.
   */
  headline?: boolean;
}

/**
 * Weights are the whole design here. A rose lands often enough to be part of the
 * texture; a crown should feel like an event, so the top three tiers together are
 * under 10% of gifts and the rocket alone is under 1%.
 */
export const GIFT_TIERS: readonly GiftTier[] = [
  { id: 'rose', emoji: '🌹', label: 'a rose', weight: 40 },
  { id: 'badge', emoji: '💗', label: 'a badge', weight: 30 },
  { id: 'doubleBadge', emoji: '💗', label: 'two badges', weight: 14 },
  { id: 'confetti', emoji: '🎉', label: 'confetti', weight: 8 },
  { id: 'tripleBadge', emoji: '💗', label: 'three badges', weight: 5, headline: true },
  { id: 'crown', emoji: '👑', label: 'a crown', weight: 2, headline: true },
  { id: 'rocket', emoji: '🚀', label: 'a rocket', weight: 1, headline: true },
];
