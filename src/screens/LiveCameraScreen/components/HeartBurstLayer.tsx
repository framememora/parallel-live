import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
// Shared with the icon set: the particle heart and the UI heart are the same
// artwork, drawn centered via the Group's `origin` prop rather than by shifting
// path coordinates (Skia anchors scale/rotate around `origin`).
import { HEART_PATH } from '../../../components/icons/iconPaths';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const HEART_COLORS = ['#ff2d55', '#ff375f', '#ff9ec4', '#ffffff', '#ff6482'];

export const HEART_POOL_SIZE = 40;
const HEART_SIZE_PX = 22;
const LIFETIME_MS = 1600;

interface HeartParticleHandle {
  spawn: (originX: number, originY: number, color: string) => void;
}

const HeartParticle = forwardRef<HeartParticleHandle>(function HeartParticle(_props, ref) {
  const translateX = useSharedValue(-999);
  const translateY = useSharedValue(-999);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const color = useSharedValue(HEART_COLORS[0]);

  useImperativeHandle(ref, () => ({
    spawn: (originX: number, originY: number, particleColor: string) => {
      const rise = 120 + Math.random() * 140;
      const drift = (Math.random() - 0.5) * 60;
      const rotateTo = (Math.random() - 0.5) * 0.5;

      color.value = particleColor;
      translateX.value = originX;
      translateY.value = originY;
      scale.value = 0;
      rotate.value = (Math.random() - 0.5) * 0.2;
      opacity.value = 0;

      opacity.value = withSequence(
        withTiming(1, { duration: 140 }),
        withDelay(LIFETIME_MS - 600, withTiming(0, { duration: 460 }))
      );
      scale.value = withSequence(
        withTiming(1.15, { duration: 160 }),
        withTiming(0.95, { duration: 160 }),
        withTiming(1, { duration: 160 })
      );
      translateY.value = withTiming(originY - rise, {
        duration: LIFETIME_MS,
        easing: Easing.out(Easing.quad),
      });
      translateX.value = withSequence(
        withTiming(originX + drift * 0.6, { duration: LIFETIME_MS * 0.4 }),
        withTiming(originX + drift, { duration: LIFETIME_MS * 0.6 })
      );
      rotate.value = withTiming(rotateTo, { duration: LIFETIME_MS });
    },
  }));

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value * (HEART_SIZE_PX / 24) },
    { rotate: rotate.value },
  ]);

  return (
    <Group transform={transform} origin={{ x: 12, y: 12 }} opacity={opacity}>
      <Path path={HEART_PATH} color={color} />
    </Group>
  );
});

export interface HeartBurstLayerHandle {
  /** Spawns `count` hearts. Omit origin to use the default bottom-right ambient anchor. */
  spawnBurst: (count: number, originX?: number, originY?: number) => void;
}

/**
 * Single shared Skia Canvas holding a fixed pool of HEART_POOL_SIZE always-mounted
 * particles, round-robin assigned on each spawn — keeps this cheap enough to run
 * alongside the camera preview and screen recording.
 */
export const HeartBurstLayer = forwardRef<HeartBurstLayerHandle>(function HeartBurstLayer(_props, ref) {
  const { width, height } = useWindowDimensions();
  const particleRefs = useRef<Array<HeartParticleHandle | null>>([]);
  const nextIndex = useRef(0);

  useImperativeHandle(ref, () => ({
    spawnBurst: (count, originX, originY) => {
      const anchorX = originX ?? width - 36;
      const anchorY = originY ?? height - 160;
      for (let i = 0; i < count; i++) {
        const slot = particleRefs.current[nextIndex.current % HEART_POOL_SIZE];
        nextIndex.current += 1;
        const jitterX = anchorX + (Math.random() - 0.5) * 30;
        const jitterY = anchorY + (Math.random() - 0.5) * 20;
        const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
        const delay = i * (40 + Math.random() * 60);
        setTimeout(() => slot?.spawn(jitterX, jitterY, color), delay);
      }
    },
  }));

  const slots = useMemo(() => Array.from({ length: HEART_POOL_SIZE }, (_, i) => i), []);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {slots.map((i) => (
        <HeartParticle
          key={i}
          ref={(el) => {
            particleRefs.current[i] = el;
          }}
        />
      ))}
    </Canvas>
  );
});
