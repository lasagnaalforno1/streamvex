import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      title?: string;
      fileSize?: number;
      originalFilename?: string;
      mimeType?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { title, fileSize, originalFilename, mimeType } = body;

    // Validate file type
    const allowedTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
    if (mimeType && !allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: "Only MP4, MOV, AVI, or WEBM files are allowed." },
        { status: 400 }
      );
    }

    // Validate declared file size — Supabase Free default bucket limit is 50 MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (fileSize && fileSize > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50 MB limit." },
        { status: 400 }
      );
    }

    // Use service client for the DB write — storage upload happens browser-side
    const serviceClient = await createServiceClient();

    const clipTitle = (title || originalFilename || "Untitled clip").replace(/\.[^/.]+$/, "");

    const { data: clip, error: dbError } = await serviceClient
      .from("clips")
      .insert({
        user_id:           user.id,
        title:             clipTitle,
        status:            "uploading",
        file_size:         fileSize          ?? null,
        original_filename: originalFilename  ?? null,
        mime_type:         mimeType          ?? null,
      })
      .select()
      .single();

   if (dbError || !clip) {
  console.error("[upload/init] dbError:", dbError);
  return NextResponse.json(
    { error: dbError?.message ?? "Failed to create clip record." },
    { status: 500 }
  );
}

    const inputPath = `${user.id}/${clip.id}/input.mp4`;

    // Store input_path immediately so the process route can find it
    await serviceClient.from("clips").update({ input_path: inputPath }).eq("id", clip.id);

    return NextResponse.json({ clipId: clip.id, inputPath }, { status: 201 });
  } catch (err) {
    console.error("[upload/init] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
