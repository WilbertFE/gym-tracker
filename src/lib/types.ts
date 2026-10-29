import type { CheckinKind } from "@/lib/checkin-kind";
import type { CountryCode } from "@/lib/countries";
import type { Currency } from "@/lib/currency";
import type { MuscleGroup } from "@/lib/muscles";
import type { WeightUnit } from "@/lib/units";

export type Checkin = {
  id: string;
  user_id: string;
  date: string;
  /** Gym, a workout at home, or a rest day. */
  kind: CheckinKind;
  mood: number | null;
  energy: number | null;
  sleep_hours: number | null;
  notes: string | null;
};

export type WeightLog = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
};

export type Membership = {
  id: string;
  user_id: string;
  gym_name: string;
  /** Branch, area or address of the gym. Free text. */
  location: string | null;
  /** Exact position picked on the map. Both set or both null. */
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  end_date: string;
  price: number | null;
  /** What `price` is in. Prices are never converted. */
  currency: Currency;
  notes: string | null;
};

export type Exercise = {
  id: string;
  /** null for built-in exercises. */
  user_id: string | null;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: string | null;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  date: string;
  started_at: string;
  /** null while the workout is in progress. */
  ended_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
};

export type WorkoutSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  /** When the set was logged. Drives the rest timer. */
  completed_at: string;
};

export type PhotoPose = "front" | "side" | "back";

/** Mirrors the progress_photos table. The file itself lives in private storage. */
export type ProgressPhoto = {
  id: string;
  user_id: string;
  date: string;
  storage_path: string;
  pose: PhotoPose;
};

/** A recurring weekly commitment (class, work, and so on). Times are "HH:MM". */
export type AvailabilityBlock = {
  id: string;
  user_id: string;
  /** 0 = Sunday ... 6 = Saturday, matching Date#getDay and Postgres dow. */
  weekday: number;
  start_time: string;
  end_time: string;
  label: string | null;
};

export type LogPhotoKind = "checkin" | "weight";

/** A photo attached to a daily check-in or a weigh-in. Exactly one of the two ids is set. */
export type LogPhoto = {
  id: string;
  user_id: string;
  checkin_id: string | null;
  weight_id: string | null;
  storage_path: string;
  created_at: string;
};

/** A Double XP Day booster that was used on `day`. */
export type XpBoost = {
  id: string;
  user_id: string;
  day: string;
  created_at: string;
};

/** Per user preferences. Defaults apply until the user saves something. */
export type UserSettings = {
  user_id: string;
  /** ISO 3166-1 alpha-2 code. Used later for local leaderboards. */
  country: CountryCode | null;
  weight_unit: WeightUnit;
  /** Default currency for new prices. */
  currency: Currency;
};
