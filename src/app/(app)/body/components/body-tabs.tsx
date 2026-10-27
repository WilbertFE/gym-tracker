"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** One view at a time: the muscle heatmap or the weight log. Both are rendered on the server. */
export function BodyTabs({ muscles, weight }: { muscles: ReactNode; weight: ReactNode }) {
  return (
    <Tabs defaultValue="muscles" className="gap-4">
      <TabsList variant="line" aria-label="Body views">
        <TabsTrigger value="muscles" className="min-h-11 px-4 text-sm">
          Muscles
        </TabsTrigger>
        <TabsTrigger value="weight" className="min-h-11 px-4 text-sm">
          Weight
        </TabsTrigger>
      </TabsList>
      <TabsContent value="muscles">{muscles}</TabsContent>
      <TabsContent value="weight">{weight}</TabsContent>
    </Tabs>
  );
}
