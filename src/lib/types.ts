import type { MuscleGroup } from "@/lib/muscles";

export type Checkin = {
  id: string;
  user_id: string;
  date: string;
  went_to_gym: boolean;
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
  start_date: string;
  end_date: string;
  price: number | null;
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
};
