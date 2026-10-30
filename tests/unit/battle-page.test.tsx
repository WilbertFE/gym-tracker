// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", async (original) => ({ ...(await original<typeof import("next/navigation")>()), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/components/chest/chest-opener", () => ({
  ChestOpener: ({ chests }: { chests: { id: string }[] }) => <div role="dialog">opening {chests.map((c) => c.id).join(",")}</div>,
}));

import { BattleChests } from "@/components/chest/battle-chests";
import { activeTab, BATTLE_TABS, openTabs } from "@/lib/battle-tabs";
import { RANKS } from "@/lib/ranks";
import { NO_EQUIPMENT } from "@/lib/items";
import type { AvailableChest } from "@/lib/chests";

afterEach(cleanup);

const chest = (id: string, kind: AvailableChest["kind"], daysLeft: number): AvailableChest => ({ id, kind, earnedOn: "2026-11-01", expiresOn: "2026-11-15", daysLeft });

describe("the battle tabs", () => {
  it("open with their features: friends at level 18, the gate and the season at 26", () => {
    expect(openTabs(10, false)).toEqual([]);
    expect(openTabs(18, false).map((t) => t.id)).toEqual(["friends"]);
    expect(openTabs(25, false).map((t) => t.id)).toEqual(["friends"]);
    expect(openTabs(26, false).map((t) => t.id)).toEqual(["gate", "season", "friends"]);
    expect(openTabs(1, true).map((t) => t.id)).toEqual(BATTLE_TABS.map((t) => t.id));
  });

  it("show the tab asked for if it is open, otherwise the first one that is, and nothing when none is", () => {
    expect(activeTab(openTabs(30, false), "season")).toBe("season");
    expect(activeTab(openTabs(30, false), "friends")).toBe("friends");
    expect(activeTab(openTabs(30, false), undefined)).toBe("gate");
    expect(activeTab(openTabs(30, false), "nope")).toBe("gate");
    // A link to the gate before the gates open shows the friends boss.
    expect(activeTab(openTabs(20, false), "gate")).toBe("friends");
    expect(activeTab(openTabs(5, false), "gate")).toBeNull();
  });
});

describe("the old fight addresses", () => {
  it("send you to the matching tab of the Battle page", async () => {
    const cases: [string, string][] = [
      ["@/app/(app)/dashboard/gate/page", "/battle?tab=gate"],
      ["@/app/(app)/dashboard/season/page", "/battle?tab=season"],
      ["@/app/(app)/friends/boss/page", "/battle?tab=friends"],
    ];
    for (const [path, target] of cases) {
      const page = (await import(/* @vite-ignore */ path)).default as () => never;
      expect(() => page(), path).toThrow(/NEXT_REDIRECT/);
      try {
        page();
      } catch (e) {
        expect(String((e as { digest?: string }).digest), path).toContain(target);
      }
    }
  });
});

describe("the battle chests line", () => {
  const render_ = (available: AvailableChest[]) => render(<BattleChests available={available} rank={RANKS[0]} worn={NO_EQUIPMENT} quick />);

  it("shows nothing when no chest is waiting", () => {
    const { container } = render_([]);
    expect(container.textContent).toBe("");
  });

  it("counts the chests of every fight in one line, with the days left of the soonest", () => {
    render_([chest("g:2026-10-26", "gate", 9), chest("f:2026-10-26", "friends", 3), chest("s:2026-10-01", "season", 20)]);
    expect(screen.getByText("3 battle chests ready")).toBeTruthy();
    expect(screen.getByText("Open them within 3 days.")).toBeTruthy();
  });

  it("is singular for one chest and says so on the last day", () => {
    render_([chest("g:2026-10-26", "gate", 0)]);
    expect(screen.getByText("1 battle chest ready")).toBeTruthy();
    expect(screen.getByText("Last day to open one.")).toBeTruthy();
  });

  it("opens all of them, in order, when Open is pressed", () => {
    render_([chest("g:2026-10-26", "gate", 5), chest("t:2026-10-26", "mvp", 5)]);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog").textContent).toBe("opening g:2026-10-26,t:2026-10-26");
  });
});
