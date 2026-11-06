// Bip de fin de repos (le son doit être « débloqué » par un geste : on le fait au démarrage de la séance).
let ctx = null;

export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* pas de son */ }
}

export function beep(times = 1) {
  if (navigator.vibrate) navigator.vibrate(times > 1 ? [120, 80, 120] : 150);
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t0 + i * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.3, t0 + i * 0.22 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.22 + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0 + i * 0.22);
    osc.stop(t0 + i * 0.22 + 0.16);
  }
}

// Garde l'écran allumé pendant la séance (si le navigateur le permet).
let lock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
    if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) { /* non supporté */ }
}
