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
