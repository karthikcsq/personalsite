// Throwaway benchmark — hits /api/chat with a few queries and reports
// TTFT (time to first SSE chunk) and total wall-clock per request.
// Server-side per-stage timings show up in the dev server's stdout.

const QUERIES = [
  "What is google-tools-mcp?",
  "What does Karthik think about agents?",
  "Where has he worked?",
];

async function bench(query) {
  const t0 = Date.now();
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: query }),
  });
  if (!res.ok) {
    console.log(`  ❌ HTTP ${res.status}`);
    return;
  }
  const reader = res.body.getReader();
  let firstByteAt = 0;
  let firstContentAt = 0;
  let bytes = 0;
  let artifactsSeen = 0;
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstByteAt === 0) firstByteAt = Date.now();
    bytes += value.length;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const event = buf.slice(0, idx).replace(/^data:\s?/, "");
      buf = buf.slice(idx + 2);
      if (!event || event === "[DONE]") continue;
      try {
        const obj = JSON.parse(event);
        if (obj.content && firstContentAt === 0) firstContentAt = Date.now();
        if (obj.artifacts) artifactsSeen += obj.artifacts.length;
      } catch {}
    }
  }
  const total = Date.now() - t0;
  console.log(
    `  TTFB: ${firstByteAt - t0}ms | first content token: ${firstContentAt - t0}ms | total: ${total}ms | artifacts: ${artifactsSeen} | ${bytes}B`,
  );
  // Brief pause so per-request server logs don't interleave.
  await new Promise((r) => setTimeout(r, 500));
}

console.log("=== Benchmark: current main ===");
for (const q of QUERIES) {
  console.log(`\n[${q}]`);
  // Run each query twice — first warms compile/cache, second is the real timing.
  await bench(q);
  await bench(q);
}
