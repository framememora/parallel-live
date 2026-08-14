/**
 * Deterministic avatars for simulated commenters. There are no avatar images
 * anywhere in the app and the authors are generated handles from
 * `engines/comments/slotPools.ts`, so each one gets a colored circle with its
 * first letter.
 *
 * Deliberately *not* random: the same handle must produce the same avatar every
 * time it appears in a session, otherwise a viewer re-appearing in the feed
 * would change color mid-recording and give the simulation away.
 */

/** Muted, saturated hues that all read against white text over a camera feed. */
const AVATAR_COLORS = [
  '#E1306C',
  '#F56040',
  '#FCAF45',
  '#4CB944',
  '#0095F6',
  '#833AB4',
  '#00B5AD',
  '#FF6482',
  '#5856D6',
  '#C13584',
] as const;

/** FNV-1a, 32-bit. Stable across runs, unlike anything seeded from `Math.random`. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function avatarColorFor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

/** First alphanumeric character, uppercased — handles leading `@`/`_` in generated names. */
export function initialFor(name: string): string {
  const match = name.match(/[a-z0-9]/i);
  return (match?.[0] ?? '?').toUpperCase();
}
