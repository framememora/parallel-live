import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { GlyphIcon } from '../../../components/icons/GlyphIcon';
import { useSettingsStore } from '../../../state/settingsStore';
import { colors, radii, spacing, textShadow, type } from '../../../theme/tokens';
import { FollowerCounter } from './FollowerCounter';
import { ViewerCounter } from './ViewerCounter';

interface LiveHeaderProps {
  /** While false, the status pills and the close control are hidden — only identity shows. */
  isLive: boolean;
  viewers: number;
  followers: number;
  onEnd: () => void;
  /** Safe-area top inset, so the header clears the notch without magic numbers. */
  topInset: number;
  /** Reports the header's real height so the comment feed can be capped below it. */
  onMeasure?: (height: number) => void;
  /**
   * Opens settings. Only passed while idle — once live the avatar goes inert,
   * so a stray tap can't pull a modal over the recording.
   */
  onOpenSettings?: () => void;
}

/**
 * Instagram Live's top chrome, one row: broadcaster identity on the left, then
 * LIVE, the viewer count and the close control grouped in the top right.
 *
 * There used to be a second row beneath the handle holding those pills plus an
 * elapsed-time indicator. Both the row and the timer were removed to match the
 * reference layout; elapsed time still appears on `SessionEndScreen` via
 * `StatSummaryCard`, so nothing is lost except the live readout.
 *
 * Rendered in both the idle and live states so the avatar and handle don't jump
 * when the broadcast starts — going live adds the pills and the close control
 * in place rather than replacing the header.
 */
export function LiveHeader({
  isLive,
  viewers,
  followers,
  onEnd,
  topInset,
  onMeasure,
  onOpenSettings,
}: LiveHeaderProps) {
  const handle = useSettingsStore((s) => s.handle);

  return (
    <View
      style={[styles.root, { paddingTop: topInset + spacing.sm }]}
      pointerEvents="box-none"
      onLayout={(e) => onMeasure?.(e.nativeEvent.layout.height)}
    >
      <View style={styles.identityRow} pointerEvents="box-none">
        <Pressable
          onPress={onOpenSettings}
          disabled={!onOpenSettings}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar name={handle} size={38} ring />
        </Pressable>
        <View style={styles.identityText} pointerEvents="none">
          <Text style={styles.handle} allowFontScaling={false} numberOfLines={1}>
            {handle}
          </Text>
          <FollowerCounter count={followers} />
        </View>

        {isLive && (
          <>
            {/* The pills are inert, but a bare View still captures touches and
                `identityRow` is box-none, so without this wrapper a tap landing
                on the viewer count would be swallowed instead of falling
                through to the tap-to-heart layer. */}
            <View style={styles.statusGroup} pointerEvents="none">
              <View style={styles.liveBadge}>
                <Text style={styles.liveLabel} allowFontScaling={false}>
                  LIVE
                </Text>
              </View>
              <ViewerCounter count={viewers} />
            </View>

            <Pressable
              onPress={onEnd}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              // The only thing naming this control once the word "End" is gone.
              accessibilityLabel="End live video"
              style={({ pressed }) => [styles.endButton, pressed && styles.pressed]}
            >
              <GlyphIcon name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  identityText: {
    flex: 1,
    gap: 1,
  },
  handle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    ...textShadow,
  },
  /**
   * Bare glyph, no pill: the reference has an unadorned ✕, and the top `Scrim`
   * already keeps it legible over a bright frame. `hitSlop` on the Pressable
   * carries the touch target rather than padding it out to pill size.
   */
  endButton: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
  },
  liveBadge: {
    backgroundColor: colors.live,
    borderRadius: radii.sm - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
  },
  liveLabel: {
    ...type.caption,
    color: colors.textPrimary,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
});
