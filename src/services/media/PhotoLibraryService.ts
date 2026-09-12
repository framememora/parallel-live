import { AssetField, MediaType, Query } from 'expo-media-library';
import { warn } from '../../utils/log';

/** One gallery photo, reduced to what the picker grid actually renders. */
export interface LibraryPhoto {
  id: string;
  uri: string;
}

/**
 * How many photos the picker offers. Bounded on purpose: resolving a URI is a
 * native call per asset (see below), and a profile picture is almost always a
 * recent one.
 */
const PAGE_SIZE = 60;

/**
 * Reads the user's own photos for the profile-picture picker.
 *
 * Uses the `Query` builder rather than the familiar `getAssetsAsync`, which is
 * not merely deprecated in SDK 57 but *throws at runtime* when imported from
 * the package root (`expo-media-library/build/legacyWarnings.js`). This is the
 * same modern API `CameraRollService` already uses for `Asset.create` /
 * `Album.get`, so the two services stay consistent.
 */
export const PhotoLibraryService = {
  async listRecentPhotos(): Promise<LibraryPhoto[]> {
    const assets = await new Query()
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
      .limit(PAGE_SIZE)
      .exe();

    // `exeForMetadata()` would be one cheap call for the whole page, but its
    // `AssetMetadata` carries no `uri` — the one field a thumbnail needs. So
    // the URIs are resolved individually, in parallel, once per open.
    //
    // `allSettled`, not `all`: one asset that won't resolve — a file removed
    // behind the media store's back, or one outside a "selected photos" grant —
    // used to reject the whole page and report "we couldn't load your photos"
    // for a library that is almost entirely readable. A missing photo now costs
    // its own thumbnail and nothing else.
    const resolved = await Promise.allSettled(
      assets.map(async (asset) => ({ id: asset.id, uri: await asset.getUri() }))
    );

    const photos = resolved
      .filter((r): r is PromiseFulfilledResult<LibraryPhoto> => r.status === 'fulfilled')
      .map((r) => r.value);

    // Everything failing is a different thing from a few gaps — that is the
    // library being unreadable, and the picker's error state is the honest
    // response. Throwing keeps that path intact.
    if (photos.length === 0 && assets.length > 0) {
      const [first] = resolved;
      warn('photo-library', first?.status === 'rejected' ? first.reason : 'every asset failed to resolve');
      throw new Error('None of the photos on this device could be read.');
    }

    return photos;
  },
};
