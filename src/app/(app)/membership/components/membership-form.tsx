"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import type { Membership } from "@/lib/types";
import { membershipSchema, type MembershipInput } from "@/lib/validation/membership";

type MembershipFormProps = {
  today: string;
  existing: Membership | null;
};

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";

export function MembershipForm({ today, existing }: MembershipFormProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MembershipInput>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      gym_name: existing?.gym_name ?? "",
      location: existing?.location ?? "",
      start_date: existing?.start_date ?? today,
      end_date: existing?.end_date ?? "",
      price: existing?.price ?? null,
      notes: existing?.notes ?? "",
    },
  });

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
        {errors.price && <p className="text-xs text-destructive">Enter a valid price</p>}
      </div>

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <Button type="submit" className="h-11 flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Saving" : existing ? "Update membership" : "Save membership"}
        </Button>
        {existing && (
          <Button type="button" variant="outline" className="h-11" onClick={remove} disabled={deleting}>
            {deleting ? "Deleting" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}
