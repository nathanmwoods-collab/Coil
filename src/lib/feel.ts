import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Platform } from 'react-native';

import { useApp } from '../store/useApp';

/**
 * One place for every haptic (personality spec §2.5). Each pattern keeps its
 * documented meaning. No-ops on web and when the user turns haptics off.
 * Never used for bot picks, scrolling, tab switches or toggles.
 */
function enabled() {
  return Platform.OS !== 'web' && useApp.getState().haptics !== false;
}

function run(fn: () => Promise<void>) {
  if (!enabled()) return;
  try {
    fn().catch(() => {});
  } catch {
    // Haptics unavailable on this device: stay silent.
  }
}

const { ImpactFeedbackStyle: Impact, NotificationFeedbackType: Note } = Haptics;

/** A dry buzz: `ticks` selection taps 45ms apart. */
function buzz(ticks: number) {
  for (let i = 0; i < ticks; i++) setTimeout(() => run(() => Haptics.selectionAsync()), i * 45);
}

export const feel = {
  /**
   * Coil's signature: the rattle. Six quick ticks, then one Rigid as Clutch
   * lifts his head. Felt face down, it means "your pick".
   */
  rattle() {
    if (!enabled()) return;
    buzz(6);
    setTimeout(() => run(() => Haptics.impactAsync(Impact.Rigid)), 6 * 45 + 120);
  },
  /** Your turn starts: the rattle. */
  yourTurn() {
    feel.rattle();
  },
  /** 10 seconds left on your clock: the rattle again, in place of a warning buzz. */
  clockWarning: () => feel.rattle(),
  /** Each of the last 3 seconds: a three-tick burst, so the rattle speeds up. */
  clockTick: () => {
    if (enabled()) buzz(3);
  },
  /** Your pick landed: fired on Clutch's strike frame, not on tap. */
  pickIn: () => run(() => Haptics.impactAsync(Impact.Rigid)),
  /** Pick rejected or the clock beat you. */
  pickRejected: () => run(() => Haptics.notificationAsync(Note.Error)),
  /** Star, chip, segment and week changes. */
  select: () => run(() => Haptics.selectionAsync()),
  /** Queue reorder. */
  nudge: () => run(() => Haptics.impactAsync(Impact.Light)),
  /** Contest entered. */
  entered: () => run(() => Haptics.impactAsync(Impact.Medium)),
  /** Draft complete. */
  draftComplete: () => run(() => Haptics.notificationAsync(Note.Success)),
  /** Ceiling week revealed. */
  ceiling: () => run(() => Haptics.impactAsync(Impact.Soft)),
  /** Springback landed: the spring lets go. */
  landed: () => run(() => Haptics.notificationAsync(Note.Success)),
  /** Autopilot took over. */
  autopilot: () => run(() => Haptics.notificationAsync(Note.Warning)),
};

/** Screen reader announcement; harmless where unsupported. */
export function announce(msg: string) {
  try {
    AccessibilityInfo.announceForAccessibility?.(msg);
  } catch {
    // ignore
  }
}
