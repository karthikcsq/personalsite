// A tiny Web Audio engine for the music player. Nothing is created until the
// first user gesture, so the page is silent until a visitor touches it.
//
//   strings: Karplus-Strong plucked string (cello pizzicato, C2 G2 D3 A3)
//   piano:   a few slightly inharmonic partials with a struck envelope
//   recording: any <audio> element routed through the same analyser
//
// Everything goes master → analyser → speakers, so one scope can draw it all.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let muted = false;
const stringCache = new Map<string, AudioBuffer>();
const sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.7;
    master.connect(comp).connect(analyser).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, master: master!, analyser: analyser! };
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

export function setMuted(value: boolean) {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.8, ctx.currentTime, 0.05);
}

export const CELLO = [65.41, 98.0, 146.83, 220.0]; // C2 G2 D3 A3

function stringBuffer(c: AudioContext, freq: number, brightness: number): AudioBuffer {
  const key = `${freq}:${brightness.toFixed(1)}`;
  const hit = stringCache.get(key);
  if (hit) return hit;
  const sr = c.sampleRate;
  const len = Math.floor(sr * 3.2);
  const buf = c.createBuffer(1, len, sr);
  const y = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / freq));
  // Excite with lowpassed noise: a finger, not a pick.
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += (Math.random() * 2 - 1 - lp) * brightness;
    y[i] = lp;
  }
  const decay = 0.9965 + Math.min(0.0025, freq / 200000);
  for (let i = N; i < len; i++) {
    y[i] = decay * 0.5 * (y[i - N] + y[i - N - 1 < 0 ? 0 : i - N - 1]);
  }
  // normalise
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
  if (peak > 0) for (let i = 0; i < len; i++) y[i] /= peak;
  stringCache.set(key, buf);
  return buf;
}

/** Pluck a cello string. `strength` 0..1 sets loudness and brightness. */
export function pluck(freq: number, strength = 0.7) {
  const { ctx: c, master: m } = audio();
  const src = c.createBufferSource();
  src.buffer = stringBuffer(c, freq, 0.35 + strength * 0.4);
  const body = c.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 900 + strength * 2200;
  body.Q.value = 0.7;
  const g = c.createGain();
  g.gain.value = 0.25 + strength * 0.55;
  src.connect(body).connect(g).connect(m);
  src.start();
}

/** Strike a piano key (MIDI note number). */
export function strike(midi: number, velocity = 0.8) {
  const { ctx: c, master: m } = audio();
  const f0 = 440 * Math.pow(2, (midi - 69) / 12);
  const now = c.currentTime;
  const out = c.createGain();
  out.gain.value = 0.22 * velocity;
  const tone = c.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(5200, now);
  tone.frequency.exponentialRampToValueAtTime(1400, now + 1.2);
  tone.connect(out).connect(m);
  const B = 0.0004; // a touch of string stiffness
  [1, 2, 3, 4, 5, 6, 8].forEach((k, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f0 * k * Math.sqrt(1 + B * k * k);
    const g = c.createGain();
    const amp = 1 / Math.pow(k, 1.35);
    const len = 2.8 / (1 + i * 0.5);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(amp, now + 0.004);
    g.gain.exponentialRampToValueAtTime(amp * 0.35, now + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    osc.connect(g).connect(tone);
    osc.start(now);
    osc.stop(now + len + 0.05);
  });
}

/** Route a media element through the shared analyser (once per element). */
export function attach(el: HTMLMediaElement) {
  const { ctx: c, master: m } = audio();
  if (!sources.has(el)) {
    const s = c.createMediaElementSource(el);
    s.connect(m);
    sources.set(el, s);
  }
}
