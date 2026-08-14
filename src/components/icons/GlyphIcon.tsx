import React from 'react';
import { Canvas, Circle, Group, Path, RoundedRect, rect, rrect } from '@shopify/react-native-skia';
import {
  CAMERA_HUMP_PATH,
  EYE_LID_PATH,
  FLIP_ARROWS_PATH,
  HEART_PATH,
  PAPER_PLANE_PATH,
} from './iconPaths';

export type IconName = 'heartFilled' | 'paperPlane' | 'eye' | 'cameraFlip';

interface GlyphIconProps {
  name: IconName;
  /** Rendered edge length in px; the 24x24 artwork is scaled to fit. */
  size?: number;
  color?: string;
  opacity?: number;
}

/** Stroke width in *viewBox* units, so icons stay visually proportional at any size. */
const STROKE = 1.8;

/**
 * Renders one icon on its own small Skia canvas.
 *
 * Each icon is a handful of Skia primitives rather than a single blob of path
 * data. `Circle` and `RoundedRect` are exact by construction, so the shapes
 * that are geometric cannot be silently wrong the way hand-written arc commands
 * can — only `heartFilled` and `paperPlane` still carry authored paths, and the
 * heart is the one already proven in `HeartBurstLayer`.
 *
 * A canvas per icon rather than one shared canvas: the icons live in different
 * parts of the layout tree (header, action rail, composer) and are positioned
 * by flexbox, so they can't share a coordinate space. There are under a dozen
 * on screen at once, well within budget alongside the camera preview.
 */
export function GlyphIcon({ name, size = 24, color = '#FFFFFF', opacity = 1 }: GlyphIconProps) {
  // Stroked geometry is centred on its contour, so half the stroke falls
  // outside the 24-unit box. Shrinking the whole group by one stroke width
  // keeps every icon inside the canvas without per-icon nudging.
  const scale = (size / 24) * ((24 - STROKE) / 24);
  const offset = (size * (STROKE / 24)) / 2;

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ translateX: offset }, { translateY: offset }, { scale }]} opacity={opacity}>
        <IconBody name={name} color={color} />
      </Group>
    </Canvas>
  );
}

function IconBody({ name, color }: { name: IconName; color: string }) {
  switch (name) {
    case 'heartFilled':
      return <Path path={HEART_PATH} color={color} />;

    case 'paperPlane':
      return (
        <Path
          path={PAPER_PLANE_PATH}
          color={color}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
          strokeJoin="round"
        />
      );

    case 'eye':
      return (
        <Group>
          <Path
            path={EYE_LID_PATH}
            color={color}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            strokeJoin="round"
          />
          {/* Filled pupil rather than a stroked iris: at the 14px this renders
              at in the viewer pill, a 1.8-unit ring collapses into mush. */}
          <Circle cx={12} cy={12} r={3} color={color} />
        </Group>
      );

    case 'cameraFlip':
      return (
        <Group>
          <RoundedRect rect={rrect(rect(2, 7, 20, 13), 3, 3)} color={color} style="stroke" strokeWidth={STROKE} />
          <Path
            path={CAMERA_HUMP_PATH}
            color={color}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            strokeJoin="round"
          />
          <Circle cx={12} cy={13.8} r={4.1} color={color} style="stroke" strokeWidth={STROKE} />
          <Path
            path={FLIP_ARROWS_PATH}
            color={color}
            style="stroke"
            strokeWidth={STROKE - 0.3}
            strokeCap="round"
            strokeJoin="round"
          />
        </Group>
      );
  }
}
