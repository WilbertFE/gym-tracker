"use client";

import { format, parseISO } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fromKg, type WeightUnit } from "@/lib/units";

type WeightChartProps = {
  /** Oldest first, in kilograms. */
  data: { date: string; weight_kg: number }[];
  unit: WeightUnit;
};

export function WeightChart({ data, unit }: WeightChartProps) {
  const config = {
    weight: { label: `Weight (${unit})`, color: "var(--primary)" },
  } satisfies ChartConfig;
  const points = data.map((d) => ({ date: d.date, weight: Number(fromKg(d.weight_kg, unit).toFixed(1)) }));

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          dataKey="weight"
          type="monotone"
          stroke="var(--color-weight)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
