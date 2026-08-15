import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { GlyphIcon } from '../../../components/icons/GlyphIcon';
import { PILL_HEIGHT, colors, radii, spacing, type } from '../../../theme/tokens';
import { formatCompactNumber } from '../../../utils/format';

interface ViewerCounterProps {
  count: number;
}

/**
 * Instagram's eye pill showing the live viewer count. Laid out inline by
 * `LiveHeader` rather than absolutely positioned — digit changes still animate
 * rather than snapping.
 */
export function ViewerCounter({ count }: ViewerCounterProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withTiming(1.12, { duration: 90 }, () => {
      pulse.value = withSpring(1, { damping: 10, stiffness: 180 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.pill, animatedStyle]}>
      <GlyphIcon name="eye" size={14} color={colors.textPrimary} />
      <Text style={styles.text} allowFontScaling={false}>
        {formatCompactNumber(count)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    // Fixed height rather than vertical padding, so this pill and the LIVE
    // badge beside it are the same size by construction. See `PILL_HEIGHT`.
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    backgroundColor: colors.glass,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md - 2,
  },
  text: {
    ...type.small,
    color: colors.textPrimary,
  },
});
