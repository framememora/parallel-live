import { Album, Asset } from 'expo-media-library';
import { PermissionsService } from '../permissions/PermissionsService';

const ALBUM_NAME = 'Fake Livestream';

function toFileUri(path: string): string {
  return /^[a-zA-Z]+:\/\//.test(path) ? path : `file://${path}`;
}

export const CameraRollService = {
  /** Saves the recorded video into a dedicated camera-roll album. Throws if permission is denied. */
  async saveVideo(path: string): Promise<void> {
    const granted = await PermissionsService.requestMediaLibraryPermission();
    if (!granted) {
      throw new Error('Photo library permission was denied.');
    }

    const asset = await Asset.create(toFileUri(path));
    const existingAlbum = await Album.get(ALBUM_NAME);
    if (existingAlbum) {
      await existingAlbum.add(asset);
    } else {
      await Album.create(ALBUM_NAME, [asset], false);
    }
  },
};
