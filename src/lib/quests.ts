import { didTrain } from "@/lib/checkin-kind";
import type { Checkin } from "@/lib/types";
import { addDaysISO, weekRange } from "@/lib/week";

/**
 * Daily and weekly quests. Like XP, they are worked out from what is already logged: there is nothing
 * to claim and nothing stored. A quest is done when the day's (or week's) data reaches its target, and
 * its XP is part of the XP total from then on. Which quests appear is a fixed function of the date, so a
 * past day always shows the same quests it did at the time.
 */

/** Quests earn XP for days from this one on. Earlier days are not turned into XP after the fact. */
export const QUEST_START_DATE = "2026-10-28";

export type QuestMetric = "checkin" | "trained" | "workouts" | "sets" | "weighIn" | "measure" | "feel" | "muscles";

export type QuestDef = {
  id: string;
  scope: "daily" | "weekly";
  title: string;
  /** One line under the title. */
  hint: string;
  metric: QuestMetric;
  target: number;
  xp: number;
  /** Two quests of one group never appear together, for example "train 3 days" and "train 4 days". */
  group?: string;
};

const DAILY_COUNT = 3;
const WEEKLY_COUNT = 3;
export const DAILY_SWEEP_XP = 7;
export const WEEKLY_SWEEP_XP = 30;

/** Always the first daily quest: the habit the whole app is built on. */
export const DAILY_ANCHOR: QuestDef = {
  id: "d-checkin",
  scope: "daily",
  title: "Check in",
  hint: "Gym, home or rest day, all count.",
  metric: "checkin",
  target: 1,
  xp: 3,
};

/**
 * The comeback quest. The System is not harsh: after a day with no daily quest finished, the next day carries
 * one extra, easy quest, and no XP is ever taken away. It sits next to the three daily quests, is not part of
 * the daily bonus, and can be switched off in Settings.
 */
export const RECOVERY_QUEST: QuestDef = {
  id: "d-recovery",
  scope: "daily",
  title: "Comeback",
  hint: "Yesterday was quiet. Log 5 sets to get back on track.",
  metric: "sets",
  target: 5,
  xp: 8,
};

export const DAILY_POOL: readonly QuestDef[] = [
  { id: "d-sets10", scope: "daily", title: "Log 10 sets", hint: "Across any exercises.", metric: "sets", target: 10, xp: 5, group: "sets" },
  { id: "d-sets20", scope: "daily", title: "Log 20 sets", hint: "A big session.", metric: "sets", target: 20, xp: 8, group: "sets" },
  { id: "d-workout", scope: "daily", title: "Finish a workout", hint: "At least 3 sets, then tap Finish.", metric: "workouts", target: 1, xp: 8 },
  { id: "d-weigh", scope: "daily", title: "Weigh in", hint: "Log your weight today.", metric: "weighIn", target: 1, xp: 4 },
  { id: "d-feel", scope: "daily", title: "Log how you feel", hint: "Mood, energy and sleep in your check-in.", metric: "feel", target: 1, xp: 4 },
  { id: "d-muscles3", scope: "daily", title: "Train 3 muscle groups", hint: "Three different primary muscles.", metric: "muscles", target: 3, xp: 6 },
];

export const WEEKLY_POOL: readonly QuestDef[] = [
  { id: "w-train3", scope: "weekly", title: "Train on 3 days", hint: "Gym or home check-ins.", metric: "trained", target: 3, xp: 25, group: "train" },
  { id: "w-train4", scope: "weekly", title: "Train on 4 days", hint: "Gym or home check-ins.", metric: "trained", target: 4, xp: 35, group: "train" },
  { id: "w-workouts3", scope: "weekly", title: "Finish 3 workouts", hint: "Each with at least 3 sets.", metric: "workouts", target: 3, xp: 25 },
  { id: "w-sets60", scope: "weekly", title: "Log 60 sets", hint: "Over the whole week.", metric: "sets", target: 60, xp: 25, group: "sets" },
  { id: "w-muscles6", scope: "weekly", title: "Train 6 muscle groups", hint: "Six different primary muscles this week.", metric: "muscles", target: 6, xp: 25 },
  { id: "w-checkin5", scope: "weekly", title: "Check in on 5 days", hint: "Any kind of check-in.", metric: "checkin", target: 5, xp: 15 },
  { id: "w-weigh2", scope: "weekly", title: "Weigh in twice", hint: "On two different days.", metric: "weighIn", target: 2, xp: 12 },
  { id: "w-measure1", scope: "weekly", title: "Log measurements", hint: "Once this week.", metric: "measure", target: 1, xp: 12 },
  { id: "w-feel3", scope: "weekly", title: "Log how you feel 3 times", hint: "Mood, energy and sleep on 3 days.", metric: "feel", target: 3, xp: 12 },
];

/** A small stable hash, so the same date always picks the same quests. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Picks `count` quests from a pool in a fixed order for a seed, never two of the same group. */
function pick(pool: readonly QuestDef[], seed: string, count: number): QuestDef[] {
  const shuffled = [...pool].sort((a, b) => hash(seed + a.id) - hash(seed + b.id) || a.id.localeCompare(b.id));
  const chosen: QuestDef[] = [];
  const groups = new Set<string>();
  for (const quest of shuffled) {
    if (quest.group && groups.has(quest.group)) continue;
    chosen.push(quest);
    if (quest.group) groups.add(quest.group);
    if (chosen.length === count) break;
  }
  return chosen;
}

/** The three quests of a day: the check-in and two from the pool. */
export const dailyQuestsFor = (date: string): QuestDef[] => [DAILY_ANCHOR, ...pick(DAILY_POOL, date, DAILY_COUNT - 1)];

/** The three quests of the week that starts on `weekStart` (a Monday). */
export const weeklyQuestsFor = (weekStart: string): QuestDef[] => pick(WEEKLY_POOL, weekStart, WEEKLY_COUNT);

/** What the data says about one day. */
export type DayMetrics = {
  checkin: number;
  trained: number;
  workouts: number;
  sets: number;
  weighIn: number;
  measure: number;
  feel: number;
  muscles: Set<string>;
};

const emptyDay = (): DayMetrics => ({
  checkin: 0,
  trained: 0,
  workouts: 0,
  sets: 0,
  weighIn: 0,
  measure: 0,
  feel: 0,
  muscles: new Set(),
});

export type QuestInput = {
  checkins: (Pick<Checkin, "date" | "kind"> & Partial<Pick<Checkin, "mood" | "energy" | "sleep_hours">>)[];
  weights: { date: string }[];
  measurements: { date: string }[];
  sessions: { id: string; date: string; ended_at: string | null }[];
  sets: { session_id: string; exercise_id?: string }[];
  /** Primary muscle of each exercise, by id. Without it the muscle quests cannot be met. */
  exerciseMuscles?: Record<string, string>;
  /** Turns the comeback quest on. Off by default, so older callers and tests are unchanged. */
  recovery?: boolean;
};

/** A finished workout needs at least this many sets to count, the same rule as the workout XP. */
export const MIN_SETS_FOR_WORKOUT = 3;

/** One entry per date that has any data. */
export function buildDayMetrics(input: QuestInput): Map<string, DayMetrics> {
  const days = new Map<string, DayMetrics>();
  const day = (date: string) => {
    let m = days.get(date);
    if (!m) days.set(date, (m = emptyDay()));
    return m;
  };

  for (const c of input.checkins) {
    const m = day(c.date);
    m.checkin = 1;
    if (didTrain(c.kind)) m.trained = 1;
    if (c.mood != null && c.energy != null && c.sleep_hours != null) m.feel = 1;
  }
  for (const w of input.weights) day(w.date).weighIn = 1;
  for (const x of input.measurements) day(x.date).measure = 1;

  const sessionDate = new Map(input.sessions.map((s) => [s.id, s.date]));
  const setCount = new Map<string, number>();
  for (const set of input.sets) {
    const date = sessionDate.get(set.session_id);
    if (!date) continue;
    const m = day(date);
    m.sets += 1;
    setCount.set(set.session_id, (setCount.get(set.session_id) ?? 0) + 1);
    const muscle = set.exercise_id ? input.exerciseMuscles?.[set.exercise_id] : undefined;
    if (muscle) m.muscles.add(muscle);
  }
  for (const s of input.sessions) {
    if (s.ended_at !== null && (setCount.get(s.id) ?? 0) >= MIN_SETS_FOR_WORKOUT) day(s.date).workouts += 1;
  }
  return days;
}

/** The value of a metric over a run of days: a sum, or for muscles the number of different ones. */
export function metricValue(metric: QuestMetric, days: readonly (DayMetrics | undefined)[]): number {
  if (metric === "muscles") {
    const all = new Set<string>();
    for (const d of days) d?.muscles.forEach((m) => all.add(m));
    return all.size;
  }
  return days.reduce((sum, d) => sum + (d ? d[metric] : 0), 0);
}

/**
 * Whether the comeback quest shows on `date`: the day before was on or after the quest start, the account
 * already existed that day, and none of its daily quests were finished.
 */
export function needsRecovery(date: string, metrics: Map<string, DayMetrics>, start: string): boolean {
  const yesterday = addDaysISO(date, -1);
  if (yesterday < start) return false;
  const first = [...metrics.keys()].sort()[0];
  if (first === undefined || first >= yesterday) return false;
  return !dailyStatus(yesterday, metrics).some((s) => s.done);
}

/** The comeback quest for a date, with progress, or null when it does not apply. */
export function recoveryStatus(date: string, metrics: Map<string, DayMetrics>, start: string): QuestStatus | null {
  if (!needsRecovery(date, metrics, start)) return null;
  const value = metricValue(RECOVERY_QUEST.metric, [metrics.get(date)]);
  const done = value >= RECOVERY_QUEST.target;
  return { quest: RECOVERY_QUEST, value, done, doneOn: done ? date : null };
}

export type QuestStatus = {
  quest: QuestDef;
  /** Progress so far, not capped at the target. */
  value: number;
  done: boolean;
  /** The day the target was first met, for dating the XP. */
  doneOn: string | null;
};

/** Daily quests for a date, with progress. */
export function dailyStatus(date: string, metrics: Map<string, DayMetrics>): QuestStatus[] {
  const today = metrics.get(date);
  return dailyQuestsFor(date).map((quest) => {
    const value = metricValue(quest.metric, [today]);
    const done = value >= quest.target;
    return { quest, value, done, doneOn: done ? date : null };
  });
}

/**
 * Weekly quests for the week starting `weekStart`, counting days up to `through` (today for the
 * current week). `doneOn` is the first day the running total reached the target.
 */
export function weeklyStatus(weekStart: string, through: string, metrics: Map<string, DayMetrics>): QuestStatus[] {
  const end = addDaysISO(weekStart, 6);
  const last = through < end ? through : end;
  const dates: string[] = [];
  for (let d = weekStart; d <= last; d = addDaysISO(d, 1)) dates.push(d);

  return weeklyQuestsFor(weekStart).map((quest) => {
    let doneOn: string | null = null;
    for (let i = 0; i < dates.length && doneOn === null; i++) {
      if (metricValue(quest.metric, dates.slice(0, i + 1).map((d) => metrics.get(d))) >= quest.target) doneOn = dates[i];
    }
    return {
      quest,
      value: metricValue(quest.metric, dates.map((d) => metrics.get(d))),
      done: doneOn !== null,
      doneOn,
    };
  });
}

/** XP earned by quests, each dated, so a boosted day can double what was earned on it. */
export type QuestReward = {
  date: string;
  xp: number;
  kind: "daily" | "weekly" | "daily-sweep" | "weekly-sweep" | "recovery";
};

export function questRewards(
  input: QuestInput,
  range: { start: string; today: string },
): { rewards: QuestReward[]; completed: number } {
  const metrics = buildDayMetrics(input);
  const rewards: QuestReward[] = [];
  let completed = 0;

  for (let date = range.start; date <= range.today; date = addDaysISO(date, 1)) {
    const status = dailyStatus(date, metrics);
    for (const s of status) {
      if (!s.done) continue;
      completed += 1;
      rewards.push({ date, xp: s.quest.xp, kind: "daily" });
    }
    if (status.every((s) => s.done)) rewards.push({ date, xp: DAILY_SWEEP_XP, kind: "daily-sweep" });
    const comeback = input.recovery ? recoveryStatus(date, metrics, range.start) : null;
    if (comeback?.done) {
      completed += 1;
      rewards.push({ date, xp: RECOVERY_QUEST.xp, kind: "recovery" });
    }
  }

  const seen = new Set<string>();
  for (let date = range.start; date <= range.today; date = addDaysISO(date, 1)) {
    const week = weekRange(date).start;
    if (seen.has(week)) continue;
    seen.add(week);
    const status = weeklyStatus(week, range.today, metrics);
    let latest = "";
    let all = true;
    for (const s of status) {
      // A week that began before the start date only pays for what was finished from the start on.
      if (s.doneOn !== null && s.doneOn >= range.start) {
        completed += 1;
        rewards.push({ date: s.doneOn, xp: s.quest.xp, kind: "weekly" });
        if (s.doneOn > latest) latest = s.doneOn;
      } else {
        all = false;
      }
    }
    if (all && status.length > 0) rewards.push({ date: latest, xp: WEEKLY_SWEEP_XP, kind: "weekly-sweep" });
  }
  return { rewards, completed };
}

export type QuestBoard = {
  today: string;
  daily: QuestStatus[];
  /** The comeback quest, when yesterday was quiet. */
  recovery: QuestStatus | null;
  dailySweep: { done: boolean; xp: number };
  weekStart: string;
  weekEnd: string;
  /** Days left in the week, today included. */
  daysLeft: number;
  weekly: QuestStatus[];
  weeklySweep: { done: boolean; xp: number };
};

/** Today's and this week's quests with progress, for the dashboard. */
export function buildQuestBoard(input: QuestInput, today: string): QuestBoard {
  const metrics = buildDayMetrics(input);
  const { start, end } = weekRange(today);
  const daily = dailyStatus(today, metrics);
  const weekly = weeklyStatus(start, today, metrics);
  return {
    today,
    daily,
    recovery: input.recovery ? recoveryStatus(today, metrics, QUEST_START_DATE) : null,
    dailySweep: { done: daily.every((s) => s.done), xp: DAILY_SWEEP_XP },
    weekStart: start,
    weekEnd: end,
    daysLeft: Math.round((Date.parse(end) - Date.parse(today)) / 86_400_000) + 1,
    weekly,
    weeklySweep: { done: weekly.every((s) => s.done), xp: WEEKLY_SWEEP_XP },
  };
}
