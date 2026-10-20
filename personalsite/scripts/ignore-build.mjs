import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const NON_SITE_FILES = new Set(["README.md", "personalsite/src/data/bm25-model.json"]);

// Vercel: 0 skips the build; 1 builds. Unknown history must always build.
// Compare with the last successful deployment, not HEAD^: a push may contain
// several commits, or a previous build may have failed.
export function shouldSkipBuild({ cwd = process.cwd(), previousSha } = {}) {
  if (!/^[a-f0-9]{40}$/i.test(previousSha ?? "")) return false;
  const git = (...args) => execFileSync("git", args, {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const root = git("rev-parse", "--show-toplevel").trim();
    const run = (...args) => execFileSync("git", args, {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    run("merge-base", "--is-ancestor", previousSha, "HEAD");
    const fields = run("diff", "--no-renames", "--name-status", "-z", previousSha, "HEAD", "--")
      .split("\0");
    fields.pop();
    if (fields.length === 0 || fields.length % 2 !== 0) return false;
    for (let i = 0; i < fields.length; i += 2) {
      // Only modifications qualify. Adds, deletes and renames still build.
      if (fields[i] !== "M" || !NON_SITE_FILES.has(fields[i + 1])) return false;
    }
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const skip = shouldSkipBuild({ previousSha: process.env.VERCEL_GIT_PREVIOUS_SHA });
  console.log(skip ? "Skipping README/BM25-only changes." : "Building: site changes or unverified history.");
  process.exitCode = skip ? 0 : 1;
}
