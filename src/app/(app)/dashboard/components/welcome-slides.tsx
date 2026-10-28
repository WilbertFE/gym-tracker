"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KEY = "ml:welcome-seen";
const subscribe = () => () => {};

const wasSeen = (): boolean => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

const SLIDES = [
  { title: "Check in and train", body: "Say how you trained today, log your sets, and finish the workout. That is the whole routine." },
  { title: "Earn XP, level up", body: "Everything you log earns XP. Levels come fast at the start, and each rank has its own badge." },
  { title: "More opens as you grow", body: "Quests, boosters and a leaderboard unlock at higher levels, so there is always something new ahead." },
] as const;

/**
 * Three short slides the first time someone opens the dashboard. Skippable, shown once per device, and
 * only for accounts that have not trained yet, so nobody who already uses the app sees it.
 */
export function WelcomeSlides({ show }: { show: boolean }) {
  const seen = useSyncExternalStore(subscribe, wasSeen, () => true);
  const [closed, setClosed] = useState(false);
  const [index, setIndex] = useState(0);
  const open = show && !seen && !closed;

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // The slides may show again next time, which is harmless.
    }
    setClosed(true);
  };

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <p className="tabular text-[11px] uppercase tracking-widest text-primary">
            Welcome, {index + 1} of {SLIDES.length}
          </p>
          <DialogTitle>{slide.title}</DialogTitle>
          <DialogDescription>{slide.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11" onClick={close}>
            Skip
          </Button>
          <Button type="button" className="h-11" onClick={() => (last ? close() : setIndex(index + 1))}>
            {last ? "Let's go" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
