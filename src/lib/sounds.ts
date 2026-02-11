let audioContext: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function createNote(
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  volume = 0.15,
): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Soft pop — 330Hz sine, 80ms */
export function playClickSound() {
  try {
    const ctx = getCtx();
    createNote(330, "sine", ctx.currentTime, 0.08, 0.12);
  } catch { /* Audio not available */ }
}

/** Ascending C5→E5→G5 chime — triangle, 200ms */
export function playOpenSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    createNote(523, "triangle", t, 0.15, 0.12);
    createNote(659, "triangle", t + 0.06, 0.15, 0.12);
    createNote(784, "triangle", t + 0.12, 0.15, 0.12);
  } catch { /* Audio not available */ }
}

/** Descending G5→E5→C5 — triangle, 200ms */
export function playCloseSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    createNote(784, "triangle", t, 0.15, 0.12);
    createNote(659, "triangle", t + 0.06, 0.15, 0.12);
    createNote(523, "triangle", t + 0.12, 0.15, 0.12);
  } catch { /* Audio not available */ }
}

/** Tick + sparkle shimmer */
export function playToggleSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    createNote(800, "sine", t, 0.04, 0.1);
    createNote(1200, "sine", t + 0.04, 0.08, 0.06);
  } catch { /* Audio not available */ }
}

/** Ascending C5→E5→G5→C6 arpeggio — 280ms */
export function playSuccessSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    createNote(523, "triangle", t, 0.18, 0.12);
    createNote(659, "triangle", t + 0.07, 0.18, 0.12);
    createNote(784, "triangle", t + 0.14, 0.18, 0.12);
    createNote(1047, "triangle", t + 0.21, 0.2, 0.15);
  } catch { /* Audio not available */ }
}

/** Gentle E4→C4 descending — 200ms */
export function playErrorSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    createNote(330, "sine", t, 0.15, 0.12);
    createNote(262, "sine", t + 0.1, 0.15, 0.12);
  } catch { /* Audio not available */ }
}

/** Warmer notification chime */
export function playNotificationSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    createNote(880, "triangle", t, 0.2, 0.15);
    createNote(1100, "triangle", t + 0.1, 0.2, 0.1);
  } catch { /* Audio not available */ }
}
