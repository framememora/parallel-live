import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, textShadow, type } from '../../../theme/tokens';
import { formatCompactNumber } from '../../../utils/format';

interface FollowerCounterProps {
  count: number;
}

/** Secondary line under the broadcaster's handle in `LiveHeader`. */
export function FollowerCounter({ count }: FollowerCounterProps) {
  return (
    <Text style={styles.text} allowFontScaling={false} numberOfLines={1}>
      {formatCompactNumber(count)} followers
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...type.caption,
    color: colors.textSecondary,
    ...textShadow,
  },
});
