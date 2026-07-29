// Custom Astro content-layer loader for src/content/writing/.
//
// Frontmatter is the publish switch: a piece with no frontmatter fence is
// private and skipped silently; a piece with frontmatter must validate
// against the strict schema below, and only draft: false pieces are stored.
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
export const writingSchema = z
  .object({
    title: z.string().min(1, "title must be a non-empty string"),
    date: z.coerce.date(),
    description: z.string().min(1, "description must be a non-empty string"),
    draft: z.boolean(),
  })
  .strict();

/**
 * A piece is publishable-candidate material only when the file opens with a
 * frontmatter fence: three dashes as the very first line.
 * @param {string} text raw file contents
 * @returns {boolean}
 */
export function hasFrontmatter(text) {
  return /^---\r?\n/.test(text);
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
 * Content-layer loader for the writing collection.
 * @param {{ contentDir?: string }} [options] contentDir overrides the
 *   writing directory (absolute path), used by tests; defaults to
 *   src/content/writing/ under the current working directory.
 * @returns {import("astro/loaders").Loader}
 */
export function writingLoader(options = {}) {
  const contentDir = options.contentDir ?? path.join(process.cwd(), "src", "content", "writing");

  return {
    name: "writing-loader",
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
          `no markdown pieces found in ${contentDir}: run "npm run pull-writing" to sync them`
        );
        return;
      }

      for (const filePath of files) {
        const relativePath = path.relative(contentDir, filePath);
        const raw = readFileSync(filePath, "utf8");

        // No frontmatter fence: the piece is private. Skip silently.
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
