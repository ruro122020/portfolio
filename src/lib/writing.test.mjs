import { test } from "node:test";
import assert from "node:assert/strict";

import { entrySlug, sortNewestFirst, formatPieceDate, pieceRoutes } from "./writing.mjs";

// ---------------------------------------------------------------------------
// entrySlug: the URL segment is the last piece of the entry id
// ---------------------------------------------------------------------------

test("entrySlug returns the last segment of a nested id", () => {
  assert.equal(
    entrySlug("Iris/essays/01-async-fn-state-machines"),
    "01-async-fn-state-machines"
  );
});

test("entrySlug returns a flat id unchanged", () => {
  assert.equal(entrySlug("piece"), "piece");
});

test("two different ids can produce the same slug: collisions are the page's job to reject", () => {
  assert.equal(entrySlug("Iris/essays/piece"), entrySlug("Other/deep/path/piece"));
});

// ---------------------------------------------------------------------------
// sortNewestFirst: newest first, deterministic on a tie
// ---------------------------------------------------------------------------

test("sortNewestFirst puts the newer piece first", () => {
  const older = { id: "a", data: { date: new Date("2026-06-01") } };
  const newer = { id: "b", data: { date: new Date("2026-07-01") } };

  assert.deepEqual(
    sortNewestFirst([older, newer]).map((entry) => entry.id),
    ["b", "a"]
  );
});

test("sortNewestFirst tie-breaks on id when the dates are equal", () => {
  const sameDay = new Date("2026-06-01");
  const second = { id: "Iris/essays/02-second", data: { date: sameDay } };
  const first = { id: "Iris/essays/01-first", data: { date: sameDay } };

  assert.deepEqual(
    sortNewestFirst([second, first]).map((entry) => entry.id),
    ["Iris/essays/01-first", "Iris/essays/02-second"]
  );
});

test("sortNewestFirst does not mutate its input", () => {
  const older = { id: "a", data: { date: new Date("2026-06-01") } };
  const newer = { id: "b", data: { date: new Date("2026-07-01") } };
  const entries = [older, newer];

  const sorted = sortNewestFirst(entries);

  assert.notEqual(sorted, entries, "a new array is returned");
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["a", "b"],
    "the caller's array keeps its original order"
  );
});

// ---------------------------------------------------------------------------
// formatPieceDate: the row shows the day written in the frontmatter
// ---------------------------------------------------------------------------

test("formatPieceDate prints the frontmatter day, not the local-timezone day", () => {
  // A YAML date parses to UTC midnight. Formatted in local time west of
  // Greenwich that instant is still the previous day, so the format must
  // pin the timezone to UTC. This assertion holds on any machine.
  assert.equal(formatPieceDate(new Date("2026-07-12")), "Jul 12, 2026");
});

// ---------------------------------------------------------------------------
// pieceRoutes: one route per piece, collisions fail the build
// ---------------------------------------------------------------------------

test("pieceRoutes maps a nested id to its last segment as the slug", () => {
  const entry = { id: "Iris/essays/01-async-fn-state-machines", data: {} };

  const routes = pieceRoutes([entry]);

  assert.equal(routes.length, 1);
  assert.equal(routes[0].params.slug, "01-async-fn-state-machines");
  assert.equal(routes[0].props.entry, entry);
});

test("pieceRoutes throws naming both entries when two ids collide on a slug", () => {
  const entries = [
    { id: "Iris/essays/piece", data: {} },
    { id: "Agora/journal/piece", data: {} },
  ];

  assert.throws(
    () => pieceRoutes(entries),
    (error) => {
      assert.ok(
        error.message.includes("Iris/essays/piece"),
        `error should name the first entry: ${error.message}`
      );
      assert.ok(
        error.message.includes("Agora/journal/piece"),
        `error should name the second entry: ${error.message}`
      );
      assert.ok(
        error.message.includes("/writing/piece/"),
        `error should name the colliding URL: ${error.message}`
      );
      return true;
    }
  );
});

