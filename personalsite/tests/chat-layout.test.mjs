import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeChat = readFileSync(
  new URL("../src/app/HomeChatClient.tsx", import.meta.url),
  "utf8",
);
const chatInput = readFileSync(
  new URL("../src/app/components/ChatInput.tsx", import.meta.url),
  "utf8",
);

test("desktop chat panes stay constrained to the viewport track", () => {
  assert.match(homeChat, /grid h-full min-h-0[^"]*overflow-hidden/);
  assert.match(homeChat, /flex h-full min-h-0 flex-col/);
  assert.match(homeChat, /min-h-0 flex-1 overflow-y-auto/);
  assert.match(homeChat, /h-full min-h-0 overflow-y-auto/);
});

test("queue growth cannot shrink the docked input out of view", () => {
  assert.match(homeChat, /max-w-\[620px\] shrink-0 pb-5/);
  assert.match(chatInput, /max-w-\[620px\] shrink-0/);
});
