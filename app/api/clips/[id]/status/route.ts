import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: clip, error } = await supabase
    .from("clips")
    .select("id, status, output_path, error_message")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !clip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let outputUrl: string | null = null;
  if (clip.output_path) {
    const { data } = await supabase.storage
      .from("clips")
      .createSignedUrl(clip.output_path, 3600);
    outputUrl = data?.signedUrl ?? null;
  }

  return NextResponse.json(
    { status: clip.status, outputUrl, errorMessage: clip.error_message ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
