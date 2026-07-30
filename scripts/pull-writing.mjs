// Pulls writing markdown from the repos listed in writing-sources.json into
// src/content/writing/. Run via: npm run pull-writing
//
// Each config entry is { "repo": "owner/name" | "<url>", "path": "dir/in/repo" }.
// The destination is wiped on every run, so the config is the single source
// of truth: adding or removing an entry is the only edit ever needed.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CONFIG_NAME = "writing-sources.json";

// owner/name shorthand expands to a GitHub URL; anything with :// is used as is.
export function resolveRepoUrl(repo) {
  return repo.includes("://") ? repo : `https://github.com/${repo}.git`;
}

// The repo's basename (e.g. "Iris" for "ruro122020/Iris") names the
// destination folder under src/content/writing/.
export function repoName(repo) {
  return path.posix.basename(repo.replace(/\/+$/, "")).replace(/\.git$/, "");
}

export function loadSources(projectRoot) {
  const configPath = path.join(projectRoot, CONFIG_NAME);
  let raw;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (error) {
    throw new Error(`cannot read ${CONFIG_NAME} at ${configPath}: ${error.message}`);
  }
  let sources;
  try {
    sources = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${CONFIG_NAME} is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(sources)) {
    throw new Error(`${CONFIG_NAME} must be a JSON array of { "repo", "path" } entries`);
  }
  sources.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`${CONFIG_NAME} entry ${index} must be an object with "repo" and "path"`);
    }
    for (const field of ["repo", "path"]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        throw new Error(`${CONFIG_NAME} entry ${index} is missing a non-empty string "${field}"`);
      }
    }
    // The path must stay inside the cloned repo; an absolute path or a ".."
    // segment would read (and write) outside the directories this script owns.
    if (path.isAbsolute(entry.path) || entry.path.split("/").includes("..")) {
      throw new Error(
        `${CONFIG_NAME} entry ${index}: "path" must be a relative path inside the repo, without ".." (got "${entry.path}")`
      );
    }
  });
  return sources;
}

function cloneShallow(url, targetDir, label) {
  try {
    execFileSync("git", ["clone", "--depth", "1", url, targetDir], {
      // GIT_TERMINAL_PROMPT=0 makes a bad or private repo fail immediately
      // instead of hanging on a credentials prompt.
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (error) {
    const detail = error.stderr ? error.stderr.toString().trim() : error.message;
    throw new Error(`clone failed for entry ${label}: ${detail}`);
  }
}

export function pullWriting(projectRoot) {
  const sources = loadSources(projectRoot);
  const destRoot = path.join(projectRoot, "src", "content", "writing");

  // Wipe then re-pull, so removed config entries disappear from the build.
  rmSync(destRoot, { recursive: true, force: true });
  mkdirSync(destRoot, { recursive: true });

  for (const entry of sources) {
    const label = `${entry.repo} (path: ${entry.path})`;
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "pull-writing-"));
    try {
      cloneShallow(resolveRepoUrl(entry.repo), tempDir, label);
      const sourceDir = path.join(tempDir, entry.path);
      if (!existsSync(sourceDir)) {
        throw new Error(`entry ${label}: path "${entry.path}" does not exist in the repo`);
      }
      const destDir = path.join(destRoot, repoName(entry.repo), entry.path);
      // Symlinks in a source repo are skipped: copied as-is they could point
      // anywhere on this machine, and a later build step would read through
      // them into the published site.
      cpSync(sourceDir, destDir, {
        recursive: true,
        filter: (src) => !lstatSync(src).isSymbolicLink(),
      });
      console.log(`pull-writing: ${label} -> src/content/writing/${repoName(entry.repo)}/${entry.path}/`);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// Guarded so the test file can import the functions without triggering a run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    pullWriting(process.cwd());
  } catch (error) {
    console.error(`pull-writing: ${error.message}`);
    process.exit(1);
  }
}
