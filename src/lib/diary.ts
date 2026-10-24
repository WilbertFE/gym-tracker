import type { Checkin, LogPhoto, WeightLog } from "@/lib/types";

export type DiaryDay = {
  date: string;
  checkin: Checkin | null;
  /** Weigh-ins of that day that have photos. */
  weights: WeightLog[];
  /** Check-in photos first, then weigh-in photos, oldest first within each. */
  photos: (LogPhoto & { source: "checkin" | "weight" })[];
};

/**
 * Groups check-in and weigh-in photos by the date of the entry they belong to,
 * newest day first. Only days with at least one photo appear. A photo whose
 * entry no longer exists is skipped.
 */
export function buildDiary(input: {
  photos: LogPhoto[];
  checkins: Checkin[];
  weights: WeightLog[];
}): DiaryDay[] {
  const checkinById = new Map(input.checkins.map((c) => [c.id, c]));
  const weightById = new Map(input.weights.map((w) => [w.id, w]));
  const days = new Map<string, DiaryDay>();

  const dayFor = (date: string): DiaryDay => {
    let day = days.get(date);
    if (!day) {
      day = { date, checkin: null, weights: [], photos: [] };
      days.set(date, day);
    }
    return day;
  };

  const byCreated = [...input.photos].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );

  for (const photo of byCreated) {
    if (photo.checkin_id) {
      const checkin = checkinById.get(photo.checkin_id);
      if (!checkin) continue;
      const day = dayFor(checkin.date);
      day.checkin = checkin;
      day.photos.push({ ...photo, source: "checkin" });
    } else if (photo.weight_id) {
      const weight = weightById.get(photo.weight_id);
      if (!weight) continue;
      const day = dayFor(weight.date);
      if (!day.weights.some((w) => w.id === weight.id)) day.weights.push(weight);
      day.photos.push({ ...photo, source: "weight" });
    }
  }

  return [...days.values()]
    .map((day) => ({
      ...day,
      photos: [...day.photos].sort(
        (a, b) => Number(b.source === "checkin") - Number(a.source === "checkin"),
      ),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
