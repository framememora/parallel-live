import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors, radii, spacing, type } from '../../../theme/tokens';
import { formatDuration } from '../../../utils/format';

interface RecordingIndicatorProps {
  elapsedSec: number;
}

/** Elapsed-time pill with a slowly breathing record dot. Laid out inline by `LiveHeader`. */
export function RecordingIndicator({ elapsedSec }: RecordingIndicatorProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.pill}>
      <Animated.View style={[styles.dot, dotStyle]} />
      <Text style={styles.text} allowFontScaling={false}>
        {formatDuration(elapsedSec)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    backgroundColor: colors.glass,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: spacing.xs + 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.live,
  },
  text: {
    ...type.caption,
    color: colors.textPrimary,
    // Tabular-ish: without this the pill jitters as digit widths change each second.
    fontVariant: ['tabular-nums'],
  },
});
