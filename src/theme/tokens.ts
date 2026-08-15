/**
 * The single source of truth for every color, radius, space and text size in
 * the app. Before this existed the same literals (`rgba(0,0,0,0.45)`, `#ff2d55`,
 * `borderRadius: 999`) were re-typed in a dozen StyleSheets and had already
 * started to drift. Values here were seeded from what those StyleSheets were
 * already using, so adopting the tokens is a consolidation rather than a
 * re-invention.
 *
 * Everything is dark-only on purpose: the UI is always composited over a live
 * camera feed, and it gets burned into an exported video, so there is no light
 * mode to support.
 */

export const colors = {
  /** Camera-less backdrop and the base for every screen. */
  background: '#000000',
  /** Raised surfaces (cards, sheets) on the non-camera screens. */
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.62)',
  textTertiary: 'rgba(255,255,255,0.40)',

  /** Translucent chrome over the camera — the fill behind every pill. */
  glass: 'rgba(0,0,0,0.32)',
  /** Hairline outline that separates glass chrome from a bright background. */
  hairline: 'rgba(255,255,255,0.16)',

  /** Instagram's live red — the LIVE badge and the recording dot. */
  live: '#FF3040',
  heart: '#FF2D55',
  success: '#30D158',
  warning: '#FF9F0A',
  neutralAction: '#3A3A3C',
  /** Instagram's badge gold, behind dark text on the "Buy a badge" prompt. */
  badge: '#F7C325',

  /** Scrim endpoints; consumed by Skia LinearGradient, which needs real colors. */
  scrimTransparent: 'rgba(0,0,0,0)',
  scrimOpaque: 'rgba(0,0,0,0.55)',
} as const;

/** Instagram's brand gradient, used for the story ring and the primary CTA. */
export const igGradient = ['#F9CE34', '#EE2A7B', '#6228D7'] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  pill: 999,
  card: 20,
  bubble: 18,
  sm: 10,
} as const;

/**
 * `fontWeight` is typed as the literal string union React Native expects, so
 * spreading a token straight into a StyleSheet type-checks under `strict`.
 */
export const type = {
  caption: { fontSize: 11, fontWeight: '600' },
  small: { fontSize: 12, fontWeight: '600' },
  body: { fontSize: 13, fontWeight: '400' },
  bodyStrong: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700' },
  display: { fontSize: 28, fontWeight: '700' },
} as const satisfies Record<string, { fontSize: number; fontWeight: '400' | '600' | '700' }>;

/**
 * Drop shadow applied to bare text that sits directly on the camera feed
 * (comment rows, follower count) so it survives a bright background even
 * where the scrim is thin.
 */
export const textShadow = {
  textShadowColor: 'rgba(0,0,0,0.75)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
} as const;
