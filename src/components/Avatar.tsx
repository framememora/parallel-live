import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, SweepGradient, vec } from '@shopify/react-native-skia';
import { avatarColorFor, initialFor } from '../utils/avatar';
import { colors, igGradient } from '../theme/tokens';

interface AvatarProps {
  /** Handle the avatar is derived from — same name always yields the same color and letter. */
  name: string;
  size?: number;
  /** Draws Instagram's gradient story ring around the avatar. */
  ring?: boolean;
  /**
   * A real photo to show instead of the derived letter disc.
   *
   * Only the broadcaster ever has one; simulated commenters keep their letter
   * avatars, which is also what makes an own comment visually distinct in the
   * feed. Falls back to the letter whenever this is absent — or whenever it
   * fails to load, see below.
   */
  uri?: string | null;
}

const RING_WIDTH = 2;
/** Black breathing room between the ring and the avatar, as Instagram draws it. */
const RING_GAP = 2;

export function Avatar({ name, size = 24, ring = false, uri }: AvatarProps) {
  const inner = ring ? size - (RING_WIDTH + RING_GAP) * 2 : size;
  const discShape = { width: inner, height: inner, borderRadius: inner / 2 };

  // Holds the URI that failed rather than a bare boolean, so a new `uri` clears
  // the failure by comparison alone — no effect, and no stale flag left behind
  // when the user picks a different photo.
  //
  // This matters because `avatarUri` is persisted: the reference outlives the
  // session that chose it, and the photo behind it can be deleted, or fall out
  // of Android's "selected photos" grant. Without this the disc renders empty.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = !!uri && failedUri !== uri;

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
      {showPhoto ? (
        // `cover` on a circular box *is* the crop. That's what makes shipping
        // without a cropping UI acceptable: a portrait photo is centred and
        // filled rather than letterboxed, whatever its aspect ratio.
        <Image
          source={{ uri }}
          style={discShape}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <View style={[styles.disc, discShape, { backgroundColor: avatarColorFor(name) }]}>
          <Text style={[styles.initial, { fontSize: inner * 0.46 }]} allowFontScaling={false}>
            {initialFor(name)}
          </Text>
        </View>
      )}
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
