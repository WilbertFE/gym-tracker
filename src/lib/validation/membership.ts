import { z } from "zod";
import { isoDate, optionalNotes } from "./common";

export const membershipSchema = z
  .object({
    gym_name: z.string().trim().min(1, "Required").max(100),
    location: z.string().trim().max(120).nullish(),
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    start_date: isoDate,
    end_date: isoDate,
    price: z.number().min(0).max(1_000_000_000).nullish(),
    notes: optionalNotes,
  })
  .refine((v) => v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "End date must be on or after the start date",
  })
  .refine((v) => (v.latitude == null) === (v.longitude == null), {
    path: ["latitude"],
    message: "Latitude and longitude must be set together",
  });

export type MembershipInput = z.infer<typeof membershipSchema>;
