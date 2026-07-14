// @ts-check
import { defineConfig } from 'astro/config';

// compressHTML off so built markup matches the source byte-for-byte;
// cssMinify off so the built stylesheet diffs cleanly against the
// original inline style block (no-visual-change requirement, issue #3).
export default defineConfig({
  compressHTML: false,
  vite: {
    build: {
      cssMinify: false,
    },
  },
});
