"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const config = { value: { label: "Stat", color: "var(--primary)" } } satisfies ChartConfig;

/** The five stats as a radar. The numbers are on the list beside it, so this only has to show the shape. */
export function StatsRadar({ stats, max }: { stats: { name: string; value: number }[]; max: number }) {
  return (
    <div role="img" aria-label={`Radar of your stats: ${stats.map((s) => `${s.name} ${s.value}`).join(", ")}`}>
      <ChartContainer config={config} className="mx-auto aspect-square max-h-80 w-full">
        <RadarChart data={stats} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          {/* Draws nothing, but fixes the top of the scale so the shape matches the bars. */}
          <PolarRadiusAxis domain={[0, max]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.3}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </RadarChart>
      </ChartContainer>
    </div>
  );
}
