import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { GlyphIcon, type IconName } from '../../../components/icons/GlyphIcon';
import { colors, spacing } from '../../../theme/tokens';

interface ActionRailProps {
  /** Swaps front/back camera. Available mid-broadcast, as on Instagram. */
  onFlipCamera: () => void;
  /** Whether the video feed is live; drives which camera glyph is shown. */
  cameraOn: boolean;
  /** Blanks or restores the preview. */
  onToggleCamera: () => void;
  /** Distance from the top of the screen — measured from the header, not guessed. */
  topOffset: number;
}

const BUTTON_SIZE = 44;
const ICON_SIZE = 26;

/** The three that are decoration, in the order the reference stacks them. */
const CHROME_ICONS: readonly IconName[] = ['sparkle', 'flash', 'settings'];

function RailButton({
  icon,
  onPress,
  label,
  size = ICON_SIZE,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={spacing.sm}
      onPress={() => {
        scale.value = withSequence(withTiming(1.25, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 220 }));
        onPress();
      }}
      style={styles.button}
    >
      <Animated.View style={animatedStyle}>
        <GlyphIcon name={icon} size={size} color={colors.textPrimary} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Instagram's right-hand camera toolbar.
 *
 * **This component was deleted once, and the reason given was wrong.** The
 * commit that removed it argued that Instagram Live "has one row and one heart,
 * and nothing floating on the right". Instagram Live in fact has a camera
 * toolbar down one side, and a setting that lets the broadcaster choose which
 * side it appears on. Its documented contents are the five here: filter, video
 * off, flip, flash, settings. So this is not the old rail restored on a whim —
 * the premise that removed it did not hold.
 *
 * What *was* right about that commit is that a rail must not carry dead
 * duplicates: it had a second heart competing with the row's, and a flip the row
 * also had. Neither is repeated here. The flip lives here alone, which is where
 * Instagram puts it, and the heart stays in the composer row.
 *
 * Three of the five are chrome — nothing in this app filters, flashes, or has
 * settings worth opening mid-broadcast. They take `pointerEvents="none"` and no
 * `accessibilityRole`, so nothing invites a tap or announces itself as a button.
 *
 * The rail hangs off the *measured* header rather than a guessed offset, and
 * deliberately leaves a gap below it: the ✕ ends the broadcast, and an icon
 * flush against it turns one mis-tap into a lost session.
 */
export function ActionRail({ onFlipCamera, cameraOn, onToggleCamera, topOffset }: ActionRailProps) {
  return (
    <View style={[styles.root, { top: topOffset }]} pointerEvents="box-none">
      <RailButton icon="cameraFlip" label="Flip camera" onPress={onFlipCamera} />
      <RailButton
        icon={cameraOn ? 'camera' : 'cameraOff'}
        label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
        onPress={onToggleCamera}
      />
      {CHROME_ICONS.map((icon) => (
        <View key={icon} style={styles.button} pointerEvents="none">
          <GlyphIcon name={icon} size={ICON_SIZE} color={colors.textPrimary} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
