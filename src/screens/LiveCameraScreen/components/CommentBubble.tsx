import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Avatar } from '../../../components/Avatar';
import type { GeneratedComment } from '../../../engines/comments/types';
import { useSettingsStore } from '../../../state/settingsStore';
import { colors, spacing, textShadow, type } from '../../../theme/tokens';

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
 */
export function CommentBubble({ comment, depth, total }: CommentBubbleProps) {
  // Only the broadcaster's own rows get the photo; every simulated commenter
  // keeps a letter disc, which is part of what makes an own comment stand out.
  const avatarUri = useSettingsStore((s) => s.avatarUri);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  // Older rows fade toward the top of the stack. Recomputed on every render
  // because a row's depth changes as newer comments push it up.
  const restOpacity = total <= 1 ? 1 : 0.5 + 0.5 * (depth / (total - 1));

  useEffect(() => {
    opacity.value = withTiming(restOpacity, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <Avatar
        name={comment.author}
        uri={comment.isOwn ? avatarUri : undefined}
        size={26}
        ring={comment.isOwn}
      />
      <View style={styles.body}>
        <Text style={styles.handle} allowFontScaling={false} numberOfLines={1}>
          {comment.author}
        </Text>
        <Text style={styles.text} numberOfLines={2}>
          {comment.text}
        </Text>
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
});
