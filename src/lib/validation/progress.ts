import { z } from "zod";
import { pastOrTodayDate } from "./common";

export const photoMetaSchema = z.object({
  date: pastOrTodayDate,
  pose: z.enum(["front", "side", "back"]),
});
