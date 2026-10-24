import { z } from "zod";
import { maxAllowedDateISO } from "@/lib/dates";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** An ISO date that is not in the future (with one day of timezone slack). */
export const pastOrTodayDate = isoDate.refine(
  (d) => d <= maxAllowedDateISO(),
  "Date cannot be in the future",
);

export const optionalNotes = z.string().trim().max(500).nullish();
