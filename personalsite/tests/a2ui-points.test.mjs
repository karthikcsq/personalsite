import test from "node:test";
import assert from "node:assert/strict";
import { enforcePointOwnership } from "../src/a2ui/points.ts";
import { A2UI_GENERATION_RESPONSE_FORMAT } from "../src/a2ui/protocol.ts";

const item = (pointId, value) => ({ label: value, value, detail: "", pointId, artifactId: "", assetId: "" });
const component = (over = {}) => ({
  id: "c",
  type: "narrative",
  title: "",
  titlePointId: "",
  body: "",
  bodyPointId: "",
  items: [],
  options: [],
  artifactIds: [],
  quoteIds: [],
  ...over,
});

// The reported board: one claim about missing business endpoints, restated in
// the lead, the card title, the third item and a supporting note.
const restaurant = () => ({
  points: [
    { id: "p1", text: "Businesses expose no endpoints agents can call." },
    { id: "p2", text: "Custom wrappers leave coverage incomplete." },
    { id: "p3", text: "Browser automation is slow and brittle." },
    { id: "p4", text: "MCP already standardizes tool descriptions." },
  ],
  title: "Agents cannot book tables because businesses expose no endpoints",
  titlePointId: "p1",
  lead: "Karthik points to a missing interface layer.",
  leadPointId: "p1",
  primary: component({
    id: "answer",
    type: "evidence_stack",
    title: "Why booking paths fail",
    titlePointId: "p1",
    items: [
      item("p2", "Custom wrappers leave coverage incomplete"),
      item("p3", "Browser automation breaks on layout changes"),
      item("p1", "No thin tool definitions on business sites"),
    ],
  }),
  supporting: [
    component({ id: "fix", title: "The native interface", body: "Adoption on the business side is the missing piece.", bodyPointId: "p1" }),
    component({ id: "protocol", body: "MCP already standardizes how tools are described.", bodyPointId: "p4" }),
  ],
});

test("prose that restates a claim a higher slot owns is cleared", () => {
  const raw = restaurant();
  const doc = enforcePointOwnership(raw);

  assert.equal(doc.title, raw.title);
  assert.equal(doc.lead, "");
  assert.equal(doc.primary.title, "");
  assert.equal(doc.supporting[0].body, "");
  // An untagged label is left alone.
  assert.equal(doc.supporting[0].title, "The native interface");
  assert.equal(doc.supporting[1].body, "MCP already standardizes how tools are described.");
  // The model output itself is never mutated.
  assert.equal(raw.lead, "Karthik points to a missing interface layer.");
});

test("items and options are never removed, even under a point already placed", () => {
  const doc = enforcePointOwnership(restaurant());
  assert.deepEqual(doc.primary.items.map((entry) => entry.pointId), ["p2", "p3", "p1"]);

  const sharedTopic = enforcePointOwnership({
    title: "Manual setup keeps agents from new tools",
    titlePointId: "p1",
    lead: "Runtime discovery is the fix.",
    leadPointId: "p2",
    primary: component({
      items: [item("p1", "Users install servers by hand"), item("p1", "Every tool needs its own JSON config")],
      options: [{ label: "Visit a URL", summary: "Discovery at runtime", detail: "", pointId: "p1", assetId: "" }],
    }),
    supporting: [],
  });
  assert.equal(sharedTopic.primary.items.length, 2);
  assert.equal(sharedTopic.primary.options.length, 1);
  assert.equal(sharedTopic.lead, "Runtime discovery is the fix.");
});

test("items outrank the body that repeats them, and supporting copy outranks the lead", () => {
  const doc = enforcePointOwnership({
    title: "Karthik started BuildPurdue to gather student founders",
    titlePointId: "p1",
    lead: "Founders were scattered and uncelebrated.",
    leadPointId: "p3",
    primary: component({
      body: "Founders were isolated across campus.",
      bodyPointId: "p2",
      items: [item("p2", "Founders were isolated"), item("p4", "Wins went uncelebrated")],
    }),
    supporting: [component({ body: "Nobody tracked ventures until graduation.", bodyPointId: "p3" })],
  });

  assert.equal(doc.primary.body, "");
  assert.equal(doc.primary.items.length, 2);
  assert.equal(doc.supporting[0].body, "Nobody tracked ventures until graduation.");
  assert.equal(doc.lead, "");
});

test("empty slots never claim a point", () => {
  const doc = enforcePointOwnership({
    title: "Answer",
    titlePointId: "p1",
    lead: "",
    leadPointId: "p2",
    primary: component({ title: "", titlePointId: "p2", items: [item("p3", "A specific fact")] }),
    supporting: [component({ body: "Kept because nothing visible owned p2", bodyPointId: "p2" })],
  });

  assert.equal(doc.supporting[0].body, "Kept because nothing visible owned p2");
});

test("fails open when the model tags nothing, or tags everything with one point", () => {
  const untagged = restaurant();
  untagged.titlePointId = "";
  untagged.leadPointId = "";
  untagged.primary.titlePointId = "";
  untagged.primary.items.forEach((entry) => { entry.pointId = ""; });
  untagged.supporting.forEach((entry) => { entry.bodyPointId = ""; });
  assert.deepEqual(enforcePointOwnership(untagged), untagged);

  const collapsed = restaurant();
  collapsed.primary.items.forEach((entry) => { entry.pointId = "p1"; });
  collapsed.supporting.forEach((entry) => { entry.bodyPointId = "p1"; });
  assert.deepEqual(enforcePointOwnership(collapsed), collapsed);
});

test("never empties the primary answer", () => {
  const raw = {
    title: "Karthik plays piano",
    titlePointId: "p1",
    lead: "He started as a child.",
    leadPointId: "p2",
    primary: component({ body: "Karthik plays piano.", bodyPointId: "p1" }),
    supporting: [],
  };
  assert.deepEqual(enforcePointOwnership(raw), raw);
});

test("the generation schema plans points before any visible copy and tags every slot", () => {
  const { schema } = A2UI_GENERATION_RESPONSE_FORMAT.json_schema;
  const keys = Object.keys(schema.properties);
  assert.ok(keys.indexOf("points") < keys.indexOf("title"));
  assert.ok(keys.indexOf("quotes") < keys.indexOf("primary"));
  for (const field of ["points", "titlePointId", "leadPointId"]) assert.ok(schema.required.includes(field));
  assert.ok(schema.$defs.item.required.includes("pointId"));
  assert.ok(schema.$defs.option.required.includes("pointId"));
  assert.ok(schema.$defs.component.required.includes("titlePointId"));
  assert.ok(schema.$defs.component.required.includes("bodyPointId"));
  for (const [name, def] of Object.entries(schema.$defs)) {
    assert.deepEqual(Object.keys(def.properties).sort(), [...def.required].sort(), `${name} requires every property`);
  }
});

test("the generation schema carries no array bounds, which Gemini rejects alongside point fields", () => {
  const json = JSON.stringify(A2UI_GENERATION_RESPONSE_FORMAT);
  assert.doesNotMatch(json, /"(minItems|maxItems)"/);
});
