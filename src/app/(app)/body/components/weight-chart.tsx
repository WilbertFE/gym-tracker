"use client";

import { format, parseISO } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  weight_kg: { label: "Weight (kg)", color: "var(--primary)" },
} satisfies ChartConfig;

type WeightChartProps = {
  /** Oldest first. */
  data: { date: string; weight_kg: number }[];
};

export function WeightChart({ data }: WeightChartProps) {
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
        />
        <YAxis
          width={36}
          tickLine={false}
          axisLine={false}
          domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(d) => format(parseISO(String(d)), "d MMM yyyy")}
            />
          }
        />
        <Line
          dataKey="weight_kg"
          type="monotone"
          stroke="var(--color-weight_kg)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
