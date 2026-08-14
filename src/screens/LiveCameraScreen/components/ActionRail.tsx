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
 * Instagram's right-hand action column, sitting above the comment composer.
 *
 * Heart and camera-flip only. An earlier revision had a share button here gated
 * on an `onShare` prop that was never passed, so it silently never rendered.
 * Rather than wire it up: nothing in the app can share a broadcast in progress,
 * and on Instagram the share control belongs to the *viewer's* UI — a
 * broadcaster looking at their own live doesn't see one. The paper plane lives
 * in `CommentComposer`, where it actually does something.
 */
export function ActionRail({ onHeart, onFlipCamera, bottomOffset }: ActionRailProps) {
  return (
    <View style={[styles.root, { bottom: bottomOffset }]} pointerEvents="box-none">
      <RailButton icon="heartFilled" label="Send a heart" onPress={onHeart} color={colors.heart} />
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
