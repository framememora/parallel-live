import * as MediaLibrary from 'expo-media-library';

/**
 * Centralizes permission requests that don't already have a dedicated request
 * path elsewhere. Camera/mic are requested directly via
 * react-native-vision-camera's hooks in LiveCameraScreen; Android screen-
 * recording consent is requested via RecordingService.prepareAndroidConsent()
 * since MediaProjection consent must fire synchronously from the "Go Live"
 * tap gesture, not from a generic permissions service.
 */
export const PermissionsService = {
  /** Write-only photo-library permission, so the app never gains read access to the user's existing library. */
  async requestMediaLibraryPermission(): Promise<boolean> {
    const response = await MediaLibrary.requestPermissionsAsync(true);
    return response.granted;
  },
};
