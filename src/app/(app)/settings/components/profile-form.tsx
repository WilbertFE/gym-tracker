"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { LEADERBOARD } from "@/lib/leaderboard";
import {
  BIO_MAX,
  DEFAULT_SECTIONS,
  NEVER_SHARED,
  SECTIONS,
  USERNAME,
  validateBio,
  validateProfileName,
  validateUsername,
  VISIBILITIES,
  type SectionFlags,
  type Visibility,
} from "@/lib/profile";
import { cn } from "@/lib/utils";

type Initial = { username: string; display_name: string; bio: string | null; visibility: Visibility; sections: SectionFlags };

type UsernameState = { state: "idle" | "checking" | "ok" | "problem"; message: string | null };

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";

/** The wait after the last key before the username is checked, so it is not asked about at every letter. */
const CHECK_DELAY_MS = 500;

type ProfileFormProps = {
  /** False until the profiles migration has run. */
  available: boolean;
  initial: Initial | null;
  /** The name on the leaderboard, to start from when there is no profile yet. */
  suggestedName: string | null;
};

/**
 * Make or change your profile: its address, the name shown, a short bio, who may open it and which sections
 * they see. Every rule is checked here for a quick answer and again on the server, which has the last word.
 */
export function ProfileForm({ available, initial, suggestedName }: ProfileFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.display_name ?? suggestedName ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "private");
  const [sections, setSections] = useState<SectionFlags>(initial?.sections ?? DEFAULT_SECTIONS);
  const [usernameState, setUsernameState] = useState<UsernameState>({ state: "idle", message: null });
  const [nameProblem, setNameProblem] = useState<string | null>(null);
  const [bioProblem, setBioProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);

  if (!available) {
    return <p className="text-sm text-muted-foreground">Profiles are not set up yet. They appear here as soon as the database is updated.</p>;
  }

  /** Checks a username with the server after a short pause. Older answers that arrive late are ignored. */
  function onUsernameChange(value: string) {
    setUsername(value);
    if (timer.current) clearTimeout(timer.current);
    const checked = validateUsername(value);
    if (!checked.ok) {
      request.current += 1;
      setUsernameState(value.trim() === "" ? { state: "idle", message: null } : { state: "problem", message: checked.message });
      return;
    }
    if (initial && checked.username === initial.username) {
      request.current += 1;
      setUsernameState({ state: "ok", message: "This is your username." });
      return;
    }
    setUsernameState({ state: "checking", message: "Checking" });
    const mine = ++request.current;
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/check?username=${encodeURIComponent(checked.username)}`);
        const json = await res.json().catch(() => ({}));
        if (mine !== request.current) return;
        if (!res.ok) return setUsernameState({ state: "idle", message: null });
        setUsernameState(json.data?.available ? { state: "ok", message: "That username is free." } : { state: "problem", message: json.data?.message ?? "That username is taken." });
      } catch {
        if (mine === request.current) setUsernameState({ state: "idle", message: null });
      }
    }, CHECK_DELAY_MS);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const u = validateUsername(username);
    const n = validateProfileName(displayName);
    const b = validateBio(bio);
    if (!u.ok) setUsernameState({ state: "problem", message: u.message });
    setNameProblem(n.ok ? null : n.message);
    setBioProblem(b.ok ? null : b.message);
    if (!u.ok || !n.ok || !b.ok) return;

    setSaving(true);
    const result = await apiRequest<Initial>("/api/profile", "PUT", {
      username: u.username,
      display_name: n.name,
      bio: b.bio,
      visibility,
      sections,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      if (/username/i.test(result.error)) setUsernameState({ state: "problem", message: result.error });
      if (/display name/i.test(result.error)) setNameProblem(result.error);
      return;
    }
    toast.success(initial ? "Profile saved" : "Profile made");
    setUsername(result.data.username);
    setUsernameState({ state: "idle", message: null });
    router.refresh();
  }

  async function remove() {
    if (saving) return;
    setSaving(true);
    const result = await apiRequest("/api/profile", "DELETE");
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile deleted");
    setConfirmDelete(false);
    setUsername("");
    setBio("");
    setVisibility("private");
    setSections(DEFAULT_SECTIONS);
    router.refresh();
  }

  const visible = visibility === "members";

  return (
    <form onSubmit={save} className="flex flex-col gap-6" noValidate>
      <p className="text-sm text-muted-foreground">
        Your profile is a page with your rank, stats and the items you found. It starts private. You choose who can open
        it and which parts they see, and you can change that or delete it any time.
      </p>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Who can open it</span>
        <SegmentedControl
          label="Who can open your profile"
          className="w-full sm:w-96"
          value={visibility}
          onChange={setVisibility}
          options={VISIBILITIES.map((v) => ({ value: v.id, label: v.name }))}
        />
        <p className="text-xs text-muted-foreground">{VISIBILITIES.find((v) => v.id === visibility)?.hint}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-username" className={labelClass}>
            Username
          </Label>
          <div className="flex items-center">
            <span aria-hidden className="tabular flex h-11 items-center border border-r-0 border-primary/25 bg-background/60 px-3 text-sm text-muted-foreground">
              @
            </span>
            <Input
              id="profile-username"
              value={username}
              maxLength={USERNAME.max + 1}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={usernameState.state === "problem"}
              aria-describedby="profile-username-help"
              onChange={(e) => onUsernameChange(e.target.value)}
              className="h-11"
            />
          </div>
          <p
            id="profile-username-help"
            aria-live="polite"
            className={cn("text-xs", usernameState.state === "problem" ? "text-destructive" : usernameState.state === "ok" ? "text-primary" : "text-muted-foreground")}
          >
            {usernameState.message ?? `${USERNAME.min} to ${USERNAME.max} characters: letters, numbers and underscores. It is the address of your profile.`}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-name" className={labelClass}>
            Display name
          </Label>
          <Input
            id="profile-name"
            value={displayName}
            maxLength={LEADERBOARD.maxNameLength}
            autoComplete="off"
            aria-invalid={nameProblem !== null}
            aria-describedby="profile-name-help"
            onChange={(e) => {
              setDisplayName(e.target.value);
              setNameProblem(null);
            }}
            className="h-11"
          />
          <p id="profile-name-help" className={cn("text-xs", nameProblem ? "text-destructive" : "text-muted-foreground")}>
            {nameProblem ?? "The name people see, also on the leaderboard. Letters, numbers, spaces, dots, dashes and underscores."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-bio" className={labelClass}>
          Bio
        </Label>
        <textarea
          id="profile-bio"
          value={bio}
          rows={3}
          maxLength={BIO_MAX + 40}
          aria-invalid={bioProblem !== null}
          aria-describedby="profile-bio-help"
          onChange={(e) => {
            setBio(e.target.value);
            setBioProblem(null);
          }}
          className="min-h-20 w-full border border-primary/25 bg-background/60 px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
        <p id="profile-bio-help" className={cn("tabular flex justify-between gap-3 text-xs", bioProblem ? "text-destructive" : "text-muted-foreground")}>
          <span>{bioProblem ?? "A line about you. Plain text."}</span>
          <span>
            {bio.length} / {BIO_MAX}
          </span>
        </p>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className={cn(labelClass, "mb-2")}>What others can see</legend>
        <p className="mb-1 text-xs text-muted-foreground">
          {visible
            ? "Switch off a section and it is not sent to anyone else at all."
            : "Your profile is private, so none of this is shown yet. It applies once you let signed-in users open it."}
        </p>
        {SECTIONS.map((section) => (
          <label key={section.id} className="flex min-h-11 items-start gap-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={sections[section.id]}
              onChange={(e) => setSections((current) => ({ ...current, [section.id]: e.target.checked }))}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span className="flex flex-col">
              <span>{section.name}</span>
              <span className="text-xs text-muted-foreground">{section.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1 border border-dashed p-3">
        <p className={labelClass}>Never shown, whatever you choose</p>
        <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-xs text-muted-foreground">
          {NEVER_SHARED.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="h-11" disabled={saving}>
          {saving ? "Saving" : initial ? "Save profile" : "Make my profile"}
        </Button>
        {initial && (
          <Link
            href={`/u/${initial.username}`}
            className="font-display inline-flex h-11 items-center border border-primary/40 px-4 text-xs font-semibold tracking-wide hover:border-primary/70 hover:bg-primary/10"
          >
            View my profile
          </Link>
        )}
        {initial &&
          (confirmDelete ? (
            <>
              <Button type="button" variant="destructive" className="h-11" onClick={remove} disabled={saving}>
                Confirm delete
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" className="h-11" onClick={() => setConfirmDelete(true)}>
              Delete profile
            </Button>
          ))}
      </div>
    </form>
  );
}
