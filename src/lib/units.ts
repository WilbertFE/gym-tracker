/** Weight is stored in kilograms everywhere. Pounds exist only on the way in and the way out. */
export type WeightUnit = "kg" | "lb";

export const WEIGHT_UNITS = ["kg", "lb"] as const;

const KG_PER_LB = 0.45359237;

/** Kilograms to the user's unit, unrounded. */
export const fromKg = (kg: number, unit: WeightUnit): number => (unit === "lb" ? kg / KG_PER_LB : kg);

/** A number the user typed, in their unit, to kilograms. Rounded to 2 decimals like the database column. */
export const toKg = (value: number, unit: WeightUnit): number =>
  Math.round((unit === "lb" ? value * KG_PER_LB : value) * 100) / 100;

/** Rounds for display and drops a trailing ".0", so 135 lb stays "135" and 61.2 kg stays "61.2". */
export function formatNumber(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** A weight for display, for example "135" for 61.23 kg in lb. Add the unit label yourself. */
export const displayWeight = (kg: number, unit: WeightUnit, digits = 1): string =>
  formatNumber(fromKg(kg, unit), digits);

/** Same, with thousands separators and no decimals, for volumes. */
export const displayVolume = (kg: number, unit: WeightUnit): string =>
  Math.round(fromKg(kg, unit)).toLocaleString("en-US");

/** Signed change for display, "+1.2" or "-0.4". */
export function displayChange(kgChange: number, unit: WeightUnit, digits = 1): string {
  const v = Number(fromKg(kgChange, unit).toFixed(digits));
  return `${v > 0 ? "+" : ""}${formatNumber(v, digits)}`;
}

export const UNIT_LABELS: Record<WeightUnit, string> = { kg: "Kilograms (kg)", lb: "Pounds (lb)" };
