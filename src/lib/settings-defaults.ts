import type { UserSettings } from "@/lib/types";

/** What a user who never opened Settings gets. */
export const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  country: null,
  weight_unit: "kg",
  currency: "IDR",
};
