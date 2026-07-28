// Site-wide URL helpers.
//
// Import this only from .astro files. import.meta.env is substituted by Vite
// during the build and is undefined under plain "node --test", so anything
// imported by a unit test must not depend on this module.

// GitHub Pages serves the site under /portfolio. BASE_URL may or may not end
// with a slash depending on config, so strip it once and always join with "/".
export const base = import.meta.env.BASE_URL.replace(/\/$/, "");
