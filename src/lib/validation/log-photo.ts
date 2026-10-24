import { z } from "zod";

export const logPhotoKinds = ["checkin", "weight"] as const;

export const logPhotoTargetSchema = z.object({
  kind: z.enum(logPhotoKinds),
  entry_id: z.string().min(1).max(100),
});

export type LogPhotoTarget = z.infer<typeof logPhotoTargetSchema>;
