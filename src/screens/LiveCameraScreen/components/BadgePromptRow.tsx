import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettingsStore } from '../../../state/settingsStore';
import { colors, radii, spacing, type } from '../../../theme/tokens';

/**
 * Instagram Live's "buy a badge to support…" strip, sitting directly above the
 * comment bar.
 *
 * **Purely decorative.** There is no press handler and no commerce behind it —
 * it exists because the strip is one of the strongest visual signals that a
 * screen is Instagram Live, and this app's whole job is to look like one on
 * camera. `ActionRail` was once deleted for carrying a control that did nothing;
 * that principle is being set aside deliberately here, and only for chrome that
 * is never presented as interactive. Rendered as plain `View`/`Text` with no
 * `Pressable` and no `accessibilityRole`, so nothing invites a tap.
 */
export function BadgePromptRow() {
  const handle = useSettingsStore((s) => s.handle);

  return (
    <View style={styles.root} pointerEvents="none">
      <Text style={styles.text} allowFontScaling={false} numberOfLines={1}>
        Buy a badge to support {handle}
      </Text>
      <View style={styles.buyPill}>
        <Text style={styles.buyLabel} allowFontScaling={false}>
          Buy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  text: {
    ...type.small,
    fontWeight: '400',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  buyPill: {
    backgroundColor: colors.badge,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 1,
  },
  buyLabel: {
    ...type.small,
    // Dark on gold: the badge fill is bright enough that white text on it is
    // the one place in this UI where contrast would fail.
    color: colors.background,
  },
});
