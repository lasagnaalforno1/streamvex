import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/clips/[id] — rename clip
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : null;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (title.length > 200) return NextResponse.json({ error: "Title too long" }, { status: 400 });

  const { error } = await supabase
    .from("clips")
    .update({ title })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/clips/[id] — remove storage files then delete row
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch storage paths first (ownership verified via eq user_id)
  const { data: clip } = await supabase
    .from("clips")
    .select("id, input_path, output_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete storage files via service client (bypasses storage RLS safely)
  const service = createServiceClient();
  const paths = [clip.input_path, clip.output_path].filter(Boolean) as string[];
  if (paths.length > 0) {
    await service.storage.from("clips").remove(paths);
  }

  // Delete the row (RLS ensures only owner can delete)
  const { error } = await supabase
    .from("clips")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
