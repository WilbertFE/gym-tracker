import { z } from "zod";
import { isoDate } from "./common";

export const boostSchema = z.object({ day: isoDate });

export type BoostInput = z.infer<typeof boostSchema>;
