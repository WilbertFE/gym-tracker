import { z } from "zod";
import { pastOrTodayDate } from "./common";

export const photoMetaSchema = z.object({
  date: pastOrTodayDate,
  pose: z.enum(["front", "side", "back"]),
});

const metric = (min: number, max: number) => z.number().min(min).max(max).nullish();

export const measurementSchema = z
  .object({
    date: pastOrTodayDate,
    chest_cm: metric(30, 250),
    waist_cm: metric(30, 250),
    hips_cm: metric(30, 250),
    arm_cm: metric(10, 100),
    thigh_cm: metric(20, 150),
    body_fat_pct: metric(2, 70),
  })
  .refine(
    (v) =>
      [v.chest_cm, v.waist_cm, v.hips_cm, v.arm_cm, v.thigh_cm, v.body_fat_pct].some(
        (n) => n !== null && n !== undefined,
      ),
    { message: "Enter at least one measurement", path: ["waist_cm"] },
  );

export type MeasurementInput = z.infer<typeof measurementSchema>;
