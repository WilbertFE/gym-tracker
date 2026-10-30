/**
 * What each page is for, in a line or two, for "About this page". The first match wins, so the more specific
 * paths come first.
 */
const PAGES: { test: RegExp; name: string; lines: string[] }[] = [
  { test: /^\/workouts\/exercises/, name: "the exercise library", lines: ["This is the exercise library.", "Each exercise lists the muscles it works. You can add your own."] },
  { test: /^\/workouts\/[^/]+/, name: "a workout", lines: ["This is a workout.", "Pick an exercise, log the weight and reps, and the timer measures the rest for you. Tap Finish when you are done."] },
  { test: /^\/workouts/, name: "workouts", lines: ["This is where workouts start.", "You need to check in first. Then start one and log your sets."] },
  { test: /^\/battle/, name: "the battle page", lines: ["Every fight in one place.", "Each set you log is a hit. Beat the boss before the time runs out for a chest."] },
  { test: /^\/dashboard\/level/, name: "levels", lines: ["This page shows every rank and your boosters.", "A booster doubles the XP of a day you choose."] },
  { test: /^\/dashboard\/diary/, name: "the gym diary", lines: ["The diary keeps the photos from your check-ins and weigh-ins, day by day."] },
  { test: /^\/dashboard/, name: "the dashboard", lines: ["This is home.", "Your level is at the top, then today's check-in and workout. More cards appear as you level up. Be patient."] },
  { test: /^\/body\/progress/, name: "progress photos", lines: ["Progress photos.", "Compare two dates side by side. Photos are private."] },
  { test: /^\/body/, name: "body", lines: ["The muscle map shows what you trained this week or overall.", "The weight tab charts your body weight over time."] },
  { test: /^\/schedule/, name: "the schedule", lines: ["Tell me when you are busy, and I will keep it all in one place. You are welcome."] },
  { test: /^\/status/, name: "your status", lines: ["This is your status window.", "Five stats grow as you train. Each one rises with a different habit."] },
  { test: /^\/leaderboard/, name: "the leaderboard", lines: ["The leaderboard ranks XP worldwide or in your country.", "You stay hidden until you join. No pressure. Mostly."] },
  { test: /^\/collection/, name: "your collection", lines: ["Chests from your quests, and the items you found in them.", "Preview an item on yourself before you equip it."] },
  { test: /^\/(profile|u\/)/, name: "a profile", lines: ["A profile is a player page.", "You choose who can open yours and which parts they see, in Settings."] },
  { test: /^\/membership/, name: "your membership", lines: ["Track your gym membership: its dates, its price and when it ends."] },
  { test: /^\/settings/, name: "settings", lines: ["Settings: your country, kg or lb, the currency, and how I behave.", "Your profile is here too."] },
  { test: /^\/guide/, name: "the guide", lines: ["A short guide to how everything works. You do not need to read it all."] },
];

export function pageHelp(path: string | undefined): { name: string; lines: string[] } | null {
  if (!path) return null;
  const found = PAGES.find((p) => p.test.test(path));
  return found ? { name: found.name, lines: found.lines } : null;
}

/** Every line of every page note, for the test that checks her voice. */
export const PAGE_LINES_FOR_TEST: readonly string[] = PAGES.flatMap((p) => p.lines);
