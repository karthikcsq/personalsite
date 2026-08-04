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
const a2uiPresentation = readFileSync(
  new URL("../src/a2ui/presentation.ts", import.meta.url),
  "utf8",
);
const a2uiProtocol = readFileSync(
  new URL("../src/a2ui/protocol.ts", import.meta.url),
  "utf8",
);
const a2uiDraft = readFileSync(
  new URL("../src/app/a2ui-draft/A2uiDraftClient.tsx", import.meta.url),
  "utf8",
);
const assetCatalog = readFileSync(
  new URL("../src/a2ui/assetCatalog.ts", import.meta.url),
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
const galleryIndex = readFileSync(
  new URL("../src/utils/galleryIndex.ts", import.meta.url),
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
  assert.match(a2uiStyles, /\.composerDock\s*\{\s*position: fixed;/);
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

test("shared artifact references render as one component-level source action", () => {
  assert.match(
    a2uiComposer,
    /When several items cite the same artifact,[\s\S]*component artifactIds array/,
  );
  assert.match(
    a2uiExperience,
    /function sharedArtifactIdFor[\s\S]*artifactIds\.length === 1/,
  );
  assert.match(a2uiExperience, /function itemOwnsArtifactAction/);
  assert.match(
    a2uiExperience,
    /function EvidenceStack[\s\S]*const sharedArtifactId = sharedArtifactIdFor\(component\)/,
  );
  assert.match(a2uiExperience, /className=\{styles\.sharedSourceAction\}/);
  assert.match(a2uiStyles, /\.sharedSourceAction\s*\{/);
});

test("notebook source actions have dedicated space below authored copy", () => {
  assert.match(
    a2uiStyles,
    /\.notebookPage\s*\{[\s\S]*?padding:\s*10px 44px 72px 8px;/,
  );
  assert.match(
    a2uiStyles,
    /@media \(max-width: 900px\)[\s\S]*?\.notebookPage\s*\{[\s\S]*?padding:\s*4px 0 58px;/,
  );
  assert.match(
    a2uiExperience,
    /className=\{styles\.notebookPage\}[\s\S]*?className=\{styles\.notebookAction\}[\s\S]*?className=\{styles\.notebookAnnotations\}/,
  );
  assert.match(
    a2uiStyles,
    /\.notebookAction\s*\{[\s\S]*?position:\s*static;[\s\S]*?margin-top:\s*28px;/,
  );
});

test("essay source actions stay in document flow", () => {
  assert.match(
    a2uiStyles,
    /\.essayPage > button\s*\{[\s\S]*?position:\s*relative;[\s\S]*?display:\s*flex;[\s\S]*?margin-top:\s*28px;/,
  );
});

test("every referenced artifact receives a host-authored backlink", () => {
  assert.match(
    a2uiExperience,
    /function componentSourceArtifactIds\([\s\S]*component\.quoteIds\.map\([\s\S]*seenPaths\.has\(path\)/,
  );
  assert.match(
    a2uiExperience,
    /const referencedSourceArtifactIds = Array\.from\([\s\S]*const fallbackSourceArtifactIds/,
  );
  assert.match(
    a2uiExperience,
    /<ArtifactSourceStrip[\s\S]*artifactIds=\{fallbackSourceArtifactIds\}/,
  );
  assert.match(
    a2uiExperience,
    /action\.intent === "open_artifact"[\s\S]*referencedSourceArtifactIds\.includes\(action\.payload\)/,
  );
  assert.match(
    a2uiExperience,
    /function itemSourceArtifactIds\([\s\S]*artifactLabel\(artifact\)[\s\S]*emptyIndexes\.length === available\.size/,
  );
  assert.match(
    a2uiExperience,
    /function SpecimenBoard\([\s\S]*const itemArtifactIds = itemSourceArtifactIds\(component, artifactMap\)[\s\S]*<ItemSourceCue artifactId=\{artifactId\}[\s\S]*onClick=\{\(\) => onOpen\(artifactId\)\}/,
  );
  assert.doesNotMatch(
    a2uiExperience,
    /function SpecimenBoard\([\s\S]*?<ArtifactSourceStrip[\s\S]*?function VisualMosaic\(/,
  );
});

test("sparse authored surfaces collapse around their actual item count", () => {
  assert.doesNotMatch(
    a2uiStyles,
    /\.essayConstellation\s*\{[^}]*min-height:\s*580px/s,
  );
  assert.doesNotMatch(
    a2uiStyles,
    /\.constellationNotes\s*\{[^}]*gap:\s*120px 90px/s,
  );
  assert.match(
    a2uiStyles,
    /\.essayConstellation:is\(\[data-count="1"\], \[data-count="2"\], \[data-count="3"\]\)[\s\S]*\.constellationNotes > svg[\s\S]*display:\s*none/,
  );
  assert.match(
    a2uiExperience,
    /const layoutCandidates =[\s\S]*component\.items\.length <= 1[\s\S]*component\.items\.length === 2[\s\S]*component\.items\.length === 3/,
  );
});

test("the chat route falls back when sparse vector ids drift from the index", () => {
  assert.match(chatRoute, /sparseResultsLookMisaligned/);
  assert.match(
    chatRoute,
    /retrying with dense retrieval[\s\S]*baselineResponse = await index\.query\(\{\s*vector: baselineEmbedding,\s*topK: 30,/,
  );
  assert.match(chatRoute, /relevanceThresholdForMode\(retrievalMode\)/);
  assert.doesNotMatch(chatRoute, /favorite project.*Repple/i);
});

test("four-stage papers use a content-sized two-by-two layout", () => {
  assert.match(
    a2uiStyles,
    /\.foldStrip\[data-count="4"\]\s*\{[^}]*grid-template-columns: repeat\(2,[^}]*grid-template-rows: repeat\(2, minmax\(310px, auto\)\)/s,
  );
  assert.match(
    a2uiStyles,
    /@media \(max-width: 560px\)[\s\S]*\.foldStrip\[data-count="4"\]\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/,
  );
});

test("fresh A2UI responses choose a host-owned visual family and safe composition", () => {
  assert.match(homeChat, /presentationSeed/);
  assert.match(homeChat, /crypto\.getRandomValues/);
  assert.match(a2uiExperience, /type A2UIVisualVariant = "folio" \| "diagram" \| "margin"/);
  assert.match(a2uiExperience, /mixPresentationSeed\(presentationSeed, "document:visual"\)/);
  assert.match(a2uiExperience, /compositionCandidates\(/);
  assert.match(a2uiExperience, /data-visual=\{visualVariant\}/);
  assert.match(a2uiExperience, /function recentVisualVariantsForTurns/);
  assert.match(
    a2uiExperience,
    /visualVariantForSeed\([\s\S]*?previous \? \[previous\] : \[\]/,
  );
  assert.match(
    a2uiExperience,
    /mixPresentationSeed\(presentationSeed, "document:visual"\),\s*recentVisualVariants/,
  );
});

test("semantic type, composition, and item arrangement rotate independently", () => {
  assert.match(a2uiPresentation, /export function mixPresentationSeed/);
  assert.match(a2uiPresentation, /presentationTypeCandidates/);
  assert.match(a2uiPresentation, /"research_map",\s*"system_blueprint",\s*"steps"/s);
  assert.match(a2uiPresentation, /case "topic_compass":[\s\S]*\["manifesto_fold", "comparison"\]/);
  assert.match(a2uiPresentation, /export function arrangementForComponent/);
  assert.match(a2uiPresentation, /\["balanced", "lead", "rail"\]/);
  assert.match(a2uiExperience, /data-arrangement=\{arrangement\}/);
  assert.match(a2uiStyles, /\[data-arrangement="lead"\]/);
  assert.match(a2uiStyles, /\[data-arrangement="rail"\]/);
});

test("structured variants become authored diagrams instead of repeated panels", () => {
  assert.match(a2uiExperience, /className=\{styles\.evidenceRoute\}/);
  assert.match(a2uiExperience, /className=\{styles\.manifestoRoute\}/);
  assert.match(
    a2uiStyles,
    /\.evidenceStack\[data-variant="margin"\][\s\S]*\.evidenceRoute[\s\S]*position: absolute/,
  );
  assert.match(
    a2uiStyles,
    /\.manifestoFold\[data-variant="diagram"\][\s\S]*\.manifestoRoute[\s\S]*position: absolute/,
  );
  assert.match(
    a2uiStyles,
    /\.timelineComponent\[data-variant="margin"\] ol::before/,
  );
  assert.match(
    a2uiStyles,
    /\.foldTimeline\[data-variant="diagram"\] \.foldStrip::before/,
  );
  assert.match(
    a2uiStyles,
    /@media \(max-width: 900px\)[\s\S]*\.evidenceStack\[data-variant="margin"\] \.evidenceRoute[\s\S]*display: none/,
  );
  assert.match(
    a2uiStyles,
    /\.component h2,[\s\S]*overflow-wrap: normal/,
  );
});

test("cross-pill draft fixtures exercise distinct semantic answer shapes", () => {
  for (const fixture of [
    "QUANTUM_FIXTURE",
    "TOOLS_FIXTURE",
    "MCP_FIXTURE",
    "FAVORITE_PROJECT_FIXTURE",
    "OUTSIDE_CODE_FIXTURE",
  ]) {
    assert.match(a2uiDraft, new RegExp(`const ${fixture}`));
  }
  assert.match(a2uiDraft, /type: "system_blueprint"/);
  assert.match(a2uiDraft, /type: "manifesto_fold"/);
  assert.match(a2uiDraft, /type: "field_notebook"/);
  assert.match(a2uiDraft, /type: "specimen_board"/);
});

test("gallery questions resolve category assets into seeded real photographs", () => {
  assert.match(galleryIndex, /loadGalleryCategoryDirectory/);
  assert.match(galleryIndex, /galleryCategoryPromptDirectory/);
  assert.match(galleryIndex, /albumData\.CommonPrefixes/);
  assert.match(assetCatalog, /galleryCategoryFromAssetId/);
  assert.match(a2uiComposer, /use visual_mosaic/);
  assert.match(a2uiComposer, /must never invent or emit an image URL/);
  assert.match(a2uiComposer, /GALLERY CATEGORIES/);
  assert.match(a2uiComposer, /loadGalleryCategoryDirectory/);
  assert.match(a2uiExperience, /fetch\("\/api\/gallery"/);
  assert.match(a2uiExperience, /mixPresentationSeed\(\s*presentationSeed/s);
  assert.match(a2uiExperience, /className=\{styles\.visualMosaicImage\}/);
  assert.match(a2uiExperience, /const usedIndexes = new Map/);
  assert.match(a2uiDraft, /buildDynamicGalleryFixture/);
  assert.match(a2uiDraft, /parameters\.get\("gallery"\)/);
  assert.match(
    a2uiStyles,
    /\.visualMosaic\[data-arrangement="lead"\][\s\S]*\.visualMosaicGrid\[data-count="4"\][\s\S]*grid-column: 1 \/ -1/,
  );
  assert.match(
    a2uiStyles,
    /\.visualMosaicGrid\[data-count="1"\][\s\S]*grid-column: 1 \/ -1/,
  );
});

test("specimen boards can recover exact project art from the asset catalog", () => {
  assert.match(assetCatalog, /"veritas-verification"/);
  assert.match(assetCatalog, /"caladrius-triage"/);
  assert.match(assetCatalog, /"formulator-motion"/);
  assert.match(assetCatalog, /export function matchA2UIVisualAsset/);
  assert.match(a2uiExperience, /function uniqueVisualAssetsForItems/);
  assert.match(a2uiExperience, /used\.has\(assetId\)/);
  assert.doesNotMatch(a2uiExperience, /styles\.specimenMark/);
  assert.doesNotMatch(a2uiStyles, /\.specimenMark/);
});

test("focused A2UI answers use adaptive density instead of mandatory grids", () => {
  assert.match(
    a2uiComposer,
    /Default to one to three primary items/,
  );
  assert.match(
    a2uiComposer,
    /values to seven words, and visible details to fourteen words/,
  );
  assert.match(
    a2uiComposer,
    /Never use it for several facets, features, or technical details of one project/,
  );
  assert.match(
    a2uiStyles,
    /\.specimenBoard\[data-count="4"\]\[data-arrangement="balanced"\]\s+\.specimens\s*\{[\s\S]*grid-template-columns: repeat\(2,/,
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

test("answer and A2UI prompts reject contrastive parallelism broadly", () => {
  for (const prompt of [chatRoute, a2uiComposer]) {
    assert.match(prompt, /Never use contrastive parallelism/);
    assert.match(prompt, /"from X to Y" thesis frames/);
    assert.match(prompt, /State the intended claim directly/);
  }
});

test("answer and A2UI prompts count exact award placements as wins", () => {
  assert.match(
    chatRoute,
    /introduce every qualifying result as a win, including second place/,
  );
  assert.match(
    a2uiComposer,
    /frame every qualifying result as a win, including second place/,
  );
});

test("answer generation and A2UI composition share one evidence contract", () => {
  assert.match(chatRoute, /ONE ANSWER CONTRACT/);
  assert.match(chatRoute, /MATCHING CANONICAL PORTFOLIO RECORDS/);
  assert.match(chatRoute, /LIVE GALLERY DIRECTORY/);
  assert.match(chatRoute, /Award placements are wins/);
  assert.match(a2uiComposer, /ANSWER AND EVIDENCE CONTRACT/);
  assert.match(a2uiComposer, /withGuaranteedSourceAccess/);
  assert.match(a2uiComposer, /hasAnswerBearingPrimary/);
  assert.match(a2uiComposer, /For a gallery answer, include one open_path action/);
  assert.match(a2uiComposer, /Award placements are wins/);
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

test("folio evidence uses one readable sheet and names every source action", () => {
  assert.match(a2uiExperience, /function sourceActionLabel/);
  assert.match(a2uiExperience, /`See \$\{artifactLabel\(artifact\)\}`/);
  assert.doesNotMatch(a2uiExperience, />Open source</);
  assert.match(
    a2uiStyles,
    /\.evidenceStack\[data-variant="folio"\]\[data-arrangement\][\s\S]*\.evidenceSlips\[data-count="4"\][\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
  );
  assert.match(
    a2uiStyles,
    /\.evidenceStack\[data-variant="folio"\][\s\S]*\.evidenceSlips[\s\S]*background:[\s\S]*a2ui-paper-stock\.webp/,
  );
});

test("six-stage timeline diagrams stay readable and follow one continuous route", () => {
  assert.match(a2uiExperience, /className=\{styles\.timelineRoute\}/);
  assert.match(a2uiExperience, /timelineRouteGhost/);
  assert.match(
    a2uiStyles,
    /\.timelineComponent\[data-variant="diagram"\] ol[\s\S]*grid-template-columns: repeat\(3, minmax\(250px, 1fr\)\)/,
  );
  assert.match(
    a2uiStyles,
    /\.timelineComponent\[data-variant="diagram"\] strong,[\s\S]*word-break: normal;[\s\S]*overflow-wrap: normal;/,
  );
  assert.match(
    a2uiStyles,
    /\.timelineComponent\[data-variant="diagram"\] li:nth-child\(6\)[\s\S]*grid-column: 1;[\s\S]*grid-row: 2;/,
  );
  assert.match(
    a2uiProtocol,
    /\["timeline", "fold_timeline"\]\.includes\(primary\.type\)\) primary\.title = ""/,
  );
});
