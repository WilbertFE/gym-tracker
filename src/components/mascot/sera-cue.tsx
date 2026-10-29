"use client";

import { useEffect } from "react";
import type { FeatureId } from "@/lib/unlocks";
import { CUE_EVENT } from "./prefs";

/**
 * Put on a page that wants Sera to speak about it, like a locked page. It sends one event when it appears and
 * draws nothing. She decides whether to say it: not in Quiet or Off, and only once per feature.
 */
export function SeraCue({ featureId }: { featureId: FeatureId }) {
  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new CustomEvent(CUE_EVENT, { detail: { featureId } })), 900);
    return () => clearTimeout(timer);
  }, [featureId]);
  return null;
}
