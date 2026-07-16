import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import matter from "gray-matter";

import { blogSchema, hasFrontmatter, blogLoader } from "./blog.mjs";

// A temp directory standing in for src/content/blog/, so tests never touch
// the real pulled notes.
function makeContentDir(files) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "blog-loader-"));
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  return dir;
}

// Minimal stand-in for Astro's LoaderContext: a Map-backed store, a
// parseData that applies the exported schema (naming the entry and the
// first offending field, like Astro's own error), a renderMarkdown stub,
// and a logger that records warnings. Keeps the tests offline and fast.
function makeContext() {
  const backing = new Map();
  const warnings = [];
  return {
    backing,
    warnings,
    context: {
      store: {
        set: (entry) => {
          backing.set(entry.id, entry);
          return true;
        },
        get: (id) => backing.get(id),
        has: (id) => backing.has(id),
        delete: (id) => backing.delete(id),
        clear: () => backing.clear(),
        entries: () => [...backing.entries()],
        keys: () => [...backing.keys()],
      },
      parseData: async ({ id, data }) => {
        const result = blogSchema.safeParse(data);
        if (!result.success) {
          // Astro's own error lists every offending field; mirror that.
          const details = result.error.issues
            .map((issue) => `${issue.path.join(".") || "frontmatter"}: ${issue.message}`)
            .join("; ");
          throw new Error(`${id} data does not match collection schema. ${details}`);
        }
        return result.data;
      },
      renderMarkdown: async (content) => ({
        html: `<rendered>${content.trim()}</rendered>`,
        metadata: { headings: [], imagePaths: [], frontmatter: {} },
      }),
      logger: {
        info: () => {},
        debug: () => {},
        error: () => {},
        warn: (message) => warnings.push(message),
      },
    },
  };
}

const VALID_NOTE = [
  "---",
  "title: A valid note",
  "date: 2026-06-01",
  "description: A note that should publish",
  "draft: false",
  "---",
  "",
  "# Heading",
  "",
  "Body text.",
  "",
].join("\n");

// ---------------------------------------------------------------------------
// hasFrontmatter: the publish switch is the opening fence
// ---------------------------------------------------------------------------

test("hasFrontmatter returns true when the file opens with a fence", () => {
  assert.equal(hasFrontmatter("---\ntitle: x\n---\nbody\n"), true);
});

test("hasFrontmatter returns true with windows line endings", () => {
  assert.equal(hasFrontmatter("---\r\ntitle: x\r\n---\r\nbody\r\n"), true);
});

test("hasFrontmatter returns false for a note with no fence", () => {
  assert.equal(hasFrontmatter("# Study Log\n\nJust markdown.\n"), false);
});

test("hasFrontmatter returns false when a fence appears only later in the file", () => {
  assert.equal(hasFrontmatter("# Heading\n\n---\n\nmore text\n"), false);
});

// ---------------------------------------------------------------------------
// blogSchema: strict shape, draft is an explicit written choice
// ---------------------------------------------------------------------------

test("schema accepts a valid publishable note", () => {
  const result = blogSchema.safeParse({
    title: "A valid note",
    date: new Date("2026-06-01"),
    description: "A note that should publish",
    draft: false,
  });
  assert.equal(result.success, true);
  assert.equal(result.data.draft, false);
  assert.ok(result.data.date instanceof Date);
});

test("schema rejects a missing title", () => {
  const result = blogSchema.safeParse({
    date: new Date("2026-06-01"),
    description: "x",
    draft: false,
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ["title"]);
});

test("schema rejects a malformed date", () => {
  const result = blogSchema.safeParse({
    title: "x",
    date: "not-a-date",
    description: "x",
    draft: false,
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ["date"]);
});

test("schema rejects a missing draft: publishing is never implicit", () => {
  const result = blogSchema.safeParse({
    title: "x",
    date: new Date("2026-06-01"),
    description: "x",
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ["draft"]);
});

test("schema rejects a non-boolean draft", () => {
  const result = blogSchema.safeParse({
    title: "x",
    date: new Date("2026-06-01"),
    description: "x",
    draft: "false",
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ["draft"]);
});

test("schema rejects an unknown key even when every required field is valid", () => {
  const result = blogSchema.safeParse({
    title: "x",
    date: new Date("2026-06-01"),
    description: "x",
    draft: false,
    extra: "not in the schema",
  });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].code, "unrecognized_keys");
  assert.ok(result.error.issues[0].message.includes("extra"));
});

test("date coercion accepts quoted and unquoted YAML dates", () => {
  // Unquoted: YAML parses it into a Date object before zod sees it.
  const unquoted = matter("---\ndate: 2026-06-01\n---\n").data.date;
  assert.ok(unquoted instanceof Date);
  // Quoted: YAML leaves it as a string and z.coerce.date must convert it.
  const quoted = matter('---\ndate: "2026-06-01"\n---\n').data.date;
  assert.equal(typeof quoted, "string");

  for (const date of [unquoted, quoted]) {
    const result = blogSchema.safeParse({
      title: "x",
      date,
      description: "x",
      draft: false,
    });
    assert.equal(result.success, true);
    assert.equal(result.data.date.getTime(), new Date("2026-06-01").getTime());
  }
});

// ---------------------------------------------------------------------------
// blogLoader().load: skip, validate, store
// ---------------------------------------------------------------------------

test("a note without a frontmatter fence is skipped silently", async (t) => {
  const dir = makeContentDir({ "private-note.md": "# Study Log\n\nNo fence here.\n" });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { backing, warnings, context } = makeContext();

  await blogLoader({ contentDir: dir }).load(context);

  assert.equal(backing.size, 0);
  assert.deepEqual(warnings, []);
});

test("a valid draft false note is stored with data, body, rendered html, and filePath", async (t) => {
  const dir = makeContentDir({ "note.md": VALID_NOTE });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { backing, context } = makeContext();

  await blogLoader({ contentDir: dir }).load(context);

  assert.equal(backing.size, 1);
  const entry = backing.get("note");
  assert.equal(entry.data.title, "A valid note");
  assert.equal(entry.data.draft, false);
  assert.ok(entry.data.date instanceof Date);
  assert.ok(entry.body.includes("# Heading"), "body is the markdown content");
  assert.ok(!entry.body.includes("title:"), "body excludes the frontmatter");
  assert.ok(entry.rendered.html.includes("# Heading"), "rendered comes from renderMarkdown");
  assert.ok(entry.filePath.endsWith("note.md"));
});

test("entry id is the path relative to the content dir with .md stripped", async (t) => {
  const dir = makeContentDir({
    "Iris/notes-english/01-async-fn-state-machines.md": VALID_NOTE,
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { backing, context } = makeContext();

  await blogLoader({ contentDir: dir }).load(context);

  assert.deepEqual([...backing.keys()], ["Iris/notes-english/01-async-fn-state-machines"]);
});

test("a valid draft true note is not stored", async (t) => {
  const dir = makeContentDir({
    "wip.md": VALID_NOTE.replace("draft: false", "draft: true"),
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { backing, context } = makeContext();

  await blogLoader({ contentDir: dir }).load(context);

  assert.equal(backing.size, 0);
});

test("a draft true note with a malformed field still fails the build", async (t) => {
  const dir = makeContentDir({
    "wip.md": VALID_NOTE.replace("draft: false", "draft: true").replace(
      "date: 2026-06-01",
      "date: not-a-date"
    ),
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { context } = makeContext();

  await assert.rejects(blogLoader({ contentDir: dir }).load(context), /date/);
});

test("a validation error names both the file and the offending field", async (t) => {
  const dir = makeContentDir({
    "Iris/notes-english/typo.md": VALID_NOTE.replace("draft: false", "darft: true"),
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { context } = makeContext();

  await assert.rejects(blogLoader({ contentDir: dir }).load(context), (error) => {
    assert.ok(
      error.message.includes("Iris/notes-english/typo.md"),
      `error should name the file: ${error.message}`
    );
    assert.ok(error.message.includes("darft"), `error should name the field: ${error.message}`);
    return true;
  });
});

test("broken YAML fails naming the file", async (t) => {
  const dir = makeContentDir({
    "broken.md": "---\ntitle: [unclosed\ndate: 2026-06-01\n---\nbody\n",
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { context } = makeContext();

  await assert.rejects(blogLoader({ contentDir: dir }).load(context), (error) => {
    assert.ok(error.message.includes("broken.md"), `error should name the file: ${error.message}`);
    return true;
  });
});

test("a missing content dir warns to run pull-blog and stores zero entries", async (t) => {
  const dir = path.join(mkdtempSync(path.join(os.tmpdir(), "blog-loader-")), "does-not-exist");
  t.after(() => rmSync(path.dirname(dir), { recursive: true, force: true }));
  const { backing, warnings, context } = makeContext();

  await blogLoader({ contentDir: dir }).load(context);

  assert.equal(backing.size, 0);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes("npm run pull-blog"), `warning should say how to fix: ${warnings[0]}`);
});

test("an empty content dir warns to run pull-blog and stores zero entries", async (t) => {
  const dir = makeContentDir({});
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { backing, warnings, context } = makeContext();

  await blogLoader({ contentDir: dir }).load(context);

  assert.equal(backing.size, 0);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes("npm run pull-blog"));
});

test("stale entries from a previous load do not linger", async (t) => {
  const dir = makeContentDir({ "note.md": VALID_NOTE });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { backing, context } = makeContext();
  backing.set("removed-note", { id: "removed-note", data: {} });

  await blogLoader({ contentDir: dir }).load(context);

  assert.deepEqual([...backing.keys()], ["note"]);
});

test("non-markdown files in the content dir are ignored", async (t) => {
  const dir = makeContentDir({
    "note.md": VALID_NOTE,
    "notes.txt": "---\nnot: markdown\n---\n",
    "image.png": "binary-ish",
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { backing, context } = makeContext();

  await blogLoader({ contentDir: dir }).load(context);

  assert.deepEqual([...backing.keys()], ["note"]);
});
