import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BACK_SHAPES, FRONT_SHAPES } from "@/components/body-map/body-shapes";
import { BodySvg } from "@/components/body-map/body-svg";
import type { IntensityLevel } from "@/lib/muscle-intensity";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";

const levels = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, "none"])) as Record<MuscleGroup, IntensityLevel>;
const scores = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<MuscleGroup, number>;

describe("BodySvg display mode (no onSelect)", () => {
  const html = renderToStaticMarkup(
    <BodySvg view="front" levels={{ ...levels, chest: "high" }} scores={{ ...scores, chest: 14 }} className="h-64" />,
  );

  it("is an image, not a group of buttons", () => {
    expect(html).toContain('role="img"');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain("tabindex");
  });

  it("gives each muscle a tooltip title and colors it by level", () => {
    expect(html).toContain("<title>Chest, Heavy, 14 weighted sets</title>");
    expect(html).toContain("fill-intensity-high");
    expect(html).toContain("fill-intensity-none");
  });

  it("uses the size class it is given", () => {
    expect(html).toContain("h-64");
    expect(html).not.toContain("h-[26rem]");
  });
});

describe("BodySvg interactive mode", () => {
  const html = renderToStaticMarkup(
    <BodySvg view="back" levels={levels} scores={scores} selected="lats" onSelect={vi.fn()} />,
  );

  it("makes every back view muscle a focusable button", () => {
    const buttons = html.match(/role="button"/g) ?? [];
    expect(buttons).toHaveLength(new Set(BACK_SHAPES.map((s) => s.muscle)).size);
    expect(html).toContain('tabindex="0"');
  });

  it("marks the selected muscle and keeps the large default size", () => {
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("stroke-primary");
    expect(html).toContain("h-[26rem]");
  });
});

describe("body shapes", () => {
  it("front and back together cover all 16 muscle groups", () => {
    const covered = new Set([...FRONT_SHAPES, ...BACK_SHAPES].map((s) => s.muscle));
    expect([...covered].sort()).toEqual([...MUSCLE_GROUPS].sort());
  });
});
