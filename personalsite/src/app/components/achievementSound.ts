const TONIC_HZ = 523.25;
const FIFTH_HZ = TONIC_HZ * 1.5;

const VOICES = [
  { frequency: TONIC_HZ, offset: 0, duration: 0.09, volume: 0.031, attack: 0.005, holdUntil: 0.083 },
  { frequency: TONIC_HZ * 2, offset: 0, duration: 0.07, volume: 0.005, attack: 0.004, holdUntil: 0.05 },
  { frequency: FIFTH_HZ, offset: 0.095, duration: 0.48, volume: 0.052, attack: 0.012 },
  { frequency: FIFTH_HZ * 2, offset: 0.095, duration: 0.31, volume: 0.014, attack: 0.009 },
  { frequency: FIFTH_HZ * 3, offset: 0.095, duration: 0.18, volume: 0.003, attack: 0.008 },
] as const;

export function playAchievementChime(context: AudioContext) {
  const start = context.currentTime + 0.008;

  for (const voice of VOICES) {
    const onset = start + voice.offset;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(voice.frequency, onset);
    envelope.gain.setValueAtTime(0.0001, onset);
    envelope.gain.exponentialRampToValueAtTime(voice.volume, onset + voice.attack);
    if ("holdUntil" in voice) {
      envelope.gain.setValueAtTime(voice.volume, onset + voice.holdUntil);
    }
    envelope.gain.exponentialRampToValueAtTime(0.0001, onset + voice.duration);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start(onset);
    oscillator.stop(onset + voice.duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
}
