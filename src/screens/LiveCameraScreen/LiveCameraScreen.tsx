import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCameraPermission,
  useMicrophonePermission,
  type CameraRef,
  type TargetCameraPosition,
} from 'react-native-vision-camera';
import { GlyphIcon } from '../../components/icons/GlyphIcon';
import { Scrim } from '../../components/Scrim';
import { createMilestoneTracker } from '../../engines/milestoneTracker';
import { RecordingService } from '../../services/recording/RecordingService';
import { useSessionStore } from '../../state/sessionStore';
import { useSettingsStore } from '../../state/settingsStore';
import { colors, radii, spacing, type } from '../../theme/tokens';
import { SettingsSheet } from '../SettingsSheet/SettingsSheet';
import { ActionRail } from './components/ActionRail';
import { CameraPreview } from './components/CameraPreview';
import { CommentComposer } from './components/CommentComposer';
import { CommentFeed } from './components/CommentFeed';
import { GoLiveButton } from './components/GoLiveButton';
import { HeartBurstLayer, type HeartBurstLayerHandle } from './components/HeartBurstLayer';
import { LiveHeader } from './components/LiveHeader';
import { useAiCommentEngine } from './hooks/useAiCommentEngine';
import { useCommentEngine } from './hooks/useCommentEngine';
import { useFollowerCountEngine } from './hooks/useFollowerCountEngine';
import { useHeartBurstEngine } from './hooks/useHeartBurstEngine';
import { useViewerCountEngine } from './hooks/useViewerCountEngine';

export interface LiveCameraScreenProps {
  /** Called when the user ends a live session; receives the final session summary from the store. */
  onSessionEnd?: () => void;
}

/**
 * First-frame fallbacks only. The composer and the header both measure
 * themselves via `onLayout` and report back — an earlier revision hardcoded
 * these as the real values, which is what let the comment stack run under the
 * header. Guessing the height of a component that measures itself is the bug;
 * these numbers exist purely so the first paint isn't wildly off before layout
 * settles.
 */
const FALLBACK_COMPOSER_HEIGHT = 58;
// One row of identity chrome. Was 92 when the header carried a second status
// row; leaving it there made the comment feed jump down on first paint.
const FALLBACK_HEADER_HEIGHT = 58;

export function LiveCameraScreen({ onSessionEnd }: LiveCameraScreenProps) {
  const {
    hasPermission: hasCameraPermission,
    canRequestPermission: canRequestCamera,
    requestPermission: requestCameraPermission,
  } = useCameraPermission();
  const {
    hasPermission: hasMicPermission,
    canRequestPermission: canRequestMic,
    requestPermission: requestMicPermission,
  } = useMicrophonePermission();
  const [cameraPosition, setCameraPosition] = useState<TargetCameraPosition>('front');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  // Guards the one-shot permission sequence below.
  const permissionFlowRan = useRef(false);
  // Whether capture actually started, which the `recordSession` setting alone
  // can't tell `endLiveSession`: consent may have been declined, or `start()`
  // may have thrown, and stopping something that never started is not free.
  const recordingStartedRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [composerHeight, setComposerHeight] = useState(FALLBACK_COMPOSER_HEIGHT + insets.bottom);
  const [headerHeight, setHeaderHeight] = useState(FALLBACK_HEADER_HEIGHT + insets.top);

  const recordSession = useSettingsStore((s) => s.recordSession);

  const status = useSessionStore((s) => s.status);
  const currentViewers = useSessionStore((s) => s.currentViewers);
  const followers = useSessionStore((s) => s.followers);
  const comments = useSessionStore((s) => s.comments);
  const startSession = useSessionStore((s) => s.startSession);
  const addComment = useSessionStore((s) => s.addComment);
  const setStatus = useSessionStore((s) => s.setStatus);
  const endSession = useSessionStore((s) => s.endSession);

  const isLive = status === 'live';
  const isProcessing = status === 'processing';
  const heartLayerRef = useRef<HeartBurstLayerHandle>(null);
  const milestoneTracker = useMemo(() => createMilestoneTracker(), []);

  // The composer measures itself including its own safe-area padding, so this
  // is a real distance from the screen bottom edge.
  const feedBottom = composerHeight + spacing.sm;
  // Keeps the stack from ever reaching the header; the feed clips its own top.
  const feedMaxHeight = Math.max(96, screenHeight - headerHeight - feedBottom - spacing.lg);

  useEffect(() => {
    // Runs exactly once per mount. It used to depend on the two `hasPermission`
    // flags, which defeated the sequencing below: granting the camera flipped
    // its flag mid-flight, re-ran the effect, and fired a *second* microphone
    // request while the first dialog was still open.
    if (permissionFlowRan.current) return;
    permissionFlowRan.current = true;

    (async () => {
      try {
        // Android presents one permission dialog at a time. Firing both requests
        // in the same tick gets the second one dropped, leaving its native
        // promise unsettled until the JNI destructor collects it — which
        // surfaces as "Timeouted: JPromise was destroyed!". Await them in
        // sequence instead.
        //
        // Gated on `canRequestPermission`, not `!hasPermission`: VisionCamera
        // only permits a request while the status is 'not-determined'. Asking
        // for one already 'denied' or 'restricted' is dropped by the OS and
        // orphans its promise the same way — see the gate below for the only
        // route out of that state.
        if (canRequestCamera) await requestCameraPermission();
        if (canRequestMic) await requestMicPermission();
      } catch {
        // `requestPermission` awaits the native call with no catch of its own,
        // so a rejection escapes as an unhandled promise rejection. The gate
        // below already renders the un-granted state; nothing here to recover.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drainAiComments = useAiCommentEngine(isLive, cameraRef);

  useViewerCountEngine(isLive, milestoneTracker);
  useFollowerCountEngine(isLive);
  useCommentEngine(isLive, milestoneTracker, drainAiComments);
  const { triggerTap } = useHeartBurstEngine(isLive, heartLayerRef, milestoneTracker);

  const flipCamera = useCallback(() => {
    setCameraPosition((p) => (p === 'front' ? 'back' : 'front'));
  }, []);

  // There was a 1s interval here feeding an elapsed-time pill in the header.
  // The pill is gone, and with it a setState that re-rendered this whole screen
  // once per second for the entire broadcast. Duration is still derived from
  // `startedAtMs` at session end, which is where it's actually displayed.

  const handleHeartAt = useCallback(
    (x: number, y: number) => {
      if (!isLive) return;
      triggerTap(x, y);
    },
    [isLive, triggerTap]
  );

  if (!hasCameraPermission || !hasMicPermission) {
    const missing = [
      !hasCameraPermission && 'Camera',
      !hasMicPermission && 'Microphone',
    ].filter(Boolean) as string[];
    const missingText = missing.join(' and ');
    // A permission that is un-granted *and* no longer requestable is 'denied' or
    // 'restricted'. VisionCamera only allows a request while 'not-determined',
    // so there is no dialog left to raise — system Settings is the only route,
    // and without this the screen waits forever for a grant that can't arrive.
    const stuck =
      (!hasCameraPermission && !canRequestCamera) || (!hasMicPermission && !canRequestMic);

    return (
      <View style={styles.permissionContainer}>
        <StatusBar style="light" hidden={false} />
        <View style={styles.permissionIcon}>
          <GlyphIcon name="cameraFlip" size={32} color={colors.textSecondary} />
        </View>
        <Text style={styles.permissionTitle}>{missingText} access needed</Text>
        <Text style={styles.permissionText}>
          {stuck
            ? `Turn ${missingText.toLowerCase()} access on in Settings — once it's been denied, the app isn't allowed to ask again.`
            : `${missingText} access ${missing.length === 1 ? 'is' : 'are'} required to go live.`}
        </Text>
        {stuck && (
          <Pressable
            // No listener needed on the way back: usePermission re-reads status
            // on AppState 'active', so granting in Settings clears this gate.
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={({ pressed }) => [styles.permissionButton, pressed && styles.pressedChrome]}
          >
            <Text style={styles.permissionButtonLabel}>Open Settings</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const handleTap = (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!isLive) return;
    triggerTap(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
  };

  const handleUnexpectedStop = () => {
    // The OS stopped recording outside of our control (e.g. the user tapped
    // ReplayKit's system stop button, or dismissed the Android notification).
    // We have no file to process in this path, so end the session without a video.
    // Computed fresh from the store rather than closing over `elapsedSec` state,
    // since this callback is registered once at start() and would otherwise see
    // a stale value from whatever render was current at that moment.
    const state = useSessionStore.getState();
    const durationSec = state.startedAtMs ? (Date.now() - state.startedAtMs) / 1000 : 0;
    recordingStartedRef.current = false;
    endSession({
      peakViewers: state.peakViewers,
      totalHearts: state.totalHearts,
      durationSec,
      finalVideoPath: undefined,
      // Hardcoded rather than read from the setting: this listener only exists
      // because recording started, so a recording was definitely requested, and
      // a literal can't go stale the way a captured setting could.
      recordingRequested: true,
    });
    onSessionEnd?.();
  };

  const endLiveSession = async () => {
    setStatus('processing');
    const startedAtMs = useSessionStore.getState().startedAtMs ?? Date.now();
    const durationSec = (Date.now() - startedAtMs) / 1000;

    // Only stop what actually started — recording is opt-in, and consent can be
    // declined even when it's on.
    const raw = recordingStartedRef.current
      ? await RecordingService.stop().catch(() => undefined)
      : undefined;
    recordingStartedRef.current = false;
    // The recording is saved as captured. There used to be a re-encode pass here
    // that composited a "SIMULATED" overlay into the video track; it was removed
    // deliberately, and skipping it also drops a full re-encode from the end of
    // every session, so saving is now near-instant.
    const finalVideoPath = raw?.path;

    endSession({
      peakViewers: useSessionStore.getState().peakViewers,
      totalHearts: useSessionStore.getState().totalHearts,
      durationSec,
      finalVideoPath,
      recordingRequested: recordSession,
    });
    onSessionEnd?.();
  };

  const startLiveSession = async () => {
    recordingStartedRef.current = false;

    // Nothing about the simulation needs screen capture — the engines are pure
    // JS over a camera preview. Capture exists only to produce a saveable clip,
    // so when the user hasn't asked for one we skip consent and the native call
    // entirely and go live instantly.
    if (recordSession) {
      // This used to `return` on a declined dialog or a failed start, leaving
      // the button looking broken. That was the watermark era, when saving an
      // un-watermarked file was forbidden; that policy is gone, and the summary
      // now carries `recordingRequested` so the end screen can say plainly that
      // the recording failed. Go live either way.
      const consented = Platform.OS !== 'android' || (await RecordingService.prepareAndroidConsent());
      if (consented) {
        try {
          await RecordingService.start({ onUnexpectedStop: handleUnexpectedStop });
          recordingStartedRef.current = true;
        } catch {
          recordingStartedRef.current = false;
        }
      }
    }

    startSession();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <CameraPreview ref={cameraRef} position={cameraPosition} isActive />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap} />

      {isLive && <Scrim edge="top" height={headerHeight + spacing.xl} intensity={0.4} />}
      {isLive && <Scrim edge="bottom" height={feedBottom + 140} intensity={0.45} />}

      {isLive && (
        <CommentFeed comments={comments} bottomOffset={feedBottom} maxHeight={feedMaxHeight} />
      )}
      <HeartBurstLayer ref={heartLayerRef} />

      {!isProcessing && (
        <LiveHeader
          isLive={isLive}
          viewers={currentViewers}
          followers={followers}
          onEnd={endLiveSession}
          topInset={insets.top}
          onMeasure={setHeaderHeight}
          // Withheld while live: the avatar goes inert so a stray tap can't
          // pull a modal over the recording.
          onOpenSettings={isLive ? undefined : () => setSettingsOpen(true)}
        />
      )}

      {isLive && (
        <ActionRail
          onHeart={handleHeartAt}
          onFlipCamera={flipCamera}
          bottomOffset={feedBottom + spacing.sm}
        />
      )}

      {isLive && (
        <CommentComposer
          onSubmit={addComment}
          onHeart={handleHeartAt}
          bottomInset={insets.bottom}
          onMeasure={setComposerHeight}
        />
      )}

      {/* Idle-only: while live the same control lives in the action rail. */}
      {status === 'idle' && (
        <Pressable
          style={[styles.flipButton, { top: insets.top + spacing.sm }]}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
          onPress={flipCamera}
        >
          <GlyphIcon name="cameraFlip" size={22} color={colors.textPrimary} />
        </Pressable>
      )}

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator color={colors.textPrimary} size="large" />
          <Text style={styles.processingText}>Processing your recording…</Text>
        </View>
      )}

      {status === 'idle' && <GoLiveButton onPress={startLiveSession} bottomInset={insets.bottom} />}

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  permissionTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  permissionText: {
    ...type.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  permissionButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  permissionButtonLabel: {
    ...type.label,
    color: colors.textPrimary,
  },
  pressedChrome: {
    opacity: 0.6,
  },
  flipButton: {
    position: 'absolute',
    right: spacing.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  processingText: {
    ...type.label,
    color: colors.textPrimary,
  },
});
