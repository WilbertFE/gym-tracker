"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { LEADERBOARD, validateDisplayName } from "@/lib/leaderboard";

type JoinCardProps = {
  joined: boolean;
  displayName: string | null;
  /** The display name of the profile, when there is one. It is then the one name, set in Settings. */
  profileName: string | null;
};

/** Join, rename or leave. Joining is a choice: until then you are not listed. */
export function JoinCard({ joined, displayName, profileName }: JoinCardProps) {
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

  async function joinWithProfileName() {
    if (busy) return;
    setBusy(true);
    // The server uses the name of the profile, whatever is sent here.
    const result = await apiRequest("/api/leaderboard/profile", "PUT", { display_name: profileName });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("You are on the leaderboard");
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

  // With a profile there is one name for everything, so joining is one tap and renaming happens in Settings.
  if (profileName && !joined) {
    return (
      <Panel label="Join the leaderboard" tour="join">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            You would be listed as <span className="font-medium">{profileName}</span>, the display name of your profile.
            Others see that name, your country, level, rank and XP, nothing else. You can leave any time.
          </p>
          <Button type="button" className="h-11" onClick={joinWithProfileName} disabled={busy}>
            {busy ? "Joining" : "Join the leaderboard"}
          </Button>
        </div>
      </Panel>
    );
  }

  if (joined && !editing) {
    return (
      <Panel label="Your entry" tour="join">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            You are listed as <span className="font-medium">{displayName}</span>. Others see your nickname, country,
            level, rank and XP, nothing else.
          </p>
          <div className="flex gap-2">
            {profileName ? (
              <Link
                href="/settings#profile"
                className="font-display inline-flex h-11 items-center border border-primary/40 px-4 text-xs font-semibold tracking-wide hover:border-primary/70 hover:bg-primary/10"
              >
                Change in Settings
              </Link>
            ) : (
              <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(true)}>
                Change nickname
              </Button>
            )}
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
    <Panel label={joined ? "Change nickname" : "Join the leaderboard"} tour="join">
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
