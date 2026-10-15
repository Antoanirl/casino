import { describe, expect, it } from "vitest";
import { SLOT_SLUGS, games, getSlotGame, isSlotSlug, mainNav, slotGames } from "@/lib/games";

describe("game catalogue", () => {
  it("lists five games: two table games and three slots", () => {
    expect(games).toHaveLength(5);
    expect(games.filter((g) => g.category === "table")).toHaveLength(2);
    expect(slotGames).toHaveLength(3);
  });

  it("has unique slugs and hrefs", () => {
    expect(new Set(games.map((g) => g.slug)).size).toBe(games.length);
    expect(new Set(games.map((g) => g.href)).size).toBe(games.length);
  });

  it("routes every slot game under /slots/<slug>", () => {
    for (const slug of SLOT_SLUGS) {
      expect(getSlotGame(slug)?.href).toBe(`/slots/${slug}`);
    }
  });

  it("rejects unknown slot slugs", () => {
    expect(isSlotSlug("poker")).toBe(false);
    expect(getSlotGame("poker")).toBeUndefined();
    expect(getSlotGame("blackjack")).toBeUndefined();
  });

  it("links every nav entry to an absolute path", () => {
    for (const item of mainNav) {
      expect(item.href.startsWith("/")).toBe(true);
    }
  });
});
