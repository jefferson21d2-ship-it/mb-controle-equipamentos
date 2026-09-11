/**
 * Gera feedback sonoro e tátil (vibração) para leitura ágil de QR Codes
 * no celular, utilizando Web Audio API e Vibration API nativas do navegador.
 */
export function triggerScanSuccessFeedback() {
  // 1. Vibração háptica (celular)
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 40, 80]);
    }
  } catch (e) {
    // Silently ignore if not supported or permissions restricted
  }

  // 2. Beep sonoro curto de confirmação (Web Audio API)
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Tom agudo agradável (A5)
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // Elevação sutil

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    }
  } catch (e) {
    // Silently ignore if audio is blocked by user gesture policy
  }
}

export function triggerScanErrorFeedback() {
  // Vibração de erro (dois pulsos mais longos)
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([120, 80, 120]);
    }
  } catch (e) {
    // ignore
  }

  // Tom grave de erro
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    }
  } catch (e) {
    // ignore
  }
}
