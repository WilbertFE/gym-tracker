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
  /** Where the phone is, sent with a gym check-in so the server can check it is at the gym. Never stored. */
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  accuracy: z.number().min(0).max(1_000_000).nullish(),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
