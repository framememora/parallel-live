import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { useSettingsStore } from '../../../state/settingsStore';
import { colors, radii, spacing, textShadow, type } from '../../../theme/tokens';
import { FollowerCounter } from './FollowerCounter';
import { RecordingIndicator } from './RecordingIndicator';
import { ViewerCounter } from './ViewerCounter';

interface LiveHeaderProps {
  /** While false, the status row and End control are hidden — only identity shows. */
  isLive: boolean;
  viewers: number;
  followers: number;
  elapsedSec: number;
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
 * Instagram Live's top chrome: broadcaster identity on the left, live status
 * and audience metrics beneath it, End on the right. Replaces the three
 * separately absolute-positioned counters that used to float at hardcoded
 * offsets.
 *
 * Rendered in both the idle and live states so the avatar and handle don't jump
 * when the broadcast starts — going live adds the status row and the End
 * control in place rather than replacing the header.
 */
export function LiveHeader({
  isLive,
  viewers,
  followers,
  elapsedSec,
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
          <Pressable
            onPress={onEnd}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="End live video"
            style={({ pressed }) => [styles.endButton, pressed && styles.pressed]}
          >
            <Text style={styles.endLabel} allowFontScaling={false}>
              End
            </Text>
          </Pressable>
        )}
      </View>

      {isLive && (
        <View style={styles.statusRow} pointerEvents="none">
          <View style={styles.liveBadge}>
            <Text style={styles.liveLabel} allowFontScaling={false}>
              LIVE
            </Text>
          </View>
          <ViewerCounter count={viewers} />
          <RecordingIndicator elapsedSec={elapsedSec} />
        </View>
      )}
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
    gap: spacing.sm + 2,
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
  endButton: {
    backgroundColor: colors.glass,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm - 1,
  },
  endLabel: {
    ...type.small,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    // Aligns the badge row under the handle rather than under the avatar.
    paddingLeft: 38 + spacing.sm + 2,
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
