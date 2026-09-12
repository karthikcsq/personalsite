import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { formatImpactRanking, getImpactFocus, getImpactRanking, IMPACT_TIERS } from "../src/utils/impactUtils.ts";

const ragDocs = new URL("../../python-rag/rag-docs/", import.meta.url);
const truth = yaml.load(readFileSync(new URL("karthik_thyagarajan_truth.yaml", ragDocs), "utf8"));
const involvement = yaml.load(readFileSync(new URL("involvement.yaml", ragDocs), "utf8"));
const projects = JSON.parse(readFileSync(new URL("../src/data/projects.json", import.meta.url), "utf8"));
const projectList = Array.isArray(projects) ? projects : projects.projects;

// The same ids the chat route builds its artifact directory from.
const artifactIds = new Set([
  ...truth.experience.map((job) => `work:${job.company}`),
  ...projectList.map((project) => `project:${project.id}`),
  ...involvement.involvement.map((entry) => `involvement:${entry.slug}`),
]);

test("every ranked id is a real artifact, ranked once with a reason", () => {
  const ranking = getImpactRanking();
  const ids = ranking.map((entry) => entry.id);
  assert.deepEqual(ids.filter((id) => !artifactIds.has(id)), [], "ranked ids that match no artifact");
  assert.equal(new Set(ids).size, ids.length, "an artifact is ranked twice");
  for (const entry of ranking) {
    assert.ok(IMPACT_TIERS.includes(entry.tier));
    assert.ok(entry.why, `${entry.id} has no reason`);
  }
});

test("every artifact is ranked, so new work cannot silently go unranked", () => {
  const ranked = new Set(getImpactRanking().map((entry) => entry.id));
  assert.deepEqual([...artifactIds].filter((id) => !ranked.has(id)), []);
});

test("the ranking states a current focus, and the prompt leads with it", () => {
  const focus = getImpactFocus();
  assert.ok(focus, "impact.yaml has no focus line");
  const prompt = formatImpactRanking(getImpactRanking(), undefined, focus);
  assert.equal(prompt.split("\n")[0], `current focus: ${focus}`);
  assert.match(prompt.split("\n")[1], /^flagship /);
});

test("the prompt lists flagship work first and drops ids the model cannot cite", () => {
  const entries = [
    { id: "project:early", tier: "early", why: "An early project." },
    { id: "work:lab", tier: "flagship", why: "The biggest role." },
    { id: "project:hidden", tier: "strong", why: "Not citable here." },
  ];
  assert.equal(
    formatImpactRanking(entries, new Set(["project:early", "work:lab"])),
    [
      "flagship (lead any broad answer about Karthik with these):",
      "1. work:lab: The biggest role.",
      "early (feature only when the visitor asks about them or that era):",
      "2. project:early: An early project.",
    ].join("\n"),
  );
});
