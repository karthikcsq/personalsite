import test from "node:test";
import assert from "node:assert/strict";
import { corpusItemHref, corpusSectionHref, corpusSectionFromPath } from "../src/lib/living-corpus/links.ts";

test("section URLs round-trip through clean paths", () => {
  for (const category of ["work", "projects", "writing", "involvement"]) {
    assert.equal(corpusSectionHref(category), `/${category}`);
    assert.equal(corpusSectionFromPath(`/${category}`), category);
  }
  for (const path of ["/", "/about", "/blog/an-essay", "/projects-extra"]) {
    assert.equal(corpusSectionFromPath(path), null);
  }
});

test("item URLs keep identity encoded without a section query", () => {
  const url = new URL(corpusItemHref("projects", "project:tavi"), "https://example.com");
  assert.equal(url.pathname, "/projects");
  assert.equal(url.searchParams.get("item"), "project:tavi");
  assert.equal(url.searchParams.has("section"), false);
});
