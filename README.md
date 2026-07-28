# Ruth Rojas: Portfolio

A personal portfolio site.

## Running locally

Requires Node 22 (an `.nvmrc` is checked in, so `nvm use` picks it up).

```sh
nvm use        # or: nvm install 22
npm install
npm run dev    # dev server with live reload
```

To preview the exact static output that would go live:

```sh
npm run build
npm run preview
```

## Editing content

Everything except blog content lives in the data objects at the top of `public/main.js`:

- `PROJECTS` / `SIDE_PROJECTS`: project cards
- `EXPERIENCE`: work history
- `SKILLS`: skills grid
- `LEARNING`: current learning log

Update those objects and the page re-renders on reload. No other files need to change.

## Publishing a blog note

Blog notes are not written in this repo. They live in other repos, and this repo pulls them in at build time. To publish a new note:

### 1. Write the note at the repo's source

`blog-sources.json` lists where notes are pulled from. Each entry names a repo and a folder inside it:

```json
[
  { "repo": "ruro122020/Iris", "path": "notes-english" }
]
```

This entry means: clone `ruro122020/Iris` from GitHub and copy its `notes-english/` folder into `src/content/blog/`. The folder does not have to sit at the repo root: `path` accepts a nested folder too, such as `"path": "docs/notes-english"`. Markdown files in subfolders under the `path` folder are also pulled in.

Add the note as a markdown file in one of those repos and folders (for the entry above, `notes-english/` in the Iris repo). Never add or edit anything under `src/content/blog/` here: it is gitignored and wiped on every pull, so changes there are lost.

### 2. Add a frontmatter block

Frontmatter is the publish switch. Give the note a block starting on the very first line of the file:

```yaml
---
title: Async functions as state machines
date: 2026-07-20
description: How the compiler rewrites async fns.
draft: false
---
```

All four fields are required:

- `title`: a non-empty string
- `date`: a date, such as `2026-07-20`
- `description`: a non-empty string
- `draft`: `true` or `false`, no default

The schema is strict: a misspelled or extra key fails the build on purpose. There are three outcomes: a note with no frontmatter stays private (skipped silently), `draft: true` validates the note but keeps it unpublished, and `draft: false` publishes it.

### 3. Preview locally

Pull the latest notes, then run the site:

```sh
npm run pull-blog
npm run dev      # or: npm run build && npm run preview
```

A published note gets its own page at `/portfolio/writing/<slug>` (the site is served under the `/portfolio` base path), where the slug is the note's filename without `.md`. The Writing section on the homepage lists the three newest notes; the full archive is at `/portfolio/writing/`. Notes used to live at `/portfolio/blog/<slug>`, and those addresses still work: they redirect to the new ones.

### 4. Merge to main

Nothing extra is needed to deploy: every CI run (pull requests into `develop`) and every deploy run (merge to `main`) pulls the latest notes before building. A published note goes live with the next merge to `main`, and a note with broken frontmatter fails the build.

