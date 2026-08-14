/**
 * Path data for the icons whose shapes are organic enough that no Skia
 * primitive can express them. Everything geometric — the eye, the camera body,
 * the lens — is built from `Circle` / `RoundedRect` / `Line` in `GlyphIcon`
 * instead, because hand-authored SVG arc commands are where the first version
 * of this file went wrong: a flipped large-arc or sweep flag renders an
 * inverted or oversized shape with no error, and there is no way to catch that
 * from a typecheck or a bundle.
 *
 * All paths are authored against a 24x24 viewBox, matching the convention
 * `HeartBurstLayer` established for its particles.
 */

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

/** The two chevrons inside the camera-flip lens. */
export const FLIP_ARROWS_PATH = 'M10 12.2l-1.6 1.7 1.6 1.7 M14 12.2l1.6 1.7-1.6 1.7';

/** Top bump on the camera-flip body (the viewfinder hump). */
export const CAMERA_HUMP_PATH = 'M8.7 7.2 10.1 4.8h3.8l1.4 2.4';
