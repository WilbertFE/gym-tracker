import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM, 24 hour clock");

export const availabilitySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    start_time: time,
    end_time: time,
    label: z.string().trim().max(60).nullish(),
  })
  .refine((v) => v.end_time > v.start_time, {
    path: ["end_time"],
    message: "End time must be after the start time",
  });

export type AvailabilityInput = z.infer<typeof availabilitySchema>;
