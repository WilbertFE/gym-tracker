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
