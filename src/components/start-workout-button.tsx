"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import type { MuscleGroup } from "@/lib/muscles";
import type { WorkoutSession } from "@/lib/types";

type StartWorkoutButtonProps = {
  /** Open the workout with an exercise for this muscle group ready to log. */
  focus?: MuscleGroup;
  label?: string;
};

/**
 * Starts a workout and opens it. Only one workout can be in progress, so if one
 * already is, this opens that one instead.
 */
export function StartWorkoutButton({ focus, label = "Start workout" }: StartWorkoutButtonProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  async function start() {
    if (starting) return;
    setStarting(true);
    const result = await apiRequest<WorkoutSession>("/api/workouts", "POST");
    if (!result.ok) {
      setStarting(false);
      toast.error(result.error);
      return;
    }
    router.push(`/workouts/${result.data.id}${focus ? `?focus=${focus}` : ""}`);
  }

  return (
    <Button className="h-12 w-full text-base sm:w-auto sm:px-8" onClick={start} disabled={starting}>
      {starting ? "Starting" : label}
    </Button>
  );
}
