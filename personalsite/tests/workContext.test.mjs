import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCanonicalWorkContext,
  selectCanonicalReceiptJobs,
  selectCanonicalJobsForQuery,
} from "../src/utils/workContext.ts";

const jobs = [
  {
    title: "AI Research Intern",
    company: "Samsung Research America — Advanced Intelligence Lab",
    description: ["Researching on-device language models."],
    year: "May 2026 - Aug 2026",
    icon: "/companies/sra.png",
  },
  {
    title: "Machine Learning Engineering Intern",
    company: "Peraton Labs",
    description: ["Built malware-detection systems."],
    year: "Jun 2025 - May 2026",
    icon: "/companies/peratonlabs.png",
  },
];

test("selects every canonical job for a work-history question", () => {
  assert.equal(selectCanonicalJobsForQuery("Where has he worked?", jobs).length, 2);
});

test("resolves a company by its full canonical name", () => {
  assert.deepEqual(
    selectCanonicalJobsForQuery(
      "Tell me about Samsung Research America",
      jobs,
    ),
    [jobs[0]],
  );
});

test("marks date-bounded work current using the request date", () => {
  const context = formatCanonicalWorkContext(
    jobs,
    new Date("2026-06-29T12:00:00Z"),
  );
  assert.match(
    context,
    /Samsung Research America — Advanced Intelligence Lab[\s\S]*Status as of 2026-06-29: current/,
  );
  assert.match(
    context,
    /Peraton Labs[\s\S]*Status as of 2026-06-29: past/,
  );
  assert.match(
    context,
    /work#samsung-research-america-advanced-intelligence-lab/,
  );
});

test("limits current-work receipts to records active on the request date", () => {
  assert.deepEqual(
    selectCanonicalReceiptJobs(
      "Where is he working now?",
      jobs,
      new Date("2026-06-29T12:00:00Z"),
    ),
    [jobs[0]],
  );
});
