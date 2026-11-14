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
