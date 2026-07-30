import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_QUERIES = [
  "What does he do at buildpurdue?",
  "Show me his favorite project.",
  "How does Repple keep people consistent?",
  "What is Karthik doing at Samsung Research America?",
  "What did Karthik build at NRL?",
  "How has Karthik's work evolved over time?",
  "What does Karthik think makes an AI agent worth building?",
  "What does Karthik study at Purdue?",
];

const PRICES_PER_MILLION = {
  "gpt-5.6-luna": { input: 1, cached: 0.1, output: 6 },
  "gpt-5.4-mini": { input: 0.75, cached: 0.075, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, cached: 0.02, output: 1.25 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2 },
  "gpt-5-nano": { input: 0.05, cached: 0.005, output: 0.4 },
  "text-embedding-3-small": { input: 0.02, cached: 0, output: 0 },
};

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function integerArg(name, fallback) {
  const value = Number.parseInt(argValue(name, String(fallback)), 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function estimateCost(records = []) {
  let total = 0;
  let priced = true;
  for (const record of records) {
    const price = PRICES_PER_MILLION[record.model];
    if (!price) {
      priced = false;
      continue;
    }
    const cached = record.cachedInputTokens || 0;
    const uncached = Math.max(0, (record.inputTokens || 0) - cached);
    total +=
      (uncached * price.input +
        cached * price.cached +
        (record.outputTokens || 0) * price.output) /
      1_000_000;
  }
  return { usd: total, complete: priced };
}

const baseUrl = argValue(
  "--url",
  process.env.CHAT_BENCHMARK_URL || "http://localhost:3000/api/chat",
);
const outputPath = resolve(
  argValue(
    "--out",
    `design/a2ui-progress/bench-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`,
  ),
);
const warmups = integerArg("--warmups", 0);
const runs = integerArg("--runs", 1);
const queryArg = argValue("--query", "");
const queries = queryArg ? [queryArg] : DEFAULT_QUERIES;
const benchmarkKey = process.env.CHAT_BENCHMARK_KEY;

async function bench(query, run, warmup) {
  const startedAt = new Date().toISOString();
  const t0 = performance.now();
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(benchmarkKey
        ? { "x-chat-benchmark-key": benchmarkKey }
        : {}),
    },
    body: JSON.stringify({ message: query }),
  });

  const row = {
    startedAt,
    query,
    run,
    warmup,
    status: response.status,
    totalMs: 0,
    firstByteMs: 0,
    firstContentMs: 0,
    bytes: 0,
    reply: "",
    artifacts: [],
    a2ui: null,
    timings: null,
    telemetry: null,
    estimatedCost: null,
  };

  if (!response.ok || !response.body) {
    row.totalMs = Math.round(performance.now() - t0);
    row.error = await response.text();
    return row;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (row.firstByteMs === 0) {
      row.firstByteMs = Math.round(performance.now() - t0);
    }
    row.bytes += value.length;
    buffer += decoder.decode(value, { stream: true });
    let separator;
    while ((separator = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, separator).replace(/^data:\s?/, "");
      buffer = buffer.slice(separator + 2);
      if (!event || event === "[DONE]") continue;
      try {
        const payload = JSON.parse(event);
        if (payload.content) {
          if (row.firstContentMs === 0) {
            row.firstContentMs = Math.round(performance.now() - t0);
          }
          row.reply += payload.content;
        }
        if (payload.artifacts) row.artifacts = payload.artifacts;
        if (payload.a2ui) row.a2ui = payload.a2ui;
        if (payload.timings) row.timings = payload.timings;
        if (payload.telemetry) row.telemetry = payload.telemetry;
      } catch {
        // Ignore incomplete or non-JSON SSE events.
      }
    }
  }

  row.totalMs = Math.round(performance.now() - t0);
  row.estimatedCost = estimateCost(row.telemetry?.usage);
  return row;
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, "", "utf8");

console.log(`Chat benchmark -> ${baseUrl}`);
console.log(`Output -> ${outputPath}`);

for (const query of queries) {
  console.log(`\n[${query}]`);
  for (let warmup = 1; warmup <= warmups; warmup++) {
    const row = await bench(query, warmup, true);
    await appendFile(outputPath, `${JSON.stringify(row)}\n`, "utf8");
    console.log(
      `  warmup ${warmup}: ${row.totalMs}ms, route=${row.telemetry?.routing?.answerRoute ?? "?"}`,
    );
  }
  for (let run = 1; run <= runs; run++) {
    const row = await bench(query, run, false);
    await appendFile(outputPath, `${JSON.stringify(row)}\n`, "utf8");
    const estimated = row.estimatedCost?.complete
      ? `$${row.estimatedCost.usd.toFixed(6)}`
      : "partial pricing";
    console.log(
      `  run ${run}: total=${row.totalMs}ms, content=${row.firstContentMs}ms, a2ui=${row.timings?.a2ui ?? "?"}ms, route=${row.telemetry?.routing?.answerRoute ?? "?"}/${row.telemetry?.routing?.answerModel ?? "?"}, reply-cache=${row.telemetry?.cache?.suggestedReply ?? "?"}, rewrites=${row.telemetry?.cache?.rewrites ?? "?"}, cost=${estimated}`,
    );
  }
}
