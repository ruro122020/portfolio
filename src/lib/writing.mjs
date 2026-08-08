// Writing helpers used by the pages and components that render pieces.
//
// These are deliberately separate from src/loaders/writing.mjs: that module's
// job is reading pieces off disk at build time and is imported only by
// src/content.config.ts. This one is imported only by .astro files. Neither
// calls into the other.
//
// Plain .mjs with JSDoc so the unit tests can run under node --test
// without any TypeScript machinery.

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
 * Order pieces newest first, tie-breaking on id so the order is deterministic
 * when dates match.
 * @template {{ id: string, data: { date: Date } }} T
 * @param {T[]} entries collection entries
 * @returns {T[]} a new sorted array; the input is left untouched
 */
export function sortNewestFirst(entries) {
  return [...entries].sort((a, b) => b.data.date - a.data.date || a.id.localeCompare(b.id));
}

/**
 * Format a piece's date for a list row, e.g. "Jul 12, 2026".
 * YAML dates parse as UTC midnight; format in UTC too, or machines west of
 * Greenwich would print the day before the one written in the frontmatter.
 * @param {Date} date the entry's frontmatter date
 * @returns {string}
 */
export function formatPieceDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Build the getStaticPaths route list for the piece pages.
 * Slugs must be unique because they are the whole URL. Two pieces with the
 * same filename in different folders collide; fail the build naming both.
 * @template {{ id: string }} T
 * @param {T[]} entries collection entries
 * @returns {{ params: { slug: string }, props: { entry: T } }[]}
 */
export function pieceRoutes(entries) {
  const seen = new Map();
  return entries.map((entry) => {
    const slug = entrySlug(entry.id);
    if (seen.has(slug)) {
      throw new Error(
        `duplicate piece slug "${slug}": entries "${seen.get(slug)}" and "${entry.id}" both map to /writing/${slug}/`
      );
    }
    seen.set(slug, entry.id);
    return { params: { slug }, props: { entry } };
  });
}
