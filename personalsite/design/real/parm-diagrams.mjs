// PARM's technical figures, redrawn from its own docs (README and
// docs/architecture.md): the evaluation pipeline, the deterministic retrieval
// waterfall, and the causal triplet. Hand-placed SVG so each fits a 1200x800
// frame with readable labels. Output: public/projects/parm-*.png
//   node design/real/parm-diagrams.mjs
import { chromium } from "/home/karth/.local/lib/node_modules/gradescope-playwright-cli/node_modules/playwright/index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/projects");

const INK = "#1d1e22";
const SUB = "#6b6e76";
const LINE = "#3a3c43";
const ACCENT = "#c2603f";
const ACCENT_FILL = "#fff4ee";

const esc = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A box with a title line and optional smaller lines under it. */
function box(n) {
  const { x, y, w, h, title, sub = [], key = false, store = false } = n;
  const lines = [title, ...sub];
  const top = y + h / 2 - ((lines.length - 1) * 18) / 2 + 5;
  const text = lines
    .map(
      (line, i) =>
        `<text x="${x + w / 2}" y="${top + i * 18}" text-anchor="middle" font-size="${i === 0 ? 15 : 12.5}" fill="${i === 0 ? INK : SUB}" font-weight="${i === 0 ? 500 : 400}">${esc(line)}</text>`,
    )
    .join("");
  if (store) {
    // A cylinder, for files on disk.
    return `<path d="M${x},${y + 8} v${h - 16} a${w / 2},8 0 0 0 ${w},0 v${-(h - 16)}" fill="#fff" stroke="${LINE}" stroke-width="1.3"/>
      <ellipse cx="${x + w / 2}" cy="${y + 8}" rx="${w / 2}" ry="8" fill="#fff" stroke="${LINE}" stroke-width="1.3"/>${text}`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${key ? ACCENT_FILL : "#fff"}" stroke="${key ? ACCENT : LINE}" stroke-width="${key ? 1.8 : 1.3}"/>${text}`;
}

const port = (n, side) =>
  ({
    r: [n.x + n.w, n.y + n.h / 2],
    l: [n.x, n.y + n.h / 2],
    t: [n.x + n.w / 2, n.y],
    b: [n.x + n.w / 2, n.y + n.h],
  })[side];

/** An orthogonal arrow from one box side to another, through optional bends. */
function arrow(a, as, b, bs, { via = [], label = "", dashed = false, from = null, to = null, head = true, labelAt = null } = {}) {
  const start = from ?? port(a, as);
  const end = to ?? port(b, bs);
  let points = [start, ...via];
  if (!via.length) {
    if ((as === "r" && bs === "l") || (as === "l" && bs === "r")) {
      const mx = (start[0] + end[0]) / 2;
      if (start[1] !== end[1]) points.push([mx, start[1]], [mx, end[1]]);
    } else if ((as === "b" && bs === "t") || (as === "t" && bs === "b")) {
      const my = (start[1] + end[1]) / 2;
      if (start[0] !== end[0]) points.push([start[0], my], [end[0], my]);
    } else if (as === "r" || as === "l") points.push([end[0], start[1]]);
    else points.push([start[0], end[1]]);
  }
  points.push(end);
  const d = points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const mid = labelAt ?? [points[Math.floor(points.length / 2)][0] + 6, points[Math.floor(points.length / 2)][1] - 6];
  const tag = label ? `<text x="${mid[0]}" y="${mid[1]}" font-size="12" fill="${SUB}">${esc(label)}</text>` : "";
  return `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="1.3" ${dashed ? 'stroke-dasharray="5 4"' : ""} ${head ? 'marker-end="url(#head)"' : ""}/>${tag}`;
}

const frame = (title, body, note = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" font-family="IBM Plex Mono, monospace">
  <defs>
    <marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${LINE}"/></marker>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0 H0 V24" fill="none" stroke="#f0f1f3" stroke-width="1"/></pattern>
  </defs>
  <rect width="1200" height="800" fill="#fff"/><rect width="1200" height="800" fill="url(#grid)"/>
  <text x="40" y="48" font-size="16" fill="${SUB}">PARM · ${esc(title)}</text>
  ${body}
  ${note ? `<text x="40" y="772" font-size="12.5" fill="${SUB}">${esc(note)}</text>` : ""}
</svg>`;

// ---- fig. 1: end-to-end evaluation pipeline --------------------------------
function pipeline() {
  const W = 190;
  const H = 62;
  const col = (i) => 40 + i * 228;
  const row = (i) => 100 + i * 162;
  const N = {
    corpus: { x: col(0), y: row(0), w: W, h: H, title: "Tracked source", sub: ["corpus"] },
    index: { x: col(1), y: row(0), w: W, h: H, title: "Frozen retrieval", sub: ["index · pages, chunks,", "links, embeddings"] },
    resource: { x: col(2), y: row(0), w: W, h: H, title: "Retrieval resource" },
    cands: { x: col(3), y: row(0), w: W, h: H, title: "Retrieved", sub: ["candidates"] },
    admit: { x: col(4), y: row(0), w: W, h: H, title: "Admission policy", sub: ["per condition"], key: true },
    caseN: { x: col(0), y: row(1), w: W, h: H, title: "Benchmark case", sub: ["prompt + large", "observation"] },
    loader: { x: col(1), y: row(1), w: W, h: H, title: "Dataset loader", sub: ["+ validator"] },
    policy: { x: col(2), y: row(1), w: W, h: H, title: "Baseline policy", sub: ["when / why retrieval", "runs"] },
    config: { x: col(3), y: row(1) + 3, w: W, h: 56, title: "run config sidecar", store: true },
    handoff: { x: col(4), y: row(1), w: W, h: H, title: "Memory handoff", sub: ["triggering output", "+ evidence"], key: true },
    request: { x: col(2), y: row(2), w: W, h: H, title: "Response-model", sub: ["request"] },
    label: { x: col(3), y: row(2), w: W, h: H, title: "One visible label" },
    scorer: { x: col(4), y: row(2), w: W, h: H, title: "Deterministic", sub: ["scorer"], key: true },
    preds: { x: col(3), y: row(3), w: W, h: 56, title: "predictions.jsonl", store: true },
    metrics: { x: col(4), y: row(3), w: W, h: 56, title: "metrics.json", store: true },
  };
  const below = row(2) + H;
  const edges = [
    arrow(N.corpus, "r", N.index, "l"),
    arrow(N.index, "r", N.resource, "l"),
    arrow(N.resource, "r", N.cands, "l"),
    arrow(N.cands, "r", N.admit, "l"),
    arrow(N.admit, "b", N.handoff, "t"),
    arrow(N.caseN, "r", N.loader, "l"),
    arrow(N.loader, "r", N.policy, "l"),
    arrow(N.policy, "t", N.resource, "b", { label: "query + trigger", labelAt: [col(2) + W / 2 - 132, row(0) + H + 52] }),
    arrow(N.policy, "r", N.config, "l"),
    // The case's prompt and observation go straight to the response model.
    arrow(N.caseN, "b", N.request, "l", { via: [[col(0) + W / 2, row(2) + H / 2]], label: "prompt + observation", labelAt: [col(0) + W / 2 + 10, row(2) + H / 2 - 8] }),
    arrow(N.handoff, "b", N.request, "t", {
      from: [col(4) + W / 2, row(1) + H],
      via: [[col(4) + W / 2, row(2) - 34], [col(2) + W / 2 + 40, row(2) - 34]],
      to: [col(2) + W / 2 + 40, row(2)],
      label: "admitted memory",
      labelAt: [col(3) + 10, row(2) - 42],
    }),
    arrow(N.request, "r", N.label, "l"),
    arrow(N.label, "r", N.scorer, "l"),
    // Gold sources from the dataset, to score the retrieval trace.
    arrow(N.loader, "b", N.scorer, "r", {
      via: [[col(1) + W / 2, below + 26], [col(4) + W + 22, below + 26], [col(4) + W + 22, row(2) + H / 2]],
      to: [col(4) + W, row(2) + H / 2],
      dashed: true,
      label: "gold sources",
      labelAt: [col(1) + W / 2 + 10, below + 18],
    }),
    arrow(N.scorer, "b", N.preds, "t", {
      from: [col(4) + 40, below],
      via: [[col(4) + 40, row(3) - 22], [col(3) + W / 2, row(3) - 22]],
      to: [col(3) + W / 2, row(3)],
    }),
    arrow(N.scorer, "b", N.metrics, "t", { from: [col(4) + W - 50, below], via: [], to: [col(4) + W - 50, row(3)] }),
  ];
  return frame(
    "fig. 1 — end-to-end evaluation pipeline",
    edges.join("") + Object.values(N).map(box).join(""),
    "The frozen index is neutral; each baseline supplies when retrieval runs and what is admitted, over the same memory substrate.",
  );
}

// ---- fig. 2: deterministic retrieval waterfall -----------------------------
function retrieval() {
  const H = 64;
  const W = 182;
  const laneY = [150, 330, 510];
  // (lanes: channel 1 top, 2 middle, 3 bottom)
  const obs = { x: 40, y: 300, w: 140, h: H + 26, title: "Large", sub: ["observation"] };
  const split = { x: 205, y: 300, w: 150, h: H + 26, title: "Split into", sub: ["listings /", "semantic blocks"] };
  const cx = (i) => 395 + i * 205;
  const lanes = [
    {
      name: "entity graph",
      steps: [
        ["Store-backed entity", "surfaces → graph", "candidates"],
        ["Region cosine +", "rare-lexical", "tie-break"],
        ["Best graph-linked", "durable page", "per region"],
      ],
    },
    {
      name: "semantic",
      steps: [
        ["Task anchors +", "rare concepts", "→ queries"],
        ["Frozen sentence", "cosine"],
        ["Review / reflection", "convergence rules"],
      ],
    },
    {
      name: "lexical",
      steps: [
        ["Full-region text", "BM25 vs durable", "notes"],
        ["Best page must", "beat runner-up", "page"],
        ["Best region must", "beat runner-up", "region"],
      ],
    },
  ];
  let body = "";
  const ends = [];
  lanes.forEach((lane, li) => {
    const y = laneY[li];
    body += `<rect x="380" y="${y - 34}" width="${3 * 205 + 10}" height="${H + 50}" fill="none" stroke="#c9cbd1" stroke-dasharray="3 4"/>`;
    body += `<text x="390" y="${y - 14}" font-size="12.5" fill="${SUB}">channel ${li + 1} · ${lane.name}</text>`;
    const nodes = lane.steps.map(([title, ...sub], si) => ({ x: cx(si), y: y - 2, w: W, h: H, title, sub }));
    body += arrow(split, "r", nodes[0], "l", { via: [[367, split.y + split.h / 2], [367, y - 2 + H / 2]] });
    for (let i = 1; i < nodes.length; i += 1) body += arrow(nodes[i - 1], "r", nodes[i], "l");
    body += nodes.map(box).join("");
    ends.push(nodes[nodes.length - 1]);
  });
  const merge = { x: 1018, y: laneY[1] - 2, w: 150, h: H, title: "Priority merge", sub: ["+ page dedup"], key: true };
  const topk = { x: 1018, y: 452, w: 150, h: H, title: "≤ top-k", sub: ["admitted", "(zero allowed)"], key: true };
  const evidence = { x: 1018, y: 562, w: 150, h: H, title: "Evidence", sub: ["projection"] };
  const handoff = { x: 1018, y: 672, w: 150, h: H, title: "Trigger region", sub: ["+ focused", "memory evidence"], key: true };
  // Channels 1 and 3 run into a junction on channel 2's line into the merge.
  const joinX = 1000;
  const joinY = merge.y + merge.h / 2;
  [ends[0], ends[2]].forEach((end) => {
    body += arrow(end, "r", merge, "l", { via: [[joinX, end.y + end.h / 2]], to: [joinX, joinY], head: false });
  });
  body += arrow(ends[1], "r", merge, "l");
  body += `<circle cx="${joinX}" cy="${joinY}" r="3.5" fill="${LINE}"/>`;
  body += arrow(merge, "b", topk, "t");
  body += arrow(topk, "b", evidence, "t");
  body += arrow(evidence, "b", handoff, "t");
  body += arrow(obs, "r", split, "l");
  body += [obs, split, merge, topk, evidence, handoff].map(box).join("");
  return frame(
    "fig. 2 — PARM retrieval waterfall (deterministic)",
    body,
    "Three cheap views of the observation; a durable page is admitted only when its channel's rule supports it. Admitting nothing is a valid result.",
  );
}

// ---- fig. 3: causal triplet as a timing diagram ----------------------------
function triplet() {
  const cols = ["prompt", "tool steps t₁ … tₙ₋₁", "late observation tₙ", "memory admission", "governed action", "verifier expects"];
  const colX = [180, 330, 520, 700, 870, 1030];
  const colW = [130, 170, 160, 150, 140, 140];
  const rows = [
    {
      name: "positive",
      cells: [["request"], ["ordinary", "tool calls"], ["contains the", "decisive cue ●"], ["retrieve m*", "before acting"], ["memory-", "conditioned"], ["m* admitted", "in time; state ✓"]],
      key: [2, 3],
    },
    {
      name: "cue-ablated",
      cells: [["request"], ["ordinary", "tool calls"], ["cue replaced ○", "rest unchanged"], ["∅ admit", "nothing"], ["output-only", "choice"], ["no admission;", "action unchanged"]],
      key: [3],
    },
    {
      name: "memory-",
      sub: "included",
      cells: [["request", "+ m* in prompt"], ["ordinary", "tool calls"], ["positive", "observation"], ["— not", "needed"], ["memory-", "conditioned"], ["action is", "achievable"]],
      key: [],
    },
  ];
  const rowY = [150, 340, 530];
  let body = "";
  cols.forEach((c, i) => {
    body += `<text x="${colX[i] + colW[i] / 2}" y="112" text-anchor="middle" font-size="12.5" fill="${SUB}">${esc(c)}</text>`;
  });
  // A time axis along the top.
  body += `<path d="M180,124 H1150" stroke="${LINE}" stroke-width="1.1" marker-end="url(#head)"/><text x="1158" y="128" font-size="12" fill="${SUB}">t</text>`;
  rows.forEach((r, ri) => {
    const y = rowY[ri];
    body += `<rect x="30" y="${y - 22}" width="1140" height="128" fill="none" stroke="#c9cbd1" stroke-dasharray="3 4"/>`;
    body += `<text x="44" y="${y + 38}" font-size="15" font-weight="600" fill="${INK}">${esc(r.name)}</text>`;
    if (r.sub) body += `<text x="44" y="${y + 58}" font-size="15" font-weight="600" fill="${INK}">${esc(r.sub)}</text>`;
    const nodes = r.cells.map(([title, ...sub], ci) => ({ x: colX[ci], y: y + 8, w: colW[ci], h: 70, title, sub, key: r.key.includes(ci) }));
    for (let i = 1; i < nodes.length; i += 1) body += arrow(nodes[i - 1], "r", nodes[i], "l");
    body += nodes.map(box).join("");
  });
  return frame(
    "fig. 3 — causal triplet: one scenario, three variants",
    body,
    "A policy passes only if it improves the positive case and preserves the cue-ablated control. m* = the memory the late cue makes actionable.",
  );
}

// ---- overview: the agent lacks a fact, retrieval supplies it, it answers right.
// PARM's worked example (docs/architecture.md, "One case in plain language").
function overview() {
  const big = (n) => {
    const { x, y, w, h, title, sub = [], key = false, ok = false } = n;
    const lines = [title, ...sub];
    const top = y + h / 2 - ((lines.length - 1) * 26) / 2 + 8;
    const text = lines
      .map((entry, i) => {
        const [line, tint] = Array.isArray(entry) ? entry : [entry, null];
        return `<text x="${x + w / 2}" y="${top + i * 26}" text-anchor="middle" font-size="${i === 0 ? 22 : 17}" fill="${tint ?? (i === 0 ? INK : SUB)}" font-weight="${i === 0 || tint ? 600 : 400}">${esc(line)}</text>`;
      })
      .join("");
    const stroke = ok ? "#2f7a55" : key ? ACCENT : LINE;
    const fill = ok ? "#effaf3" : key ? ACCENT_FILL : "#fff";
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${key || ok ? 2.2 : 1.6}"/>${text}`;
  };
  const request = { x: 50, y: 330, w: 250, h: 110, title: "Request", sub: ["“pick one session", "for Amara”"] };
  const agent = { x: 440, y: 315, w: 300, h: 140, title: "Agent", sub: ["doesn't know what", "Amara needs"] };
  const answer = { x: 890, y: 330, w: 260, h: 110, title: "✓ NovaMind session", sub: ["correct choice"], ok: true };
  const tool = { x: 420, y: 95, w: 340, h: 120, title: "Late tool result", sub: ["agenda · 9,000 tokens", ["NovaMind: Texas grid pilot", ACCENT]] };
  const memory = { x: 420, y: 560, w: 340, h: 120, title: "Personal memory", sub: [["“Amara needs grid-pilot", ACCENT], "evidence before investing”"], key: true };
  const line = (d, { dashed = false, color = LINE, width = 2 } = {}) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${dashed ? 'stroke-dasharray="7 6"' : ""} marker-end="url(#bighead)"/>`;
  const label = (x, y, text, color = SUB, anchor = "start") => `<text x="${x}" y="${y}" font-size="17" fill="${color}" text-anchor="${anchor}">${esc(text)}</text>`;
  let body = `<defs>
    <marker id="bighead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${LINE}"/></marker>
    <marker id="accenthead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${ACCENT}"/></marker>
  </defs>`;
  body += line(`M${request.x + request.w},385 H${agent.x}`);
  body += line(`M${agent.x + agent.w},385 H${answer.x}`);
  body += label(agent.x + agent.w + 18, 372, "answers");
  // The tool result arrives late, carrying the cue.
  body += line(`M${tool.x + tool.w / 2},${tool.y + tool.h} V${agent.y}`);
  body += label(tool.x + tool.w / 2 + 14, 270, "the cue arrives late");
  // PARM links the cue to the memory and hands it to the agent.
  body += `<path d="M${memory.x + memory.w / 2},${memory.y} V${agent.y + agent.h}" fill="none" stroke="${ACCENT}" stroke-width="2.6" marker-end="url(#accenthead)"/>`;
  body += label(memory.x + memory.w / 2 + 14, 500, "PARM matches the cue", ACCENT);
  body += label(memory.x + memory.w / 2 + 14, 522, "and retrieves this memory", ACCENT);
  body += label(memory.x + memory.w / 2 + 14, 544, "just before the action", SUB);
  body += [request, agent, answer, tool, memory].map(big).join("");
  return frame(
    "overview — memory only when the task gives a reason",
    body,
    "Without the cue (an unrelated company in that row), PARM admits nothing and the agent keeps its ordinary choice.",
  );
}

const FIGURES = { "parm-fig0-overview": overview(), "parm-fig1-pipeline": pipeline(), "parm-fig2-retrieval": retrieval(), "parm-fig3-triplet": triplet() };

const browser = await chromium.launch({ executablePath: "/home/karth/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
for (const [name, svg] of Object.entries(FIGURES)) {
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><style>html,body{margin:0;width:1200px;height:800px}</style></head><body>${svg}</body></html>`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log("rendered", name);
}
await browser.close();
