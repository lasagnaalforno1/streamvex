import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { processVideo } from "@/lib/ffmpeg";
import { DEFAULT_EDIT_CONFIG } from "@/lib/types";
import type { EditConfig } from "@/lib/types";

export const maxDuration = 300; // 5 minutes — requires Vercel Pro; unlimited on VPS

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Verify the caller is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[process:${id}] user=${user.id}`);

    // Fetch the clip — RLS ensures it belongs to this user
    const { data: clip, error: clipError } = await supabase
      .from("clips")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (clipError || !clip) {
      console.error(`[process:${id}] clip not found:`, clipError?.message);
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    console.log(`[process:${id}] clip status=${clip.status}, input_path=${clip.input_path}`);

    if (!clip.input_path) {
      return NextResponse.json(
        { error: "Clip has no input file." },
        { status: 400 }
      );
    }

    // Prevent duplicate concurrent processing runs
    if (clip.status === "processing") {
      return NextResponse.json(
        { error: "Clip is already processing." },
        { status: 409 }
      );
    }

    // Mark as processing — use service client so this write always succeeds
    await serviceClient
      .from("clips")
      .update({ status: "processing", error_message: null })
      .eq("id", id);

    // ── Delegate to external processor if configured ──────────────────────────
    // On Vercel the ffmpeg-static binary is stripped from the deployment bundle
    // (it exceeds the 250 MB size limit). Set PROCESSOR_URL to a Railway/Render
    // service that runs the actual FFmpeg work. Falls back to local execution in
    // development when PROCESSOR_URL is unset.
    const PROCESSOR_URL    = process.env.PROCESSOR_URL;
    const PROCESSOR_SECRET = process.env.PROCESSOR_SECRET;

    if (PROCESSOR_URL) {
      if (!PROCESSOR_SECRET) {
        console.error(`[process:${id}] PROCESSOR_URL is set but PROCESSOR_SECRET is missing`);
        await serviceClient
          .from("clips")
          .update({ status: "error", error_message: "Processor misconfigured (missing secret)." })
          .eq("id", id);
        return NextResponse.json(
          { error: "Processor misconfigured." },
          { status: 500 }
        );
      }

      console.log(`[process:${id}] delegating to external processor: ${PROCESSOR_URL}`);
      try {
        const resp = await fetch(`${PROCESSOR_URL}/process/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Processor-Secret": PROCESSOR_SECRET,
          },
          // Give the processor almost the full Vercel budget
          signal: AbortSignal.timeout(280_000),
        });
        const json = await resp.json().catch(() => ({})) as {
          error?: string;
          success?: boolean;
          outputPath?: string;
        };
        if (!resp.ok) {
          return NextResponse.json(
            { error: json.error ?? "Processor returned an error." },
            { status: resp.status }
          );
        }
        return NextResponse.json(json);
      } catch (delegateError) {
        const msg =
          delegateError instanceof Error
            ? delegateError.message
            : "Failed to reach processor.";
        console.error(`[process:${id}] delegation failed:`, msg);
        await serviceClient
          .from("clips")
          .update({ status: "error", error_message: msg })
          .eq("id", id);
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }
    // ── Local FFmpeg (development only) ───────────────────────────────────────

    // Download the input file from storage
    console.log(`[process:${id}] downloading from storage: ${clip.input_path}`);
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from("clips")
      .download(clip.input_path);

    if (downloadError || !fileData) {
      console.error(`[process:${id}] download failed:`, downloadError?.message);
      await serviceClient
        .from("clips")
        .update({ status: "error", error_message: "Failed to download input file from storage." })
        .eq("id", id);
      return NextResponse.json(
        { error: "Failed to download input file." },
        { status: 500 }
      );
    }

    // Build EditConfig — prefer saved edit_config, fall back to legacy trim fields
    const inputBuffer = Buffer.from(await fileData.arrayBuffer());
    console.log(`[process:${id}] downloaded ${inputBuffer.length} bytes`);

    const savedConfig = clip.edit_config as EditConfig | null;
    const config: EditConfig = savedConfig ?? {
      ...DEFAULT_EDIT_CONFIG,
      trimStart: typeof clip.trim_start_seconds === "number" ? clip.trim_start_seconds : 0,
      trimEnd:   typeof clip.trim_end_seconds   === "number" ? clip.trim_end_seconds   : null,
    };
    console.log(`[process:${id}] config:`, JSON.stringify(config));

    let outputBuffer: Buffer;

    try {
      outputBuffer = await processVideo(inputBuffer, id, config);
    } catch (ffmpegError) {
      const rawMsg = ffmpegError instanceof Error ? ffmpegError.message : "FFmpeg processing failed.";
      const stderr = (ffmpegError as Error & { ffmpegStderr?: string }).ffmpegStderr ?? "";
      console.error(`[process:${id}] FFmpeg failed:`, rawMsg);
      if (stderr) console.error(`[process:${id}] FFmpeg stderr:\n${stderr}`);
      // Store the first line of the error (safe for DB, readable)
      const dbMsg = rawMsg.split("\n")[0].slice(0, 500);
      await serviceClient
        .from("clips")
        .update({ status: "error", error_message: dbMsg })
        .eq("id", id);
      // Return a useful summary to the client
      return NextResponse.json({ error: dbMsg }, { status: 500 });
    }

    // Upload processed output
    const outputPath = `${user.id}/${id}/output.mp4`;
    console.log(`[process:${id}] uploading ${outputBuffer.length} bytes to ${outputPath}`);

    const { error: uploadError } = await serviceClient.storage
      .from("clips")
      .upload(outputPath, outputBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[process:${id}] storage upload failed:`, uploadError.message);
      await serviceClient
        .from("clips")
        .update({ status: "error", error_message: "Failed to upload processed video to storage." })
        .eq("id", id);
      return NextResponse.json(
        { error: "Failed to upload processed video." },
        { status: 500 }
      );
    }

    // Mark as ready
    console.log(`[process:${id}] done — marking ready, output_path=${outputPath}`);
    await serviceClient
      .from("clips")
      .update({ status: "ready", output_path: outputPath, error_message: null })
      .eq("id", id);

    return NextResponse.json({ success: true, outputPath });
  } catch (err) {
    console.error("[process] unexpected error:", err);
    // Best-effort status update — id is in scope from the outer try
    try {
      const serviceClient = await createServiceClient();
      const msg = err instanceof Error ? err.message : "Unexpected server error.";
      await serviceClient
        .from("clips")
        .update({ status: "error", error_message: msg })
        .eq("id", id);
    } catch {}
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
