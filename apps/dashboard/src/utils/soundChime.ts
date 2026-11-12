let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioCtx();
  }
  return sharedAudioContext;
}

/**
 * Resumes Web Audio context after user gesture so KDS chimes fire reliably.
 */
export async function unlockAudioChime(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // Autoplay policies may still block until next click
    }
  }
}

/**
 * Plays a pleasant two-tone counter bell chime using Web Audio API (no external audio asset required).
 */
export async function playOrderBellChime(isMuted: boolean): Promise<void> {
  if (isMuted) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 880, start: 0, duration: 0.22 },
      { freq: 1174.66, start: 0.14, duration: 0.42 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.24, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + note.start + note.duration,
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    }
  } catch {
    // Ignore audio context errors when browser blocks ungestured playback
  }
}
