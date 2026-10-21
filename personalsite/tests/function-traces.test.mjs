import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

// Run after next build with CHECK_FUNCTION_TRACES=1. Check emitted artifacts,
// not config text: regressions can otherwise silently omit runtime content.
test('built content functions retain corpus without unrelated static assets', {
  skip: process.env.CHECK_FUNCTION_TRACES !== '1',
}, () => {
  const docs = path.resolve(root, '../python-rag/rag-docs');
  const required = [
    ...fs.readdirSync(path.join(docs, 'corpus')).filter(f => f.endsWith('.md')).map(f => path.join(docs, 'corpus', f)),
    ...['karthik_thyagarajan_truth.yaml', 'involvement.yaml', 'topics.yaml'].map(f => path.join(docs, f)),
  ];
  for (const route of ['api/living-corpus/attend/route', 'api/living-corpus/what-broke/route', 'api/living-corpus/journey/route', 'notes/[kind]/[slug]/raw/route', 'api/gallery/route']) {
    const trace = path.join(root, '.next/server/app', route + '.js.nft.json');
    const files = JSON.parse(fs.readFileSync(trace, 'utf8')).files.map(f => path.resolve(path.dirname(trace), f));
    for (const file of required) assert.ok(files.includes(file), `${route} missing ${file}`);
    for (const file of files) {
      assert.ok(fs.existsSync(file), `missing traced file ${file}`);
      assert.ok(!file.startsWith(path.join(root, 'design') + path.sep));
      assert.ok(!file.startsWith(path.join(root, 'public') + path.sep));
      assert.notEqual(file, path.join(root, 'src/data/bm25-model.json'));
    }
  }
});
