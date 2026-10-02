import assert from "node:assert/strict";
import test from "node:test";
import { playAchievementChime } from "../src/app/components/achievementSound.ts";

test("achievement chime plays a short tonic followed by a longer perfect fifth", () => {
  const oscillators = [];
  const envelopes = [];
  const context = {
    currentTime: 10,
    destination: {},
    createOscillator() {
      const oscillator = {
        frequency: { setValueAtTime(value) { oscillator.pitch = value; } },
        connect() {},
        disconnect() {},
        start(time) { oscillator.onset = time; },
        stop(time) { oscillator.end = time; },
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain() {
      const events = [];
      envelopes.push(events);
      return {
        gain: {
          setValueAtTime(value, time) { events.push({ kind: "set", value, time }); },
          exponentialRampToValueAtTime(value, time) { events.push({ kind: "ramp", value, time }); },
        },
        connect() {},
        disconnect() {},
      };
    },
  };

  playAchievementChime(context);

  assert.equal(oscillators.length, 5);
  const [tonic, , fifth] = oscillators;
  assert.equal(fifth.pitch / tonic.pitch, 1.5);
  assert.ok(Math.abs(tonic.end - tonic.onset - 0.09) < 0.000001);
  assert.ok(Math.abs(fifth.onset - tonic.end - 0.005) < 0.000001);
  assert.deepEqual(envelopes[0].map(({ kind }) => kind), ["set", "ramp", "set", "ramp"]);
  assert.ok(Math.abs(envelopes[0][2].time - tonic.onset - 0.083) < 0.000001);
  assert.ok(fifth.end - fifth.onset > tonic.end - tonic.onset);
});
