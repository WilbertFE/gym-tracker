"use client";

import { CopyIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { formatFriendCode, MAX_FRIENDS, normalizeFriendCode } from "@/lib/friends";
import { LEADERBOARD, validateDisplayName } from "@/lib/leaderboard";

type Person = { id: string; name: string; level: number };

type FriendsManagerProps = {
  card: { code: string; name: string; level: number };
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
};

/**
 * Everything you can do on the Friends page: share your code, add a friend with theirs, answer requests, remove a friend, change
 * the name friends see and leave. Each action goes through the API, which checks everything again.
 */
export function FriendsManager({ card, friends, incoming, outgoing }: FriendsManagerProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeProblem, setCodeProblem] = useState<string | null>(null);
  const [name, setName] = useState(card.name);
  const [nameProblem, setNameProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function run<T>(key: string, action: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, done: (data: T) => string | null) {
    if (busy) return;
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    const message = done(result.data);
    if (message) toast.success(message);
    router.refresh();
    return true;
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(formatFriendCode(card.code));
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy. Select the code and copy it.");
    }
  }

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!normalizeFriendCode(code)) {
      setCodeProblem("A friend code has 8 letters and numbers, like ABCD-EFGH.");
      return;
    }
    setCodeProblem(null);
    const ok = await run(
      "add",
      () => apiRequest<{ status: "requested" | "accepted" }>("/api/friends", "POST", { code }),
      (data) => (data.status === "accepted" ? "You are friends now" : "Request sent"),
    );
    if (ok) setCode("");
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const checked = validateDisplayName(name);
    if (!checked.ok) {
      setNameProblem(checked.message);
      return;
    }
    setNameProblem(null);
    const ok = await run("name", () => apiRequest("/api/friends/card", "PUT", { name: checked.name }), () => "Name changed");
    if (ok) setEditing(false);
  }

  const accept = (p: Person) => run(`accept-${p.id}`, () => apiRequest(`/api/friends/${p.id}`, "PUT", { action: "accept" }), () => `${p.name} is your friend`);
  const remove = (p: Person, message: string) => run(`remove-${p.id}`, () => apiRequest(`/api/friends/${p.id}`, "DELETE"), () => message);

  const full = friends.length >= MAX_FRIENDS;

  return (
    <div className="flex flex-col gap-6">
      <Panel label="Your friend code" variant="system" tour="friend-code">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display tabular text-3xl font-semibold tracking-[0.2em]" aria-label={`Your friend code is ${card.code.split("").join(" ")}`}>
              {formatFriendCode(card.code)}
            </p>
            <Button type="button" variant="outline" className="h-11" onClick={copyCode}>
              <CopyIcon aria-hidden data-icon="inline-start" />
              Copy
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Send this code to a friend. They type it under Add a friend, and you accept. Friends see only your name, your level and the damage you deal to
            the weekly boss, nothing else.
          </p>

          {editing ? (
            <form onSubmit={saveName} className="flex flex-col gap-2 sm:max-w-sm" noValidate>
              <Label htmlFor="friend-name" className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Name your friends see
              </Label>
              <Input
                id="friend-name"
                value={name}
                maxLength={LEADERBOARD.maxNameLength}
                autoComplete="off"
                aria-invalid={nameProblem !== null}
                aria-describedby="friend-name-help"
                className="h-11"
                onChange={(e) => {
                  setName(e.target.value);
                  setNameProblem(null);
                }}
              />
              <p id="friend-name-help" className={nameProblem ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {nameProblem ?? `${LEADERBOARD.minNameLength} to ${LEADERBOARD.maxNameLength} characters: letters, numbers, spaces, dots, dashes, underscores.`}
              </p>
              <div className="flex gap-2">
                <Button type="submit" className="h-11" disabled={busy !== null}>
                  {busy === "name" ? "Saving" : "Save name"}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">
                Friends see you as <span className="font-medium">{card.name}</span>, level {card.level}.
              </p>
              <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(true)}>
                Change name
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel label="Add a friend" tour="add-friend">
        <form onSubmit={addFriend} className="flex flex-col gap-3" noValidate>
          <Label htmlFor="friend-code" className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Their friend code
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex flex-col gap-1 sm:w-64">
              <Input
                id="friend-code"
                value={code}
                maxLength={12}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ABCD-EFGH"
                aria-invalid={codeProblem !== null}
                aria-describedby="friend-code-help"
                disabled={full}
                className="tabular h-11 uppercase tracking-widest"
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeProblem(null);
                }}
              />
              <p id="friend-code-help" className={codeProblem ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {codeProblem ?? (full ? `You have ${MAX_FRIENDS} friends, the most there can be.` : `Up to ${MAX_FRIENDS} friends.`)}
              </p>
            </div>
            <Button type="submit" className="h-11" disabled={busy !== null || full}>
              {busy === "add" ? "Sending" : "Send request"}
            </Button>
          </div>
        </form>
      </Panel>

      {incoming.length > 0 && (
        <Panel label="Requests for you" variant="system">
          <ul className="divide-y">
            {incoming.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <p className="text-sm">
                  <span className="font-medium">{p.name}</span> <span className="tabular text-muted-foreground">level {p.level}</span>
                </p>
                <div className="flex gap-2">
                  <Button type="button" className="h-11" disabled={busy !== null} onClick={() => accept(p)}>
                    Accept
                  </Button>
                  <Button type="button" variant="outline" className="h-11" disabled={busy !== null} onClick={() => remove(p, "Request declined")}>
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel label={`Friends (${friends.length} of ${MAX_FRIENDS})`} tour="friends-list">
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No friends yet. Share your code, or add a friend with theirs.</p>
        ) : (
          <ul className="divide-y">
            {friends.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <p className="text-sm">
                  <span className="font-medium">{p.name}</span> <span className="tabular text-muted-foreground">level {p.level}</span>
                </p>
                <ConfirmDialog
                  title={`Remove ${p.name}?`}
                  description="You stop fighting the weekly boss together. Their damage no longer counts for you, and yours no longer counts for them. You can add each other again later."
                  confirmLabel="Remove"
                  destructive
                  onConfirm={async () => {
                    await remove(p, "Friend removed");
                  }}
                  trigger={
                    <Button type="button" variant="outline" className="h-11" disabled={busy !== null}>
                      Remove
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {outgoing.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Waiting for an answer</p>
            <ul className="mt-2 divide-y">
              {outgoing.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <p className="text-sm">
                    <span className="font-medium">{p.name}</span>
                  </p>
                  <Button type="button" variant="outline" className="h-11" disabled={busy !== null} onClick={() => remove(p, "Request cancelled")}>
                    Cancel request
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel label="Leave friends" variant="plain">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Leaving deletes your code, all your friendships and the boss damage friends could see. You can come back with a new code.</p>
          <ConfirmDialog
            title="Leave friends?"
            description="Your friend code, your friendships and your boss damage are deleted. Your friends stop seeing you."
            confirmLabel="Leave"
            destructive
            onConfirm={async () => {
              await run("leave", () => apiRequest("/api/friends/card", "DELETE"), () => "You left friends");
            }}
            trigger={
              <Button type="button" variant="outline" className="h-11 shrink-0" disabled={busy !== null}>
                Leave
              </Button>
            }
          />
        </div>
      </Panel>
    </div>
  );
}
