import assert from "node:assert/strict";
import test from "node:test";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_EVENT,
  ACHIEVEMENT_RESET_EVENT,
  ACHIEVEMENT_STORAGE_KEY,
  GROWTH_COVERAGE_STORAGE_KEY,
  hasAllBranches,
  hasAllLeaves,
  leafTargets,
  parseAchievementIds,
  parseAchievementRecords,
  parseGrowthCoverage,
  readGrowthCoverage,
  readUnlockedAchievements,
  recordBranchCoverage,
  recordLeafCoverage,
  resetAchievements,
  syncAchievements,
  unlockAchievement,
} from "../src/lib/living-corpus/achievements.ts";

test("only first/all growth milestones appear; old per-item awards become coverage", () => {
  assert.deepEqual(
    ACHIEVEMENTS.map(({ id }) => id),
    ["branch", "all-branches", "leaf", "all-leaves", "night", "break", "eclipse"],
  );
  assert.deepEqual(
    parseAchievementIds('["branch","leaf","branch:work","leaf:work:samsung#opened"]'),
    ["branch", "leaf"],
  );
  assert.deepEqual(
    parseAchievementRecords(JSON.stringify([
      { id: "leaf:work:samsung#opened", title: "Samsung", description: "Work · opened" },
      { id: "branch:work", title: "Work branch", description: "Old award" },
      { id: "leaf", title: "Wrong title", description: "Wrong description" },
    ])).map(({ id, title }) => [id, title]),
    [["leaf", "First leaf"]],
  );
  assert.deepEqual(
    parseGrowthCoverage(null, JSON.stringify([
      { id: "branch:work" },
      { id: "leaf:work:samsung#opened" },
      { id: "leaf:work:samsung#opened" },
    ])),
    { branches: ["work"], entries: ["work:samsung#opened"] },
  );
});

test("all leaves requires every item and every rendered section", () => {
  const items = [
    {
      id: "work:samsung", category: "work", description: "The summary.",
      sections: [
        { id: "duplicate", text: "The summary." },
        { id: "router", text: "A real note." },
      ],
    },
    { id: "writing:essay", category: "writing", description: "An essay.", sections: [] },
  ];
  assert.equal(hasAllBranches(["work", "projects", "ideas"]), false);
  assert.equal(hasAllBranches(["writing", "ideas", "projects", "work"]), true);
  const targets = leafTargets(items);
  assert.deepEqual(targets, ["work:samsung#opened", "work:samsung#router", "writing:essay#opened"]);
  assert.equal(hasAllLeaves(targets, []), false);
  assert.equal(hasAllLeaves(targets, ["work:samsung#opened", "writing:essay#opened"]), false);
  assert.equal(hasAllLeaves(targets, [
    "work:samsung#opened", "work:samsung#router", "writing:essay#opened",
  ]), true);
});

test("first leaf notification is generic; coverage persists and reset clears it", () => {
  const savedWindow = globalThis.window;
  const savedCustomEvent = globalThis.CustomEvent;
  const storage = new Map([[
    ACHIEVEMENT_STORAGE_KEY,
    JSON.stringify([{ id: "branch:work", title: "Work branch", description: "Old" }]),
  ]]);
  const events = [];
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    dispatchEvent: (event) => events.push(event),
  };
  globalThis.CustomEvent = class {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  };

  try {
    assert.deepEqual(readGrowthCoverage().branches, ["work"]);
    recordBranchCoverage("projects");
    recordBranchCoverage("ideas");
    assert.equal(hasAllBranches(readGrowthCoverage().branches), false);
    recordBranchCoverage("writing");
    assert.equal(hasAllBranches(readGrowthCoverage().branches), true);
    assert.deepEqual(JSON.parse(storage.get(GROWTH_COVERAGE_STORAGE_KEY)).branches,
      ["work", "projects", "ideas", "writing"]);

    recordLeafCoverage("work:samsung#opened");
    assert.equal(unlockAchievement("leaf"), true);
    assert.equal(events.at(-1).type, ACHIEVEMENT_EVENT);
    assert.equal(events.at(-1).detail.title, "First leaf");
    assert.equal(unlockAchievement("leaf"), false);
    syncAchievements(["branch"]);
    assert.deepEqual(readUnlockedAchievements().map(({ id }) => id), ["leaf", "branch"]);

    resetAchievements();
    assert.equal(storage.has(ACHIEVEMENT_STORAGE_KEY), false);
    assert.equal(storage.has(GROWTH_COVERAGE_STORAGE_KEY), false);
    assert.deepEqual(readGrowthCoverage(), { branches: [], entries: [] });
    assert.deepEqual(readUnlockedAchievements(), []);
    assert.equal(events.at(-1).type, ACHIEVEMENT_RESET_EVENT);
  } finally {
    resetAchievements();
    globalThis.window = savedWindow;
    globalThis.CustomEvent = savedCustomEvent;
  }
});
