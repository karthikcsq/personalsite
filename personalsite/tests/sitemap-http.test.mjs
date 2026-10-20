import assert from 'node:assert/strict';
import test from 'node:test';

const base = process.env.SEO_BASE_URL;

// Run against the built site: SEO_BASE_URL=http://127.0.0.1:3109 node --test tests/sitemap-http.test.mjs
// Skip in the ordinary unit suite, which does not start a server.
test('sitemap lists only final, self-canonical HTML pages', { skip: !base }, async () => {
  const xmlResponse = await fetch(`${base}/sitemap.xml`);
  assert.equal(xmlResponse.status, 200);
  const urls = [...(await xmlResponse.text()).matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].replaceAll('&amp;', '&'));
  assert.ok(urls.length > 0);
  assert.equal(new Set(urls).size, urls.length, 'no duplicate sitemap entries');

  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://www.karthikthyagarajan.com');
    assert.equal(parsed.search, '', `${url} is query state, not a separate canonical page`);
    assert.equal(parsed.hash, '');
    assert.ok(!/\/(raw|content|page|embed)(\/|$)|^\/api\//.test(parsed.pathname), `${url} is not a canonical HTML page`);
    assert.ok(parsed.pathname === '/' || !parsed.pathname.endsWith('/'), `${url} has a duplicate trailing slash`);
    const response = await fetch(new URL(parsed.pathname, base), { redirect: 'manual' });
    assert.equal(response.status, 200, `${url} must not redirect`);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html/, `${url} must be HTML`);
    const html = await response.text();
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    assert.ok(canonical, `${url} must have a canonical`);
    assert.equal(new URL(canonical).href, url, `${url} must have its own canonical`);
  }

  const root = await fetch(base, { redirect: 'manual' });
  assert.equal(root.status, 200);
  assert.match(root.headers.get('content-type') ?? '', /^text\/html/, 'bare fetch of / must serve HTML');
  for (const agent of ['Googlebot', 'GPTBot']) {
    const response = await fetch(base, { headers: { 'User-Agent': agent } });
    assert.match(response.headers.get('content-type') ?? '', /^text\/html/, `${agent} gets HTML at the canonical root`);
  }
  for (const section of ['work', 'projects', 'involvement', 'writing']) {
    const response = await fetch(`${base}/?section=${section}`, { redirect: 'manual' });
    assert.equal(response.status, 308, `${section} query links redirect to clean section paths`);
    assert.equal(response.headers.get('location'), `/${section}`);
    assert.ok(urls.includes(`https://www.karthikthyagarajan.com/${section}`));
  }
  for (const sectionPath of ['/blog', '/notes']) {
    const response = await fetch(`${base}${sectionPath}`, { redirect: 'manual' });
    assert.equal(response.status, 308, `${sectionPath} is a redirect and must not be in the sitemap`);
    assert.ok(!urls.includes(`https://www.karthikthyagarajan.com${sectionPath}`));
  }
  const raw = await fetch(`${base}/notes/project/caladrius/raw`);
  assert.match(raw.headers.get('x-robots-tag') ?? '', /noindex/);
  assert.ok(!urls.includes('https://www.karthikthyagarajan.com/notes/project/caladrius/raw'));
  const index = await fetch(`${base}/llms.txt`);
  assert.equal(index.status, 200, 'agent index remains reachable at its explicit URL');
  assert.match(index.headers.get('content-type') ?? '', /^text\/plain/);
});
