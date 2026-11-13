// Captures each essay (and the "What I'm looking for" note) as it appears on
// the site: its title and opening, cropped to 3:2. Needs the site running on
// http://127.0.0.1:3123.
//   node design/real/pages.mjs
import { chromium } from "/home/karth/.local/lib/node_modules/gradescope-playwright-cli/node_modules/playwright/index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/projects");
const PAGES = {
  "owl-and-sparrows": "/blog/the-owl-and-the-sparrows",
  "stability-in-the-age-of-ai": "/blog/stability-in-the-age-of-ai",
  "ai-company": "/blog/the-ai-company-id-love-to-create",
  "future-of-work": "/blog/future-of-ai-work",
  "what-im-looking-for": "/notes/topic/what-im-looking-for",
};
const browser = await chromium.launch({ executablePath: "/home/karth/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
for (const [name, url] of Object.entries(PAGES)) {
  await page.goto(`http://127.0.0.1:3123${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  // Frame the title and what follows it: 3:2, starting just above the heading.
  const box = await page.locator("h1").first().boundingBox();
  const width = 900;
  const x = Math.max(0, Math.min(box.x - 60, 1280 - width));
  const y = Math.max(0, box.y - 70);
  await page.screenshot({ path: path.join(out, `${name}.png`), clip: { x, y, width, height: width / 1.5 } });
  console.log("captured", name, url);
}
await browser.close();
