/**
 * Path data for the icons whose shapes are organic enough that no Skia
 * primitive can express them. Everything geometric — the eye, the camera body,
 * the lens — is built from `Circle` / `RoundedRect` / `Line` in `GlyphIcon`
 * instead, because hand-authored SVG arc commands are where the first version
 * of this file went wrong: a flipped large-arc or sweep flag renders an
 * inverted or oversized shape with no error, and there is no way to catch that
 * from a typecheck or a bundle.
 *
 * Where a shape genuinely needs an arc — the switch-camera mark at the bottom —
 * it is *constructed* with `SkPath.addArc`, which takes a start angle and a
 * sweep angle. That has no flags to get backwards, so it is the same
 * exact-by-construction escape the primitives above provide.
 *
 * All paths are authored against a 24x24 viewBox, matching the convention
 * `HeartBurstLayer` established for its particles.
 */

import { Skia, type SkPath } from '@shopify/react-native-skia';

/**
 * The filled heart. This exact path has been rendering correctly in
 * `HeartBurstLayer`'s particle pool since before the redesign, which is why the
 * icon set reuses it rather than carrying a second, unproven heart.
 */
export const HEART_PATH =
  'M12 21s-6.716-4.35-9.428-8.28C.51 9.86 1.02 6.36 3.6 4.68 5.64 3.36 8.16 3.72 10.02 5.4L12 7.14l1.98-1.74c1.86-1.68 4.38-2.04 6.42-.72 2.58 1.68 3.09 5.18 1.02 8.04C18.716 16.65 12 21 12 21z';

/**
 * Direct-message paper plane, drawn as an open outline plus the fold line —
 * stroked, not filled, so it reads at 20px the way Instagram's does. Straight
 * line segments only; nothing here depends on arc flags.
 */
export const PAPER_PLANE_PATH = 'M22 2 2 9.6l8.5 3.9L14 21.5 22 2z M22 2l-11.5 11.5';

/** Eyelid almond for the viewer-count glyph. Symmetric cubics, no arcs. */
export const EYE_LID_PATH = 'M1.5 12C4.6 7.4 8.2 5 12 5s7.4 2.4 10.5 7c-3.1 4.6-6.7 7-10.5 7S4.6 16.6 1.5 12z';

/** Top bump on the camera body (the viewfinder hump). */
export const CAMERA_HUMP_PATH = 'M8.7 7.2 10.1 4.8h3.8l1.4 2.4';

/**
 * The effects sparkle: a four-point star with concave sides, plus a smaller one
 * off its shoulder.
 *
 * Filled where the rest of the rail is stroked. At the size this renders, a
 * 1.8-unit stroke closes up the concave notches between the points and the
 * shape turns to mush — the fill is what keeps it legible.
 */
export const SPARKLE_PATH =
  'M11 4.5C11.55 9.9 13.6 11.95 19 12.5C13.6 13.05 11.55 15.1 11 20.5C10.45 15.1 8.4 13.05 3 12.5C8.4 11.95 10.45 9.9 11 4.5Z';
export const SPARKLE_SPARK_PATH =
  'M18.8 3C18.98 4.5 19.5 5.02 21 5.2C19.5 5.38 18.98 5.9 18.8 7.4C18.62 5.9 18.1 5.38 16.6 5.2C18.1 5.02 18.62 4.5 18.8 3Z';

/** Flash bolt. Straight segments only — nothing here can be silently wrong. */
export const FLASH_PATH = 'M13.6 2 5.8 13.2h5L10.4 22l7.8-11.2h-5L13.6 2Z';

/**
 * Gift box, minus the lid — that is a `RoundedRect` in `GlyphIcon`. Drawn as an
 * open path rather than a second rect so no line runs through the box's middle.
 */
export const GIFT_BODY_PATH = 'M4.8 11.4V20.8H19.2V11.4';

/** Two mirrored loops meeting at the ribbon. Cubics only, no arcs. */
export const GIFT_BOW_PATH =
  'M12 7.2C10.5 4.4 8.6 3.6 7.7 4.6C6.8 5.6 8.6 7.2 12 7.2Z M12 7.2C13.5 4.4 15.4 3.6 16.3 4.6C17.2 5.6 15.4 7.2 12 7.2Z';

/* --------------------------------------------------------------------------
 * The switch-camera mark: two arcs chasing each other, each ending in an
 * arrowhead. Built rather than authored, for the reason in this file's header
 * — an SVG `A` command carries large-arc and sweep *flags*, and getting one
 * backwards silently renders an inverted or oversized shape. `addArc` takes a
 * start angle and a sweep angle instead. There is no flag to invert, so the
 * failure mode that produced that warning cannot occur here.
 * ------------------------------------------------------------------------ */

const CENTER = 12;
const RADIUS = 7;
/** Leaves two even gaps between the arcs for the arrowheads to sit in. */
const SWEEP = 140;
/** Arrowhead leg lengths: `ALONG` back down the arc, `ACROSS` either side of it. */
const ALONG = 3.4;
const ACROSS = 2.4;

/**
 * A two-segment chevron at the end of an arc, pointing the way the arc travels.
 *
 * Every point is derived from the arc's own end angle rather than eyeballed, so
 * the heads stay attached if `RADIUS` or `SWEEP` is ever retuned.
 */
function appendArrowhead(path: SkPath, endAngleDeg: number): void {
  const rad = (endAngleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Tip of the arc, then its clockwise tangent and outward normal.
  const tipX = CENTER + RADIUS * cos;
  const tipY = CENTER + RADIUS * sin;
  const tangentX = -sin;
  const tangentY = cos;

  path.moveTo(tipX - ALONG * tangentX + ACROSS * cos, tipY - ALONG * tangentY + ACROSS * sin);
  path.lineTo(tipX, tipY);
  path.lineTo(tipX - ALONG * tangentX - ACROSS * cos, tipY - ALONG * tangentY - ACROSS * sin);
}

function buildCameraFlipPath(): SkPath {
  const path = Skia.Path.Make();
  const oval = {
    x: CENTER - RADIUS,
    y: CENTER - RADIUS,
    width: RADIUS * 2,
    height: RADIUS * 2,
  };

  // Two arcs 180° apart. `addArc` opens its own contour, so these stay separate
  // strokes rather than being joined by a chord.
  path.addArc(oval, 0, SWEEP);
  path.addArc(oval, 180, SWEEP);

  appendArrowhead(path, SWEEP);
  appendArrowhead(path, 180 + SWEEP);

  return path;
}

let cameraFlipPath: SkPath | undefined;

/**
 * Built once on first use, then cached — the geometry is constant, so
 * re-deriving it per render would be waste.
 *
 * Deliberately lazy rather than a module-scope `const`. Everything else in this
 * file is an inert string; this is the only entry that calls into Skia, and a
 * native call at module-evaluation time is the exact shape of the startup crash
 * this app already shipped once (a top-level `requireNativeModule` in a module
 * the render tree imported, which failed before React could mount). Deferring
 * to first render costs nothing and removes that class of failure outright.
 */
export function getCameraFlipPath(): SkPath {
  if (!cameraFlipPath) cameraFlipPath = buildCameraFlipPath();
  return cameraFlipPath;
}

/* --------------------------------------------------------------------------
 * The microphone stand: the cradle under the capsule, plus the post and foot.
 * The capsule is a `RoundedRect` in `GlyphIcon`; only the cradle needs a path,
 * because it is a half-circle, and a half-circle is exactly where an authored
 * `A` command goes wrong. Same `addArc` escape as the camera-flip mark.
 * ------------------------------------------------------------------------ */

const CRADLE_RADIUS = 6.5;
const CRADLE_CENTER_Y = 11.3;
/** Where the cradle bottoms out, so where the post starts. Derived, not typed in. */
const POST_TOP = CRADLE_CENTER_Y + CRADLE_RADIUS;
const POST_BOTTOM = 21;
const FOOT_HALF_WIDTH = 3.4;

function buildMicrophoneStandPath(): SkPath {
  const path = Skia.Path.Make();

  // 0° is the cradle's right tip; a +180 sweep carries it under the capsule to
  // the left tip. `moveTo` after it opens a fresh contour, so the post is not
  // joined back to the arc by a chord.
  path.addArc(
    {
      x: CENTER - CRADLE_RADIUS,
      y: CRADLE_CENTER_Y - CRADLE_RADIUS,
      width: CRADLE_RADIUS * 2,
      height: CRADLE_RADIUS * 2,
    },
    0,
    180
  );

  path.moveTo(CENTER, POST_TOP);
  path.lineTo(CENTER, POST_BOTTOM);
  path.moveTo(CENTER - FOOT_HALF_WIDTH, POST_BOTTOM);
  path.lineTo(CENTER + FOOT_HALF_WIDTH, POST_BOTTOM);

  return path;
}

let microphoneStandPath: SkPath | undefined;

/** Lazy for the same reason as `getCameraFlipPath` — no Skia call at module scope. */
export function getMicrophoneStandPath(): SkPath {
  if (!microphoneStandPath) microphoneStandPath = buildMicrophoneStandPath();
  return microphoneStandPath;
}

/* --------------------------------------------------------------------------
 * The settings cog's teeth. The two circles it sits on are primitives in
 * `GlyphIcon`; only the spokes need generating, and they are generated rather
 * than typed out for the same reason `appendArrowhead` derives its points — so
 * they stay evenly spaced and attached if a radius is ever retuned.
 * ------------------------------------------------------------------------ */

const TOOTH_COUNT = 8;
const TOOTH_INNER = 6;
const TOOTH_OUTER = 8.4;

function buildSettingsTeethPath(): SkPath {
  const path = Skia.Path.Make();

  for (let i = 0; i < TOOTH_COUNT; i++) {
    const rad = ((i * 360) / TOOTH_COUNT) * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    path.moveTo(CENTER + TOOTH_INNER * cos, CENTER + TOOTH_INNER * sin);
    path.lineTo(CENTER + TOOTH_OUTER * cos, CENTER + TOOTH_OUTER * sin);
  }

  return path;
}

let settingsTeethPath: SkPath | undefined;

/** Lazy for the same reason as `getCameraFlipPath` — no Skia call at module scope. */
export function getSettingsTeethPath(): SkPath {
  if (!settingsTeethPath) settingsTeethPath = buildSettingsTeethPath();
  return settingsTeethPath;
}
