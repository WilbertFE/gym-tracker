import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocationLine } from "@/components/location-line";

const render = (
  gymName: string,
  location: string | null,
  latitude: number | null = null,
  longitude: number | null = null,
) =>
  renderToStaticMarkup(
    <LocationLine gymName={gymName} location={location} latitude={latitude} longitude={longitude} />,
  );

describe("LocationLine", () => {
  it("renders nothing without an address or a pin", () => {
    expect(render("Iron Gym", null)).toBe("");
    expect(render("Iron Gym", "")).toBe("");
  });

  it("links to a text search of gym name plus address when there is no pin", () => {
    const html = render("Iron Gym", "Central Branch");
    expect(html).toContain("Central Branch");
    expect(html).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=Iron%20Gym%20Central%20Branch"');
    expect(html).toContain("Open in maps");
  });

  it("links to the exact coordinates when a pin is set", () => {
    const html = render("Iron Gym", "Central Branch", -6.2088, 106.8456);
    expect(html).toContain("query=-6.2088%2C106.8456");
    expect(html).not.toContain("Iron%20Gym");
    expect(html).toContain("Central Branch");
  });

  it("shows the coordinates when there is a pin but no address", () => {
    const html = render("Iron Gym", null, -6.2088, 106.8456);
    expect(html).toContain("-6.208800, 106.845600");
    expect(html).toContain("Open in maps");
  });

  it("falls back to the address if the saved pin is not a real point", () => {
    const html = render("Iron Gym", "Central Branch", 999, 106.8);
    expect(html).toContain("Iron%20Gym%20Central%20Branch");
  });

  it("opens the link safely in a new tab and says so to screen readers", () => {
    const html = render("Iron Gym", "Central Branch");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("opens in a new tab");
  });

  it("URL encodes special characters so they cannot alter the query", () => {
    const html = render("A&B Gym", "Street #5 ?x=1&y=2");
    expect(html).toContain("query=A%26B%20Gym%20Street%20%235%20%3Fx%3D1%26y%3D2");
  });

  it("escapes markup in the location text", () => {
    const html = render("Gym", '<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
