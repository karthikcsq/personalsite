import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sitemapSource = readFileSync(path.join(process.cwd(), 'src/app/sitemap.ts'), 'utf8');

test('sitemap does not publish query-state variants of the homepage', () => {
  assert.doesNotMatch(sitemapSource, /url:\s*`[^`]*\?section=[^`]*`/);
});
