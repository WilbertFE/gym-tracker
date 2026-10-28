"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/currency";
import type { UserSettings } from "@/lib/types";
import { UNIT_LABELS, WEIGHT_UNITS, type WeightUnit } from "@/lib/units";

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";
const NO_COUNTRY = "none";

export function SettingsForm({ initial }: { initial: UserSettings }) {
  const router = useRouter();
  const countries = useMemo(() => countryOptions(), []);
  const [country, setCountry] = useState<string>(initial.country ?? NO_COUNTRY);
  const [unit, setUnit] = useState<WeightUnit>(initial.weight_unit);
  const [currency, setCurrency] = useState<Currency>(initial.currency);
  const [saving, setSaving] = useState(false);

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

      <Button type="submit" className="h-11 sm:w-48" disabled={saving}>
        {saving ? "Saving" : "Save settings"}
      </Button>
    </form>
  );
}
