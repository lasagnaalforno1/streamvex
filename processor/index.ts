import express, { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ── Inline types (standalone — no imports from the Next.js app) ───────────────

type LayoutPreset =
  | "fullscreen_facecam_top"
  | "fullscreen_facecam_bottom"
  | "split"
  | "gameplay_only"
  | "blur_background";

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ClipSegment {
  start: number;
  end: number;
}

interface EditConfig {
  layout: LayoutPreset;
  gameplayCrop: CropBox;
  facecamCrop: CropBox;
  trimStart: number;
  trimEnd: number | null;
  segments?: ClipSegment[];
}

interface OutputSettings {
  width: number;    // output frame width  (720 free / 1080 pro)
  height: number;   // output frame height (1280 free / 1920 pro)
  fps: number;      // 30 always for free; 30 or 60 for pro
  watermark: boolean;
}

const DEFAULT_EDIT_CONFIG: EditConfig = {
  trimStart: 0,
  trimEnd: null,
  layout: "fullscreen_facecam_top",
  gameplayCrop: { x: 0.05, y: 0.05, width: 0.75, height: 0.75 },
  facecamCrop:  { x: 0.55, y: 0.55, width: 0.35, height: 0.35 },
};

// ── Version banner ────────────────────────────────────────────────────────────
console.log("[processor] PROCESSOR VERSION: QUALITY_TIERS_V1");
console.log("[processor] cuts strategy: preprocess-stitch (no trim/atrim filter_complex)");
console.log("[processor] quality tiers: free=720p/30fps/watermark  pro=1080p/30-60fps/no-watermark");

// ── FFmpeg setup ──────────────────────────────────────────────────────────────

console.log("[ffmpeg] platform:", process.platform, "arch:", process.arch);
console.log("[ffmpeg] ffmpeg-static resolved path:", ffmpegStatic);

if (ffmpegStatic) {
  try {
    if (fs.existsSync(ffmpegStatic)) {
      const stat = fs.statSync(ffmpegStatic);
      console.log(`[ffmpeg] binary exists — ${stat.size} bytes`);
      ffmpeg.setFfmpegPath(ffmpegStatic);
    } else {
      console.error("[ffmpeg] binary NOT FOUND at path:", ffmpegStatic);
      const parentDir = path.dirname(ffmpegStatic);
      if (fs.existsSync(parentDir)) {
        console.error("[ffmpeg] ls of parent dir:", fs.readdirSync(parentDir).join(", "));
      } else {
        console.error("[ffmpeg] parent dir does not exist:", parentDir);
      }
    }
  } catch (err) {
    console.error("[ffmpeg] startup check failed:", err);
  }
} else {
  console.warn("[ffmpeg] ffmpeg-static returned null — falling back to system ffmpeg");
}

// ── FFmpeg helpers ────────────────────────────────────────────────────────────

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

function buildFilterComplex(config: EditConfig, s: OutputSettings): string {
  const { width: W, height: H } = s;
  const gpExpr = cropExpr(config.gameplayCrop);
  const fcExpr = cropExpr(config.facecamCrop);

  // Each branch produces [layout_out]. The watermark step below converts it to [out].
  let layoutPart: string;

  if (config.layout === "split") {
    const gpH = Math.round(H * 0.6);
    const fcH = H - gpH;
    layoutPart = [
      `[0:v]${gpExpr},scale=${W}:${gpH}:force_original_aspect_ratio=increase,crop=${W}:${gpH}[gp]`,
      `[0:v]${fcExpr},scale=${W}:${fcH}:force_original_aspect_ratio=increase,crop=${W}:${fcH}[fc]`,
      `[gp][fc]vstack[layout_out]`,
    ].join(";");
  } else if (config.layout === "gameplay_only") {
    layoutPart = `[0:v]${gpExpr},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}[layout_out]`;
  } else if (config.layout === "blur_background") {
    const fgH = Math.round(H * 0.703); // keeps the same ~70% fill ratio as the original 900/1280
    layoutPart = [
      `[0:v]${gpExpr},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:5[bg]`,
      `[0:v]${gpExpr},scale=-2:${fgH}:force_original_aspect_ratio=decrease[fg]`,
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[layout_out]`,
    ].join(";");
  } else {
    // fullscreen_facecam_top / fullscreen_facecam_bottom
    const FC_H = Math.round(H * 0.35); // facecam takes 35% of height
    const GP_H = H - FC_H;
    if (config.layout === "fullscreen_facecam_top") {
      layoutPart = [
        `[0:v]${fcExpr},scale=${W}:${FC_H}:force_original_aspect_ratio=increase,crop=${W}:${FC_H}[fc]`,
        `[0:v]${gpExpr},scale=${W}:${GP_H}:force_original_aspect_ratio=increase,crop=${W}:${GP_H}[gp]`,
        `[fc][gp]vstack[layout_out]`,
      ].join(";");
    } else {
      layoutPart = [
        `[0:v]${gpExpr},scale=${W}:${GP_H}:force_original_aspect_ratio=increase,crop=${W}:${GP_H}[gp]`,
        `[0:v]${fcExpr},scale=${W}:${FC_H}:force_original_aspect_ratio=increase,crop=${W}:${FC_H}[fc]`,
        `[gp][fc]vstack[layout_out]`,
      ].join(";");
    }
  }

  if (s.watermark) {
    // Proportional sizing: ~32px text at 1280h, ~20px padding
    const fontsize = Math.round(H * 0.025);
    const padX     = Math.round(W * 0.028);
    const padY     = Math.round(H * 0.016);
    return `${layoutPart};[layout_out]drawtext=text='streamvex.com':fontsize=${fontsize}:fontcolor=white@0.6:x=w-tw-${padX}:y=h-th-${padY}[out]`;
  }

  // No watermark — rename the label directly
  return layoutPart.replace("[layout_out]", "[out]");
}

/**
 * Low-level FFmpeg runner — spawns with an explicit args array, never a shell
 * string. Resolves on exit code 0; rejects with a trimmed stderr tail otherwise.
 */
function runFfmpeg(args: string[], label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin  = ffmpegStatic ?? "ffmpeg";
    const proc = spawn(bin, args);
    const stderrLines: string[] = [];

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderrLines.push(...chunk.toString().split("\n"));
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const tail = stderrLines.slice(-15).join("\n");
        reject(new Error(`[${label}] ffmpeg exited with code ${code}:\n${tail}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`[${label}] spawn failed: ${err.message}`));
    });
  });
}

/**
 * Extract one time range from inputPath into outputPath using stream copy.
 * -ss before -i = fast keyframe seek.
 * -avoid_negative_ts make_zero resets the first timestamp to 0, which is
 * required for the concat demuxer to stitch files without gaps or drift.
 */
async function extractSegment(
  inputPath: string,
  outputPath: string,
  start: number,
  end: number,
  label: string,
): Promise<void> {
  await runFfmpeg(
    [
      "-ss", String(start),
      "-t",  String(end - start),
      "-i",  inputPath,
      "-c",  "copy",
      "-avoid_negative_ts", "make_zero",
      "-y",
      outputPath,
    ],
    label,
  );
}

/**
 * Given a list of time-range segments, extracts each as a temp MP4 then
 * stitches them with the FFmpeg concat demuxer (not the concat filter).
 *
 * Why the demuxer instead of the filter graph:
 *   The concat filter requires careful stream-type interleaving and is fragile
 *   when combined with the layout filter_complex. The demuxer operates purely
 *   at the container level — each segment is a stand-alone file, timestamps are
 *   already reset to 0, and the stitch is a plain stream copy with no filter
 *   graph whatsoever. The resulting file is a normal MP4 that feeds into the
 *   existing render pipeline unchanged.
 *
 * Returns the path to the stitched temp file. The caller must delete it after use.
 * If only one valid segment is given, that segment file is returned directly
 * (no stitch step needed).
 */
/**
 * Detect the video framerate of `inputPath` by running `ffmpeg -i` and parsing
 * its stderr. FFmpeg always exits non-zero when no output is given, but it
 * always prints stream metadata first. We parse the first "N fps" occurrence.
 * Returns 30 on any failure so processing always continues.
 */
async function getSourceFps(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    const bin  = ffmpegStatic ?? "ffmpeg";
    const proc = spawn(bin, ["-i", inputPath]);
    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on("close", () => {
      const match = stderr.match(/(\d+(?:\.\d+)?)\s+fps/);
      resolve(match ? parseFloat(match[1]) : 30);
    });
    proc.on("error", () => resolve(30));
  });
}

/**
 * Resolve output encoding settings based on the user's plan tier and the
 * detected source framerate.
 *
 * Free : 720×1280  30 fps  watermark
 * Pro  : 1080×1920 30 fps  no watermark
 *        1080×1920 60 fps  no watermark  — only when source >= 50 fps
 *
 * 60 fps is gated on source fps so we never manufacture frames that weren't
 * there and don't bloat file size without a real quality gain.
 */
function getOutputSettings(isPro: boolean, sourceFps: number): OutputSettings {
  if (!isPro) {
    return { width: 720, height: 1280, fps: 30, watermark: true };
  }
  const fps = sourceFps >= 50 ? 60 : 30;
  return { width: 1080, height: 1920, fps, watermark: false };
}

async function buildStitchedInputFromCuts(
  inputPath: string,
  segments: ClipSegment[],
  jobId: string,
): Promise<string> {
  const valid = segments
    .filter((s) => s.start >= 0 && s.end > s.start)
    .sort((a, b) => a.start - b.start);

  if (valid.length === 0) {
    throw new Error(`[${jobId}] buildStitchedInputFromCuts: no valid segments`);
  }

  const tmpDir   = os.tmpdir();
  const segPaths: string[] = [];

  // ── step 1: extract each segment ──────────────────────────────────────────
  for (let i = 0; i < valid.length; i++) {
    const { start, end } = valid[i];
    const segPath = path.join(tmpDir, `streamvex_seg_${jobId}_${i}.mp4`);
    console.log(`[${jobId}] segment ${i}: ${start}s–${end}s → ${segPath}`);
    await extractSegment(inputPath, segPath, start, end, `${jobId}/seg${i}`);
    segPaths.push(segPath);
  }

  // ── single segment: skip the concat step ──────────────────────────────────
  if (segPaths.length === 1) {
    console.log(`[${jobId}] single segment — skipping stitch`);
    return segPaths[0];
  }

  // ── step 2: write the concat demuxer list ─────────────────────────────────
  // -safe 0 allows absolute paths. Temp names use only [a-z0-9_.-] so no
  // escaping of the paths is needed.
  const listPath = path.join(tmpDir, `streamvex_concat_${jobId}.txt`);
  fs.writeFileSync(
    listPath,
    segPaths.map((p) => `file '${p}'`).join("\n") + "\n",
    "utf8",
  );
  console.log(`[${jobId}] concat list (${segPaths.length} entries) → ${listPath}`);

  // ── step 3: stitch ────────────────────────────────────────────────────────
  const stitchedPath = path.join(tmpDir, `streamvex_stitched_${jobId}.mp4`);
  await runFfmpeg(
    [
      "-f",    "concat",
      "-safe", "0",
      "-i",    listPath,
      "-c",    "copy",
      "-y",
      stitchedPath,
    ],
    `${jobId}/stitch`,
  );
  console.log(`[${jobId}] stitched → ${stitchedPath}`);

  // ── step 4: clean up segment files + list (stitched file stays) ───────────
  for (const p of segPaths) try { fs.unlinkSync(p); } catch {}
  try { fs.unlinkSync(listPath); } catch {}

  return stitchedPath;
}

async function processVideo(
  inputBuffer: Buffer,
  jobId: string,
  config: EditConfig,
  isPro: boolean,
): Promise<Buffer> {
  const tmpDir     = os.tmpdir();
  const inputPath  = path.join(tmpDir, `streamvex_in_${jobId}.mp4`);
  const outputPath = path.join(tmpDir, `streamvex_out_${jobId}.mp4`);

  console.log(`[ffmpeg:${jobId}] writing ${inputBuffer.length} bytes → ${inputPath}`);
  fs.writeFileSync(inputPath, inputBuffer);

  // ── cuts preprocessing ────────────────────────────────────────────────────
  // When segments are defined, extract + stitch them into one temp file first.
  // The stitched file is a normal MP4 — the render pipeline below is unchanged.
  const segs        = config.segments;
  const hasSegments = Array.isArray(segs) && segs.length > 0;

  let stitchedPath: string | null = null;
  let effectiveInputPath          = inputPath;

  if (hasSegments) {
    console.log(`[ffmpeg:${jobId}] USING NEW STITCHED CUTS PATH — ${segs!.length} segment(s)`);
    stitchedPath      = await buildStitchedInputFromCuts(inputPath, segs!, jobId);
    effectiveInputPath = stitchedPath;
  } else {
    console.log(`[ffmpeg:${jobId}] no cuts — using original input directly`);
  }

  // ── quality tier ──────────────────────────────────────────────────────────
  const sourceFps = await getSourceFps(effectiveInputPath);
  const settings  = getOutputSettings(isPro, sourceFps);
  console.log(`[ffmpeg:${jobId}] tier=${isPro ? "pro" : "free"} source_fps=${sourceFps} output=${settings.width}x${settings.height}@${settings.fps}fps watermark=${settings.watermark}`);

  // ── render ────────────────────────────────────────────────────────────────
  const filterComplex = buildFilterComplex(config, settings);
  console.log(`[ffmpeg:${jobId}] layout=${config.layout}`);
  console.log(`[ffmpeg:${jobId}] filter_complex=${filterComplex}`);

  // Input seek/trim — skip when cuts were used (stitched file is already trimmed).
  const inputOptions: string[] = [];
  if (!hasSegments) {
    if (config.trimStart > 0) inputOptions.push("-ss", String(config.trimStart));
    if (config.trimEnd !== null && config.trimEnd > config.trimStart) {
      inputOptions.push("-t", String(config.trimEnd - config.trimStart));
    }
  }
  console.log(`[ffmpeg:${jobId}] inputOptions=${inputOptions.join(" ") || "(none)"}`);

  const cleanup = () => {
    try { if (fs.existsSync(inputPath))  fs.unlinkSync(inputPath);  } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    if (stitchedPath) try { if (fs.existsSync(stitchedPath)) fs.unlinkSync(stitchedPath); } catch {}
  };

  return new Promise<Buffer>((resolve, reject) => {
    const stderrLines: string[] = [];

    const cmd = ffmpeg(effectiveInputPath);
    if (inputOptions.length > 0) cmd.inputOptions(inputOptions);

    cmd
      .outputOptions([
        "-filter_complex", filterComplex,
        "-map", "[out]",
        "-map", "0:a?",
        "-r", String(settings.fps),
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
        if (/error|warn|invalid|fail/i.test(line)) {
          console.warn(`[ffmpeg:${jobId}/stderr] ${line}`);
        }
      })
      .on("end", () => {
        console.log(`[ffmpeg:${jobId}] finished — reading output`);
        try {
          const outputBuffer = fs.readFileSync(outputPath);
          cleanup();
          resolve(outputBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        const stderr = stderrLines.slice(-20).join("\n");
        console.error(`[ffmpeg:${jobId}] error: ${err.message}`);
        console.error(`[ffmpeg:${jobId}] stderr (last 20 lines):\n${stderr}`);
        cleanup();
        const enriched = new Error(err.message);
        (enriched as Error & { ffmpegStderr: string }).ffmpegStderr = stderr;
        reject(enriched);
      })
      .run();
  });
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL) console.error("[startup] SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is not set");
if (!SERVICE_KEY)  console.error("[startup] SUPABASE_SERVICE_ROLE_KEY is not set");

function getServiceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Express app ───────────────────────────────────────────────────────────────
console.log("[startup] processor booting...");
const app = express();
app.use(express.json());

const SECRET = process.env.PROCESSOR_SECRET ?? "";
if (!SECRET) console.warn("[startup] PROCESSOR_SECRET is not set — all requests will be rejected");

function requireSecret(req: Request, res: Response, next: () => void) {
  const provided = req.headers["x-processor-secret"];
  if (!SECRET || provided !== SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    ffmpegPath: ffmpegStatic ?? "system",
    ffmpegExists: ffmpegStatic ? fs.existsSync(ffmpegStatic) : null,
  });
});

app.post("/process/:id", requireSecret, async (req: Request, res: Response) => {
  const clipId = req.params.id;
  console.log(`\n[process:${clipId}] ── request received ──`);

  const supabase = getServiceClient();

  try {
    // Fetch clip
    const { data: clip, error: clipError } = await supabase
      .from("clips")
      .select("*")
      .eq("id", clipId)
      .single();

    if (clipError || !clip) {
      console.error(`[process:${clipId}] clip not found:`, clipError?.message);
      return res.status(404).json({ error: "Clip not found" });
    }

    console.log(`[process:${clipId}] status=${clip.status}, input_path=${clip.input_path}`);

    if (!clip.input_path) {
      return res.status(400).json({ error: "Clip has no input file." });
    }

    // Download input
    console.log(`[process:${clipId}] downloading from storage…`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("clips")
      .download(clip.input_path);

    if (downloadError || !fileData) {
  console.error(`[process:${clipId}] download failed:`, downloadError?.message);

  await supabase
    .from("clips")
    .update({
      status: "error",
      error_message: "Failed to download input file."
    })
    .eq("id", clipId);

  return res.status(500).json({ error: "Failed to download input file." });
}

    const inputBuffer = Buffer.from(await fileData.arrayBuffer());
    console.log(`[process:${clipId}] downloaded ${inputBuffer.length} bytes`);

    // Build EditConfig
    const savedConfig = clip.edit_config as EditConfig | null;
    const config: EditConfig = savedConfig ?? {
      ...DEFAULT_EDIT_CONFIG,
      trimStart: typeof clip.trim_start_seconds === "number" ? clip.trim_start_seconds : 0,
      trimEnd:   typeof clip.trim_end_seconds   === "number" ? clip.trim_end_seconds   : null,
    };
    console.log(`[process:${clipId}] config:`, JSON.stringify(config));

    // Entitlement: Next.js passes isPro after checking the user's plan
    const isPro = Boolean((req.body as { isPro?: boolean }).isPro);
    console.log(`[process:${clipId}] isPro=${isPro}`);

    // Run FFmpeg
    let outputBuffer: Buffer;
    try {
      outputBuffer = await processVideo(inputBuffer, clipId, config, isPro);
    } catch (ffmpegError) {
      const rawMsg = ffmpegError instanceof Error ? ffmpegError.message : "FFmpeg processing failed.";
      const stderr = (ffmpegError as Error & { ffmpegStderr?: string }).ffmpegStderr ?? "";
      console.error(`[process:${clipId}] FFmpeg failed:`, rawMsg);
      if (stderr) console.error(`[process:${clipId}] FFmpeg stderr:\n${stderr}`);
      const dbMsg = rawMsg.split("\n")[0].slice(0, 500);
      await supabase
        .from("clips")
        .update({ status: "error", error_message: dbMsg })
        .eq("id", clipId);
      return res.status(500).json({ error: dbMsg });
    }

    // Upload output
    // Upload output
const outputPath = `${clip.user_id}/${clipId}/output.mp4`;

const { error: uploadError } = await supabase.storage
  .from("clips")
  .upload(outputPath, outputBuffer, { contentType: "video/mp4", upsert: true });

if (uploadError) {
  console.error(`[process:${clipId}] upload failed:`, uploadError.message);

  await supabase
    .from("clips")
    .update({
      status: "error",
      error_message: "Failed to upload processed video."
    })
    .eq("id", clipId);

  return res.status(500).json({ error: "Failed to upload processed video." });
}

    // Mark completed
const { error: completeError } = await supabase
  .from("clips")
  .update({
    status: "ready",
    output_path: outputPath,
    error_message: null,
  })
  .eq("id", clipId);

if (completeError) {
  console.error(`[process:${clipId}] failed to mark completed:`, completeError.message);
  return res.status(500).json({ error: "Failed to update clip status to ready." });
}

console.log(`[process:${clipId}] status updated to ready`);
console.log(`[process:${clipId}] ── done ✓ ──`);
return res.json({ success: true, outputPath });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error.";
    console.error(`[process:${clipId}] unexpected error:`, err);
    try {
      await getServiceClient()
        .from("clips")
        .update({ status: "error", error_message: msg })
        .eq("id", clipId);
    } catch {}
    return res.status(500).json({ error: msg });
  }
});

// ── yt-dlp import ─────────────────────────────────────────────────────────────

// Video extensions yt-dlp may produce (in preference order)
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mkv", ".mov", ".m4v"];

/**
 * Scan a directory for the first non-partial video file yt-dlp may have written.
 * yt-dlp writes a `.part` file during download and renames it on completion, so
 * we explicitly skip `.part` files.
 */
function findDownloadedFile(dir: string): string | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  for (const ext of VIDEO_EXTENSIONS) {
    const match = entries.find(
      (f) => f.toLowerCase().endsWith(ext) && !f.toLowerCase().endsWith(".part"),
    );
    if (match) return path.join(dir, match);
  }
  return null;
}

/**
 * Download a URL via yt-dlp into an isolated directory.
 *
 * Returns the title (from yt-dlp's --print) and the absolute path of the
 * downloaded file. The caller is responsible for cleaning up the directory.
 *
 * Why a directory instead of a fixed path:
 *   yt-dlp determines the final extension itself (even when --merge-output-format
 *   is set it may fall back to webm/mkv if ffmpeg is unavailable or the format
 *   selector produces a different container). Giving it a directory + template
 *   prevents a fixed-path mismatch from hiding the real file.
 */
async function downloadWithYtDlp(
  url: string,
  outputDir: string,
  jobId: string,
): Promise<{ title: string; filePath: string }> {
  // `video.%(ext)s` gives yt-dlp full control over the extension while keeping
  // the base name predictable for the subsequent directory scan.
  const outputTemplate = path.join(outputDir, "video.%(ext)s");

  const args: string[] = [
    "--no-playlist",
    // Capture the video title so we can update the clip DB row.
    // IMPORTANT: --print implies --simulate in yt-dlp; --no-simulate overrides that
    // so the file is actually downloaded while still printing the title to stdout.
    "--print", "%(title)s",
    "--no-simulate",
    // Prefer best video up to 720p merged with best audio
    "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]",
    "--merge-output-format", "mp4",
    "-o", outputTemplate,
    "--no-warnings",
    "--no-progress",
  ];

  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    // yt-dlp needs ffmpeg to mux separate video+audio streams
    args.push("--ffmpeg-location", ffmpegStatic);
    console.log(`[import:${jobId}] ffmpeg-location: ${ffmpegStatic}`);
  } else {
    console.warn(`[import:${jobId}] ffmpeg-static not found — merge may produce non-mp4`);
  }

  args.push(url);
  console.log(`[import:${jobId}] yt-dlp command: yt-dlp ${args.join(" ")}`);

  let stdout = "";
  try {
    const result = await execFileAsync("yt-dlp", args, {
      timeout: 5 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = result.stdout;
    if (result.stderr?.trim()) {
      console.log(`[import:${jobId}] yt-dlp stderr: ${result.stderr.trim()}`);
    }
  } catch (err) {
    const execErr = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    if (execErr.stderr?.trim()) {
      console.error(`[import:${jobId}] yt-dlp stderr:\n${execErr.stderr.trim()}`);
    }
    throw new Error(`yt-dlp failed: ${execErr.message}`);
  }

  // --print outputs the title as the first line of stdout
  const title = (stdout.trim().split("\n")[0] ?? "").slice(0, 200);

  // Log what yt-dlp actually wrote so failures are easy to diagnose
  const dirEntries = fs.readdirSync(outputDir);
  console.log(`[import:${jobId}] files in download dir: [${dirEntries.join(", ") || "(empty)"}]`);

  const filePath = findDownloadedFile(outputDir);
  if (!filePath) {
    throw new Error(
      `yt-dlp finished but no video file found. Dir contents: [${dirEntries.join(", ")}]`,
    );
  }

  console.log(`[import:${jobId}] resolved download file: ${filePath}`);
  return { title, filePath };
}

app.post("/import", requireSecret, async (req: Request, res: Response) => {
  const { clipId, url, userId } = req.body as {
    clipId?: string;
    url?: string;
    userId?: string;
    platform?: string;
  };

  if (!clipId || !url || !userId) {
    res.status(400).json({ error: "Missing clipId, url, or userId." });
    return;
  }

  console.log(`\n[import:${clipId}] ── request received ──`);
  console.log(`[import:${clipId}] url=${url}`);

  // Acknowledge immediately — download runs in the background.
  // The clip-page status poller picks up the DB update when the processor finishes.
  res.json({ ok: true, clipId });

  const supabase = getServiceClient();
  // Isolated per-job directory so yt-dlp's output files never collide
  const tmpDir = path.join(os.tmpdir(), `streamvex_import_${clipId}`);

  (async () => {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      console.log(`[import:${clipId}] tmp dir: ${tmpDir}`);

      const { title, filePath } = await downloadWithYtDlp(url, tmpDir, clipId);
      console.log(`[import:${clipId}] download complete — title="${title}"`);

      const buffer   = fs.readFileSync(filePath);
      const fileSize = buffer.length;
      console.log(`[import:${clipId}] file size: ${fileSize} bytes`);

      const inputPath = `${userId}/${clipId}/input.mp4`;
      const { error: uploadError } = await supabase.storage
        .from("clips")
        .upload(inputPath, buffer, { contentType: "video/mp4", upsert: true });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
      console.log(`[import:${clipId}] uploaded to storage: ${inputPath}`);

      const updates: Record<string, unknown> = {
        status:        "ready",
        input_path:    inputPath,
        file_size:     fileSize,
        error_message: null,
      };
      if (title) updates.title = title;

      await supabase.from("clips").update(updates).eq("id", clipId);
      console.log(`[import:${clipId}] ── done ✓ ──`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      console.error(`[import:${clipId}] error:`, err);
      await supabase
        .from("clips")
        .update({ status: "error", error_message: msg.slice(0, 500) })
        .eq("id", clipId);
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  })();
});

const PORT = parseInt(process.env.PORT || "3001", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[processor] listening on host 0.0.0.0 port ${PORT}`);
});
