import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { shouldSkipBuild } from "../scripts/ignore-build.mjs";

function repo(t) {
  const cwd = mkdtempSync(path.join(tmpdir(), "personalsite-ignore-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const put = (name, value) => { mkdirSync(path.dirname(path.join(cwd, name)), { recursive: true }); writeFileSync(path.join(cwd, name), value); };
  git("init", "-q");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Test");
  put("README.md", "initial");
  put("personalsite/src/data/bm25-model.json", "{}");
  const commit = () => { git("add", "."); git("commit", "-qm", "test"); return git("rev-parse", "HEAD"); };
  return { cwd, git, put, commit, previousSha: commit() };
}

for (const changed of [["README.md"], ["personalsite/src/data/bm25-model.json"], ["README.md", "personalsite/src/data/bm25-model.json"]]) {
  test(`skips only modifications to ${changed.join(" + ")}`, t => {
    const r = repo(t);
    changed.forEach(p => r.put(p, "changed")); r.commit();
    assert.equal(shouldSkipBuild({ ...r, cwd: path.join(r.cwd, "personalsite") }), true);
  });
}

for (const changed of ["personalsite/src/app/page.tsx", "personalsite/blog/posts/new.md", "python-rag/rag-docs/corpus/project_new.md", "python-rag/rag-docs/topics.yaml", "personalsite/public/new.png", "personalsite/package-lock.json", ".github/workflows/update-rag.yml", "personalsite/vercel.json"]) {
  test(`builds changes to ${changed}, even alongside README changes`, t => {
    const r = repo(t); r.put(changed, "new"); r.put("README.md", "changed"); r.commit();
    assert.equal(shouldSkipBuild(r), false);
  });
}

test("does not hide site changes in an earlier commit of a multi-commit push", t => {
  const r = repo(t); r.put("python-rag/rag-docs/summary.txt", "new content"); r.commit();
  r.put("personalsite/src/data/bm25-model.json", "generated"); r.commit();
  assert.equal(shouldSkipBuild(r), false);
});

test("builds on missing/unavailable history, same SHA, and divergent branches", t => {
  const r = repo(t);
  for (const previousSha of [undefined, "", "HEAD^", "f".repeat(40), r.previousSha]) {
    assert.equal(shouldSkipBuild({ cwd: r.cwd, previousSha }), false);
  }
  r.git("checkout", "-qb", "other"); r.put("README.md", "other"); const other = r.commit();
  r.git("checkout", "--detach", r.previousSha); r.put("README.md", "current"); r.commit();
  assert.equal(shouldSkipBuild({ cwd: r.cwd, previousSha: other }), false);
});

test("builds on deletion or rename of an ignored file", t => {
  const r = repo(t); renameSync(path.join(r.cwd, "README.md"), path.join(r.cwd, "README-old.md")); r.commit();
  assert.equal(shouldSkipBuild(r), false);
  const s = repo(t); rmSync(path.join(s.cwd, "personalsite/src/data/bm25-model.json")); s.commit();
  assert.equal(shouldSkipBuild(s), false);
});
