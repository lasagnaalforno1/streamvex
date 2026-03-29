import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 300; // 5 minutes — requires Vercel Pro

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  // Validate processor env vars immediately — fail loudly before touching the DB
 const rawProcessorUrl = (process.env.PROCESSOR_URL || "").trim();
const PROCESSOR_URL = rawProcessorUrl.startsWith("http")
  ? rawProcessorUrl
  : `https://${rawProcessorUrl}`;
const PROCESSOR_SECRET = process.env.PROCESSOR_SECRET;

console.log(`[process:${id}] raw PROCESSOR_URL=${rawProcessorUrl || "(not set)"}`);
console.log(`[process:${id}] normalized PROCESSOR_URL=${PROCESSOR_URL || "(not set)"}`);

  console.log(`[process:${id}] PROCESSOR_URL=${PROCESSOR_URL ?? "(not set)"}`);

  if (!PROCESSOR_URL || !PROCESSOR_SECRET) {
    const missing = [
      !PROCESSOR_URL    && "PROCESSOR_URL",
      !PROCESSOR_SECRET && "PROCESSOR_SECRET",
    ].filter(Boolean).join(", ");
    console.error(`[process:${id}] missing env vars: ${missing}`);
    return NextResponse.json(
      { error: `Server misconfigured — missing env vars: ${missing}` },
      { status: 500 }
    );
  }

  try {
    const supabase       = await createClient();
    const serviceClient = createServiceClient();

    // Verify the caller is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[process:${id}] user=${user.id}`);

    // Read preset from request body (sent by the export modal)
    const body = await request.json().catch(() => ({})) as { preset?: string };
    const preset = body.preset ?? "standard";

    // ── Plan entitlement — read from user_metadata (set by upgrade webhook) ──
    const plan      = (user.user_metadata?.plan as string | undefined) ?? "free";
    const role      = (user.user_metadata?.role as string | undefined) ?? "";
    const isPro     = plan === "pro";
    const isCreator = role === "creator";
    console.log(`[process:${id}] isPro=${isPro} isCreator=${isCreator} preset=${preset}`);

    // Fetch clip — RLS guarantees it belongs to this user
    const { data: clip, error: clipError } = await supabase
      .from("clips")
      .select("id, status, input_path, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (clipError || !clip) {
      console.error(`[process:${id}] clip not found:`, clipError?.message);
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    console.log(`[process:${id}] status=${clip.status}, input_path=${clip.input_path}`);

    if (!clip.input_path) {
      return NextResponse.json({ error: "Clip has no input file." }, { status: 400 });
    }

    if (clip.status === "processing") {
      return NextResponse.json({ error: "Clip is already processing." }, { status: 409 });
    }

    // Mark as processing before calling the processor
    await serviceClient
      .from("clips")
      .update({ status: "processing", error_message: null })
      .eq("id", id);

    // ── Forward to Railway processor ──────────────────────────────────────────
    console.log(`[process:${id}] → forwarding to processor: ${PROCESSOR_URL}/process/${id}`);

    let resp: Response;
    try {
      resp = await fetch(`${PROCESSOR_URL}/process/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Processor-Secret": PROCESSOR_SECRET,
        },
        body: JSON.stringify({ isPro, isCreator, preset }),
        signal: AbortSignal.timeout(280_000), // 4m40s — leaves headroom under maxDuration
      });
    } catch (fetchError) {
      const msg =
        fetchError instanceof Error ? fetchError.message : "Could not reach processor.";
      console.error(`[process:${id}] fetch to processor failed:`, msg);
      await serviceClient
        .from("clips")
        .update({ status: "error", error_message: msg })
        .eq("id", id);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const json = await resp.json().catch(() => ({})) as {
      message: string | undefined;
      error?: string;
      success?: boolean;
      outputPath?: string;
    };

    console.log(`[process:${id}] processor response: status=${resp.status}`, JSON.stringify(json));

    if (!resp.ok) {
  const processorError =
    json.error ||
    json.message ||
    `Processor returned an error (status ${resp.status}).`;

  console.error(`[process:${id}] processor error:`, processorError);

  await serviceClient
    .from("clips")
    .update({ status: "error", error_message: processorError })
    .eq("id", id);

  return NextResponse.json(
    { error: processorError },
    { status: resp.status }
  );
}

    return NextResponse.json(json);

  } catch (err) {
    console.error(`[process:${id}] unexpected error:`, err);
    try {
      const serviceClient = createServiceClient();
      const msg = err instanceof Error ? err.message : "Unexpected server error.";
      await serviceClient
        .from("clips")
        .update({ status: "error", error_message: msg })
        .eq("id", id);
    } catch {}
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
