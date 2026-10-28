import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";
import { CURRENCIES } from "@/lib/currency";
import { WEIGHT_UNITS } from "@/lib/units";

export const settingsSchema = z.object({
  country: z.enum(COUNTRY_CODES).nullable(),
  weight_unit: z.enum(WEIGHT_UNITS),
  currency: z.enum(CURRENCIES),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
