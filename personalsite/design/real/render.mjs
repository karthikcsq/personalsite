// Renders Repple's transition image from its App Store screenshots (PARM's
// figures are in parm-diagrams.mjs). Output: public/projects/*.png (then converted to WebP).
//
//   node design/real/render.mjs
import { chromium } from "/home/karth/.local/lib/node_modules/gradescope-playwright-cli/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../public/projects");
fs.mkdirSync(out, { recursive: true });
const dataUri = (file) => `data:image/jpeg;base64,${fs.readFileSync(path.join(here, file)).toString("base64")}`;

const base = `
<link href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 800px; font-family: Karla, sans-serif; color: #171719; background: #fbf8f6; padding: 64px 84px; display: flex; flex-direction: column; justify-content: center; }
  .kicker { font-size: 20px; letter-spacing: .14em; text-transform: uppercase; color: #8a7f86; font-weight: 600; }
  h1 { font-size: 46px; font-weight: 600; letter-spacing: -.02em; margin: 10px 0 40px; line-height: 1.12; }
  .muted { color: #8a7f86; }
</style>`;

const PAGES = {
  repple: `${base}
<style>
  body { padding: 0; display: flex; align-items: center; justify-content: center; gap: 34px; background: linear-gradient(160deg, #fbf3ee, #efe7f4); }
  img { height: 700px; border-radius: 34px; box-shadow: 0 30px 60px -28px rgba(60, 30, 50, .5); }
  img:nth-child(2) { height: 740px; }
</style>
<img src="${dataUri("repple-matchup-chat.jpg")}"><img src="${dataUri("repple-home-page.jpg")}"><img src="${dataUri("repple-spin-the-slots.jpg")}">`,
};

const browser = await chromium.launch({ executablePath: "/home/karth/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
for (const [name, html] of Object.entries(PAGES)) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log("rendered", name);
}
await browser.close();
