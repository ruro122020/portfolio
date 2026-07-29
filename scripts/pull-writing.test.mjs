import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, symlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "pull-writing.mjs");

// Creates a throwaway git repo under the OS temp dir containing the given
// files, and returns its file:// URL so the script can clone it offline.
function makeFixtureRepo(name, files) {
  const repoDir = mkdtempSync(path.join(os.tmpdir(), `writing-fixture-${name}-`));
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(repoDir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  const git = (...args) =>
    execFileSync(
      "git",
      ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", ...args],
      { cwd: repoDir, stdio: "pipe" }
    );
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture content");
  return { repoDir, url: pathToFileURL(repoDir).href };
}

// A temp project dir standing in for the portfolio root, so tests never
// touch the real writing-sources.json or src/content/writing.
function makeProject(sources) {
  const projectDir = mkdtempSync(path.join(os.tmpdir(), "writing-project-"));
  writeConfig(projectDir, sources);
  return projectDir;
}

function writeConfig(projectDir, sources) {
  writeFileSync(path.join(projectDir, "writing-sources.json"), JSON.stringify(sources, null, 2));
}

// Runs the script exactly as npm run pull-writing does: as a child process with
// cwd at the project root. Returns { status, stdout, stderr }.
function runScript(projectDir) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath], {
      cwd: projectDir,
      encoding: "utf8",
      stdio: "pipe",
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return { status: error.status, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

function writingDir(projectDir) {
  return path.join(projectDir, "src", "content", "writing");
}

test("pulls every markdown file from every listed repo into src/content/writing/<repoName>/<path>/", (t) => {
  const alpha = makeFixtureRepo("alpha", {
    "essays/one.md": "# one\n",
    "essays/two.md": "# two\n",
    "README.md": "not pulled, outside the configured path\n",
  });
  const beta = makeFixtureRepo("beta", {
    "posts/three.md": "# three\n",
  });
  const project = makeProject([
    { repo: alpha.url, path: "essays" },
    { repo: beta.url, path: "posts" },
  ]);
  t.after(() => {
    rmSync(alpha.repoDir, { recursive: true, force: true });
    rmSync(beta.repoDir, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  });

  const result = runScript(project);

  assert.equal(result.status, 0, `expected success, stderr: ${result.stderr}`);
  const alphaName = path.basename(alpha.repoDir);
  const betaName = path.basename(beta.repoDir);
  assert.equal(readFileSync(path.join(writingDir(project), alphaName, "essays", "one.md"), "utf8"), "# one\n");
  assert.equal(readFileSync(path.join(writingDir(project), alphaName, "essays", "two.md"), "utf8"), "# two\n");
  assert.equal(readFileSync(path.join(writingDir(project), betaName, "posts", "three.md"), "utf8"), "# three\n");
  assert.equal(existsSync(path.join(writingDir(project), alphaName, "README.md")), false);
});

test("adding a second config entry brings its files in with no other edit", (t) => {
  const alpha = makeFixtureRepo("alpha", { "essays/one.md": "# one\n" });
  const beta = makeFixtureRepo("beta", { "posts/two.md": "# two\n" });
  const project = makeProject([{ repo: alpha.url, path: "essays" }]);
  t.after(() => {
    rmSync(alpha.repoDir, { recursive: true, force: true });
    rmSync(beta.repoDir, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  });

  assert.equal(runScript(project).status, 0);
  assert.equal(existsSync(path.join(writingDir(project), path.basename(beta.repoDir))), false);

  writeConfig(project, [
    { repo: alpha.url, path: "essays" },
    { repo: beta.url, path: "posts" },
  ]);
  const result = runScript(project);

  assert.equal(result.status, 0, `expected success, stderr: ${result.stderr}`);
  assert.ok(existsSync(path.join(writingDir(project), path.basename(alpha.repoDir), "essays", "one.md")));
  assert.ok(existsSync(path.join(writingDir(project), path.basename(beta.repoDir), "posts", "two.md")));
});

test("removing a config entry and re-running removes its files", (t) => {
  const alpha = makeFixtureRepo("alpha", { "essays/one.md": "# one\n" });
  const beta = makeFixtureRepo("beta", { "posts/two.md": "# two\n" });
  const project = makeProject([
    { repo: alpha.url, path: "essays" },
    { repo: beta.url, path: "posts" },
  ]);
  t.after(() => {
    rmSync(alpha.repoDir, { recursive: true, force: true });
    rmSync(beta.repoDir, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  });

  assert.equal(runScript(project).status, 0);
  assert.ok(existsSync(path.join(writingDir(project), path.basename(beta.repoDir), "posts", "two.md")));

  writeConfig(project, [{ repo: alpha.url, path: "essays" }]);
  const result = runScript(project);

  assert.equal(result.status, 0, `expected success, stderr: ${result.stderr}`);
  assert.ok(existsSync(path.join(writingDir(project), path.basename(alpha.repoDir), "essays", "one.md")));
  assert.equal(existsSync(path.join(writingDir(project), path.basename(beta.repoDir))), false);
});

test("a config path that does not exist in the repo exits nonzero and names the entry", (t) => {
  const alpha = makeFixtureRepo("alpha", { "essays/one.md": "# one\n" });
  const project = makeProject([{ repo: alpha.url, path: "no-such-dir" }]);
  t.after(() => {
    rmSync(alpha.repoDir, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  });

  const result = runScript(project);

  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes(alpha.url), `stderr should name the repo: ${result.stderr}`);
  assert.ok(result.stderr.includes("no-such-dir"), `stderr should name the path: ${result.stderr}`);
});

test("a clone failure exits nonzero and names the entry", (t) => {
  const missingUrl = pathToFileURL(path.join(os.tmpdir(), "writing-no-such-repo")).href;
  const project = makeProject([{ repo: missingUrl, path: "essays" }]);
  t.after(() => rmSync(project, { recursive: true, force: true }));

  const result = runScript(project);

  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes(missingUrl), `stderr should name the repo: ${result.stderr}`);
});

test("malformed JSON in writing-sources.json exits nonzero naming the config", (t) => {
  const project = mkdtempSync(path.join(os.tmpdir(), "writing-project-"));
  writeFileSync(path.join(project, "writing-sources.json"), "{ not json");
  t.after(() => rmSync(project, { recursive: true, force: true }));

  const result = runScript(project);

  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes("not valid JSON"), `stderr: ${result.stderr}`);
});

test("a config that is not an array exits nonzero", (t) => {
  const project = mkdtempSync(path.join(os.tmpdir(), "writing-project-"));
  writeFileSync(path.join(project, "writing-sources.json"), JSON.stringify({ repo: "a/b", path: "c" }));
  t.after(() => rmSync(project, { recursive: true, force: true }));

  const result = runScript(project);

  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes("must be a JSON array"), `stderr: ${result.stderr}`);
});

test("symlinks in a source repo are not copied into src/content/writing", (t) => {
  const alpha = makeFixtureRepo("alpha", { "essays/one.md": "# one\n" });
  // A symlink committed to the repo could point anywhere on the machine that
  // clones it; the pull must copy only regular files.
  symlinkSync("/etc/hostname", path.join(alpha.repoDir, "essays", "leak.md"));
  execFileSync("git", ["add", "-A"], { cwd: alpha.repoDir, stdio: "pipe" });
  execFileSync(
    "git",
    ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "-m", "add symlink"],
    { cwd: alpha.repoDir, stdio: "pipe" }
  );
  const project = makeProject([{ repo: alpha.url, path: "essays" }]);
  t.after(() => {
    rmSync(alpha.repoDir, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  });

  const result = runScript(project);

  assert.equal(result.status, 0, `expected success, stderr: ${result.stderr}`);
  const alphaName = path.basename(alpha.repoDir);
  assert.ok(existsSync(path.join(writingDir(project), alphaName, "essays", "one.md")));
  assert.equal(existsSync(path.join(writingDir(project), alphaName, "essays", "leak.md")), false);
});

test('a config path with ".." or an absolute path exits nonzero without cloning', (t) => {
  for (const badPath of ["../outside", "essays/../../outside", "/etc"]) {
    const project = makeProject([{ repo: "owner/name", path: badPath }]);
    t.after(() => rmSync(project, { recursive: true, force: true }));

    const result = runScript(project);

    assert.notEqual(result.status, 0, `expected failure for path "${badPath}"`);
    assert.ok(result.stderr.includes(badPath), `stderr should name the path: ${result.stderr}`);
  }
});

test("an entry missing repo or path exits nonzero naming the field", (t) => {
  const project = makeProject([{ repo: "owner/name" }]);
  t.after(() => rmSync(project, { recursive: true, force: true }));

  const result = runScript(project);

  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes('"path"'), `stderr should name the missing field: ${result.stderr}`);
});
