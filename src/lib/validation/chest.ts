import { z } from "zod";

/** `d:2026-10-29` or `w:2026-10-26`. The server re-derives the chest, so this only has to be well formed. */
export const openChestSchema = z.object({
  chestId: z.string().regex(/^[dwg]:\d{4}-\d{2}-\d{2}$/),
});

export const equipSchema = z.object({
  slot: z.enum(["frame", "aura", "plate", "look", "weapon", "outfit"]),
  /** An item id, or null to take the slot's item off. */
  itemId: z.string().min(1).max(40).nullable(),
});

export type OpenChestInput = z.infer<typeof openChestSchema>;
export type EquipInput = z.infer<typeof equipSchema>;
