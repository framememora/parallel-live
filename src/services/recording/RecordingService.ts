import { Platform } from 'react-native';
import {
  addScreenRecordingListener,
  cancelInAppRecording,
  requestMicrophonePermission,
  requestScreenRecordingConsent,
  startGlobalRecording,
  startInAppRecording,
  stopGlobalRecording,
  stopInAppRecording,
  type RecordingError,
  type ScreenRecordingEvent,
} from 'react-native-nitro-screen-recorder';

export interface RecordingResult {
  path: string;
  durationSec: number;
}

export interface StartRecordingOptions {
  enableMic?: boolean;
  /** Called if the OS stops recording outside of our own stop()/cancel() (e.g. the user taps ReplayKit's system stop button, or the Android notification). */
  onUnexpectedStop?: () => void;
  /** Android only: fired if the global recording session errors after start. */
  onRecordingError?: (error: RecordingError) => void;
}

/**
 * Wraps react-native-nitro-screen-recorder and isolates the ReplayKit
 * (iOS, in-app-only capture) vs MediaProjection (Android, whole-device
 * capture) split behind one platform-agnostic start/stop API. This is what
 * actually captures the camera feed *and* the RN overlay (comments, hearts,
 * counters) as one file — see plan §2 for why vision-camera's own recording
 * can't do this.
 */
class RecordingServiceImpl {
  private stopListenerCleanup: (() => void) | undefined;
  private stoppingOurselves = false;

  /**
   * Android only. Must be called synchronously from the "Go Live" tap handler —
   * MediaProjection consent requires a direct user gesture, not an async/deferred trigger.
   *
   * Declining the dialog **rejects** rather than resolving `false`: the library
   * fails the coroutine with a bare `Exception("Global recording permission
   * denied")` and its `requestScreenRecordingConsent()` awaits that with no
   * `catch`, so the library's own `Promise<boolean>` type is wrong on that path.
   * Without this catch the rejection escapes as an unhandled promise rejection
   * and the caller's `if (!consented)` guard never runs.
   */
  async prepareAndroidConsent(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      return await requestScreenRecordingConsent();
    } catch {
      return false;
    }
  }

  async start({ enableMic = true, onUnexpectedStop, onRecordingError }: StartRecordingOptions = {}): Promise<void> {
    // The permission request resolves a status object rather than rejecting, so
    // a denial is only visible in `.granted`. Recording with `enableMic` still
    // true after a denial makes `startGlobalRecording` throw synchronously, so
    // fall back to a mic-less recording instead of failing the whole session.
    let micEnabled = enableMic;
    if (enableMic) {
      const mic = await requestMicrophonePermission().catch(() => undefined);
      micEnabled = mic?.granted ?? false;
    }

    this.stoppingOurselves = false;
    this.stopListenerCleanup?.();
    this.stopListenerCleanup = addScreenRecordingListener({
      ignoreRecordingsInitiatedElsewhere: false,
      listener: (event: ScreenRecordingEvent) => {
        if (event.reason === 'ended' && !this.stoppingOurselves) {
          onUnexpectedStop?.();
        }
      },
    });

    if (Platform.OS === 'ios') {
      await startInAppRecording({
        options: { enableMic: micEnabled, enableCamera: false },
        onRecordingFinished: () => {
          // Completion is consumed via stop()'s return value / the
          // addScreenRecordingListener above; this is just a required
          // callback on the library's iOS API.
        },
      });
    } else {
      startGlobalRecording({
        // `usePreparedConsent` consumes the session `prepareAndroidConsent()`
        // just created. Without it the prepared session is discarded and
        // Android raises the MediaProjection dialog a *second* time.
        options: { enableMic: micEnabled, usePreparedConsent: true },
        onRecordingError: (error) => onRecordingError?.(error),
      });
    }
  }

  async stop(): Promise<RecordingResult | undefined> {
    this.stoppingOurselves = true;
    const file =
      Platform.OS === 'ios' ? await stopInAppRecording() : await stopGlobalRecording({ settledTimeMs: 800 });
    this.stopListenerCleanup?.();
    this.stopListenerCleanup = undefined;
    if (!file) return undefined;
    return { path: file.path, durationSec: file.duration };
  }

  async cancel(): Promise<void> {
    this.stoppingOurselves = true;
    if (Platform.OS === 'ios') {
      await cancelInAppRecording();
    } else {
      await stopGlobalRecording().catch(() => undefined);
    }
    this.stopListenerCleanup?.();
    this.stopListenerCleanup = undefined;
  }
}

export const RecordingService = new RecordingServiceImpl();
