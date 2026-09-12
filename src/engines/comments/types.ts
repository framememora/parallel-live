export type Persona =
  | 'hypeBro'
  | 'skeptic'
  | 'emojiSpammer'
  | 'newbie'
  | 'oldFan'
  | 'flirty'
  | 'confused'
  | 'supportive';

export const ALL_PERSONAS: readonly Persona[] = [
  'hypeBro',
  'skeptic',
  'emojiSpammer',
  'newbie',
  'oldFan',
  'flirty',
  'confused',
  'supportive',
];

export type SlotKind = 'name' | 'emoji' | 'count' | 'timePhrase' | 'compliment' | 'question';

export type Milestone = 'viewerSpike' | 'heartBurst' | 'giftReceived' | 'none';

export interface CommentTemplate {
  id: string;
  persona: Persona;
  /** Relative selection frequency within its persona pool. */
  weight: number;
  /** Raw text containing `{slotKind}` placeholders, e.g. "{name} just hit {count}!" */
  text: string;
  slots: SlotKind[];
  /** Only eligible once the session has been live at least this many seconds. */
  minSessionSecond?: number;
  /** Only eligible before the session has been live this many seconds. */
  maxSessionSecond?: number;
  /** Only eligible right after this kind of event just happened. */
  requiresMilestone?: Milestone;
}

export interface GeneratedComment {
  id: string;
  templateId: string;
  persona: Persona;
  /** Commenter display name, independent of any {name} slot referenced inside the text itself. */
  author: string;
  text: string;
  createdAt: number;
  /**
   * True for a comment the user typed into the composer rather than one the
   * scheduler generated. Flagged rather than given its own `Persona` so the
   * persona union stays exactly the set the template bank is keyed by.
   */
  isOwn?: boolean;
  /**
   * Set when this row is a gift arriving rather than someone talking. Carried as
   * an optional field on the comment for the same reason `isOwn` is: gifts ride
   * the one feed the store already caps and fades, and interleave with comments
   * chronologically the way they do on a real broadcast. The scheduler never
   * produces one — `useGiftEngine` pushes them straight to the store.
   */
  gift?: GiftRowInfo;
}

/** What a gift row needs to render, flattened off `GiftTier` at the moment it lands. */
export interface GiftRowInfo {
  tierId: string;
  emoji: string;
  /** Completes "‹author› sent ‹label›". */
  label: string;
}

export interface CommentContext {
  sessionSecond: number;
  viewerCount: number;
  recentMilestone: Milestone;
  now: number;
}
