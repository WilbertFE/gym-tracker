"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import type { WorkoutSession } from "@/lib/types";

export function StartWorkoutButton() {
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
    router.push(`/workouts/${result.data.id}`);
  }

  return (
    <Button className="h-12 w-full text-base sm:w-auto sm:px-8" onClick={start} disabled={starting}>
      {starting ? "Starting" : "Start workout"}
    </Button>
  );
}
