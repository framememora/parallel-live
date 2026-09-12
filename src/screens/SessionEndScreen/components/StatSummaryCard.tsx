import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../../../theme/tokens';
import { formatCompactNumber, formatDuration } from '../../../utils/format';
import type { SessionSummary } from '../../../types/session';

interface StatSummaryCardProps {
  summary: SessionSummary;
}

/**
 * Two rows of two rather than one row of four. A fourth column fits a 400pt
 * screen and truncates "Peak viewers" on a 320pt one, and the label is the half
 * that carries the meaning — the number alone doesn't say what it counts.
 */
export function StatSummaryCard({ summary }: StatSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Stat label="Peak viewers" value={formatCompactNumber(summary.peakViewers)} />
        <View style={styles.divider} />
        <Stat label="Duration" value={formatDuration(summary.durationSec)} />
      </View>
      <View style={styles.rowDivider} />
      <View style={styles.row}>
        <Stat label="Hearts" value={formatCompactNumber(summary.totalHearts)} />
        <View style={styles.divider} />
        <Stat label="Gifts" value={formatCompactNumber(summary.totalGifts)} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value} allowFontScaling={false} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginVertical: spacing.xl,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs + 1,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.hairline,
  },
  value: {
    ...type.display,
    fontSize: 24,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...type.caption,
    fontWeight: '400',
    color: colors.textSecondary,
  },
});
