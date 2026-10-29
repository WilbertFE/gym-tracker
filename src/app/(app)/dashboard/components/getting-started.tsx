import { CheckIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Panel } from "@/components/panel";
import { guideDone, type GuideStep, type GuideStepId } from "@/lib/guide";
import { cn } from "@/lib/utils";

/**
 * The first steps, as a short checklist that ticks itself. It is the whole tutorial: no tour, no pop-ups,
 * and it goes away when the last step is done. Finishing it earns a booster.
 */
export function GettingStarted({ steps, lockedSteps = {} }: { steps: GuideStep[]; lockedSteps?: Partial<Record<GuideStepId, number>> }) {
  if (guideDone(steps)) return null;
  const done = steps.filter((s) => s.done).length;
  // A step whose page is still locked says when it opens, and is never the one to do next.
  const next = steps.find((s) => !s.done && lockedSteps[s.id] === undefined);

  return (
    <Panel label="Getting started" variant="system" tour="guide">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Four small steps. Finish them for a free XP booster.
          </p>
          <div
            role="progressbar"
            aria-label="Getting started progress"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={done}
            className="mt-1 h-1.5 w-full bg-intensity-none"
          >
            <div className="h-full bg-primary shadow-[0_0_10px_var(--primary)] transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <p className="tabular text-xs text-muted-foreground">
            {done} of {steps.length} done
          </p>
        </div>

        <ol className="flex flex-col divide-y border">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3 px-3 py-3">
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center border",
                  step.done ? "border-primary bg-primary text-primary-foreground" : "text-transparent",
                )}
              >
                <CheckIcon className="size-4" weight="bold" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className={cn("text-sm", step.done && "text-muted-foreground line-through decoration-1")}>{step.title}</p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground">
                    {lockedSteps[step.id] !== undefined ? `Opens at level ${lockedSteps[step.id]}. ${step.hint}` : step.hint}
                  </p>
                )}
              </div>
              {step === next && (
                <Link
                  href={step.href}
                  className="tabular inline-flex min-h-11 shrink-0 items-center border border-primary px-3 text-[11px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Do it
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  );
}
