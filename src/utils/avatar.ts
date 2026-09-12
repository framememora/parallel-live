/**
 * Deterministic look for simulated commenters. The authors are generated
 * handles from `engines/comments/slotPools.ts`, not real accounts, so there is
 * no photo behind any of them — `remoteAvatar.ts` derives a portrait URL from
 * this same hash and `illustratedAvatar.ts` draws the face shown beneath it
 * until it loads (or instead of it, offline). This letter disc stays the
 * broadcaster's own placeholder, before they set a photo.
 *
 * Deliberately *not* random: the same handle must produce the same avatar every
 * time it appears in a session, otherwise a viewer re-appearing in the feed
 * would change look mid-recording and give the simulation away.
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
export function hashString(value: string): number {
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
