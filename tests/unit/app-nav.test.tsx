// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

import { AppNav } from "@/components/app-nav";

beforeEach(() => {
  pathname = "/dashboard";
});
afterEach(cleanup);

/** The phone bar is the second navigation landmark, after the desktop rail. */
const phoneBar = () => screen.getAllByRole("navigation", { name: "Primary" })[1];
const tabLabels = () => within(phoneBar()).getAllByRole("listitem").map((li) => li.textContent?.trim());
const openMore = () => fireEvent.click(within(phoneBar()).getByRole("button", { name: "More" }));
const sheetLinks = () => within(screen.getByRole("dialog")).getAllByRole("link").map((a) => a.textContent?.trim());

describe("the phone bar", () => {
  it("has the main tabs and a More tab, never more than five items", () => {
    render(<AppNav level={30} showAll={false} />);
    expect(tabLabels()).toEqual(["Dashboard", "Workouts", "Body", "More"]);
  });

  it("has only what is open: a new player sees Dashboard, Workouts and More", () => {
    render(<AppNav level={1} showAll={false} />);
    expect(tabLabels()).toEqual(["Dashboard", "Workouts", "More"]);
  });

  it("opens a sheet with every other open page, in the order of the desktop rail, and Sign out", () => {
    render(<AppNav level={30} showAll={false} />);
    openMore();
    expect(sheetLinks()).toEqual(["Schedule", "Status", "Collection", "Leaderboard", "Friends", "Profile", "Membership", "Settings"]);
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("leaves out pages that are still locked, as the desktop rail does", () => {
    render(<AppNav level={5} showAll={false} />);
    openMore();
    expect(sheetLinks()).toEqual(["Settings"]);
  });

  it("opens everything with Show all features", () => {
    render(<AppNav level={1} showAll />);
    openMore();
    expect(sheetLinks()).toContain("Friends");
    expect(sheetLinks()).toContain("Membership");
  });

  it("points each tile at its page and closes the sheet when one is tapped", () => {
    render(<AppNav level={30} showAll={false} />);
    openMore();
    const friends = within(screen.getByRole("dialog")).getByRole("link", { name: "Friends" });
    expect(friends.getAttribute("href")).toBe("/friends");
    fireEvent.click(friends);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("marks More as the current page when the page is inside it, and the tile too", () => {
    pathname = "/leaderboard";
    render(<AppNav level={30} showAll={false} />);
    const more = within(phoneBar()).getByRole("button", { name: "More" });
    expect(more.getAttribute("aria-current")).toBe("page");
    openMore();
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Leaderboard" }).getAttribute("aria-current")).toBe("page");
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Status" }).getAttribute("aria-current")).toBeNull();
  });

  it("marks a tab, not More, when the page is a tab", () => {
    pathname = "/workouts/abc";
    render(<AppNav level={30} showAll={false} />);
    expect(within(phoneBar()).getByRole("button", { name: "More" }).getAttribute("aria-current")).toBeNull();
    expect(within(phoneBar()).getByRole("link", { name: "Workouts" }).getAttribute("aria-current")).toBe("page");
  });

  it("highlights the Profile page for a player profile too", () => {
    pathname = "/u/someone";
    render(<AppNav level={30} showAll={false} />);
    expect(within(phoneBar()).getByRole("button", { name: "More" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("the desktop rail", () => {
  it("still lists every open page", () => {
    render(<AppNav level={30} showAll={false} />);
    const rail = screen.getAllByRole("navigation", { name: "Primary" })[0];
    expect(within(rail).getAllByRole("link").map((a) => a.textContent?.trim())).toEqual([
      "Dashboard",
      "Workouts",
      "Body",
      "Schedule",
      "Status",
      "Collection",
      "Leaderboard",
      "Friends",
      "Profile",
      "Membership",
      "Settings",
    ]);
  });
});
