import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the clip belongs to this user
    const { data: clip, error: clipError } = await supabase
      .from("clips")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: "Clip not found." }, { status: 404 });
    }

    if (clip.status !== "uploading") {
      return NextResponse.json({ error: "Clip is not in uploading state." }, { status: 409 });
    }

    const serviceClient = await createServiceClient();

    await serviceClient.from("clips").update({ status: "ready" }).eq("id", id);

    return NextResponse.json({ clipId: id });
  } catch (err) {
    console.error("[upload/complete] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
