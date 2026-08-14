import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { CameraRef } from 'react-native-vision-camera';
import type { GeneratedComment } from '../../../engines/comments/types';
import { generateCommentsForFrame } from '../../../services/ai/CommentVisionService';
import { useSettingsStore } from '../../../state/settingsStore';
import { arrayBufferToBase64 } from '../../../utils/base64';

/** How often a frame is captured and sent. Deliberately slow — this is a network round trip and a privacy cost. */
const CAPTURE_INTERVAL_MS = 20_000;
/** Longest edge sent to the API. The preview bitmap is full device resolution, which is far more detail than short comments need. */
const MAX_EDGE_PX = 768;
const JPEG_QUALITY = 60;
/** Cap the buffer so a stale batch can't keep surfacing minutes after the frame it described. */
const MAX_BUFFERED = 6;

let aiSeq = 0;

/**
 * Captures a still from the live preview every `CAPTURE_INTERVAL_MS`, asks the
 * model for viewer comments about it, and buffers them for the comment
 * scheduler to drain at its own pace.
 *
 * Android only: vision-camera's `takeSnapshot()` throws unconditionally on iOS
 * (`HybridPreviewView.swift:122`). On iOS this hook is inert and the feed stays
 * fully template-driven.
 *
 * Returns a stable `drain` to hand to `CommentScheduler`'s `externalSource`.
 * The network work deliberately happens here rather than in the scheduler, so
 * the scheduler's `tick()` stays synchronous.
 */
export function useAiCommentEngine(active: boolean, cameraRef: React.RefObject<CameraRef | null>) {
  const buffer = useRef<GeneratedComment[]>([]);
  const enabled = useSettingsStore((s) => s.aiCommentsEnabled);
  const isSupported = Platform.OS === 'android';

  const drain = useCallback((): GeneratedComment | undefined => buffer.current.shift(), []);

  useEffect(() => {
    if (!active || !enabled || !isSupported) {
      buffer.current = [];
      return;
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const captureOnce = async () => {
      const camera = cameraRef.current;
      if (!camera) return;

      const snapshot = await camera.takeSnapshot();

      // Downscale before encoding: the preview bitmap is device-resolution, and
      // a 768px frame is ample for "what is this person doing".
      const longEdge = Math.max(snapshot.width, snapshot.height);
      const scale = longEdge > MAX_EDGE_PX ? MAX_EDGE_PX / longEdge : 1;
      const framed =
        scale < 1
          ? snapshot.resize(Math.round(snapshot.width * scale), Math.round(snapshot.height * scale))
          : snapshot;

      const encoded = await framed.toEncodedImageDataAsync('jpg', JPEG_QUALITY);
      if (cancelled) return;

      const comments = await generateCommentsForFrame(arrayBufferToBase64(encoded.buffer), controller.signal);
      if (cancelled) return;

      const now = Date.now();
      for (const comment of comments) {
        aiSeq += 1;
        buffer.current.push({
          id: `ai-${now}-${aiSeq}`,
          templateId: 'ai-vision',
          // The persona only tints the avatar for generated commenters. AI
          // comments deliberately don't push onto the scheduler's persona
          // rotation, so this value never skews the template mix.
          persona: 'supportive',
          author: comment.author,
          text: comment.text,
          createdAt: now,
        });
      }
      if (buffer.current.length > MAX_BUFFERED) {
        buffer.current = buffer.current.slice(-MAX_BUFFERED);
      }
    };

    const loop = async () => {
      // Swallowed on purpose: a dark frame, a rate limit, a dropped connection,
      // or a missing key should quietly leave the template feed running rather
      // than interrupt a recording in progress.
      await captureOnce().catch(() => undefined);
      if (cancelled) return;
      timer = setTimeout(loop, CAPTURE_INTERVAL_MS);
    };

    // Small initial delay so the preview surface is actually ready — a snapshot
    // taken too early throws "PreviewView isn't ready yet!".
    timer = setTimeout(loop, 2500);

    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) clearTimeout(timer);
      buffer.current = [];
    };
  }, [active, enabled, isSupported, cameraRef]);

  return drain;
}
