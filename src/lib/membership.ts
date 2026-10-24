import { differenceInCalendarDays, parseISO } from "date-fns";

export const EXPIRY_WARNING_DAYS = 7;

export type MembershipState = "active" | "expiring" | "expired";

export function membershipStatus(
  endDate: string,
  today: string,
  warningDays = EXPIRY_WARNING_DAYS,
): { daysLeft: number; state: MembershipState } {
  const daysLeft = differenceInCalendarDays(parseISO(endDate), parseISO(today));
  if (daysLeft < 0) return { daysLeft, state: "expired" };
  if (daysLeft <= warningDays) return { daysLeft, state: "expiring" };
  return { daysLeft, state: "active" };
}
