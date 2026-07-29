import { defineCollection } from "astro:content";
import { writingLoader, writingSchema } from "./loaders/writing.mjs";

// Frontmatter is the publish switch: pieces without frontmatter
// are private and skipped; pieces with frontmatter must pass the strict
// schema, and only draft: false pieces are stored and published.
const writing = defineCollection({
  loader: writingLoader(),
  schema: writingSchema,
});

export const collections = { writing };
