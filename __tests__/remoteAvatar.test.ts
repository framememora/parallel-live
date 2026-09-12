import { remoteAvatarUrlFor } from '../src/utils/remoteAvatar';
import { NAMES } from '../src/engines/comments/slotPools';

/** Mirrors the paths verified against the host: buckets, and indices 0-99. */
const URL_PATTERN = /^https:\/\/randomuser\.me\/api\/portraits\/(med\/)?(men|women)\/(\d{1,2})\.jpg$/;

describe('remoteAvatarUrlFor', () => {
  it('is deterministic: the same handle always yields the same portrait', () => {
    expect(remoteAvatarUrlFor('@sunny_days', 26)).toBe(remoteAvatarUrlFor('@sunny_days', 26));
  });

  it('only ever builds a URL the host actually serves', () => {
    for (let i = 0; i < 200; i++) {
      const url = remoteAvatarUrlFor(`viewer_${i}`, 26);
      const match = url.match(URL_PATTERN);
      expect(match).not.toBeNull();
      // Index 100 is a 404 on the host, so the modulo must never reach it.
      expect(Number(match![3])).toBeLessThan(100);
    }
  });

  it('spreads across both buckets and many indices', () => {
    const urls = Array.from({ length: 60 }, (_, i) => remoteAvatarUrlFor(`handle${i}`, 26));
    const buckets = new Set(urls.map((u) => u.match(URL_PATTERN)![2]));
    const indices = new Set(urls.map((u) => u.match(URL_PATTERN)![3]));

    expect(buckets.size).toBe(2);
    expect(indices.size).toBeGreaterThan(20);
  });

  it('gives every handle in the generated roster its own face', () => {
    // The tell this guards against: two commenters in one feed wearing the same
    // photo. Hashing alone collided badly at this pool size.
    const urls = NAMES.map((name) => remoteAvatarUrlFor(name, 26));

    expect(new Set(urls).size).toBe(NAMES.length);
  });

  it('has enough portraits for the roster to stay collision-free as it grows', () => {
    // 2 buckets x 100. Past this the roster wraps and starts sharing faces
    // again, so growing NAMES beyond it has to be a deliberate decision.
    expect(NAMES.length).toBeLessThanOrEqual(200);
  });

  it('still assigns a face to an author that is not in the roster', () => {
    // The vision model invents its own handles; those fall through to the hash.
    const invented = remoteAvatarUrlFor('someone_the_model_made_up', 26);

    expect(invented).toMatch(URL_PATTERN);
  });

  it('picks the smaller variant for comment-row avatars and the full one above that', () => {
    expect(remoteAvatarUrlFor('lunaaa', 26)).toContain('/med/');
    expect(remoteAvatarUrlFor('lunaaa', 38)).not.toContain('/med/');
  });

  it('serves the same portrait at both sizes, differing only in variant', () => {
    const small = remoteAvatarUrlFor('grumpy_gus', 26);
    const large = remoteAvatarUrlFor('grumpy_gus', 38);

    expect(small.replace('/med/', '/')).toBe(large);
  });
});
