import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { detectTwitchClip } from "@/lib/platform";

// Only creates the DB row + fires the processor trigger — no heavy work here
export const maxDuration = 15;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawUrl = (body.url ?? "").trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "URL is required." }, { status: 400 });
  }

  // Server-side validation — mirrors client-side detection
  const clipInfo = detectTwitchClip(rawUrl);
  if (!clipInfo) {
    return NextResponse.json(
      { error: "Only Twitch clip links are supported." },
      { status: 422 }
    );
  }

  // Create the clip row — status "uploading" while the processor downloads
  const service = createServiceClient();
  const { data: clip, error: dbError } = await service
    .from("clips")
    .insert({
      user_id: user.id,
      title:   `Twitch clip`,
      status:  "uploading",
    })
    .select()
    .single();

  if (dbError || !clip) {
    console.error("[import-link] db insert error:", dbError);
    return NextResponse.json({ error: "Failed to create clip." }, { status: 500 });
  }

  // Trigger the processor's /import endpoint.
  // The processor acks immediately and handles the download in the background,
  // then updates the clip to status "ready" (or "error") when done.
  const rawProcessorUrl = (process.env.PROCESSOR_URL ?? "").trim();
  const processorUrl    = rawProcessorUrl.startsWith("http")
    ? rawProcessorUrl
    : rawProcessorUrl ? `https://${rawProcessorUrl}` : "";
  const processorSecret = process.env.PROCESSOR_SECRET ?? "";

  if (processorUrl) {
    fetch(`${processorUrl}/import`, {
      method:  "POST",
      headers: {
        "Content-Type":       "application/json",
        "x-processor-secret": processorSecret,
      },
      body: JSON.stringify({
        clipId:   clip.id,
        url:      clipInfo.normalizedUrl,
        userId:   user.id,
        platform: "twitch_clip",
      }),
    }).catch((err) =>
      console.error("[import-link] processor trigger failed:", err)
    );
  } else {
    console.warn("[import-link] PROCESSOR_URL not set — import will not run");
  }

  return NextResponse.json({ clipId: clip.id }, { status: 201 });
}
