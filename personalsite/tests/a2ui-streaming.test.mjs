import test from 'node:test';
import assert from 'node:assert/strict';
import { readA2UIStream, readCompletedA2UI, stablePresentationSeed, withSettledProse } from '../src/a2ui/streaming.ts';

const items = [
  { label: 'One', value: 'First fact', detail: 'nested [value]', artifactId: 'project:a', assetId: '' },
  { label: 'Two', value: 'Second "quoted"', detail: 'a slash \\ and braces { }', artifactId: '', assetId: '' },
  { label: 'Three', value: 'Unicode 🌿', detail: '', artifactId: '', assetId: '' },
];
const primary = { id: 'primary', type: 'narrative', title: 'Primary', body: 'A quote: "braces { and }" and a slash \\', items, options: [], artifactIds: ['project:a'], quoteIds: [] };
const supporting = [{ id: 'a', type: 'narrative', body: 'Unicode 🌿 and an escaped "quote"', items: [] }, { id: 'b', type: 'narrative', body: 'Second component', items: [] }];
const doc = { version: '1.0', question: 'Question', title: 'Title', lead: 'Lead', compositionOptions: ['stacked'], primary, supporting, actions: [] };
const json = JSON.stringify(doc);

/** Every field a partial exposes must already equal its finished value. */
function assertNothingPartial(parsed) {
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'primary' || key === 'supporting') continue;
    assert.deepEqual(value, doc[key], `${key} was published before it closed`);
  }
  const streamedPrimary = parsed.primary;
  for (const [key, value] of Object.entries(streamedPrimary)) {
    if (key === 'items') continue;
    assert.deepEqual(value, primary[key], `primary.${key} was published before it closed`);
  }
  const streamedItems = streamedPrimary.items ?? [];
  assert.deepEqual(streamedItems, items.slice(0, streamedItems.length));
  parsed.supporting.forEach((component, index) => {
    for (const [key, value] of Object.entries(component)) {
      if (key === 'items') continue;
      assert.deepEqual(value, supporting[index][key], `supporting[${index}].${key} was partial`);
    }
  });
}

test('progress reports which components can still change', () => {
  const at = (marker) => readA2UIStream(marker === undefined ? json : json.slice(0, json.indexOf(marker))).progress;
  assert.deepEqual(at('"options"'), { primaryOpen: true, lastSupportingOpen: false, supportingOpen: true, actionsOpen: true });
  assert.deepEqual(at('"items":[]},{"id":"b"'), { primaryOpen: false, lastSupportingOpen: true, supportingOpen: true, actionsOpen: true });
  assert.deepEqual(at('{"id":"b"'), { primaryOpen: false, lastSupportingOpen: false, supportingOpen: true, actionsOpen: true });
  assert.deepEqual(at('"actions"'), { primaryOpen: false, lastSupportingOpen: false, supportingOpen: false, actionsOpen: true });
  assert.deepEqual(at(), { primaryOpen: false, lastSupportingOpen: false, supportingOpen: false, actionsOpen: false });
});

test('prose waits until nothing that outranks it can still arrive', () => {
  const component = (over = {}) => ({ id: 'c', type: 'evidence_stack', title: 'Title', body: 'Body', items: [], options: [], artifactIds: [], quoteIds: [], ...over });
  const sanitized = { version: '1.0', question: 'Q', title: 'Answer', lead: 'Lead', compositionOptions: [], primary: component({ items: [{ label: 'L', value: 'V', detail: '', artifactId: '', assetId: '' }] }), supporting: [component({ id: 's0' }), component({ id: 's1' })], actions: [] };
  const closed = { primaryOpen: false, lastSupportingOpen: false, supportingOpen: false, actionsOpen: false };

  const writingPrimary = withSettledProse(sanitized, { ...closed, primaryOpen: true, supportingOpen: true, actionsOpen: true });
  assert.equal(writingPrimary.title, 'Answer');
  assert.equal(writingPrimary.lead, '');
  assert.deepEqual([writingPrimary.primary.title, writingPrimary.primary.body], ['', '']);
  assert.equal(writingPrimary.primary.items.length, 1, 'items are never held back');

  const writingSupport = withSettledProse(sanitized, { ...closed, lastSupportingOpen: true, supportingOpen: true, actionsOpen: true });
  assert.equal(writingSupport.primary.body, 'Body');
  assert.equal(writingSupport.supporting[0].body, 'Body');
  assert.deepEqual([writingSupport.supporting[1].title, writingSupport.supporting[1].body], ['', '']);
  assert.equal(writingSupport.lead, '');

  const writingActions = { ...closed, actionsOpen: true };
  assert.equal(withSettledProse(sanitized, writingActions).lead, 'Lead');

  // A bare narrative becomes a link card once an action names its section.
  const bare = { ...sanitized, primary: component({ type: 'narrative' }) };
  assert.equal(withSettledProse(bare, writingActions).primary.body, '');
  assert.equal(withSettledProse(bare, closed).primary.body, 'Body');
  const linked = { ...sanitized, primary: component({ type: 'narrative', body: 'See [his work](/work).' }) };
  assert.equal(withSettledProse(linked, writingActions).primary.body, 'See [his work](/work).');
});

test('a completed item is placed before the component around it closes', () => {
  const primaryEnd = json.indexOf(',"supporting"');
  const firstItemEnd = json.indexOf('},{"label":"Two"') + 1;
  const early = readCompletedA2UI(json.slice(0, firstItemEnd));
  assert.deepEqual(early.primary.items, [items[0]]);
  assert.ok(firstItemEnd < primaryEnd, 'the primary is still open at that point');
  assert.equal(early.primary.artifactIds, undefined, 'nothing after the open array is guessed');
  assert.deepEqual(readCompletedA2UI(json.slice(0, primaryEnd)).primary, primary);
});

test('no partially written value ever reaches the UI at any character boundary', () => {
  for (let n = 0; n < json.length; n++) {
    const parsed = readCompletedA2UI(json.slice(0, n));
    if (!parsed) continue;
    assertNothingPartial(parsed);
  }
  assert.deepEqual(readCompletedA2UI(json), doc);
});

test('all streaming chunk sizes produce a growing prefix, never a shrinking one', () => {
  for (const size of [1, 2, 3, 7, 31, 128]) {
    let buffer = '';
    let seenItems = 0;
    let seenSupporting = 0;
    for (let n = 0; n < json.length; n += size) {
      buffer += json.slice(n, n + size);
      const parsed = readCompletedA2UI(buffer);
      if (!parsed) continue;
      assertNothingPartial(parsed);
      const itemCount = (parsed.primary.items ?? []).length;
      assert.ok(itemCount >= seenItems, 'items never disappear');
      assert.ok(parsed.supporting.length >= seenSupporting, 'components never disappear');
      seenItems = itemCount;
      seenSupporting = parsed.supporting.length;
    }
    assert.equal(seenItems, items.length);
    assert.equal(seenSupporting, supporting.length);
  }
});

test('an item is invisible until its own object closes', () => {
  const secondItemStart = json.indexOf('{"label":"Two"');
  for (let n = secondItemStart; n < json.indexOf('},{"label":"Three"') + 1; n++) {
    const parsed = readCompletedA2UI(json.slice(0, n));
    if (!parsed) continue;
    assert.equal((parsed.primary.items ?? []).length, 1);
  }
});

test('malformed input, untyped components and resource limits fail closed', () => {
  for (const text of ['', 'not json', '{"primary": [}', '{"primary": "incomplete', '{"primary": null}', '{"primary": {"id": "no-type-yet"', ' '.repeat(100_001)]) {
    assert.equal(readCompletedA2UI(text), null);
  }
  assert.equal(readCompletedA2UI('{"__proto__":{"polluted":true},"primary":{}}').polluted, undefined);
  assert.equal(readCompletedA2UI('{"primary":{"type":"narrative","__proto__":{"polluted":true}').polluted, undefined);
  assert.equal({}.polluted, undefined);
});

test('presentation seed is allocated once and preserved through all updates including zero', () => {
  let calls = 0; const create = () => ++calls;
  assert.equal(stablePresentationSeed(undefined, create), 1);
  assert.equal(stablePresentationSeed(1, create), 1);
  assert.equal(stablePresentationSeed(0, create), 0);
  assert.equal(calls, 1);
});
