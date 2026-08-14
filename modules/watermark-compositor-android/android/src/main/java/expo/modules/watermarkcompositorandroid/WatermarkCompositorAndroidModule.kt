package expo.modules.watermarkcompositorandroid

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.media.MediaMetadataRetriever
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Burns a permanent "SIMULATED" watermark into a recorded video's pixels —
 * Layer 2 of the mandatory watermark policy (see WATERMARK_POLICY.md at the
 * project root). Uses Jetpack Media3 Transformer with a static full-frame
 * bitmap overlay (a low-opacity tiled diagonal pattern plus a bold
 * bottom-center label), so a simple crop can't remove it.
 *
 * The overlay is built with `BitmapOverlay.createStaticBitmapOverlay`, which is
 * stable across media3 1.5–1.11. An earlier revision used
 * `StaticOverlaySettings` plus `overlay.setOverlaySettings(...)`; neither exists
 * in the pinned 1.5.1 (`StaticOverlaySettings` landed later, and `BitmapOverlay`
 * has no such setter — settings are passed at construction), which failed the
 * first EAS build at `:watermark-compositor-android:compileReleaseKotlin`.
 * Prefer the factory over hand-built settings so this survives whichever media3
 * version Gradle resolves.
 */
@UnstableApi
class WatermarkCompositorAndroidModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WatermarkCompositorAndroid")

    AsyncFunction("burnIn") { sourcePath: String, destinationPath: String, promise: expo.modules.kotlin.Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("NO_CONTEXT", "React context unavailable", null)
        return@AsyncFunction
      }

      val destinationFile = File(destinationPath)
      if (destinationFile.exists()) destinationFile.delete()

      val (videoWidth, videoHeight) = readVideoDimensions(sourcePath)
      val overlayBitmap = buildWatermarkBitmap(videoWidth, videoHeight)

      // Overlay bitmap is already sized to match the video frame exactly, so the
      // default overlay settings draw it edge-to-edge rather than centered/scaled.
      val overlay = BitmapOverlay.createStaticBitmapOverlay(overlayBitmap)

      val overlayEffect = OverlayEffect(listOf(overlay))
      val mediaItem = MediaItem.fromUri(File(sourcePath).toURI().toString())
      val editedMediaItem = EditedMediaItem.Builder(mediaItem)
        .setEffects(Effects(emptyList(), listOf(overlayEffect)))
        .build()

      val transformer = Transformer.Builder(context)
        .addListener(object : Transformer.Listener {
          override fun onCompleted(composition: Composition, exportResult: ExportResult) {
            promise.resolve(destinationPath)
          }

          override fun onError(
            composition: Composition,
            exportResult: ExportResult,
            exportException: ExportException
          ) {
            promise.reject("EXPORT_FAILED", exportException.message ?: "Unknown export failure", exportException)
          }
        })
        .build()

      transformer.start(editedMediaItem, destinationPath)
    }
      // Media3's Transformer must be built and started on one Looper thread, and
      // verifyApplicationThread() throws "Transformer is accessed on the wrong
      // thread" otherwise. Expo runs AsyncFunction bodies on Queues.DEFAULT — a
      // background thread with no Looper — so Transformer.Builder would fall back
      // to the main Looper and then reject start() from this thread. Pinning the
      // whole function to MAIN keeps both on the same Looper.
      .runOnQueue(Queues.MAIN)
  }

  private fun readVideoDimensions(path: String): Pair<Int, Int> {
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(path)
      val width = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 1080
      val height = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 1920
      val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      if (rotation == 90 || rotation == 270) height to width else width to height
    } finally {
      retriever.release()
    }
  }

  /** Draws the tiled diagonal pattern + bottom-center label onto a transparent bitmap the size of the video frame. */
  private fun buildWatermarkBitmap(width: Int, height: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    val tilePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.argb(40, 255, 255, 255) // ~16% opacity white
      textSize = 44f
      typeface = Typeface.DEFAULT_BOLD
      textAlign = Paint.Align.CENTER
    }

    val tileSpacingX = 420f
    val tileSpacingY = 320f
    val overscan = 400f

    canvas.save()
    canvas.rotate(-30f, width / 2f, height / 2f)
    var y = -overscan
    while (y < height + overscan) {
      var x = -overscan
      while (x < width + overscan) {
        canvas.drawText("SIMULATED", x, y, tilePaint)
        x += tileSpacingX
      }
      y += tileSpacingY
    }
    canvas.restore()

    val labelWidth = (width - 56f).coerceAtMost(1040f)
    val labelHeight = 88f
    val labelLeft = (width - labelWidth) / 2f
    val labelTop = height - 56f - labelHeight

    val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.argb(140, 0, 0, 0)
    }
    canvas.drawRoundRect(
      labelLeft, labelTop, labelLeft + labelWidth, labelTop + labelHeight,
      labelHeight / 2, labelHeight / 2, backgroundPaint
    )

    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      textSize = 32f
      typeface = Typeface.DEFAULT_BOLD
      textAlign = Paint.Align.CENTER
    }
    canvas.drawText(
      "⚠ SIMULATED — not a real livestream",
      width / 2f,
      labelTop + labelHeight / 2f + textPaint.textSize / 3f,
      textPaint
    )

    return bitmap
  }
}
