import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { EditConfig, LayoutPreset, CropBox, ClipSegment } from "@/lib/types";

interface Params {
  params: Promise<{ id: string }>;
}

const VALID_LAYOUTS: LayoutPreset[] = [
  "fullscreen_facecam_top",
  "fullscreen_facecam_bottom",
  "split",
];

function isValidSegments(v: unknown): v is ClipSegment[] {
  if (!Array.isArray(v)) return false;
  if (v.length === 0) return true;
  return v.every(
    (s) =>
      s !== null &&
      typeof s === "object" &&
      typeof (s as Record<string, unknown>).start === "number" &&
      typeof (s as Record<string, unknown>).end   === "number" &&
      (s as ClipSegment).start >= 0 &&
      (s as ClipSegment).end > (s as ClipSegment).start,
  );
}

function isValidCrop(v: unknown): v is CropBox {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.x      === "number" && c.x      >= 0 && c.x      <  1    &&
    typeof c.y      === "number" && c.y      >= 0 && c.y      <  1    &&
    typeof c.width  === "number" && c.width  >  0 && c.width  <= 1    &&
    typeof c.height === "number" && c.height >  0 && c.height <= 1    &&
    c.x + (c.width  as number) <= 1.001 &&
    c.y + (c.height as number) <= 1.001
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.trimStart !== "number" || b.trimStart < 0) {
    return NextResponse.json({ error: "Invalid trimStart." }, { status: 400 });
  }
  if (b.trimEnd !== null && (typeof b.trimEnd !== "number" || b.trimEnd <= b.trimStart)) {
    return NextResponse.json({ error: "Invalid trimEnd." }, { status: 400 });
  }
  if (!VALID_LAYOUTS.includes(b.layout as LayoutPreset)) {
    return NextResponse.json({ error: "Invalid layout." }, { status: 400 });
  }
  if (!isValidCrop(b.gameplayCrop)) {
    return NextResponse.json({ error: "Invalid gameplayCrop." }, { status: 400 });
  }
  if (!isValidCrop(b.facecamCrop)) {
    return NextResponse.json({ error: "Invalid facecamCrop." }, { status: 400 });
  }
  if (b.segments !== undefined && !isValidSegments(b.segments)) {
    return NextResponse.json({ error: "Invalid segments." }, { status: 400 });
  }

  // Verify ownership
  const { data: clip } = await supabase
    .from("clips")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!clip) return NextResponse.json({ error: "Clip not found." }, { status: 404 });

  const editConfig: EditConfig = {
    trimStart:    b.trimStart    as number,
    trimEnd:      b.trimEnd      as number | null,
    layout:       b.layout       as LayoutPreset,
    gameplayCrop: b.gameplayCrop as CropBox,
    facecamCrop:  b.facecamCrop  as CropBox,
  };

  // Only include segments when present and non-empty
  const rawSegments = b.segments as ClipSegment[] | undefined;
  if (rawSegments && rawSegments.length > 0) {
    editConfig.segments = rawSegments;
  }

  const serviceClient = await createServiceClient();
  const { error: updateError } = await serviceClient
    .from("clips")
    .update({
      edit_config:        editConfig,
      trim_start_seconds: editConfig.trimStart,
      trim_end_seconds:   editConfig.trimEnd,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
