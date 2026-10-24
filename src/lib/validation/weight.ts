import { z } from "zod";
import { optionalNotes, pastOrTodayDate } from "./common";

export const weightSchema = z.object({
  date: pastOrTodayDate,
  weight_kg: z
    .number("Enter a number")
    .min(20, "At least 20 kg")
    .max(500, "At most 500 kg"),
  notes: optionalNotes,
});

export type WeightInput = z.infer<typeof weightSchema>;
