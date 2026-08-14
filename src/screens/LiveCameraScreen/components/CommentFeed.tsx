import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { GeneratedComment } from '../../../engines/comments/types';
import { spacing } from '../../../theme/tokens';
import { CommentBubble } from './CommentBubble';

interface CommentFeedProps {
  comments: GeneratedComment[];
  /** Distance from the screen bottom to the top of the composer, so rows clear it. */
  bottomOffset: number;
  /** Hard ceiling on the stack's height, measured from `bottomOffset` upward. */
  maxHeight: number;
}

/**
 * Bottom-left comment stack, oldest at the top.
 *
 * `maxHeight` + `overflow: 'hidden'` are load-bearing, not defensive: the store
 * keeps 8 comments and each row is roughly 46pt, so an unbounded stack grows
 * ~370pt upward and slides under `LiveHeader` on a shorter screen. Clipping
 * from the top with the rows pinned to the bottom is also what Instagram does —
 * combined with the per-row opacity ramp in `CommentBubble`, the oldest
 * comments fade and then disappear off the top rather than colliding.
 */
export function CommentFeed({ comments, bottomOffset, maxHeight }: CommentFeedProps) {
  return (
    <View style={[styles.container, { bottom: bottomOffset, maxHeight }]} pointerEvents="none">
      {comments.map((comment, index) => (
        <CommentBubble key={comment.id} comment={comment} depth={index} total={comments.length} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    // Clears the action rail on the right.
    right: 64,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
});
