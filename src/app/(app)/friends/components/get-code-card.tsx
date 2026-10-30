"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { MAX_FRIENDS } from "@/lib/friends";

/** The first step: nothing is shared until you ask for a friend code. */
export function GetCodeCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    const result = await apiRequest("/api/friends/card", "POST");
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Your friend code is ready");
    router.refresh();
  }

  return (
    <Panel label="Fight a boss with your friends" variant="system" tour="friend-code">
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Add up to {MAX_FRIENDS} friends with a friend code. Every week you all fight one shared boss: the damage of everyone in the group counts toward one
          health bar. Beat it and each of you who dealt damage gets a chest, and the three who dealt the most get a better one.
        </p>
        <p className="text-sm text-muted-foreground">
          Nobody sees you until you get a code and a friend accepts. A friend sees only your name, your level and the damage you deal to the weekly boss, never your
          workouts, weight, photos or email. You can leave any time and it is all deleted.
        </p>
        <Button type="button" className="h-11 self-start" onClick={start} disabled={busy}>
          {busy ? "Getting your code" : "Get my friend code"}
        </Button>
      </div>
    </Panel>
  );
}
