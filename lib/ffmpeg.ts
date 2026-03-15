import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";
import path from "path";
import type { EditConfig, CropBox } from "./types";

if (ffmpegStatic) {
  console.log("[ffmpeg] using ffmpeg-static binary:", ffmpegStatic);
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.warn("[ffmpeg] ffmpeg-static returned null — falling back to system ffmpeg");
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function clampCrop(c: CropBox): CropBox {
  const x = Math.max(0, Math.min(0.99, c.x));
  const y = Math.max(0, Math.min(0.99, c.y));
  return {
    x,
    y,
    width:  Math.max(0.01, Math.min(1 - x, c.width)),
    height: Math.max(0.01, Math.min(1 - y, c.height)),
  };
}

function cropExpr(c: CropBox): string {
  const { x, y, width, height } = clampCrop(c);
  return `crop=iw*${width}:ih*${height}:iw*${x}:ih*${y}`;
}

/**
 * Build a filter_complex string for the given edit config.
 *
 * Layouts:
 *   split                  — gameplay fills top 60 %, facecam fills bottom 40 %
 *   fullscreen_facecam_top — blurred gameplay bg + gameplay centered + facecam PiP at top
 *   fullscreen_facecam_bot — blurred gameplay bg + gameplay centered + facecam PiP at bottom
 *
 * Output label: [out]
 */
function buildFilterComplex(config: EditConfig): string {
  const gpExpr = cropExpr(config.gameplayCrop);
  const fcExpr = cropExpr(config.facecamCrop);


  if (config.layout === "split") {
    return [
      `[0:v]${gpExpr},scale=720:768:force_original_aspect_ratio=increase,crop=720:768[gp]`,
      `[0:v]${fcExpr},scale=720:512:force_original_aspect_ratio=increase,crop=720:512[fc]`,
      `[gp][fc]vstack[out]`,
    ].join(";");
  }

  // fullscreen_facecam_top:  facecam top 35 % (672 px) + gameplay bottom 65 % (1248 px)
  // fullscreen_facecam_bottom: gameplay top 65 % (1248 px) + facecam bottom 35 % (672 px)
  const FC_H = 448;  // 1920 * 0.35
  const GP_H = 832/ 1920 * 0.65

  if (config.layout === "fullscreen_facecam_top") {
    return [
    `[0:v]${gpExpr},scale=720:${GP_H}:force_original_aspect_ratio=increase,crop=720:${GP_H}[gp]`,
    `[0:v]${fcExpr},scale=720:${FC_H}:force_original_aspect_ratio=increase,crop=720:${FC_H}[fc]`,
    `[gp][fc]vstack[out]`,
  ].join(";");
}

  // fullscreen_facecam_bottom
return [
  `[0:v]${gpExpr},scale=720:${GP_H}:force_original_aspect_ratio=increase,crop=720:${GP_H}[gp]`,
  `[0:v]${fcExpr},scale=720:${FC_H}:force_original_aspect_ratio=increase,crop=720:${FC_H}[fc]`,
  `[gp][fc]vstack[out]`,
].join(";");
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Converts a video clip to 9:16 vertical format using the supplied EditConfig.
 *
 * @param inputBuffer  Raw bytes of the source video
 * @param jobId        Unique identifier used for temp-file names
 * @param config       Full editor configuration (trim, layout, crops)
 */
export function processVideo(
  inputBuffer: Buffer,
  jobId: string,
  config: EditConfig,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tmpDir     = os.tmpdir();
    const inputPath  = path.join(tmpDir, `streamvex_in_${jobId}.mp4`);
    const outputPath = path.join(tmpDir, `streamvex_out_${jobId}.mp4`);

    console.log(`[ffmpeg:${jobId}] writing ${inputBuffer.length} bytes to ${inputPath}`);
    fs.writeFileSync(inputPath, inputBuffer);

    const filterComplex = buildFilterComplex(config);
    console.log(`[ffmpeg:${jobId}] layout=${config.layout}`);
    console.log(`[ffmpeg:${jobId}] filter_complex=${filterComplex}`);

    // Input options for trim — placed before -i for fast keyframe seek
    const inputOptions: string[] = [];
    if (config.trimStart > 0) {
      inputOptions.push("-ss", String(config.trimStart));
    }
    if (config.trimEnd !== null && config.trimEnd > config.trimStart) {
      inputOptions.push("-t", String(config.trimEnd - config.trimStart));
    }
    console.log(`[ffmpeg:${jobId}] inputOptions=${inputOptions.join(" ") || "(none)"}`);

    // Capture stderr for diagnostics
    let stderrLines: string[] = [];

    const cmd = ffmpeg(inputPath);
    if (inputOptions.length > 0) cmd.inputOptions(inputOptions);

    cmd
      // Each flag and its value must be a separate array element so fluent-ffmpeg
      // passes them as distinct argv tokens to the ffmpeg process.
      .outputOptions([
  "-filter_complex", filterComplex,
  "-map", "[out]",
  "-map", "0:a?",
  "-r", "30",
  "-c:v", "libx264",
  "-preset", "ultrafast",
  "-crf", "28",
  "-c:a", "aac",
  "-b:a", "96k",
  "-movflags", "+faststart",
  "-pix_fmt", "yuv420p",
  "-y",
])
      .output(outputPath)
      .on("stderr", (line: string) => {
        stderrLines.push(line);
        // Only log error/warning lines to avoid drowning the console
        if (/error|warn|invalid|fail/i.test(line)) {
          console.warn(`[ffmpeg:${jobId}/stderr] ${line}`);
        }
      })
      .on("end", () => {
        console.log(`[ffmpeg:${jobId}] finished, reading output from ${outputPath}`);
        try {
          const outputBuffer = fs.readFileSync(outputPath);
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          resolve(outputBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        const stderr = stderrLines.slice(-20).join("\n"); // last 20 lines
        console.error(`[ffmpeg:${jobId}] error: ${err.message}`);
        console.error(`[ffmpeg:${jobId}] stderr (last 20 lines):\n${stderr}`);
        try {
          if (fs.existsSync(inputPath))  fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch {}
        // Attach stderr so the caller can log and surface it
        const enriched = new Error(err.message);
        (enriched as Error & { ffmpegStderr: string }).ffmpegStderr = stderr;
        reject(enriched);
      })
      .run();
  });
}
