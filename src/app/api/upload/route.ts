import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS and can manage storage buckets
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = "branding";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orgId = formData.get("orgId") as string | null;
    const type = formData.get("type") as string | null;

    if (!file || !orgId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure the bucket exists (create if not)
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error: bucketErr } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5 MB
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
      });
      if (bucketErr) {
        return NextResponse.json({ error: "Could not create storage bucket: " + bucketErr.message }, { status: 500 });
      }
    }

    // Build a stable file path (overwrite existing on upsert)
    const fileExt = file.name.split(".").pop() || "png";
    const filePath = `${orgId}-${type}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({ error: "Upload failed: " + uploadErr.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    // Bust cache by appending a timestamp
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("Upload API error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
