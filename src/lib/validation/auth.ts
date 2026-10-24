import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email").max(254),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(72, "At most 72 characters"),
});

export type Credentials = z.infer<typeof credentialsSchema>;
