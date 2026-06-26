import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";

const MAX_LINES = 1000;
const REPO_ROOT = new URL("../../", import.meta.url);
const IGNORED_DIRECTORIES = new Set([".git", "dist", "node_modules"]);

const getTrackedFiles = () => {
  return execFileSync("git", ["ls-files"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
};

const countLines = (relativePath) => {
  const content = readFileSync(join(REPO_ROOT.pathname, relativePath), "utf8");

  if (content.length === 0) return 0;

  return content.split("\n").length - (content.endsWith("\n") ? 1 : 0);
};

test("tracked project files stay under 1000 lines", () => {
  const oversizedFiles = getTrackedFiles()
    .filter((filePath) => {
      return !filePath
        .split("/")
        .some((segment) => IGNORED_DIRECTORIES.has(segment));
    })
    .map((filePath) => ({
      filePath,
      lines: countLines(filePath),
    }))
    .filter(({ lines }) => lines > MAX_LINES);

  assert.deepEqual(
    oversizedFiles,
    [],
    `Files over ${MAX_LINES} lines: ${oversizedFiles
      .map(({ filePath, lines }) => `${basename(filePath)} (${lines})`)
      .join(", ")}`,
  );
});
