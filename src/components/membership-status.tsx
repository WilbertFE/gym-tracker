import type { MembershipState } from "@/lib/membership";
import { cn } from "@/lib/utils";

export const STATE_LABEL: Record<MembershipState, string> = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
};

/** Green, yellow and red are reserved for status, so this is a legitimate use. */
export const STATE_DOT: Record<MembershipState, string> = {
  active: "bg-intensity-low",
  expiring: "bg-intensity-mid",
  expired: "bg-intensity-high",
};

export function MembershipStatusLine({ state }: { state: MembershipState }) {
  return (
    <p className="flex items-center gap-2 text-sm" role="status">
      <span className={cn("size-2 rounded-full", STATE_DOT[state])} aria-hidden />
      {STATE_LABEL[state]}
    </p>
  );
}
