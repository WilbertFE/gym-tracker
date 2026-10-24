import { NextResponse } from "next/server";
import { badRequest, guard, notFound } from "@/lib/api";
import { detectImageType, MAX_PHOTO_BYTES } from "@/lib/photo-file";
import { createLogPhoto, listLogPhotos } from "@/lib/repositories/logPhotos";
import { logPhotoKinds, logPhotoTargetSchema } from "@/lib/validation/log-photo";

// Uploads are heavy, so they get a much lower write limit than other routes.
const UPLOADS_PER_MINUTE = 10;

/**
 * Photo metadata only, newest first. Optional filters: `kind` (checkin or weight)
 * and `entry_id`. Each file is served by /api/log-photos/[id]/file.
 */
export async function GET(request: Request) {
  const g = await guard("log-photos", { write: false });
  if (g.error) return g.error;

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  if (kind !== null && !(logPhotoKinds as readonly string[]).includes(kind)) return badRequest();

  const photos = await listLogPhotos(g.userId, {
    kind: (kind as (typeof logPhotoKinds)[number] | null) ?? undefined,
    entryId: params.get("entry_id") ?? undefined,
  });
  return NextResponse.json({ data: photos });
}

/**
 * Multipart upload to a check-in or a weigh-in: fields `file`, `kind` (checkin or
 * weight) and `entry_id`. JPEG, PNG or WebP up to 5 MB, at most 4 per entry.
 */
export async function POST(request: Request) {
  const g = await guard("log-photos", { write: true, limit: UPLOADS_PER_MINUTE });
  if (g.error) return g.error;

  // Reject obviously oversized bodies before reading them into memory.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PHOTO_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Photo is larger than 5 MB" }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest();

  const target = logPhotoTargetSchema.safeParse({ kind: form.get("kind"), entry_id: form.get("entry_id") });
  const file = form.get("file");
  if (!target.success || !(file instanceof File)) return badRequest();

  if (file.size === 0) return badRequest("The file is empty");
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo is larger than 5 MB" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return badRequest("Only JPEG, PNG or WebP photos are accepted");

  const result = await createLogPhoto(
    g.userId,
    { kind: target.data.kind, entryId: target.data.entry_id },
    bytes,
    type,
  );
  if (result.ok) return NextResponse.json({ data: result.photo }, { status: 201 });
  if (result.reason === "limit_reached") {
    return NextResponse.json({ error: "Photo limit reached for this entry" }, { status: 409 });
  }
  return notFound();
}
