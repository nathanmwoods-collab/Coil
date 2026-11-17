# Founder comments on the Coil Preview (2026-11-16)

Nathan left these 23 comments while tapping through the preview. Location = the screen text near the comment.

## Draft room / player rows
1. "aim for 2 to 3" (position targets) — Don't suggest how many.
2. "3 of 5 to 7" (My Team counts) — Don't list this range for any position. Show plain counts only.
3. "GB · Bye 5 · ADP 20.8 · autopick" — Don't need to say "autopick".
4. Avatar initials "JJ" — Use TEAM initials (e.g. MIN), not player initials, in the fallback avatar.
5. Same spot — Actually source real player headshots (see docs/data-sources.md; prototype source must stay clearly flagged; the sandbox could not reach the Sleeper CDN before — retry, and if still blocked, ship the mapping script + team-initial fallback).
6. Tap a player → show player news (a player sheet with news, injury status, ADP, bye, team; news is mock/placeholder data clearly labeled until a feed exists, structure ready for the ingestion design in docs/data-sources.md).
7. Show injury designation on player rows (Q / D / O / IR / PUP badge; mock data for a handful of players).
8. Queue icon: make it more thematic (e.g. a rattle or coil glyph); if not, a star is better than the bookmark.
9. Board: tapping a drafter (e.g. "Flowers") shows that team's roster.

## Draft complete
10. "$0.05 Springback pending, lands Wednesday" — Use "you earned" language ("You earned $0.05 Springback. Lands Wednesday.").
11. "Bought the whole backfield early. Bold." was shown for a team with Josh Downs (a WR) — the quip logic is wrong; it must only reference RBs when the early picks are actually RBs. Audit all build quips for correctness.
12. "Robust RB" — he loves the build labels: expand the archetype set (e.g. Zero RB, Hero RB, Robust RB, Hyper-fragile RB, Elite QB, Late-round QB, Elite TE, Zero TE, WR Avalanche, Balanced) and make sure the quips match.
13. "Play the season" button — make the primary button "Draft again" instead (season sim moves to a secondary action).

## Lobby
14. "Best ball, wound tight." — Remove the tagline.
15. Sit & go / contest subtitles — Don't say "12-team pods"; drop descriptive text that won't always be true. Keep only facts from the contest data.
16. Rankings are per SLATE (NFL, NFL Playoffs, NBA, ...), not per Fast/Slow draft type. Change rankings (and autodraft) to be keyed by slate.

## Drafts / Live / Exposure
17. "2026 season · Through week 6 of 17" — Let me filter between sports (NFL, NBA); seasons are per sport.
18. Exposure filters ("All QB RB WR TE %") — Add filters for sport, $ buy-in, and contest name.
19. Rename "Stack" token — Add an option that names the teams in the stack, like "IND KC", alongside the current player version.

## You tab
20. "Drafts / Finished / Mock fees" stats — Remove these stats.
21. "$10" mock fees — No fees shown here.
22. Notifications should be here for preferences (on the clock, draft filled, Springback landed, news on my players; toggles, stored locally).
23. "How could we personalize the icon when you are drafting?" — Question: answer in the report (e.g. user picks a Rattler skin/color or initials badge shown as their avatar in the pick strip/board; maybe earned skins via Springback gauges). Implement a simple version: choose your avatar color + 2-letter tag, shown on your picks in the strip and board.
