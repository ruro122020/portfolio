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

## Branching

- All work branches from `develop` and merges back into `develop`.
- `main` is what GitHub Pages serves. It is updated only by merging a pull request from `develop`, so every commit that lands on `main` goes live immediately.


## Editing content

All content lives in the data objects at the top of `public/main.js`:

- `PROJECTS` / `SIDE_PROJECTS`: project cards
- `EXPERIENCE`: work history
- `SKILLS`: skills grid
- `LEARNING`: current learning log
- `POSTS`: blog/writing entries

Update those objects and the page re-renders on reload. No other files need to change.

