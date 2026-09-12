import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, SweepGradient, vec } from '@shopify/react-native-skia';
import { avatarColorFor, initialFor } from '../utils/avatar';
import { illustratedAvatarFor } from '../utils/illustratedAvatar';
import { remoteAvatarUrlFor } from '../utils/remoteAvatar';
import { colors, igGradient } from '../theme/tokens';

interface AvatarProps {
  /** Handle the avatar is derived from — same name always yields the same color and letter. */
  name: string;
  size?: number;
  /** Draws Instagram's gradient story ring around the avatar. */
  ring?: boolean;
  /**
   * The broadcaster's own chosen photo. Takes precedence over the derived
   * portrait a `simulated` avatar would otherwise get, so the two can never
   * fight. Falls back to the disc whenever this is absent — or whenever it
   * fails to load, see below.
   */
  uri?: string | null;
  /**
   * Marks this avatar as standing for a simulated person rather than the
   * broadcaster, which selects a whole fallback chain: a portrait fetched from
   * `remoteAvatarUrlFor`, with the drawn `IllustratedFace` underneath it for
   * the moment before it loads and for good if it never does — offline, on a
   * dropped connection, or if the host goes away.
   *
   * Set for commenters in `CommentBubble`; left off everywhere the avatar is
   * the broadcaster (`SettingsSheet`, `LiveHeader`), who has their own photo
   * and keeps the letter disc as their placeholder.
   */
  simulated?: boolean;
}

const RING_WIDTH = 2;
/** Black breathing room between the ring and the avatar, as Instagram draws it. */
const RING_GAP = 2;

export function Avatar({ name, size = 24, ring = false, uri, simulated = false }: AvatarProps) {
  const inner = ring ? size - (RING_WIDTH + RING_GAP) * 2 : size;
  const discShape = { width: inner, height: inner, borderRadius: inner / 2 };

  // A simulated commenter has no photo of their own, so one is derived. An
  // explicit `uri` still wins, so this never overrides the broadcaster.
  const photoUri = uri ?? (simulated ? remoteAvatarUrlFor(name, inner) : null);

  // Holds the URI that failed rather than a bare boolean, so a new `uri` clears
  // the failure by comparison alone — no effect, and no stale flag left behind
  // when the user picks a different photo.
  //
  // This matters because `avatarUri` is persisted: the reference outlives the
  // session that chose it, and the photo behind it can be deleted, or fall out
  // of Android's "selected photos" grant. Without this the disc renders empty.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = !!photoUri && failedUri !== photoUri;

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
      {/* The fallback is drawn first and the photo laid over it, rather than
          the two being alternatives. A remote portrait arrives a frame or more
          after mount, and an empty disc in the meantime is what would give the
          feed away; this way the row is complete from the first frame and the
          photo simply covers it. An opaque `cover` photo hides it entirely. */}
      <View style={[styles.disc, discShape, { backgroundColor: avatarColorFor(name) }]}>
        {simulated ? (
          <IllustratedFace name={name} size={inner} />
        ) : (
          <Text style={[styles.initial, { fontSize: inner * 0.46 }]} allowFontScaling={false}>
            {initialFor(name)}
          </Text>
        )}
        {showPhoto && (
          // `cover` on a circular box *is* the crop. That's what makes shipping
          // without a cropping UI acceptable: a portrait photo is centred and
          // filled rather than letterboxed, whatever its aspect ratio.
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={() => setFailedUri(photoUri)}
          />
        )}
      </View>
    </View>
  );
}

/**
 * A generated bust silhouette: an oversized shoulders circle cropped by the
 * disc's `overflow: hidden`, a head circle with eyes/eyebrows/mouth and a
 * light gloss highlight, and a hairstyle shape — `long` sits behind the head
 * (drawn first), `short`/`bun` sit in front. Eyes/mouth/highlight are fixed
 * tones (dark, near-black overlays) rather than derived from skin/hair color,
 * the way flat-illustration avatar sets shade features — one low-opacity
 * overlay reads correctly against any base color without per-tone tuning.
 * Plain `View`s rather than Skia so this needs no canvas or test mocking, the
 * same way the letter disc it replaces is plain `View` + `Text`.
 */
function IllustratedFace({ name, size }: { name: string; size: number }) {
  const { skinTone, hairColor, hairStyle } = illustratedAvatarFor(name);

  const headSize = size * 0.44;
  const headTop = size * 0.12;
  const shoulderSize = size * 1.05;
  const shoulderTop = size * 0.58;

  const centered = (width: number) => ({ left: (size - width) / 2 });
  const centerX = size / 2;

  // Sized well above their photorealistic proportion (a real eye isn't 20%
  // of head width) because these render as small as 11pt of head at the
  // 26pt comment-row avatar — anything closer to true proportion disappears
  // below a couple of physical pixels at that scale.
  const eyeSize = headSize * 0.2;
  const eyeY = headTop + headSize * 0.42;
  const eyeXOffset = headSize * 0.22;
  const eyebrowWidth = headSize * 0.26;
  const eyebrowHeight = headSize * 0.07;
  const eyebrowY = eyeY - headSize * 0.22;
  const mouthWidth = headSize * 0.4;
  const mouthHeight = headSize * 0.12;
  const mouthY = headTop + headSize * 0.72;

  return (
    <View style={StyleSheet.absoluteFill} testID="illustrated-face">
      {hairStyle === 'long' && (
        <View
          style={[
            styles.hairShape,
            centered(headSize * 1.55),
            {
              top: headTop - headSize * 0.12,
              width: headSize * 1.55,
              height: headSize * 1.9,
              borderRadius: headSize,
              backgroundColor: hairColor,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.bodyShape,
          centered(shoulderSize),
          {
            top: shoulderTop,
            width: shoulderSize,
            height: shoulderSize,
            borderRadius: shoulderSize / 2,
            backgroundColor: skinTone,
          },
        ]}
      />
      <View
        style={[
          styles.bodyShape,
          centered(headSize),
          {
            top: headTop,
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            backgroundColor: skinTone,
          },
        ]}
      />
      {/* Directional-light gloss, upper-left of the head. */}
      <View
        style={[
          styles.highlightShape,
          {
            top: headTop + headSize * 0.08,
            left: centerX - headSize * 0.38,
            width: headSize * 0.5,
            height: headSize * 0.4,
            borderRadius: headSize * 0.25,
          },
        ]}
      />
      <View
        style={[styles.eyebrowShape, { top: eyebrowY, left: centerX - eyeXOffset - eyebrowWidth / 2, width: eyebrowWidth, height: eyebrowHeight, borderRadius: eyebrowHeight / 2, backgroundColor: hairColor }]}
      />
      <View
        style={[styles.eyebrowShape, { top: eyebrowY, left: centerX + eyeXOffset - eyebrowWidth / 2, width: eyebrowWidth, height: eyebrowHeight, borderRadius: eyebrowHeight / 2, backgroundColor: hairColor }]}
      />
      <View
        style={[styles.eyeShape, { top: eyeY, left: centerX - eyeXOffset - eyeSize / 2, width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]}
      />
      <View
        style={[styles.eyeShape, { top: eyeY, left: centerX + eyeXOffset - eyeSize / 2, width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]}
      />
      <View
        style={[styles.mouthShape, { top: mouthY, left: centerX - mouthWidth / 2, width: mouthWidth, height: mouthHeight, borderRadius: mouthHeight / 2 }]}
      />
      {hairStyle === 'short' && (
        <View
          style={[
            styles.hairShape,
            centered(headSize * 1.05),
            {
              top: headTop - headSize * 0.06,
              width: headSize * 1.05,
              height: headSize * 0.5,
              borderTopLeftRadius: headSize / 2,
              borderTopRightRadius: headSize / 2,
              backgroundColor: hairColor,
            },
          ]}
        />
      )}
      {hairStyle === 'bun' && (
        <>
          <View
            style={[
              styles.hairShape,
              centered(headSize * 1.05),
              {
                top: headTop - headSize * 0.04,
                width: headSize * 1.05,
                height: headSize * 0.35,
                borderTopLeftRadius: headSize / 2,
                borderTopRightRadius: headSize / 2,
                backgroundColor: hairColor,
              },
            ]}
          />
          <View
            style={[
              styles.hairShape,
              centered(headSize * 0.34),
              {
                top: headTop - headSize * 0.28,
                width: headSize * 0.34,
                height: headSize * 0.34,
                borderRadius: headSize * 0.17,
                backgroundColor: hairColor,
              },
            ]}
          />
        </>
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
    // Crops IllustratedFace's oversized shoulders/hair shapes to the circle.
    // A no-op for the letter case, which already fits inside the disc.
    overflow: 'hidden',
  },
  initial: {
    color: colors.textPrimary,
    fontWeight: '700',
    // Centering a single glyph by line box alone leaves it visually low.
    includeFontPadding: false,
    textAlign: 'center',
  },
  bodyShape: {
    position: 'absolute',
  },
  hairShape: {
    position: 'absolute',
  },
  highlightShape: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    opacity: 0.16,
  },
  eyebrowShape: {
    position: 'absolute',
    opacity: 0.85,
  },
  eyeShape: {
    position: 'absolute',
    backgroundColor: '#1A1A1A',
  },
  mouthShape: {
    position: 'absolute',
    backgroundColor: '#000000',
    opacity: 0.4,
  },
});
