import { test } from "node:test";
import assert from "node:assert/strict";

import { entrySlug, sortNotesNewestFirst, formatNoteDate, noteRoutes } from "./notes.mjs";

// ---------------------------------------------------------------------------
// entrySlug: the URL segment is the last piece of the entry id
// ---------------------------------------------------------------------------

test("entrySlug returns the last segment of a nested id", () => {
  assert.equal(
    entrySlug("Iris/notes-english/01-async-fn-state-machines"),
    "01-async-fn-state-machines"
  );
});

test("entrySlug returns a flat id unchanged", () => {
  assert.equal(entrySlug("note"), "note");
});

test("two different ids can produce the same slug: collisions are the page's job to reject", () => {
  assert.equal(entrySlug("Iris/notes-english/note"), entrySlug("Other/deep/path/note"));
});

// ---------------------------------------------------------------------------
// sortNotesNewestFirst: newest first, deterministic on a tie
// ---------------------------------------------------------------------------

test("sortNotesNewestFirst puts the newer note first", () => {
  const older = { id: "a", data: { date: new Date("2026-06-01") } };
  const newer = { id: "b", data: { date: new Date("2026-07-01") } };

  assert.deepEqual(
    sortNotesNewestFirst([older, newer]).map((entry) => entry.id),
    ["b", "a"]
  );
});

test("sortNotesNewestFirst tie-breaks on id when the dates are equal", () => {
  const sameDay = new Date("2026-06-01");
  const second = { id: "Iris/notes-english/02-second", data: { date: sameDay } };
  const first = { id: "Iris/notes-english/01-first", data: { date: sameDay } };

  assert.deepEqual(
    sortNotesNewestFirst([second, first]).map((entry) => entry.id),
    ["Iris/notes-english/01-first", "Iris/notes-english/02-second"]
  );
});

test("sortNotesNewestFirst does not mutate its input", () => {
  const older = { id: "a", data: { date: new Date("2026-06-01") } };
  const newer = { id: "b", data: { date: new Date("2026-07-01") } };
  const entries = [older, newer];

  const sorted = sortNotesNewestFirst(entries);

  assert.notEqual(sorted, entries, "a new array is returned");
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["a", "b"],
    "the caller's array keeps its original order"
  );
});

// ---------------------------------------------------------------------------
// formatNoteDate: the row shows the day written in the frontmatter
// ---------------------------------------------------------------------------

test("formatNoteDate prints the frontmatter day, not the local-timezone day", () => {
  // A YAML date parses to UTC midnight. Formatted in local time west of
  // Greenwich that instant is still the previous day, so the format must
  // pin the timezone to UTC. This assertion holds on any machine.
  assert.equal(formatNoteDate(new Date("2026-07-12")), "Jul 12, 2026");
});

// ---------------------------------------------------------------------------
// noteRoutes: one route per note, collisions fail the build
// ---------------------------------------------------------------------------

test("noteRoutes maps a nested id to its last segment as the slug", () => {
  const entry = { id: "Iris/notes-english/01-async-fn-state-machines", data: {} };

  const routes = noteRoutes([entry]);

  assert.equal(routes.length, 1);
  assert.equal(routes[0].params.slug, "01-async-fn-state-machines");
  assert.equal(routes[0].props.entry, entry);
});

test("noteRoutes throws naming both entries when two ids collide on a slug", () => {
  const entries = [
    { id: "Iris/notes-english/note", data: {} },
    { id: "Agora/notes/note", data: {} },
  ];

  assert.throws(
    () => noteRoutes(entries),
    (error) => {
      assert.ok(
        error.message.includes("Iris/notes-english/note"),
        `error should name the first entry: ${error.message}`
      );
      assert.ok(
        error.message.includes("Agora/notes/note"),
        `error should name the second entry: ${error.message}`
      );
      assert.ok(
        error.message.includes("/writing/note/"),
        `error should name the colliding URL: ${error.message}`
      );
      return true;
    }
  );
});

