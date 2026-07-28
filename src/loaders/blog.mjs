// Custom Astro content-layer loader for src/content/blog/.
//
// Frontmatter is the publish switch: a note with no frontmatter fence is
// private and skipped silently; a note with frontmatter must validate
// against the strict schema below, and only draft: false notes are stored.
//
// Plain .mjs with JSDoc so the unit tests can run under node --test
// without any TypeScript machinery.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
// astro/zod (not astro:content) so plain node tests can import this module.
import { z } from "astro/zod";

// Strict: an unknown or misspelled key (e.g. "darft") fails the build
// instead of silently publishing. "draft" is required, never defaulted,
// because publishing must be an explicit written choice.
export const blogSchema = z
  .object({
    title: z.string().min(1, "title must be a non-empty string"),
    date: z.coerce.date(),
    description: z.string().min(1, "description must be a non-empty string"),
    draft: z.boolean(),
  })
  .strict();

/**
 * A note is publishable-candidate material only when the file opens with a
 * frontmatter fence: three dashes as the very first line.
 * @param {string} text raw file contents
 * @returns {boolean}
 */
export function hasFrontmatter(text) {
  return /^---\r?\n/.test(text);
}

/**
 * Derive the URL slug for an entry: the last "/"-separated segment of its id
 * ("Iris/notes-english/01-async-fn-state-machines" -> "01-async-fn-state-machines").
 * Different ids can share a slug; the page that builds the routes must reject
 * such collisions.
 * @param {string} id entry id as stored by the loader
 * @returns {string}
 */
export function entrySlug(id) {
  const segments = id.split("/");
  return segments[segments.length - 1];
}

/**
 * Order notes newest first, tie-breaking on id so the order is deterministic
 * when dates match.
 * @param {{ id: string, data: { date: Date } }[]} entries collection entries
 * @returns {{ id: string, data: { date: Date } }[]} a new sorted array; the
 *   input is left untouched
 */
export function sortNotesNewestFirst(entries) {
  return [...entries].sort((a, b) => b.data.date - a.data.date || a.id.localeCompare(b.id));
}

/**
 * Format a note date for a list row, e.g. "Jul 12, 2026".
 * YAML dates parse as UTC midnight; format in UTC too, or machines west of
 * Greenwich would print the day before the one written in the frontmatter.
 * @param {Date} date the entry's frontmatter date
 * @returns {string}
 */
export function formatNoteDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Build the getStaticPaths route list for the note pages.
 * Slugs must be unique because they are the whole URL. Two notes with the
 * same filename in different folders collide; fail the build naming both.
 * @param {{ id: string }[]} entries collection entries
 * @returns {{ params: { slug: string }, props: { entry: object } }[]}
 */
export function noteRoutes(entries) {
  const seen = new Map();
  return entries.map((entry) => {
    const slug = entrySlug(entry.id);
    if (seen.has(slug)) {
      throw new Error(
        `duplicate note slug "${slug}": entries "${seen.get(slug)}" and "${entry.id}" both map to /writing/${slug}/`
      );
    }
    seen.set(slug, entry.id);
    return { params: { slug }, props: { entry } };
  });
}

/**
 * Recursively collect .md file paths under dir.
 * @param {string} dir absolute directory path
 * @returns {string[]} absolute file paths, sorted for determinism
 */
function walkMarkdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

/**
 * Content-layer loader for the blog collection.
 * @param {{ contentDir?: string }} [options] contentDir overrides the
 *   notes directory (absolute path), used by tests; defaults to
 *   src/content/blog/ under the current working directory.
 * @returns {import("astro/loaders").Loader}
 */
export function blogLoader(options = {}) {
  const contentDir = options.contentDir ?? path.join(process.cwd(), "src", "content", "blog");

  return {
    name: "blog-loader",
    load: async (context) => {
      const { store, parseData, renderMarkdown, logger } = context;

      let files;
      try {
        files = walkMarkdownFiles(contentDir);
      } catch (error) {
        if (error && error.code === "ENOENT") {
          files = [];
        } else {
          throw error;
        }
      }

      // Rebuild the store from scratch so entries removed from the source
      // (or newly turned into drafts) do not linger from a previous load.
      store.clear();

      if (files.length === 0) {
        logger.warn(
          `no markdown notes found in ${contentDir}: run "npm run pull-blog" to sync them`
        );
        return;
      }

      for (const filePath of files) {
        const relativePath = path.relative(contentDir, filePath);
        const raw = readFileSync(filePath, "utf8");

        // No frontmatter fence: the note is private. Skip silently.
        if (!hasFrontmatter(raw)) {
          continue;
        }

        let parsed;
        try {
          parsed = matter(raw);
        } catch (error) {
          throw new Error(`invalid YAML frontmatter in ${relativePath}: ${error.message}`);
        }

        const id = relativePath.replace(/\.md$/, "").split(path.sep).join("/");

        let data;
        try {
          data = await parseData({ id, data: parsed.data, filePath });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          // parseData errors usually name the field but not always the file;
          // make sure the build error carries both.
          if (message.includes(relativePath)) {
            throw error;
          }
          throw new Error(`invalid frontmatter in ${relativePath}: ${message}`, { cause: error });
        }

        // A valid draft stays out of the store: fully validated, never published.
        if (data.draft) {
          continue;
        }

        store.set({
          id,
          data,
          body: parsed.content,
          rendered: await renderMarkdown(parsed.content),
          // Root-relative, per the data store docs: Astro resolves images
          // and other assets in the entry against the project root.
          filePath: path.relative(process.cwd(), filePath),
        });
      }
    },
  };
}
