import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { GlyphIcon } from '../../../components/icons/GlyphIcon';
import { useSettingsStore } from '../../../state/settingsStore';
import { PILL_HEIGHT, colors, radii, spacing, textShadow, type } from '../../../theme/tokens';
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
 * Those three share one `rightGroup` wrapper, one gap and one height
 * (`PILL_HEIGHT`). Before that they were sized independently — 19px, 24px and a
 * 28px padded box, at two different gaps — which centred them on a common line
 * but still read as ragged.
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
  const avatarUri = useSettingsStore((s) => s.avatarUri);

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
          <Avatar name={handle} uri={avatarUri} size={38} ring />
        </Pressable>
        <View style={styles.identityText} pointerEvents="none">
          <Text style={styles.handle} allowFontScaling={false} numberOfLines={1}>
            {handle}
          </Text>
          <FollowerCounter count={followers} />
        </View>

        {isLive && (
          <View style={styles.rightGroup} pointerEvents="box-none">
            {/* The pills are inert, but a bare View still captures touches and
                the rows above are box-none, so without this wrapper a tap
                landing on the viewer count would be swallowed instead of
                falling through to the tap-to-heart layer. */}
            <View style={styles.pills} pointerEvents="none">
              <View style={styles.liveBadge}>
                <Text style={styles.liveLabel} allowFontScaling={false}>
                  LIVE
                </Text>
              </View>
              <ViewerCounter count={viewers} />
            </View>

            {/* Bare glyph, no pill and no padding: the reference has an
                unadorned ✕, the top `Scrim` keeps it legible over a bright
                frame, and `hitSlop` carries the touch target. It used to also
                carry `padding: spacing.xs`, which held the glyph 4px off the
                row's right margin while the pills beside it sat flush. */}
            <Pressable
              onPress={onEnd}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              // The only thing naming this control once the word "End" is gone.
              accessibilityLabel="End live video"
              style={({ pressed }) => pressed && styles.pressed}
            >
              {/* Sized optically, not to `PILL_HEIGHT`. The ✕'s strokes span
                  half its box, so a 22px glyph would put 11px of thin line
                  beside a solid 22px badge and read as the runt of the row.
                  The row's height is set by the 38px avatar either way, so a
                  larger glyph costs no layout. */}
              <GlyphIcon name="close" size={26} color={colors.textPrimary} />
            </Pressable>
          </View>
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
  pressed: {
    opacity: 0.6,
  },
  /**
   * Every item in the top right, spaced by one value. Previously the two pills
   * were grouped at a 6px gap while the ✕ inherited `identityRow`'s 10px, so
   * the three items sat at two different rhythms.
   */
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    // The handle already shrinks first (`identityText` is flex: 1), but a
    // 30-character handle should never get to squash or wrap this group.
    flexShrink: 0,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  /**
   * Height comes from `PILL_HEIGHT`, not from padding, so it cannot drift out
   * of step with the viewer pill the way it had: 11px text + 3px padding gave
   * 19px against the viewer pill's 24px.
   *
   * The radius stays a rounded rect against the viewer pill's capsule. That
   * contrast is Instagram's own; matching the heights is the fix, not
   * flattening both to one shape.
   */
  liveBadge: {
    height: PILL_HEIGHT,
    justifyContent: 'center',
    backgroundColor: colors.live,
    borderRadius: radii.sm - 4,
    paddingHorizontal: spacing.sm,
  },
  liveLabel: {
    ...type.caption,
    color: colors.textPrimary,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
});
