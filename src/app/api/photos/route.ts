import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { detectImageType, MAX_PHOTO_BYTES } from "@/lib/photo-file";
import { createPhoto, listPhotos } from "@/lib/repositories/photos";
import { photoMetaSchema } from "@/lib/validation/progress";

// Uploads are heavy, so they get a much lower write limit than other routes.
const UPLOADS_PER_MINUTE = 10;

/** Photo metadata only. Each file is served by /api/photos/[id]/file. */
export async function GET() {
  const g = await guard("photos", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listPhotos(g.userId) });
}

/** Multipart upload: fields `file`, `date` (YYYY-MM-DD) and `pose`. JPEG, PNG or WebP up to 5 MB. */
export async function POST(request: Request) {
  const g = await guard("photos", { write: true, limit: UPLOADS_PER_MINUTE });
  if (g.error) return g.error;

  // Reject obviously oversized bodies before reading them into memory.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PHOTO_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Photo is larger than 5 MB" }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest();

  const meta = photoMetaSchema.safeParse({ date: form.get("date"), pose: form.get("pose") });
  const file = form.get("file");
  if (!meta.success || !(file instanceof File)) return badRequest();

  if (file.size === 0) return badRequest("The file is empty");
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo is larger than 5 MB" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return badRequest("Only JPEG, PNG or WebP photos are accepted");

  const result = await createPhoto(g.userId, meta.data, bytes, type);
  if (!result.ok) {
    return NextResponse.json({ error: "Photo limit reached. Delete some photos first." }, { status: 409 });
  }
  return NextResponse.json({ data: result.photo }, { status: 201 });
}
