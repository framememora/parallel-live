import { useEffect } from 'react';
import { GiftScheduler } from '../../../engines/gifts/giftScheduler';
import type { MilestoneTracker } from '../../../engines/milestoneTracker';
import { useSessionStore } from '../../../state/sessionStore';

/**
 * How long a gift keeps the feed talking about it. Longer than a heart burst's
 * window, since a gift is a rarer event and one reaction to it shouldn't land
 * after the row has already scrolled away.
 */
const GIFT_MILESTONE_MS = 9000;

let giftCommentSeq = 0;

/**
 * Runs the simulated gift stream while a session is live.
 *
 * A gift is pushed into the same comment feed as everything else rather than
 * given its own overlay: the store already caps and fades that stack, and a gift
 * landing *between* two comments is what makes it read as part of the broadcast
 * instead of a notification pasted over it.
 *
 * Only the headline tiers raise the milestone. A real chat doesn't stop for
 * every rose, and commenters reacting to all of them would read as scripted.
 */
export function useGiftEngine(active: boolean, milestoneTracker: MilestoneTracker) {
  const addComment = useSessionStore((s) => s.addComment);
  const addGift = useSessionStore((s) => s.addGift);

  useEffect(() => {
    if (!active) return;
    const scheduler = new GiftScheduler({
      getViewerCount: () => useSessionStore.getState().currentViewers,
      onGift: (event) => {
        giftCommentSeq += 1;
        addGift();
        addComment({
          id: `giftrow-${event.createdAt}-${giftCommentSeq}`,
          templateId: `gift-${event.tier.id}`,
          // Gifts don't belong to the persona rotation the template bank is
          // keyed by; 'supportive' is the neutral entry, and nothing reads this
          // for a gift row beyond the avatar tint.
          persona: 'supportive',
          author: event.sender,
          // The row renders from `gift`, not from this; it exists so a gift is
          // still legible anywhere a comment is treated as plain text.
          text: `sent ${event.tier.label}`,
          createdAt: event.createdAt,
          gift: { tierId: event.tier.id, emoji: event.tier.emoji, label: event.tier.label },
        });
        if (event.tier.headline) {
          milestoneTracker.trigger('giftReceived', GIFT_MILESTONE_MS);
        }
      },
    });
    scheduler.start();
    return () => scheduler.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
