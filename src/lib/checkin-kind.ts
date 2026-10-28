/** Where, or whether, the user trained today. Only a gym check-in needs the user to be at the gym. */
export const CHECKIN_KINDS = ["gym", "home", "rest"] as const;

export type CheckinKind = (typeof CHECKIN_KINDS)[number];

export const CHECKIN_KIND_LABELS: Record<CheckinKind, string> = {
  gym: "Gym",
  home: "Home workout",
  rest: "Rest day",
};

/** A day you trained, at the gym or at home. */
export const didTrain = (kind: CheckinKind): boolean => kind !== "rest";
