import type { FeatureId } from "@/lib/unlocks";
import type { StagePose } from "./types";

/**
 * Guided tours, as data. A tour is a list of steps; each step points at one area of the page (an element with
 * `data-tour="<target>"`), says what it is in two plain sentences, and gives Sera a pose. A step whose area is not on
 * the page (a card that is locked, hidden or empty today) is skipped, so one tour fits every account. A test reads the
 * page source and checks that every target named here exists, so a renamed area cannot silently break a tour.
 */
export type TourStep = {
  /** The `data-tour` value of the area to highlight. */
  target: string;
  title: string;
  /** One or two short, plain sentences. */
  text: string;
  pose: StagePose;
};

export type Tour = {
  id: string;
  /** The page it belongs to, as a path or a path prefix ending in a slash. */
  path: string;
  /** The feature that has to be open, so a locked page has no tour. */
  feature: FeatureId | null;
  /** What it is called in her buttons. */
  name: string;
  steps: TourStep[];
};

export const TOURS: readonly Tour[] = [
  {
    id: "dashboard",
    path: "/dashboard",
    feature: null,
    name: "the dashboard",
    steps: [
      { target: "level", title: "Your level", text: "This is your level and rank. Everything you log earns XP and fills the bar, so try to keep up.", pose: "point" },
      { target: "guide", title: "First steps", text: "A short list to get you started. Tick the steps off and your first levels come fast.", pose: "point" },
      { target: "checkin", title: "Daily check-in", text: "Begin every day here. Gym, a home workout or a rest day, tell me which. Rest days count too.", pose: "point" },
      { target: "train", title: "Start training", text: "When you are ready, start your workout here. Log your sets, then tap Finish for the XP.", pose: "point" },
      { target: "next-unlock", title: "What opens next", text: "More opens as you level up. This shows the next unlock and how far away it is. Be patient.", pose: "point" },
      { target: "quests", title: "Daily quests", text: "Three small goals for today. Finish them all for bonus XP and a chest.", pose: "point" },
      { target: "gate", title: "The weekly gate", text: "A boss appears every week and every set you log hits it. Beat it before Sunday for XP.", pose: "point" },
      { target: "week", title: "Your week", text: "Your training week, day by day. The honest picture, whether you like it or not.", pose: "point" },
      { target: "nav", title: "The menu", text: "Your pages are here. Locked ones stay hidden until you reach their level.", pose: "point" },
      { target: "sera", title: "And me", text: "Tap me any time. I will pretend to be annoyed, but I will answer, or show you around again.", pose: "wave" },
    ],
  },
  {
    id: "workouts",
    path: "/workouts",
    feature: null,
    name: "Workouts",
    steps: [
      { target: "start", title: "Start a workout", text: "Tap Start when you reach the gym. The timer runs by itself, and you log sets as you go.", pose: "point" },
      { target: "history", title: "Your history", text: "Every finished workout is listed here. Tap one to see its sets or share it.", pose: "point" },
      { target: "library", title: "Exercise library", text: "Look up exercises, or add your own, here.", pose: "point" },
    ],
  },
  {
    id: "body",
    path: "/body",
    feature: "body",
    name: "Body",
    steps: [
      { target: "heatmap", title: "Muscle heatmap", text: "The more you train a muscle, the brighter it glows. Dark spots are muscles you have been skipping.", pose: "point" },
      { target: "body-tabs", title: "Muscles and weight", text: "Switch between the heatmap and your body weight. Logging your weight earns XP too.", pose: "point" },
      { target: "progress-link", title: "Progress photos", text: "Keep your progress photos here, privately, and compare two dates.", pose: "point" },
    ],
  },
  {
    id: "schedule",
    path: "/schedule",
    feature: "schedule",
    name: "Schedule",
    steps: [
      { target: "commitments", title: "Your commitments", text: "Your classes and busy hours, week by week, so you can see where the gym fits.", pose: "point" },
      { target: "add-commitment", title: "Add one", text: "Add a class or a busy hour with exact times. It repeats every week.", pose: "point" },
    ],
  },
  {
    id: "status",
    path: "/status",
    feature: "status",
    name: "Status",
    steps: [
      { target: "rank", title: "Your rank", text: "Your rank letter grows with your level. Items you wear show up around it.", pose: "point" },
      { target: "stats", title: "Your five stats", text: "Five stats, each raised by a different habit. The line under each tells you how.", pose: "point" },
      { target: "shape", title: "Your shape", text: "The radar shows what kind of trainer you are. A wide shape means a balanced one.", pose: "point" },
      { target: "titles", title: "Titles", text: "Titles are earned by doing things. Wear one if you want to show off.", pose: "point" },
      { target: "muscle-levels", title: "Muscle levels", text: "Every muscle has its own level, so you see which ones you have actually built.", pose: "point" },
    ],
  },
  {
    id: "collection",
    path: "/collection",
    feature: "collection",
    name: "Collection",
    steps: [
      { target: "chests", title: "Your chests", text: "Finish your quests to earn chests. They expire, so open them in time.", pose: "point" },
      { target: "looks", title: "Wear your finds", text: "Items you found are here. Pick one to wear it, and watch the preview change.", pose: "point" },
      { target: "odds", title: "The odds", text: "No tricks. This shows the chance of each grade for every chest.", pose: "point" },
      { target: "opened", title: "What you opened", text: "Your latest finds are listed here.", pose: "point" },
    ],
  },
  {
    id: "leaderboard",
    path: "/leaderboard",
    feature: "leaderboard",
    name: "Leaderboard",
    steps: [
      { target: "join", title: "Join in", text: "Pick a nickname to join the board. You only appear if you join.", pose: "point" },
      { target: "board-controls", title: "Worldwide or home", text: "See everyone, or only your country. Choose all time or just this week.", pose: "point" },
      { target: "board", title: "The ranking", text: "Players are ordered by XP. Your own row is marked, so it is easy to find.", pose: "point" },
    ],
  },
  {
    id: "friends",
    path: "/friends",
    feature: "friends",
    name: "Friends",
    steps: [
      { target: "friend-code", title: "Your friend code", text: "Share this code with a friend. Only players who have it can add you.", pose: "point" },
      { target: "add-friend", title: "Add a friend", text: "Type a friend's code and send a request. They accept, and you are friends.", pose: "point" },
      { target: "friends-list", title: "Your group", text: "Everyone here fights the weekly boss with you. Their damage and yours fill one health bar.", pose: "point" },
    ],
  },
  {
    id: "profile",
    path: "/u/",
    feature: "profile",
    name: "Profile",
    steps: [
      { target: "player", title: "Your player card", text: "Your rank, level and the items you wear, as other players see them.", pose: "point" },
      { target: "profile-stats", title: "Stats", text: "Your five stats, if you chose to show them.", pose: "point" },
      { target: "profile-collection", title: "Collection", text: "The items you found. You decide which parts of your profile are public in Settings.", pose: "point" },
    ],
  },
  {
    id: "membership",
    path: "/membership",
    feature: "membership",
    name: "Membership",
    steps: [
      { target: "membership", title: "Your gym membership", text: "Keep your gym, price and renewal date here, so a renewal never surprises you.", pose: "point" },
      { target: "edit-membership", title: "Change it", text: "Edit the details whenever something changes.", pose: "point" },
    ],
  },
];

/** The page to go to for a tour. A prefix tour (the profile) starts from the entry page that leads to it. */
export const tourHref = (tour: Tour): string => (tour.path.endsWith("/") ? "/profile" : tour.path);

/** The tour of a feature's page, if it has one. */
export const tourForFeature = (id: FeatureId): Tour | undefined => TOURS.find((t) => t.feature === id);

export const TOUR_IDS: readonly string[] = TOURS.map((t) => t.id);

export const tourById = (id: string): Tour | undefined => TOURS.find((t) => t.id === id);

/** The tour that belongs to a page, if there is one. A path prefix ends in a slash and matches everything under it. */
export function tourForPath(path: string): Tour | undefined {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return TOURS.find((t) => (t.path.endsWith("/") ? clean.startsWith(t.path) && clean.length > t.path.length : clean === t.path));
}

/** Every `data-tour` target the tours name, for the test that checks the pages carry them. */
export const TOUR_TARGETS: readonly string[] = [...new Set(TOURS.flatMap((t) => t.steps.map((s) => s.target)))];
