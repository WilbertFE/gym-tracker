import { z } from "zod";

/** A friend code as typed. The rules (the alphabet, the length) are in `normalizeFriendCode` and give the exact message. */
export const addFriendSchema = z.object({ code: z.string().max(30) });

export const friendActionSchema = z.object({ action: z.literal("accept") });

/** The name friends see. `validateDisplayName` applies the real rules on top of this. */
export const friendNameSchema = z.object({ name: z.string().max(60) });

export type AddFriendInput = z.infer<typeof addFriendSchema>;
