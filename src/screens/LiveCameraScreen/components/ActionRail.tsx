import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { GlyphIcon, type IconName } from '../../../components/icons/GlyphIcon';
import { colors, spacing } from '../../../theme/tokens';

interface ActionRailProps {
  /** Spawns hearts at the given screen coords — wired to the real heart engine, not decorative. */
  onHeart: (x: number, y: number) => void;
  /** Swaps front/back camera. Available mid-broadcast, as on Instagram. */
  onFlipCamera: () => void;
  bottomOffset: number;
}

const BUTTON_SIZE = 44;

function RailButton({
  icon,
  onPress,
  label,
  color = colors.textPrimary,
  size = 28,
}: {
  icon: IconName;
  onPress: (x: number, y: number) => void;
  label: string;
  color?: string;
  size?: number;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={spacing.sm}
      onPress={(evt) => {
        scale.value = withSequence(withTiming(1.25, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 220 }));
        // pageX/pageY, not locationX/locationY: the heart layer spawns particles
        // in screen coordinates, and locationX is relative to this 44pt button.
        onPress(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      }}
      style={styles.button}
    >
      <Animated.View style={animatedStyle}>
        <GlyphIcon name={icon} size={size} color={color} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * The right-hand action column, sitting above the comment composer.
 *
 * This component was deleted once, in the commit that rebuilt the bottom bar as
 * a single Instagram Live row, on the grounds that it carried controls that did
 * nothing and duplicated a heart the row already had. It is back for the
 * opposite reason: the row is now five inert glyphs matching the reference, and
 * these two are the controls that genuinely work. They had nowhere else to go.
 *
 * The camera flip is the sharper case. `LiveCameraScreen` gates its other flip
 * button to the idle state, so without this rail there is no way to switch
 * cameras once you are live.
 *
 * **Anchored above the composer rather than under the ✕**, which is where the
 * reference screenshot puts its rail. A heart is tapped constantly and the ✕
 * ends the broadcast; stacking one directly beneath the other means a single
 * slip throws away the session.
 */
export function ActionRail({ onHeart, onFlipCamera, bottomOffset }: ActionRailProps) {
  return (
    <View style={[styles.root, { bottom: bottomOffset }]} pointerEvents="box-none">
      <RailButton icon="heartOutline" label="Send a heart" onPress={onHeart} />
      {/* Takes no coordinates, so the pageX/pageY the button hands over is dropped. */}
      <RailButton icon="cameraFlip" label="Flip camera" onPress={onFlipCamera} size={26} />
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
