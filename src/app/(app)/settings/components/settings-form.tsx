"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { countryOptions } from "@/lib/countries";
import { NO_RECOVERY_COOKIE, SHOW_ALL_COOKIE, writeCookie } from "@/lib/feature-prefs";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/currency";
import type { UserSettings } from "@/lib/types";
import { UNIT_LABELS, WEIGHT_UNITS, type WeightUnit } from "@/lib/units";
import { levelUpScreenEnabled, setLevelUpScreenEnabled, setXpPopupsEnabled, xpPopupsEnabled } from "@/lib/xp-popup-pref";

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";
const NO_COUNTRY = "none";

const PREF_EVENT = "gymtrack:xp-pref";
const subscribePref = (notify: () => void) => {
  window.addEventListener(PREF_EVENT, notify);
  return () => window.removeEventListener(PREF_EVENT, notify);
};

export function SettingsForm({ initial, showAll, recovery }: { initial: UserSettings; showAll: boolean; recovery: boolean }) {
  const router = useRouter();
  const countries = useMemo(() => countryOptions(), []);
  const [country, setCountry] = useState<string>(initial.country ?? NO_COUNTRY);
  const [unit, setUnit] = useState<WeightUnit>(initial.weight_unit);
  const [currency, setCurrency] = useState<Currency>(initial.currency);
  const [saving, setSaving] = useState(false);
  const [everything, setEverything] = useState(showAll);
  const [comeback, setComeback] = useState(recovery);
  // Kept on this device, not in the account, and read after load so the server and browser agree.
  const popups = useSyncExternalStore(subscribePref, xpPopupsEnabled, () => true);
  const levelScreen = useSyncExternalStore(subscribePref, levelUpScreenEnabled, () => true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await apiRequest("/api/settings", "PUT", {
      country: country === NO_COUNTRY ? null : country,
      weight_unit: unit,
      currency,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Country</span>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="h-11 w-full sm:max-w-sm" aria-label="Country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={NO_COUNTRY}>Not set</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Used for local rankings later. It is not shown to anyone yet.</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Weight unit</span>
        <SegmentedControl
          label="Weight unit"
          className="w-full sm:w-64"
          value={unit}
          onChange={setUnit}
          options={WEIGHT_UNITS.map((u) => ({ value: u, label: u }))}
        />
        <p className="text-xs text-muted-foreground">
          {UNIT_LABELS[unit]}. Applies to body weight, sets and volume. Your data is stored in kilograms, so
          you can switch back and forth without losing anything.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Currency</span>
        <SegmentedControl
          label="Currency"
          className="w-full sm:w-64"
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
        <p className="text-xs text-muted-foreground">
          {CURRENCY_LABELS[currency]}. The default for new membership prices. Amounts are never converted,
          each price keeps the currency it was saved in.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Features</span>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={everything}
            onChange={(e) => {
              setEverything(e.target.checked);
              writeCookie(SHOW_ALL_COOKIE, e.target.checked ? "1" : null);
              router.refresh();
            }}
            className="size-4 accent-[var(--primary)]"
          />
          Show all features now
        </label>
        <p className="text-xs text-muted-foreground">
          Quests, boosters and the leaderboard normally open as you level up. Turn this on to see everything right away.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Comeback quest</span>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={comeback}
            onChange={(e) => {
              setComeback(e.target.checked);
              writeCookie(NO_RECOVERY_COOKIE, e.target.checked ? null : "1");
              router.refresh();
            }}
            className="size-4 accent-[var(--primary)]"
          />
          Offer an easy comeback quest after a quiet day
        </label>
        <p className="text-xs text-muted-foreground">
          After a day with no daily quest finished, the next day has one extra, easy quest. No XP is ever taken away.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>XP pop-ups</span>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={popups}
            onChange={(e) => {
              setXpPopupsEnabled(e.target.checked);
              window.dispatchEvent(new Event(PREF_EVENT));
            }}
            className="size-4 accent-[var(--primary)]"
          />
          Show a small pop-up when I earn XP
        </label>
        <p className="text-xs text-muted-foreground">
          Applies on this device only and takes effect straight away. Your XP and level are not affected.
        </p>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={levelScreen}
            onChange={(e) => {
              setLevelUpScreenEnabled(e.target.checked);
              window.dispatchEvent(new Event(PREF_EVENT));
            }}
            className="size-4 accent-[var(--primary)]"
          />
          Full screen for big level ups, new ranks and unlocks
        </label>
      </div>

      <Button type="submit" className="h-11 sm:w-48" disabled={saving}>
        {saving ? "Saving" : "Save settings"}
      </Button>
    </form>
  );
}
