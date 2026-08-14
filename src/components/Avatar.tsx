import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, SweepGradient, vec } from '@shopify/react-native-skia';
import { avatarColorFor, initialFor } from '../utils/avatar';
import { colors, igGradient } from '../theme/tokens';

interface AvatarProps {
  /** Handle the avatar is derived from — same name always yields the same color and letter. */
  name: string;
  size?: number;
  /** Draws Instagram's gradient story ring around the avatar. */
  ring?: boolean;
}

const RING_WIDTH = 2;
/** Black breathing room between the ring and the avatar, as Instagram draws it. */
const RING_GAP = 2;

export function Avatar({ name, size = 24, ring = false }: AvatarProps) {
  const inner = ring ? size - (RING_WIDTH + RING_GAP) * 2 : size;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      {ring && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Circle cx={size / 2} cy={size / 2} r={(size - RING_WIDTH) / 2} style="stroke" strokeWidth={RING_WIDTH}>
            {/* Repeating the first color at the end closes the sweep so the ring
                has no hard seam where 360° meets 0°. */}
            <SweepGradient c={vec(size / 2, size / 2)} colors={[...igGradient, igGradient[0]]} />
          </Circle>
        </Canvas>
      )}
      <View
        style={[
          styles.disc,
          { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: avatarColorFor(name) },
        ]}
      >
        <Text style={[styles.initial, { fontSize: inner * 0.46 }]} allowFontScaling={false}>
          {initialFor(name)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.textPrimary,
    fontWeight: '700',
    // Centering a single glyph by line box alone leaves it visually low.
    includeFontPadding: false,
    textAlign: 'center',
  },
});
