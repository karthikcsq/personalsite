import test from "node:test";
import assert from "node:assert/strict";
import { buildRssFeed } from "../src/utils/rss.ts";

test("RSS escapes authored text, orders posts newest first, and uses canonical stable URLs", () => {
  const posts = [
    { slug: "older", title: "Older", date: "2025-01-01" },
    { slug: "latest", title: 'AI & <work> "now"', date: "2026-05-09", summary: "Karthik's ideas & more" },
  ];
  const xml = buildRssFeed(posts);
  assert.ok(xml.indexOf("/blog/latest") < xml.indexOf("/blog/older"));
  assert.match(xml, /AI &amp; &lt;work&gt; &quot;now&quot;/);
  assert.match(xml, /Karthik&apos;s ideas &amp; more/);
  assert.match(xml, /<guid isPermaLink="true">https:\/\/www.karthikthyagarajan.com\/blog\/latest<\/guid>/);
  assert.match(xml, /<pubDate>Sat, 09 May 2026 00:00:00 GMT<\/pubDate>/);
  assert.equal(posts[0].slug, "older");
});

test("an empty blog still has a discoverable RSS channel without invalid dates", () => {
  const xml = buildRssFeed([]);
  assert.match(xml, /<rss version="2.0"/);
  assert.match(xml, /rel="self" type="application\/rss\+xml"/);
  assert.doesNotMatch(xml, /<item>|Invalid Date|<lastBuildDate>/);
});
