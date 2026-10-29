"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { CURRENCIES, type Currency } from "@/lib/currency";
import type { Membership } from "@/lib/types";
import { membershipSchema, type MembershipInput } from "@/lib/validation/membership";
import { LocationPicker } from "./location-picker";

type MembershipFormProps = {
  today: string;
  existing: Membership | null;
  /** Currency preselected for a new membership, from Settings. */
  defaultCurrency: Currency;
};

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";

export function MembershipForm({ today, existing, defaultCurrency }: MembershipFormProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  // The address the map last filled in. A new pin may replace it, but never text the user typed.
  const [autoAddress, setAutoAddress] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<MembershipInput>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      gym_name: existing?.gym_name ?? "",
      location: existing?.location ?? "",
      latitude: existing?.latitude ?? null,
      longitude: existing?.longitude ?? null,
      start_date: existing?.start_date ?? today,
      end_date: existing?.end_date ?? "",
      price: existing?.price ?? null,
      currency: existing?.currency ?? defaultCurrency,
      notes: existing?.notes ?? "",
    },
  });

  const latitude = useWatch({ control, name: "latitude" });
  const longitude = useWatch({ control, name: "longitude" });
  const pin = latitude != null && longitude != null ? { latitude, longitude } : null;

  function onPinChange(point: { latitude: number; longitude: number } | null, address?: string) {
    setValue("latitude", point?.latitude ?? null, { shouldDirty: true });
    setValue("longitude", point?.longitude ?? null, { shouldDirty: true });
    const current = getValues("location");
    if (point && address && (!current || current === autoAddress)) {
      setValue("location", address, { shouldDirty: true });
      setAutoAddress(address);
    }
  }

  async function onSubmit(values: MembershipInput) {
    const payload = { ...values, location: values.location || null, notes: values.notes || null };
    const result = existing
      ? await apiRequest(`/api/membership/${existing.id}`, "PUT", payload)
      : await apiRequest("/api/membership", "POST", payload);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(existing ? "Membership updated" : "Membership saved");
    router.refresh();
  }

  async function remove() {
    if (!existing || deleting) return;
    setDeleting(true);
    const result = await apiRequest(`/api/membership/${existing.id}`, "DELETE");
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Membership deleted");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="gym_name" className={labelClass}>Gym name</Label>
        <Input id="gym_name" className="h-11" aria-invalid={!!errors.gym_name} {...register("gym_name")} />
        {errors.gym_name && <p className="text-xs text-destructive">{errors.gym_name.message}</p>}
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="location" className={labelClass}>Location (optional)</Label>
        <Input
          id="location"
          className="h-11"
          placeholder="Branch, area or address"
          maxLength={120}
          autoComplete="street-address"
          aria-invalid={!!errors.location}
          {...register("location")}
        />
        {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
      </div>

      <div className="sm:col-span-2">
        <LocationPicker value={pin} onChange={onPinChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="start_date" className={labelClass}>Start date</Label>
        <Input id="start_date" type="date" className="tabular h-11" aria-invalid={!!errors.start_date} {...register("start_date")} />
        {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="end_date" className={labelClass}>End date</Label>
        <Input id="end_date" type="date" className="tabular h-11" aria-invalid={!!errors.end_date} {...register("end_date")} />
        {errors.end_date && <p className="text-xs text-destructive">{errors.end_date.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="price" className={labelClass}>Price</Label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            id="price"
            type="number"
            inputMode="decimal"
            min="0"
            className="tabular h-11"
            aria-invalid={!!errors.price}
            {...register("price", {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
          />
          <select
            aria-label="Currency"
            className="h-11 border bg-background px-2 text-sm"
            {...register("currency")}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {errors.price && <p className="text-xs text-destructive">Enter a valid price</p>}
      </div>

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <Button type="submit" className="h-11 flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Saving" : existing ? "Update membership" : "Save membership"}
        </Button>
        {existing && (
          <ConfirmDialog
            title="Delete this membership?"
            description="Your membership details and the gym pin are removed. Gym check-ins need a pinned gym, so pin it again to check in."
            confirmLabel="Delete membership"
            destructive
            onConfirm={remove}
            trigger={
              <Button type="button" variant="outline" className="h-11" disabled={deleting}>
                {deleting ? "Deleting" : "Delete"}
              </Button>
            }
          />
        )}
      </div>
    </form>
  );
}
