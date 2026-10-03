/**
 * Haptic feedback (Vibration API) utility for mobile devices.
 * Safely falls back on devices/browsers that don't support vibration.
 */

export const haptics = {
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      "vibrate" in navigator &&
      typeof navigator.vibrate === "function"
    );
  },

  /**
   * Action prompt: Short alert vibration when screen turns green
   */
  action() {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(25);
    } catch {}
  },

  /**
   * Normal hit: Crisp light tap
   */
  hitNormal() {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(35);
    } catch {}
  },

  /**
   * Excellent hit: Double pulse vibration
   */
  hitExcellent() {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([30, 40, 40]);
    } catch {}
  },

  /**
   * Godlike hit: Strong high-intensity burst vibration
   */
  hitGodlike() {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([50, 40, 80]);
    } catch {}
  },

  /**
   * Game Over / False Start: Distinct error buzz
   */
  gameOver() {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([80, 50, 80]);
    } catch {}
  },
};
