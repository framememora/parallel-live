import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { colors, igGradient, radii, spacing, type } from '../../../theme/tokens';

interface GoLiveButtonProps {
  onPress: () => void;
  disabled?: boolean;
  /** Safe-area bottom inset so the CTA clears the home indicator. */
  bottomInset: number;
}

/**
 * The idle-state call to action, filled with Instagram's brand gradient.
 *
 * Only rendered while idle — once the session is live, ending it moves to the
 * `End` control in `LiveHeader`, which is where Instagram puts it.
 */
export function GoLiveButton({ onPress, disabled, bottomInset }: GoLiveButtonProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={[styles.dock, { paddingBottom: bottomInset + spacing.xl }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        onLayout={onLayout}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Start live video"
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [styles.button, (pressed || disabled) && styles.pressed]}
      >
        {size.width > 0 && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect x={0} y={0} width={size.width} height={size.height}>
              <LinearGradient
                // Diagonal, matching Instagram's own gradient direction.
                start={vec(0, size.height)}
                end={vec(size.width, 0)}
                colors={[...igGradient]}
              />
            </Rect>
          </Canvas>
        )}
        <Text style={styles.label} allowFontScaling={false}>
          Start live video
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: radii.pill,
    // Clips the gradient canvas to the pill; without this it paints square corners.
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    ...type.label,
    color: colors.textPrimary,
    fontSize: 16,
  },
});
