import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/** Every source file under a folder. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx|css)$/.test(name) ? [path] : [];
  });
}

describe("brand", () => {
  it("is called Muscles Leveling", () => {
    expect(SITE_NAME).toBe("Muscles Leveling");
    expect(SITE_DESCRIPTION).not.toMatch(/gymtrack/i);
    expect(SITE_DESCRIPTION).not.toContain("—");
  });

  it("does not show the old name anywhere in the source", () => {
    // The browser storage keys and event names start with "gymtrack:" on purpose, so saved settings
    // survive the rename. Anything else that says GymTrack, in any case, is a leftover.
    const leftovers: string[] = [];
    for (const file of files(join(process.cwd(), "src"))) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          const text = line.replaceAll(/gymtrack:[a-z-]+/g, "");
          if (/gymtrack/i.test(text)) leftovers.push(`${file}:${i + 1}`);
        });
    }
    expect(leftovers).toEqual([]);
  });
});
