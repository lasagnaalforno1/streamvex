import express, { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";
import path from "path";

// ── Inline types (standalone — no imports from the Next.js app) ───────────────

type LayoutPreset =
  | "fullscreen_facecam_top"
  | "fullscreen_facecam_bottom"
  | "split";

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditConfig {
  layout: LayoutPreset;
  gameplayCrop: CropBox;
  facecamCrop: CropBox;
  trimStart: number;
  trimEnd: number | null;
}

const DEFAULT_EDIT_CONFIG: EditConfig = {
  trimStart: 0,
  trimEnd: null,
  layout: "fullscreen_facecam_top",
  gameplayCrop: { x: 0.05, y: 0.05, width: 0.75, height: 0.75 },
  facecamCrop:  { x: 0.55, y: 0.55, width: 0.35, height: 0.35 },
};

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

function buildFilterComplex(config: EditConfig): string {
  const gpExpr = cropExpr(config.gameplayCrop);
  const fcExpr = cropExpr(config.facecamCrop);

  if (config.layout === "split") {
    return [
      `[0:v]${gpExpr},scale=1080:1152:force_original_aspect_ratio=increase,crop=1080:1152[gp]`,
      `[0:v]${fcExpr},scale=1080:768:force_original_aspect_ratio=increase,crop=1080:768[fc]`,
      `[gp][fc]vstack[out]`,
    ].join(";");
  }

  const FC_H = 672;
  const GP_H = 1248;

  if (config.layout === "fullscreen_facecam_top") {
    return [
      `[0:v]${fcExpr},scale=1080:${FC_H}:force_original_aspect_ratio=increase,crop=1080:${FC_H}[fc]`,
      `[0:v]${gpExpr},scale=1080:${GP_H}:force_original_aspect_ratio=increase,crop=1080:${GP_H}[gp]`,
      `[fc][gp]vstack[out]`,
    ].join(";");
  }

  // fullscreen_facecam_bottom
  return [
    `[0:v]${gpExpr},scale=1080:${GP_H}:force_original_aspect_ratio=increase,crop=1080:${GP_H}[gp]`,
    `[0:v]${fcExpr},scale=1080:${FC_H}:force_original_aspect_ratio=increase,crop=1080:${FC_H}[fc]`,
    `[gp][fc]vstack[out]`,
  ].join(";");
}

function processVideo(
  inputBuffer: Buffer,
  jobId: string,
  config: EditConfig,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tmpDir     = os.tmpdir();
    const inputPath  = path.join(tmpDir, `streamvex_in_${jobId}.mp4`);
    const outputPath = path.join(tmpDir, `streamvex_out_${jobId}.mp4`);

    console.log(`[ffmpeg:${jobId}] writing ${inputBuffer.length} bytes → ${inputPath}`);
    fs.writeFileSync(inputPath, inputBuffer);

    const filterComplex = buildFilterComplex(config);
    console.log(`[ffmpeg:${jobId}] layout=${config.layout}`);
    console.log(`[ffmpeg:${jobId}] filter_complex=${filterComplex}`);

    const inputOptions: string[] = [];
    if (config.trimStart > 0) inputOptions.push("-ss", String(config.trimStart));
    if (config.trimEnd !== null && config.trimEnd > config.trimStart) {
      inputOptions.push("-t", String(config.trimEnd - config.trimStart));
    }
    console.log(`[ffmpeg:${jobId}] inputOptions=${inputOptions.join(" ") || "(none)"}`);

    let stderrLines: string[] = [];

    const cmd = ffmpeg(inputPath);
    if (inputOptions.length > 0) cmd.inputOptions(inputOptions);

    cmd
      .outputOptions([
        "-filter_complex", filterComplex,
        "-map", "[out]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
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
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          resolve(outputBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        const stderr = stderrLines.slice(-20).join("\n");
        console.error(`[ffmpeg:${jobId}] error: ${err.message}`);
        console.error(`[ffmpeg:${jobId}] stderr (last 20 lines):\n${stderr}`);
        try {
          if (fs.existsSync(inputPath))  fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch {}
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

    // Run FFmpeg
    let outputBuffer: Buffer;
    try {
      outputBuffer = await processVideo(inputBuffer, clipId, config);
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
  .update({ status: "completed", output_path: outputPath, error_message: null })
  .eq("id", clipId);

if (completeError) {
  console.error(`[process:${clipId}] failed to mark completed:`, completeError.message);
  return res.status(500).json({ error: "Failed to update clip status to completed." });
}

console.log(`[process:${clipId}] status updated to completed`);
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

const PORT = parseInt(process.env.PORT || "3001", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[processor] listening on host 0.0.0.0 port ${PORT}`);
});
