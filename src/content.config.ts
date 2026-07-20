import { defineCollection } from "astro:content";
import { blogLoader, blogSchema } from "./loaders/blog.mjs";

// Frontmatter is the publish switch: notes without frontmatter
// are private and skipped; notes with frontmatter must pass the strict
// schema, and only draft: false notes are stored and published.
const blog = defineCollection({
  loader: blogLoader(),
  schema: blogSchema,
});

export const collections = { blog };
