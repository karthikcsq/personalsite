import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeChat = readFileSync(
  new URL("../src/app/HomeChatClient.tsx", import.meta.url),
  "utf8",
);
const chatInput = readFileSync(
  new URL("../src/app/components/ChatInput.tsx", import.meta.url),
  "utf8",
);
const a2uiExperience = readFileSync(
  new URL("../src/app/components/a2ui/A2UIExperience.tsx", import.meta.url),
  "utf8",
);
const a2uiStyles = readFileSync(
  new URL("../src/app/components/a2ui/a2ui.module.css", import.meta.url),
  "utf8",
);
const a2uiComposer = readFileSync(
  new URL("../src/a2ui/compose.ts", import.meta.url),
  "utf8",
);
const chatRoute = readFileSync(
  new URL("../src/app/api/chat/route.ts", import.meta.url),
  "utf8",
);
const modelRouting = readFileSync(
  new URL("../src/utils/modelRouting.ts", import.meta.url),
  "utf8",
);

test("desktop chat panes stay constrained to the viewport track", () => {
  assert.match(homeChat, /grid h-full min-h-0[^"]*overflow-hidden/);
  assert.match(homeChat, /flex h-full min-h-0 flex-col/);
  assert.match(homeChat, /min-h-0 flex-1 overflow-y-auto/);
  assert.match(homeChat, /h-full min-h-0 overflow-y-auto/);
});

test("queue growth cannot shrink the docked input out of view", () => {
  assert.match(homeChat, /max-w-\[620px\] shrink-0 pb-5/);
  assert.match(chatInput, /max-w-\[620px\] shrink-0/);
});

test("A2UI surfaces queued follow-ups in the conversation rail", () => {
  assert.match(homeChat, /queuedPrompts=\{queue\}/);
  assert.match(a2uiExperience, /aria-label="Queued follow-ups"/);
  assert.match(homeChat, /onEditQueued=\{startEditQueue\}/);
  assert.match(homeChat, /onReorderQueued=\{reorderQueue\}/);
  assert.match(a2uiExperience, /<Reorder\.Group/);
  assert.match(a2uiExperience, /<Reorder\.Item/);
  assert.doesNotMatch(a2uiExperience, /Move queued question up/);
  assert.doesNotMatch(a2uiExperience, /Move queued question down/);
  assert.match(a2uiStyles, /\.queuedFollowUps/);
  assert.match(a2uiStyles, /border-radius: 15px 15px 15px 5px/);
});

test("evidence slips collapse before their titles become too narrow", () => {
  assert.match(
    a2uiStyles,
    /repeat\(auto-fit, minmax\(min\(250px, 100%\), 1fr\)\)/,
  );
  assert.match(
    a2uiStyles,
    /\.evidenceSlips\[data-count="4"\]\s*\{\s*grid-template-columns: repeat\(2,/,
  );
});

test("guarded routing keeps A2UI on Luna and uses Mini only for narrow facts", () => {
  assert.match(modelRouting, /"OPENAI_ANSWER_FAST_MODEL"/);
  assert.match(modelRouting, /legacyAnswerModel \|\| "gpt-5-mini"/);
  assert.match(modelRouting, /legacyAnswerModel \|\| "gpt-5\.6-luna"/);
  assert.match(modelRouting, /"OPENAI_A2UI_MODEL", "gpt-5\.6-luna"/);
  assert.match(modelRouting, /const SIMPLE_FACT/);
  assert.match(modelRouting, /const COMPLEX_QUESTION/);
  assert.match(chatRoute, /selectAnswerRoute\(/);
  assert.match(a2uiComposer, /MODEL_CONFIG\.a2uiModel/);
});

test("role questions cannot ship an empty source sheet as the primary", () => {
  assert.match(a2uiComposer, /asksAboutPersonalContribution/);
  assert.match(
    a2uiComposer,
    /artifact_focus, paper_dossier, narrative, and a generic source sheet are invalid primary choices/,
  );
  assert.match(a2uiComposer, /REPAIR REQUIRED/);
  assert.match(a2uiComposer, /hasCompleteContributionSurface\(repaired\)/);
});

test("essay layouts align their paper and notes and embed the quote below the paper", () => {
  assert.match(a2uiExperience, /const embeddedQuote =/);
  assert.match(a2uiExperience, /className=\{styles\.essayInlineQuote\}/);
  assert.match(
    a2uiStyles,
    /\.essayMargin\s*\{[^}]*grid-template-columns: minmax\(0, 1\.25fr\) minmax\(300px, 0\.75fr\);[^}]*align-items: start;/s,
  );
  assert.match(a2uiStyles, /\.essayMainColumn/);
  assert.match(a2uiStyles, /\.essayInlineQuote/);
});

test("field notebooks recover a visible artifact title when the model omits one", () => {
  assert.match(a2uiExperience, /const notebookTitle =/);
  assert.match(
    a2uiExperience,
    /component\.title \|\| \(sharedArtifact \? artifactLabel\(sharedArtifact\) : ""\)/,
  );
});
