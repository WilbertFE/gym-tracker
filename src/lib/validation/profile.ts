import { z } from "zod";

/**
 * The shape of a profile request. The rules about what a username, a name or a bio may contain are in
 * `src/lib/profile.ts` and are applied on top of this, so the messages can be exact.
 */
export const profileSchema = z.object({
  username: z.string().max(60),
  display_name: z.string().max(60),
  bio: z.string().max(600).nullable().optional(),
  visibility: z.enum(["private", "members"]),
  /** Section id to shown. Anything missing counts as shown, unknown ids are ignored. */
  sections: z.record(z.string().max(20), z.boolean()).optional(),
});

export const usernameCheckSchema = z.object({ username: z.string().max(60) });

export type ProfileRequest = z.infer<typeof profileSchema>;
