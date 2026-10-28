"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { LEADERBOARD, validateDisplayName } from "@/lib/leaderboard";

type JoinCardProps = { joined: boolean; displayName: string | null };

/** Join, rename or leave. Joining is a choice: until then you are not listed. */
export function JoinCard({ joined, displayName }: JoinCardProps) {
  const router = useRouter();
  const [name, setName] = useState(displayName ?? "");
  const [editing, setEditing] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const checked = validateDisplayName(name);
    if (!checked.ok) {
      setProblem(checked.message);
      return;
    }
    setBusy(true);
    setProblem(null);
    const result = await apiRequest("/api/leaderboard/profile", "PUT", { display_name: checked.name });
    setBusy(false);
    if (!result.ok) {
      setProblem(result.error);
      return;
    }
    toast.success(joined ? "Nickname changed" : "You are on the leaderboard");
    setEditing(false);
    router.refresh();
  }

  async function leave() {
    if (busy) return;
    setBusy(true);
    const result = await apiRequest("/api/leaderboard/profile", "DELETE");
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("You left the leaderboard");
    setConfirmLeave(false);
    setName("");
    router.refresh();
  }

  if (joined && !editing) {
    return (
      <Panel label="Your entry">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            You are listed as <span className="font-medium">{displayName}</span>. Others see your nickname, country,
            level, rank and XP, nothing else.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(true)}>
              Change nickname
            </Button>
            {confirmLeave ? (
              <>
                <Button type="button" variant="destructive" className="h-11" onClick={leave} disabled={busy}>
                  {busy ? "Leaving" : "Confirm leave"}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={() => setConfirmLeave(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" className="h-11" onClick={() => setConfirmLeave(true)}>
                Leave
              </Button>
            )}
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel label={joined ? "Change nickname" : "Join the leaderboard"}>
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        {!joined && (
          <p className="text-sm text-muted-foreground">
            Nobody sees you until you join. If you do, others see only your nickname, your country (from Settings),
            your level, rank and XP. Never your name, email, photos, weight or workouts. You can leave any time and your
            entry is deleted.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:max-w-sm">
          <Label htmlFor="nickname" className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Nickname
          </Label>
          <Input
            id="nickname"
            value={name}
            maxLength={LEADERBOARD.maxNameLength}
            autoComplete="off"
            aria-invalid={problem !== null}
            aria-describedby="nickname-help"
            onChange={(e) => {
              setName(e.target.value);
              setProblem(null);
            }}
            className="h-11"
          />
          <p id="nickname-help" className={problem ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {problem ?? `${LEADERBOARD.minNameLength} to ${LEADERBOARD.maxNameLength} characters: letters, numbers, spaces, dots, dashes, underscores.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-11" disabled={busy}>
            {busy ? "Saving" : joined ? "Save nickname" : "Join the leaderboard"}
          </Button>
          {joined && (
            <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
