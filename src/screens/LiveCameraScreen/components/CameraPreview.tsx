import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import { Camera, type CameraRef, type TargetCameraPosition } from 'react-native-vision-camera';

interface CameraPreviewProps {
  position: TargetCameraPosition;
  isActive: boolean;
}

/**
 * Live preview only — no `outputs` configured. Recording is handled at the OS
 * screen-capture level (see RecordingService), not via vision-camera's own
 * recording pipeline, since the overlay UI must be captured too (see plan §2).
 */
export const CameraPreview = forwardRef<CameraRef, CameraPreviewProps>(function CameraPreview(
  { position, isActive },
  ref
) {
  return <Camera ref={ref} style={StyleSheet.absoluteFill} device={position} isActive={isActive} />;
});
