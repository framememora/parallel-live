import { AssetField, MediaType, Query } from 'expo-media-library';

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
    return Promise.all(
      assets.map(async (asset) => ({ id: asset.id, uri: await asset.getUri() }))
    );
  },
};
