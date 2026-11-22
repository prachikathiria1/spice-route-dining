"use client";

let ctx: AudioContext | null = null;

/** Short attention chime (works after the first user tap on the page). */
export function chime(kind: "order" | "help" = "order") {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    const notes = kind === "help" ? [988, 740, 988] : [660, 880];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      const t = ctx!.currentTime + i * 0.16;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.15);
    });
  } catch {
    /* audio blocked */
  }
  try {
    // Browsers only allow vibration after the user has interacted with the page.
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
    if (active) navigator.vibrate?.(kind === "help" ? [200, 100, 200, 100, 200] : [150, 80, 150]);
  } catch {
    /* no vibration */
  }
}
