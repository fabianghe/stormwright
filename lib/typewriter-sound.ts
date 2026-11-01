let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio() {
  if (!context) {
    context = new AudioContext();
    const length = Math.floor(context.sampleRate * 0.08);
    noise = context.createBuffer(1, length, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function click(ctx: AudioContext, at: number, frequency: number, gain: number, length: number) {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.playbackRate.value = 0.9 + Math.random() * 0.25;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 0.9;
  const volume = ctx.createGain();
  volume.gain.setValueAtTime(gain, at);
  volume.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(filter).connect(volume).connect(ctx.destination);
  source.start(at);
  source.stop(at + length + 0.02);
}

function thump(ctx: AudioContext, at: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(60, at + 0.05);
  const volume = ctx.createGain();
  volume.gain.setValueAtTime(gain, at);
  volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  osc.connect(volume).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.08);
}

export function playKey(soft = false) {
  const ctx = audio();
  const now = ctx.currentTime;
  click(ctx, now, 1900 + Math.random() * 1400, soft ? 0.12 : 0.22, 0.035);
  thump(ctx, now, soft ? 0.05 : 0.09);
}

export function playReturn() {
  const ctx = audio();
  const now = ctx.currentTime;
  click(ctx, now, 900, 0.18, 0.12);
  for (const [frequency, gain] of [
    [2093, 0.05],
    [3140, 0.02],
  ]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const volume = ctx.createGain();
    volume.gain.setValueAtTime(0.0001, now + 0.08);
    volume.gain.exponentialRampToValueAtTime(gain, now + 0.09);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(volume).connect(ctx.destination);
    osc.start(now + 0.08);
    osc.stop(now + 1);
  }
}
