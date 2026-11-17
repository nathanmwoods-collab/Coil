# Data sources

Where Coil's data comes from today (all mock or prototype) and what it has to
become before launch. Nothing here involves real money.

## Player pool, ADP, projections

`src/data/players.ts` is hand-built placeholder data. Replace with a licensed
feed (rosters, schedule, projections) before launch. ADP is covered below.

## Player photos

**Today: no photos ship.** Every player shows the designed fallback avatar
(`src/components/PlayerAvatar.tsx`): initials on the team's primary color with a
ring in the secondary color. Team colors live in `src/data/teams.ts`. No team
logos or wordmarks are used.

The photo source is pluggable. UI calls `photoUrl(player)` from
`src/data/photos.ts` and nothing else. A null URL, or an image that fails to
load (`onError`), falls back to the avatar.

### Option A, licensed (required for launch)

| Provider | What you get | Cost and terms (verify with sales) |
| --- | --- | --- |
| [SportsDataIO Player Headshots](https://sportsdata.io/developers/sports-player-headshots-api) | Headshot URLs on their NFL player feed, keyed by their PlayerID. Sourced under license from a photo agency. | Sold as an add-on to a paid NFL data subscription, quote-based. Headshots are excluded from the free trial, and display is limited to the terms of the commercial license. |
| [Sportradar Images API](https://developer.sportradar.com/images-and-editorials/reference) | Per-league manifests of headshots and action shots (wire-agency sourced), multiple crops, keyed by Sportradar player id. | Enterprise contract, quote-based, priced per league and per usage type. Editorial-use restrictions apply; real-money gaming use must be named in the contract. |

Either way: we receive a player id map with the provider's player feed, mirror
images to our own CDN (do not ship provider keys in the app), and register a
provider with `licensedCdn(baseUrl, ids)` then `setPhotoProvider(...)`.
Player name/image rights for a paid-entry product also need sign-off from
counsel (NFLPA group licensing is separate from a photo license).

### Option B, prototype only (NOT licensed)

`prototypeCdn` in `src/data/photos.ts` reads `src/data/photoIds.ts`, a map from
our player ids to ids on a public fantasy platform's image CDN
(`https://sleepercdn.com/content/nfl/players/thumb/{id}.jpg`, ids from
`https://api.sleeper.app/v1/players/nfl`).

- **This is a PROTOTYPE source. It is not licensed for commercial use and must
  be swapped for Option A before launch.** The images belong to their rights
  holders and that API's terms do not grant redistribution.
- `photoIds.ts` is currently **empty**: the build sandbox blocks both hosts, so
  the map could not be generated or verified. Run
  `node scripts/gen-photo-ids.mjs 150` on a machine with open network access to
  fill it for the top 150 players by name and position match. Review the
  "Missed" list it prints.
- To turn photos off entirely: `setPhotoProvider(noPhotos)`.

## Search aliases

`src/data/teams.ts` (city, name, nicknames for all 32 teams) and
`src/data/aliases.ts` (player nicknames and initialisms) are hand-curated.
`searchPlayers` in `src/lib/search.ts` consumes both. Add aliases as data; no
code changes needed.

## ADP from real drafts

**Today (mock client):** `updateAdp` in `src/engine/adp.ts` is pure and tested.
The store folds every completed draft into a per-draft-type table
(`adp.fast12`, `adp.slow12`, `adp.sng`) exactly once (`adpCounted` on the
draft), and the draft room shows that ADP with an up/down mover against the
seed. Because local pods are one human plus bots, the client uses looser
settings (`CLIENT_ADP` in `src/store/useApp.ts`) than the server should.
Bots and the autopick fallback still draft off seed ADP.

**The model**

- One table per draft type (fast 12-team, slow 12-team, small sit & go). Room
  size and clock change how people draft, so they never share ADP.
- Observation weight = time decay x pick source.
  Time decay is exponential with a 14-day half-life. A bot or filler pick
  weighs 0.25 of a human pick (set 0 to exclude). A user's own autopick counts
  as human: it is their rankings speaking.
- Bayesian blend with the seed: `ADP = (k * seed + sum(w * pick)) / (k + sum(w))`
  with `k = 12`. New or thinly drafted players sit on the seed and converge to
  the observed average as weight accumulates.
- Min-sample rule: under 5 observed drafts, show the seed unchanged.
- Undrafted handling: a player not taken in a draft is observed at
  `totalPicks + 1`, weighted like an average pick in that draft. Without this,
  late-round ADP only ever counts the drafts where someone reached.

**Server design (event per pick, incremental aggregate)**

1. Draft service emits `pick.made {draft_id, draft_type, sport, player_id, overall, entrant_kind: human|bot|autopick, at}` and
   `draft.completed {draft_id, draft_type, total_picks, at}` to a durable log.
   Picks are immutable; a voided draft emits `draft.voided` and is subtracted.
2. A consumer keeps one row per `(sport, draft_type, player_id)`:
   `{w, wp, n, as_of}`. That is the `AdpAggregate` in the code. On each
   `draft.completed` it loads that draft's picks, calls the same `updateAdp`
   (decay the row to now, add the new weights), and writes the rows back in one
   transaction keyed by `draft_id` for idempotency (the client's `adpCounted`).
3. Reads compute `adpValue` on the fly (`k`, min sample are read-time knobs, so
   they can be tuned without a backfill). Publish a snapshot every few minutes
   to a cache/CDN; clients fetch the snapshot, not the rows.
4. Keep a daily snapshot per draft type for movers (today vs 7 days ago) and
   for audit. Rebuild from the pick log is always possible: replay events in
   time order through `updateAdp`.
5. Abuse guard: cap any one user's share of weight per player per day so a
   150-entry drafter cannot move ADP alone; drop picks from collusion-flagged
   drafts.

The seed ADP at launch comes from a licensed feed or our own closed beta, not
from scraping another operator's ADP.

## Player news

Goal: a one-line "why is he sliding" on the player row, with a link out.

| Source | What | How | Notes |
| --- | --- | --- | --- |
| Official injury reports | Practice status, game designations | Licensed data feed (same vendor as rosters/stats) | Structured, authoritative. Render directly, no LLM needed. |
| Transactions | Signings, trades, IR, suspensions | Licensed feed or the league's public transaction wire | Structured. Map to player ids at ingest. |
| Headlines | Beat-writer and outlet news | Publisher RSS/Atom feeds, only feeds the publisher offers for syndication | Store title, link, source, published time. Always show the source and link out. |
| One-line summary | "Limited Wed/Thu with a hamstring. Expected to play." | LLM over the structured injury/transaction data plus headline titles | Summaries are generated from facts we hold and titles, not article bodies. |

Rules:

- **No scraping of article text.** We do not fetch, store or summarize article
  bodies. Headline, source name, timestamp and link only, per each feed's terms.
- Every item keeps its source and URL; summaries are labeled as generated and
  never invent a status the structured data does not contain. If the structured
  feed and a headline disagree, show the structured status.
- Pipeline: poll feeds, dedupe by URL/GUID, entity-link to player ids (the
  alias table in `src/data/aliases.ts` is the start of that dictionary),
  store, summarize on change, push to clients with the ADP snapshot.
- Quiet by default: surface news only on players in a user's queue, rankings
  top 50, or rosters.
