import test from "node:test";
import assert from "node:assert/strict";
import { buildBoard } from "../src/a2ui/board.ts";

const component = (over = {}) => ({
  id: "answer",
  type: "narrative",
  title: "",
  body: "",
  items: [],
  options: [],
  artifactIds: [],
  quoteIds: [],
  ...over,
});

const item = (over = {}) => ({
  label: "",
  value: "",
  detail: "",
  artifactId: "",
  assetId: "",
  ...over,
});

const document = (over = {}) => ({
  version: "1.0",
  question: "What did he build?",
  title: "He built a retrieval pipeline",
  lead: "",
  compositionOptions: ["stacked"],
  primary: component(),
  supporting: [],
  actions: [],
  ...over,
});

const artifacts = [
  { id: "project:repple", label: "Repple" },
  { id: "work:peraton", label: "Peraton Labs" },
  { id: "blog:stability", label: "Stability", annotation: "“A quote he wrote.”" },
];

const SEED = 987654321;

test("every authored piece of the answer reaches the board exactly once", () => {
  const board = buildBoard(
    document({
      lead: "One sentence of orientation.",
      primary: component({
        type: "system_blueprint",
        title: "How retrieval runs",
        body: "Three modules move a question to an answer.",
        items: [
          item({ label: "Chunking", value: "600 character windows", detail: "Keeps YAML intact." }),
          item({ label: "Embedding", value: "ada-002", artifactId: "work:peraton" }),
          item({ label: "Album", assetId: "gallery:Iceland", value: "Photographs" }),
        ],
        artifactIds: ["project:repple"],
      }),
      supporting: [
        component({
          id: "principles",
          type: "manifesto_fold",
          options: [
            { label: "Local first", summary: "No external APIs", detail: "Everything runs on the box.", assetId: "" },
          ],
        }),
        component({
          id: "voice",
          type: "quote_focus",
          title: "In his words",
          quoteIds: ["quote:blog:stability"],
        }),
      ],
    }),
    artifacts,
    SEED,
  );

  assert.deepEqual(
    board.pieces.map((piece) => piece.kind),
    ["lead", "note", "stage", "stage", "photo", "option", "quote"],
  );
  assert.deepEqual(
    board.pieces.map((piece) => piece.order),
    [0, 1, 2, 3, 4, 5, 6],
  );

  const [lead, note, chunking, embedding, photo, option, quote] = board.pieces;
  assert.equal(lead.body, "One sentence of orientation.");
  assert.equal(note.heading, "How retrieval runs");
  assert.equal(note.body, "Three modules move a question to an answer.");
  assert.equal(chunking.heading, "Chunking");
  assert.equal(chunking.value, "600 character windows");
  assert.equal(chunking.detail, "Keeps YAML intact.");
  assert.equal(chunking.eyebrow, "01");
  assert.equal(embedding.eyebrow, "02");
  // Real photographs only: a gallery item carries its category, never art.
  assert.equal(photo.galleryCategory, "Iceland");
  assert.equal(photo.assetId, "");
  assert.equal(option.heading, "Local first");
  assert.equal(option.value, "No external APIs");
  assert.equal(option.detail, "Everything runs on the box.");
  assert.equal(quote.quote, "A quote he wrote.");
  assert.equal(quote.attribution, "Stability");
  assert.equal(quote.eyebrow, "In his words");

  // Sources: every referenced artifact is reachable exactly once.
  assert.equal(embedding.artifactId, "work:peraton");
  assert.equal(quote.artifactId, "blog:stability");
  assert.equal(note.artifactId, "project:repple");
  assert.deepEqual(board.sourceArtifactIds, []);
  assert.deepEqual(new Set(board.referencedArtifactIds).size, 3);
});

test("pieces are individually placed, never one enclosing panel", () => {
  const board = buildBoard(
    document({
      primary: component({
        items: [
          item({ label: "A", value: "First fact", detail: "A longer supporting detail that earns more room on the board." }),
          item({ label: "B", value: "Second" }),
          item({ label: "C", value: "Third" }),
        ],
      }),
    }),
    [],
    SEED,
  );

  assert.equal(board.pieces.length, 3);
  for (const piece of board.pieces) {
    assert.ok(["hero", "wide", "standard", "narrow"].includes(piece.span));
    assert.ok(["pin", "tape", "clip"].includes(piece.pin));
    assert.ok(Math.abs(piece.tilt) > 0 && Math.abs(piece.tilt) <= 2.1, `tilt is visible but readable: ${piece.tilt}`);
    assert.ok([0, 10, 18].includes(piece.drop));
  }
  // Varied size is content-driven: the long item is not the same as the short.
  assert.notEqual(board.pieces[0].span, board.pieces[2].span);
  assert.equal(new Set(board.pieces.map((piece) => piece.key)).size, 3);
});

test("piece identity and order never depend on how much has arrived", () => {
  const items = [
    item({ label: "One", value: "First fact" }),
    item({ label: "Two", value: "Second fact" }),
    item({ label: "Three", value: "Third fact" }),
    item({ label: "Four", value: "Fourth fact" }),
  ];
  const growth = [
    document({ primary: component({ title: "Stages", items: items.slice(0, 1) }) }),
    document({ primary: component({ title: "Stages", items: items.slice(0, 2) }) }),
    document({ primary: component({ title: "Stages", items: items.slice(0, 4) }) }),
    document({
      primary: component({ title: "Stages", items }),
      supporting: [component({ id: "extra", body: "Later evidence." })],
    }),
  ];

  const boards = growth.map((value) => buildBoard(value, artifacts, SEED));
  for (let step = 1; step < boards.length; step += 1) {
    const previous = boards[step - 1].pieces;
    const current = boards[step].pieces;
    assert.ok(current.length >= previous.length);
    previous.forEach((piece, index) => {
      const next = current[index];
      // Same key, same slot in the reading order, same look.
      assert.equal(next.key, piece.key);
      assert.equal(next.order, piece.order);
      assert.equal(next.kind, piece.kind);
      assert.equal(next.span, piece.span);
      assert.equal(next.tilt, piece.tilt);
      assert.equal(next.pin, piece.pin);
      assert.equal(next.drop, piece.drop);
      assert.equal(next.value, piece.value);
    });
  }

  // Items keep document order; nothing is rotated by a seeded offset.
  assert.deepEqual(
    boards.at(-1).pieces.filter((piece) => piece.kind === "fact").map((piece) => piece.value),
    ["First fact", "Second fact", "Third fact", "Fourth fact"],
  );
  for (const seed of [0, 1, 7, 42, 2 ** 31]) {
    assert.deepEqual(
      buildBoard(growth.at(-1), artifacts, seed).pieces.map((piece) => piece.key),
      boards.at(-1).pieces.map((piece) => piece.key),
    );
  }
});

test("navigation components stay one clickable piece with their link intact", () => {
  const board = buildBoard(
    document({
      supporting: [
        component({
          id: "more",
          body: "The rest of the work lives on his [projects page](/projects).",
        }),
      ],
    }),
    [],
    SEED,
  );

  const link = board.pieces.find((piece) => piece.kind === "link");
  assert.ok(link);
  assert.equal(link.navigationPath, "/projects");
  assert.equal(link.body, "The rest of the work lives on his projects page.");
});

test("a navigation component with no title or body never becomes an empty link card", () => {
  const board = buildBoard(
    document({
      supporting: [component({ id: "more" })],
      actions: [{ label: "See his projects", intent: "open_path", payload: "/projects" }],
    }),
    [],
    SEED,
  );

  assert.equal(board.pieces.some((piece) => piece.componentId === "more"), false);
});

test("unclaimed sources become board source tags instead of vanishing", () => {
  const board = buildBoard(
    document({
      primary: component({
        title: "Selected work",
        body: "",
        items: [item({ label: "One", value: "Only one visible item" })],
        artifactIds: ["project:repple", "work:peraton", "blog:stability"],
      }),
    }),
    artifacts,
    SEED,
  );

  const owned = board.pieces.map((piece) => piece.artifactId).filter(Boolean);
  const reachable = [...owned, ...board.sourceArtifactIds];
  assert.deepEqual(new Set(reachable).size, reachable.length, "no source appears twice");
  assert.deepEqual(new Set(reachable), new Set(["project:repple", "work:peraton", "blog:stability"]));
  assert.deepEqual(new Set(board.referencedArtifactIds), new Set(reachable));
});

test("a quote two components both name is pinned once", () => {
  const board = buildBoard(
    document({
      primary: component({ id: "answer", quoteIds: ["quote:blog:stability"] }),
      supporting: [
        component({ id: "more", type: "quote_focus", quoteIds: ["quote:blog:stability"] }),
      ],
    }),
    artifacts,
    SEED,
  );

  const quotes = board.pieces.filter((piece) => piece.kind === "quote");
  assert.equal(quotes.length, 1);
  assert.equal(quotes[0].componentId, "answer");
});

test("unknown ids and unverified quotes never reach the board", () => {
  const board = buildBoard(
    document({
      primary: component({
        title: "Claims",
        items: [item({ label: "One", value: "Fact", artifactId: "project:invented" })],
        artifactIds: ["project:invented"],
        quoteIds: ["quote:project:repple", "quote:project:invented"],
      }),
    }),
    artifacts,
    SEED,
  );

  assert.deepEqual(board.pieces.map((piece) => piece.artifactId).filter(Boolean), []);
  assert.deepEqual(board.sourceArtifactIds, []);
  // project:repple is a known artifact with no annotation, so no quote piece.
  assert.deepEqual(board.pieces.filter((piece) => piece.kind === "quote"), []);
});

test("heading-only and unresolved quote components never create empty notes", () => {
  const board=buildBoard(document({primary:component({title:"Why he joined Repple",type:"quote_focus",quoteIds:["quote:project:repple"]}),supporting:[component({id:"empty",title:"A heading without an answer"})]}),artifacts,SEED);
  assert.equal(board.pieces.length,0);
});

test("a heading-only section keeps its actual facts without an empty title card", () => {
  const board=buildBoard(document({primary:component({title:"Working notes",items:[item({label:"Motivation",value:"Build something people use"})]})}),artifacts,SEED);
  assert.equal(board.pieces.length,1);
  assert.equal(board.pieces[0].kind,"fact");
  assert.equal(board.pieces[0].value,"Build something people use");
});
