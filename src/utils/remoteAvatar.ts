import { hashString } from './avatar';
import { NAMES } from '../engines/comments/slotPools';

/**
 * Profile photo URL for a simulated commenter.
 *
 * The handles come from `engines/comments/slotPools.ts` and no account exists
 * behind any of them, so the photo is picked from randomuser.me's portrait set
 * — 100 images per bucket, served straight off their CDN with no API call, no
 * key, and no query string. Real photographs, which is the point: a letter disc
 * or a drawn silhouette reads as a placeholder next to a real live feed.
 *
 * Deterministic per handle for the same reason as `avatarColorFor`: a commenter
 * reappearing mid-recording must not change face. It also means the whole feed
 * converges on a small set of URLs, so the image cache stops making requests
 * almost immediately.
 *
 * Purely cosmetic, and never sent anything about the user — the handle is
 * hashed locally and only an index reaches the network.
 */

/** randomuser.me splits its portraits into these two paths. */
const PORTRAIT_BUCKETS = ['men', 'women'] as const;
/** Indices run 0-99 in each bucket; 100 is a 404. */
const PORTRAITS_PER_BUCKET = 100;
/** Every portrait, addressed as one flat space before being split back out. */
const TOTAL_PORTRAITS = PORTRAIT_BUCKETS.length * PORTRAITS_PER_BUCKET;

/**
 * Size variants of the same portrait. Picked by rendered size so a 26pt comment
 * avatar isn't decoding a 128px JPEG, and a larger one isn't upscaling a 72px
 * one. `med` is 72px, the unprefixed path 128px.
 */
const MED_VARIANT_MAX_PT = 36;

/**
 * The generated roster gets dealt consecutive portraits rather than hashed
 * ones, because hashing 62 handles into 200 slots collides hard — by birthday
 * it left 47 distinct faces, one of them shared by four different commenters.
 * Two handles wearing the same face in one feed is exactly the tell the rest of
 * this module exists to avoid.
 *
 * Only the generated pool can be dealt from, since it's the only roster known
 * up front; anything else (an author invented by the vision model) still hashes.
 * Assumes the pool stays within `TOTAL_PORTRAITS` — `remoteAvatar.test.ts`
 * fails if it ever outgrows it.
 */
const ROSTER_SLOTS = new Map(NAMES.map((name, index) => [name, index % TOTAL_PORTRAITS]));

function portraitSlotFor(name: string): number {
  return ROSTER_SLOTS.get(name) ?? hashString(`${name}#portrait`) % TOTAL_PORTRAITS;
}

export function remoteAvatarUrlFor(name: string, size: number): string {
  const slot = portraitSlotFor(name);
  const bucket = PORTRAIT_BUCKETS[slot % PORTRAIT_BUCKETS.length];
  const index = Math.floor(slot / PORTRAIT_BUCKETS.length);
  const variant = size <= MED_VARIANT_MAX_PT ? 'med/' : '';
  return `https://randomuser.me/api/portraits/${variant}${bucket}/${index}.jpg`;
}
