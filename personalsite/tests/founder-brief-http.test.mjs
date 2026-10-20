import assert from 'node:assert/strict';
import test from 'node:test';

const base = process.env.SEO_BASE_URL;

test('first responses carry the startup brief without JavaScript or follow-up requests', { skip: !base }, async () => {
  for (const path of ['/', '/about', '/llms.txt', '/llms-full.txt']) {
    const response = await fetch(new URL(path, base));
    assert.equal(response.status, 200, path);
    const body = await response.text();
    assert.match(body, /For startups and founding teams/, path);
    assert.match(body, /95% signal suppression/, path);
    assert.match(body, /Co-founder who ships and thinks about distribution/, path);
    if (path.endsWith('.txt')) {
      assert.ok(body.indexOf('For startups and founding teams') < body.indexOf('## Portfolio index'));
    } else {
      // Simulate a reader that drops scripts, including JSON-LD and the inline
      // Markdown. The brief must still exist as ordinary HTML in response one.
      const html = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      assert.match(html, /95% signal suppression/);
      assert.match(html, /<section hidden="" data-founder-brief=""/);
      for (const href of [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1])) {
        if (!href.startsWith('/notes/')) continue;
        const source = await fetch(new URL(href.replaceAll('&amp;', '&'), base));
        assert.equal(source.status, 200, `source ${href}`);
      }
    }
  }
});

test('readable brief is discoverable and Markdown is explicitly negotiated', { skip: !base }, async () => {
  const about = await (await fetch(`${base}/about`)).text();
  assert.match(about, /href="\/brief"[^>]*>For founders and hiring teams/);
  const page = await (await fetch(`${base}/brief`)).text();
  const visible = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.match(visible, /<section data-founder-brief=""/);
  assert.match(visible, /95% signal suppression/);
  for (const path of ['/', '/about', '/brief']) {
    for (const accept of ['text/markdown', 'text/html;q=0.5, text/markdown;q=0.9']) {
      const response = await fetch(`${base}${path}`, { headers: { accept } });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^text\/markdown/);
      assert.match(response.headers.get('vary'), /Accept/);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.match(await response.text(), /Co-founder who ships and thinks about distribution/);
    }
    for (const accept of ['*/*', 'text/html', 'text/markdown;q=0', 'text/html, text/markdown;q=0.5']) {
      const response = await fetch(`${base}${path}`, { headers: { accept, 'User-Agent': 'GPTBot' } });
      assert.match(response.headers.get('content-type'), /^text\/html/);
      assert.match(response.headers.get('vary'), /Accept/);
    }
  }
});
