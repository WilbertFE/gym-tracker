import { z } from "zod";
import { optionalNotes, pastOrTodayDate } from "./common";

const scale = z.number().int().min(1).max(5).nullish();

export const checkinSchema = z.object({
  date: pastOrTodayDate,
  went_to_gym: z.boolean(),
  mood: scale,
  energy: scale,
  sleep_hours: z.number().min(0).max(24).nullish(),
  notes: optionalNotes,
});

export type CheckinInput = z.infer<typeof checkinSchema>;
