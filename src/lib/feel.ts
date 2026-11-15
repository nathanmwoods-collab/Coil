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

export const feel = {
  /** Your turn starts: a "double knock". */
  yourTurn() {
    run(() => Haptics.impactAsync(Impact.Heavy));
    setTimeout(() => run(() => Haptics.impactAsync(Impact.Rigid)), 120);
  },
  /** 10 seconds left on your clock. */
  clockWarning: () => run(() => Haptics.notificationAsync(Note.Warning)),
  /** Each of the last 3 seconds. */
  clockTick: () => run(() => Haptics.selectionAsync()),
  /** Your pick landed. */
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
