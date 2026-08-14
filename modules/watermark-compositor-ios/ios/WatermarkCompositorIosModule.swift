import ExpoModulesCore
import AVFoundation
import UIKit

/// Burns a permanent "SIMULATED" watermark into a recorded video's pixels —
/// Layer 2 of the mandatory watermark policy (see WATERMARK_POLICY.md at the
/// project root). Uses AVFoundation's AVVideoCompositionCoreAnimationTool,
/// which composites a CALayer overlay (a low-opacity tiled diagonal pattern
/// covering the full frame, plus a bold bottom-center label) onto every
/// frame during export, so a simple crop can't remove it.
public class WatermarkCompositorIosModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WatermarkCompositorIos")

    AsyncFunction("burnIn") { (sourcePath: String, destinationPath: String, promise: Promise) in
      let sourceURL = URL(fileURLWithPath: sourcePath)
      let destinationURL = URL(fileURLWithPath: destinationPath)

      if FileManager.default.fileExists(atPath: destinationURL.path) {
        try? FileManager.default.removeItem(at: destinationURL)
      }

      let asset = AVURLAsset(url: sourceURL)

      guard let videoComposition = try? Self.buildWatermarkedComposition(for: asset) else {
        promise.reject("WATERMARK_BUILD_FAILED", "Could not build the watermark video composition")
        return
      }

      guard let exportSession = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
        promise.reject("EXPORT_SESSION_FAILED", "Could not create AVAssetExportSession")
        return
      }

      exportSession.outputURL = destinationURL
      exportSession.outputFileType = .mp4
      exportSession.videoComposition = videoComposition
      exportSession.shouldOptimizeForNetworkUse = true

      exportSession.exportAsynchronously {
        switch exportSession.status {
        case .completed:
          promise.resolve(destinationURL.path)
        case .failed:
          promise.reject("EXPORT_FAILED", exportSession.error?.localizedDescription ?? "Unknown export failure")
        case .cancelled:
          promise.reject("EXPORT_CANCELLED", "Watermark export was cancelled")
        default:
          promise.reject("EXPORT_UNKNOWN_STATE", "Watermark export ended in state \(exportSession.status.rawValue)")
        }
      }
    }
  }

  private static func buildWatermarkedComposition(for asset: AVAsset) throws -> AVMutableVideoComposition {
    guard let videoTrack = asset.tracks(withMediaType: .video).first else {
      throw NSError(
        domain: "WatermarkCompositorIos",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Source has no video track"]
      )
    }

    let transformedSize = videoTrack.naturalSize.applying(videoTrack.preferredTransform)
    let videoSize = CGSize(width: abs(transformedSize.width), height: abs(transformedSize.height))

    // NOTE(verify-on-device): `AVMutableVideoComposition(propertiesOf:)` is the
    // synchronous initializer; if the Xcode/SDK version used to build this
    // treats it as unavailable/deprecated-to-error, switch to the async
    // `AVMutableVideoComposition.videoComposition(withPropertiesOf:)` variant
    // and make this function async. Flagged per the Phase 1 plan's Tier 2
    // on-device verification step (see WATERMARK_POLICY.md).
    let videoComposition = AVMutableVideoComposition(propertiesOf: asset)
    videoComposition.renderSize = videoSize

    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: videoSize)

    let outputLayer = CALayer()
    outputLayer.frame = CGRect(origin: .zero, size: videoSize)
    // Core Animation layers default to a bottom-left origin in this context;
    // flip so the label/tile placement math below reads top-left, as authored.
    outputLayer.isGeometryFlipped = true
    outputLayer.addSublayer(videoLayer)
    outputLayer.addSublayer(makeTiledDiagonalWatermarkLayer(size: videoSize))
    outputLayer.addSublayer(makeBottomLabelLayer(size: videoSize))

    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: outputLayer
    )

    return videoComposition
  }

  /// Low-opacity "SIMULATED" text tiled diagonally across the whole frame, so no
  /// crop smaller than the full frame removes the disclosure.
  private static func makeTiledDiagonalWatermarkLayer(size: CGSize) -> CALayer {
    let container = CALayer()
    container.frame = CGRect(origin: .zero, size: size)
    container.masksToBounds = true

    let tileSpacingX: CGFloat = 220
    let tileSpacingY: CGFloat = 160
    let overscan: CGFloat = 200 // covers the corners once each tile is rotated

    var y: CGFloat = -overscan
    while y < size.height + overscan {
      var x: CGFloat = -overscan
      while x < size.width + overscan {
        let label = CATextLayer()
        label.string = "SIMULATED"
        label.font = UIFont.boldSystemFont(ofSize: 22)
        label.fontSize = 22
        label.alignmentMode = .center
        label.foregroundColor = UIColor.white.withAlphaComponent(0.16).cgColor
        label.bounds = CGRect(x: 0, y: 0, width: 220, height: 30)
        label.position = CGPoint(x: x, y: y)
        label.contentsScale = UIScreen.main.scale
        label.transform = CATransform3DMakeRotation(-.pi / 6, 0, 0, 1)
        container.addSublayer(label)
        x += tileSpacingX
      }
      y += tileSpacingY
    }

    return container
  }

  /// Bold, fully-opaque bottom-center pill — the primary human-legible disclosure.
  private static func makeBottomLabelLayer(size: CGSize) -> CALayer {
    let padding: CGFloat = 28
    let labelHeight: CGFloat = 44
    let labelWidth: CGFloat = min(size.width - padding * 2, 520)

    let background = CALayer()
    background.frame = CGRect(
      x: (size.width - labelWidth) / 2,
      y: size.height - padding - labelHeight,
      width: labelWidth,
      height: labelHeight
    )
    background.backgroundColor = UIColor.black.withAlphaComponent(0.55).cgColor
    background.cornerRadius = labelHeight / 2

    let text = CATextLayer()
    text.string = "⚠ SIMULATED — not a real livestream"
    text.font = UIFont.boldSystemFont(ofSize: 16)
    text.fontSize = 16
    text.alignmentMode = .center
    text.foregroundColor = UIColor.white.cgColor
    text.frame = background.bounds.insetBy(dx: 8, dy: 10)
    text.contentsScale = UIScreen.main.scale
    background.addSublayer(text)

    return background
  }
}
