"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import type { MuscleGroup } from "@/lib/muscles";
import type { WorkoutSession } from "@/lib/types";

type StartWorkoutButtonProps = {
  /** Open the workout with an exercise for this muscle group ready to log. */
  focus?: MuscleGroup;
  label?: string;
  /**
   * Why a new workout cannot be started right now (for example no gym check-in
   * today). The button is turned off and the reason is shown with a link to
   * the check-in. The server enforces the same rule.
   */
  blockedMessage?: string;
};

/**
 * Starts a workout and opens it. Only one workout can be in progress, so if one
 * already is, this opens that one instead.
 */
export function StartWorkoutButton({ focus, label = "Start workout", blockedMessage }: StartWorkoutButtonProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const messageId = useId();

  async function start() {
    if (starting || blockedMessage) return;
    setStarting(true);
    const result = await apiRequest<WorkoutSession>("/api/workouts", "POST");
    if (!result.ok) {
      setStarting(false);
      toast.error(result.error);
      return;
    }
    router.push(`/workouts/${result.data.id}${focus ? `?focus=${focus}` : ""}`);
  }

  if (blockedMessage) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          className="h-12 w-full text-base sm:w-auto sm:px-8"
          disabled
          aria-describedby={messageId}
        >
          {label}
        </Button>
        <p id={messageId} className="text-sm text-muted-foreground">
          {blockedMessage}{" "}
          <Link
            href="/dashboard#daily-checkin"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Go to the check-in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <Button className="h-12 w-full text-base sm:w-auto sm:px-8" onClick={start} disabled={starting}>
      {starting ? "Starting" : label}
    </Button>
  );
}
