import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { trimStart?: unknown; trimEnd?: unknown; duration?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { trimStart, trimEnd, duration } = body;

  if (typeof trimStart !== "number" || typeof trimEnd !== "number") {
    return NextResponse.json(
      { error: "trimStart and trimEnd must be numbers." },
      { status: 400 }
    );
  }
  if (trimStart < 0 || trimEnd <= trimStart) {
    return NextResponse.json(
      { error: "Invalid trim range: end must be after start." },
      { status: 400 }
    );
  }

  // Verify the clip belongs to this user (RLS would also block, but explicit check gives a clear error)
  const { data: clip } = await supabase
    .from("clips")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!clip) {
    return NextResponse.json({ error: "Clip not found." }, { status: 404 });
  }

  const update: Record<string, number> = {
    trim_start_seconds: trimStart,
    trim_end_seconds:   trimEnd,
  };
  if (typeof duration === "number" && duration > 0) {
    update.duration = duration;
  }

  const serviceClient = await createServiceClient();
  const { error: updateError } = await serviceClient
    .from("clips")
    .update(update)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
