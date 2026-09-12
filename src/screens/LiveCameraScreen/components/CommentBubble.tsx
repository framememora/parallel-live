import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Avatar } from '../../../components/Avatar';
import type { GeneratedComment } from '../../../engines/comments/types';
import { useSettingsStore } from '../../../state/settingsStore';
import { colors, radii, spacing, textShadow, type } from '../../../theme/tokens';

interface CommentBubbleProps {
  comment: GeneratedComment;
  /** 0 = oldest row in the visible stack; used to fade the top of the feed out. */
  depth: number;
  total: number;
}

/**
 * One Instagram-style comment row: small avatar, handle, then the text.
 *
 * The dark pill this used to sit in is gone — `Scrim` behind the whole feed
 * region handles legibility now, which is what makes a stack of these read as a
 * broadcast overlay rather than a column of chips.
 *
 * A gift row is the one exception that keeps a pill: it is an event rather than
 * someone talking, and it has to be separable from the comments around it at a
 * glance. Gold at glass weight, so the camera still reads through it.
 */
export function CommentBubble({ comment, depth, total }: CommentBubbleProps) {
  // Only the broadcaster's own row gets their chosen photo (or its letter-disc
  // fallback) plus the story ring; every simulated commenter gets a portrait
  // derived from their handle instead. The ring is what makes an own comment
  // stand out now that both carry a photo — a gift is set apart by its fill
  // instead, so the ring keeps meaning exactly one thing.
  const avatarUri = useSettingsStore((s) => s.avatarUri);
  const gift = comment.gift;
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  // Gifts land with a small scale-up; ordinary comments never move from 1, so
  // this costs them nothing.
  const scale = useSharedValue(gift ? 0.9 : 1);

  // Older rows fade toward the top of the stack. Recomputed on every render
  // because a row's depth changes as newer comments push it up.
  const restOpacity = total <= 1 ? 1 : 0.5 + 0.5 * (depth / (total - 1));

  useEffect(() => {
    opacity.value = withTiming(restOpacity, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(1, { duration: 260 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.row, gift && styles.giftRow, animatedStyle]}>
      <Avatar
        name={comment.author}
        uri={comment.isOwn ? avatarUri : undefined}
        size={26}
        ring={comment.isOwn}
        simulated={!comment.isOwn}
      />
      <View style={styles.body}>
        <Text style={styles.handle} allowFontScaling={false} numberOfLines={1}>
          {comment.author}
        </Text>
        {gift ? (
          <Text style={styles.giftText} numberOfLines={1}>
            sent {gift.label} {gift.emoji}
          </Text>
        ) : (
          <Text style={styles.text} numberOfLines={2}>
            {comment.text}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingRight: spacing.sm,
  },
  /**
   * `alignSelf: 'flex-start'` keeps the pill as wide as its contents — stretched
   * to the feed's full width it would read as a banner across the frame rather
   * than as one row among the comments.
   */
  giftRow: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.badgeGlass,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.badgeHairline,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
  },
  body: {
    flex: 1,
    // Nudge the text block down so the handle's cap height lines up with the
    // centre of the 26pt avatar rather than its top edge.
    paddingTop: 1,
  },
  handle: {
    ...type.caption,
    color: colors.textSecondary,
    ...textShadow,
  },
  text: {
    ...type.body,
    color: colors.textPrimary,
    ...textShadow,
  },
  giftText: {
    ...type.body,
    color: colors.badge,
    ...textShadow,
  },
});
