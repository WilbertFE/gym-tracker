"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SectionTabsProps = {
  label: string;
  /** Contents are rendered on the server and passed in, so each stays a Server Component. */
  tabs: { value: string; label: string; content: ReactNode }[];
};

/** One section at a time, so a long page becomes a short one. Tabs share the width on phones. */
export function SectionTabs({ label, tabs }: SectionTabsProps) {
  return (
    <Tabs defaultValue={tabs[0].value} className="gap-4">
      <TabsList variant="line" aria-label={label} className="w-full justify-start border-b sm:w-fit">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="min-h-11 flex-1 px-4 text-sm sm:flex-none">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="text-sm">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
