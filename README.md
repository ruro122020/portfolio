# Ruth Rojas: Portfolio

A personal portfolio site. Built with plain HTML, CSS, and JavaScript. No framework, no build step, no dependencies.

## Stack

- **HTML**: semantic markup, single page
- **CSS**: custom properties, responsive layout, no framework
- **Vanilla JavaScript**: content rendering, mobile menu, scroll animations, custom cursor

## Structure

```
.
├── index.html              # Markup + all styles
├── main.js                 # Data, rendering, and interactivity
├── Ruth_Rojas_Resume.pdf   # Downloadable résumé
└── README.md
```

## Running locally

No build step. Serve the site with live-reload (the browser refreshes automatically on every save):

```bash
npx live-server
```

This opens the site in your browser (default: `http://127.0.0.1:8080`). Edit `index.html` or `main.js` and the page reloads on its own.

You can also just open `index.html` directly in a browser: you'll just have to refresh manually after edits.

## Branching

- All work branches from `develop` and merges back into `develop`.
- `main` is what GitHub Pages serves. It is updated only by merging a pull request from `develop`, so every commit that lands on `main` goes live immediately.
- Preview changes by building and serving the site locally from `develop` before opening that pull request.

## Editing content

All content lives in the data objects at the top of `main.js`:

- `PROJECTS` / `SIDE_PROJECTS`: project cards
- `EXPERIENCE`: work history
- `SKILLS`: skills grid
- `LEARNING`: current learning log
- `POSTS`: blog/writing entries

Update those objects and the page re-renders on reload. No other files need to change.

