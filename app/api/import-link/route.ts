import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { detectPlatform } from "@/lib/platform";

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

  // Server-side platform detection (mirrors client-side)
  const info = detectPlatform(rawUrl);
  if (!info) {
    return NextResponse.json(
      { error: "Unsupported link. Paste a YouTube video or Twitch clip URL." },
      { status: 422 }
    );
  }

  if (info.status === "unsupported") {
    return NextResponse.json(
      {
        error: info.note ?? `${info.displayName} isn't supported yet.`,
        platform: info.platform,
      },
      { status: 422 }
    );
  }

  // Create the clip row — status "uploading" while the processor downloads
  const service = createServiceClient();
  const { data: clip, error: dbError } = await service
    .from("clips")
    .insert({
      user_id: user.id,
      title: `${info.displayName} clip`,
      status: "uploading",
    })
    .select()
    .single();

  if (dbError || !clip) {
    console.error("[import-link] db insert error:", dbError);
    return NextResponse.json({ error: "Failed to create clip." }, { status: 500 });
  }

  // Trigger the processor's /import endpoint.
  // The processor responds immediately and handles the download in the background,
  // then updates the clip status to "ready" (or "error") when done.
  const rawProcessorUrl = (process.env.PROCESSOR_URL ?? "").trim();
  const processorUrl = rawProcessorUrl.startsWith("http")
    ? rawProcessorUrl
    : rawProcessorUrl ? `https://${rawProcessorUrl}` : "";
  const processorSecret = process.env.PROCESSOR_SECRET ?? "";

  if (processorUrl) {
    // Fire-and-forget — processor acks immediately, download is async
    fetch(`${processorUrl}/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-processor-secret": processorSecret,
      },
      body: JSON.stringify({
        clipId: clip.id,
        url: info.normalizedUrl,
        userId: user.id,
        platform: info.platform,
      }),
    }).catch((err) =>
      console.error("[import-link] processor trigger failed:", err)
    );
  } else {
    console.warn("[import-link] PROCESSOR_URL not set — import will not run");
  }

  return NextResponse.json(
    {
      clipId: clip.id,
      platform: info.platform,
      displayName: info.displayName,
    },
    { status: 201 }
  );
}
