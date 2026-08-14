import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();
  const [cameraPosition, setCameraPosition] = useState<TargetCameraPosition>('front');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [composerHeight, setComposerHeight] = useState(FALLBACK_COMPOSER_HEIGHT + insets.bottom);
  const [headerHeight, setHeaderHeight] = useState(FALLBACK_HEADER_HEIGHT + insets.top);

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
    // Android presents one permission dialog at a time. Firing both requests in
    // the same tick gets the second one dropped, leaving its native promise
    // unsettled until the JNI destructor collects it — which surfaces as
    // "Timeouted: JPromise was destroyed!". Await them in sequence instead.
    let cancelled = false;
    (async () => {
      if (!hasCameraPermission) await requestCameraPermission();
      if (cancelled) return;
      if (!hasMicPermission) await requestMicPermission();
    })();
    return () => {
      cancelled = true;
    };
  }, [hasCameraPermission, hasMicPermission, requestCameraPermission, requestMicPermission]);

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
    return (
      <View style={styles.permissionContainer}>
        <StatusBar style="light" hidden={false} />
        <View style={styles.permissionIcon}>
          <GlyphIcon name="cameraFlip" size={32} color={colors.textSecondary} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Camera and microphone access are required to go live.
        </Text>
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
    endSession({
      peakViewers: state.peakViewers,
      totalHearts: state.totalHearts,
      durationSec,
      finalVideoPath: undefined,
    });
    onSessionEnd?.();
  };

  const endLiveSession = async () => {
    setStatus('processing');
    const startedAtMs = useSessionStore.getState().startedAtMs ?? Date.now();
    const durationSec = (Date.now() - startedAtMs) / 1000;

    const raw = await RecordingService.stop().catch(() => undefined);
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
    });
    onSessionEnd?.();
  };

  const startLiveSession = async () => {
    if (Platform.OS === 'android') {
      const consented = await RecordingService.prepareAndroidConsent();
      if (!consented) return; // user declined the MediaProjection consent dialog
    }
    try {
      await RecordingService.start({ onUnexpectedStop: handleUnexpectedStop });
    } catch {
      return; // couldn't start recording; stay idle rather than "go live" without one
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
