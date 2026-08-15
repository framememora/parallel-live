import * as MediaLibrary from 'expo-media-library';

export interface PhotoReadPermission {
  granted: boolean;
  /**
   * Android 14+ and iOS 14+ let the user grant access to a hand-picked subset
   * rather than the whole library. The grid is then legitimately short, which
   * looks like a bug unless the caller offers a way to widen the selection —
   * see `presentPhotoSelectionPicker`.
   */
  limited: boolean;
}

/**
 * Centralizes permission requests that don't already have a dedicated request
 * path elsewhere. Camera/mic are requested directly via
 * react-native-vision-camera's hooks in LiveCameraScreen; Android screen-
 * recording consent is requested via RecordingService.prepareAndroidConsent()
 * since MediaProjection consent must fire synchronously from the "Go Live"
 * tap gesture, not from a generic permissions service.
 */
export const PermissionsService = {
  /**
   * Write-only photo-library permission, for saving a finished recording.
   *
   * This is kept separate from the read request below rather than collapsed
   * into one broad grant: saving a clip is something every session may do,
   * while reading the library only happens if the user opens the profile-photo
   * picker. Asking for the narrower one here means a user who never sets a
   * photo is never asked for read access at all.
   */
  async requestMediaLibraryPermission(): Promise<boolean> {
    const response = await MediaLibrary.requestPermissionsAsync(true);
    return response.granted;
  },

  /**
   * Read access to the photo library, so the profile-photo picker can list the
   * user's own pictures.
   *
   * `['photo']` narrows the Android 13+ granular request to READ_MEDIA_IMAGES
   * — already declared in AndroidManifest.xml — so this never asks for video
   * or audio, which the app has no use for.
   */
  async requestPhotoReadPermission(): Promise<PhotoReadPermission> {
    const response = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    return { granted: response.granted, limited: response.accessPrivileges === 'limited' };
  },

  /**
   * Reopens the OS sheet for choosing *which* photos the app can see. Only
   * meaningful while access is `limited`; harmless otherwise.
   */
  async presentPhotoSelectionPicker(): Promise<void> {
    // 'photo' here is a `MediaTypeFilter`, a different vocabulary from the
    // `MediaType.IMAGE` ('image') used to filter a Query. Easy to cross.
    await MediaLibrary.presentPermissionsPicker(['photo']);
  },
};
