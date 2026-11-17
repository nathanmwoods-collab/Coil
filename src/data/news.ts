/**
 * Player news and injury designations.
 *
 * MOCK PLACEHOLDER DATA. Nothing here is real reporting. Every item is
 * flagged `mock: true` and the UI labels it "Sample news". The shapes match
 * the ingestion design in docs/data-sources.md ("Player news"): structured
 * status from an injury/transaction feed, headlines with source + link, and
 * an optional generated one-line summary built only from those facts.
 * Replace `NEWS` / `INJURIES` with the feed snapshot; the UI reads only
 * `injuryFor` and `newsFor`.
 */

/** Official game/roster designations, shortest first. */
export type InjuryStatus = 'Q' | 'D' | 'O' | 'IR' | 'PUP';

export const INJURY_LABEL: Record<InjuryStatus, string> = {
  Q: 'Questionable',
  D: 'Doubtful',
  O: 'Out',
  IR: 'Injured reserve',
  PUP: 'PUP list',
};

export interface Injury {
  status: InjuryStatus;
  /** Body part or reason, as the structured feed gives it. */
  detail: string;
  mock: true;
}

export interface NewsItem {
  id: string;
  playerId: string;
  /** Headline, from a feed we are allowed to syndicate. */
  title: string;
  source: string;
  url: string | null;
  /** Epoch ms. */
  at: number;
  /** Generated one-liner from structured facts. Labeled as generated in the UI. */
  summary?: string;
  mock: true;
}

const INJURIES: Record<string, Injury> = {
  p_ch_mccaffrey: { status: 'Q', detail: 'Achilles', mock: true },
  p_de_achane: { status: 'Q', detail: 'Calf', mock: true },
  p_ni_collins: { status: 'D', detail: 'Hamstring', mock: true },
  p_de_henry: { status: 'Q', detail: 'Ankle', mock: true },
  p_ma_nabers: { status: 'O', detail: 'Knee', mock: true },
  p_br_thomas: { status: 'IR', detail: 'Shoulder', mock: true },
  p_ja_smith_njigba: { status: 'PUP', detail: 'Foot', mock: true },
};

const H = 3_600_000;
const BASE = Date.UTC(2026, 10, 16, 15);

const NEWS: NewsItem[] = [
  { id: 'n1', playerId: 'p_ch_mccaffrey', title: 'Limited in practice Wednesday', source: 'Sample feed', url: null, at: BASE - 5 * H, summary: 'Limited Wednesday with an Achilles issue. Listed questionable.', mock: true },
  { id: 'n2', playerId: 'p_de_achane', title: 'Calf tightness keeps him out of team drills', source: 'Sample feed', url: null, at: BASE - 20 * H, mock: true },
  { id: 'n3', playerId: 'p_ni_collins', title: 'Did not practice Thursday', source: 'Sample feed', url: null, at: BASE - 26 * H, summary: 'Missed Thursday with a hamstring. Listed doubtful.', mock: true },
  { id: 'n4', playerId: 'p_ma_nabers', title: 'Ruled out for Sunday', source: 'Sample feed', url: null, at: BASE - 2 * H, summary: 'Out this week with a knee injury.', mock: true },
  { id: 'n5', playerId: 'p_br_thomas', title: 'Placed on injured reserve', source: 'Sample feed', url: null, at: BASE - 50 * H, mock: true },
  { id: 'n6', playerId: 'p_ja_chase', title: 'Full participant all week', source: 'Sample feed', url: null, at: BASE - 8 * H, mock: true },
  { id: 'n7', playerId: 'p_bi_robinson', title: 'Workload talk: coach expects 20+ touches', source: 'Sample feed', url: null, at: BASE - 30 * H, mock: true },
  { id: 'n8', playerId: 'p_de_henry', title: 'Rolled ankle late in Sunday win', source: 'Sample feed', url: null, at: BASE - 70 * H, mock: true },
];

export function injuryFor(playerId: string): Injury | null {
  return INJURIES[playerId] ?? null;
}

/** Newest first. */
export function newsFor(playerId: string): NewsItem[] {
  return NEWS.filter((n) => n.playerId === playerId).sort((a, b) => b.at - a.at);
}
