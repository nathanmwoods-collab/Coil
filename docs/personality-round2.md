# Coil personality, round 2

**Status:** review + proposal, 15 Nov 2026. Read-only pass; no code changed.
**Trigger:** founder feedback after tapping through: "Love the coil as the loading bar but we want less AI obvious, add more personality."
**Inputs:** every PNG in `screenshots/`, `src/app`, `src/components`, `src/lib/banter.ts`, `src/data/promos.ts`, `assets/logo-mark.png`, and `docs/personality-spec.md` (round 1).

## The honest summary

Round 1 fixed the defaults: real type, mint CTAs, icons, haptics, a decent voice. What it produced is a **clean** app, and clean is exactly what a model produces when told to have taste. Nothing in the 27 screenshots could only have been made by a person who loves this game. Specifically:

1. **There is no image anywhere.** Not one illustration, texture, photo that loads, or shape that is not a rounded rectangle, a pill or a hairline. The only drawn things in the whole product are the coil meter and the draft-complete path, and those are the two things the founder praised. That is the signal: draw more.
2. **Everything has the same weight.** One card recipe (`ui.tsx` `Card`: `#15162A`-ish surface, radius 18, padding 16) is used for a $3M flagship, a $5 qualifier, a promo, a draft in progress and a season summary. A $3M contest and a $5 one differ by a 1px mint border.
3. **The copy is competent and has no opinion.** It tells you what the screen does. It never tells you what Coil thinks about your draft.
4. **The mascot rule from round 1 is now wrong.** Round 1 said "no mascot, the mint dot is the character" and "never snake puns". The logo is now the Rattler, a snake with a face and a rattle. A logo with a face that never moves is a wasted asset. Sections 2.10 and rule 3 of 2.2 in round 1 are superseded by this document.

Housekeeping found on the way:
- `screenshots/lobby.png` still shows the old three-row S mark in the header, not the Rattler. `promos.png` is byte-identical to `lobby.png` and `multi-entry.png` to `contest.png`, so two screens were reviewed from one capture each.
- `exposure.png`: "You're the Bijan Robinson guy. 1 of 2 teams." Every player on the screen is at 50%. The call-out fires on noise and reads as a template. Gate it at 3+ teams and 50%+ (`(tabs)/exposure.tsx:51`).
- `QueueList.tsx:34` says "Star a few guys" but the icon has been a bookmark since round 1.

References used (links at the end): Duolingo's shape-language and character guidelines, Buck's Cash App illustration system, the Robinhood confetti removal, and three 2026 "de-slop" checklists. They agree on two points that drive this document: a character works when it is built from a tiny set of repeatable shapes, and generic output is fixed by committing to one specific idea everywhere, not by adding more polish.

---

## 1. Verdict per screen

"Tell" means: what still reads as machine-made. Fix IDs point to the backlog in section 6.

### Lobby (`lobby.png`, `promos.png`, `(tabs)/index.tsx`, `ContestCard.tsx`, `PromoRail.tsx`)
- **Tell: five stacked navy rounded rectangles on near-black.** Promo card, flagship, two contest cards, all the same surface, radius and padding. The flagship's only distinction is a 1px mint outline.
- **Tell: the promo rail is a template.** Kicker, big number, title, body, text link. "We match your first one" could be any app.
- **Tell: the header is a dashboard header.** Logo, balance, Deposit button. Nothing greets you, nothing is alive.
- **Fix:** flagship becomes a ticket (P0-6). Fast contests stay cards. Sit-and-gos become borderless rows. The promo card gets the scale pattern and a taped sticker instead of a kicker. One loud moment: the flagship prize, in mint, and only that.

### Contest sheet and multi-entry (`contest.png`, `contest/[id].tsx`)
- **Tell: label/value table rows** ("Seats taken 6,204 of 11,760", "Your entries 0 of 20"). This is a settings screen layout. The seats row is precisely where the coil meter belongs and it is missing here.
- **Tell: two identical bordered radio boxes** with a generic check circle.
- **Tell: the rules are two grey paragraphs.** Correct, unread.
- **Fix:** seats row becomes a full-width coil with the count riding on the head dot. The stepper prints ticket stubs: each entry added slides in a small stub (1, 2, 3) so the count is visible as objects. Rules become three numbered beats with the display numeral, not paragraphs.

### Draft room (`draft-room.png`, `autopilot.png`, `draft/[id].tsx`, `PlayerRow.tsx`, `PickStrip.tsx`)
- **Tell: eight identical outlined "Draft" pills down the right edge.** The core verb of the product looks like a secondary button, repeated.
- **Tell: initials-in-a-circle avatars** (BR, JG, PN). This is the single most recognisable generated-app element on any screen. `PlayerAvatar.tsx` falls back to it whenever a photo does not load, and in every screenshot none loaded.
- **Tell: the on-the-clock banner is a card with a number.** The most emotional moment in the app is a rounded rectangle.
- **Fix:** the banner becomes the Rattler's stage (P0-2) and the clock becomes a tightening coil (P0-3). Only the row you are about to draft (top of queue, else top of list) gets a filled mint Draft button while you are up; other rows show the button on press-in. Avatar fallback becomes a jersey tag: a squircle split diagonally in the team's two colours with the position letter, not initials.

### My team (`my-team.png`, `MyTeam.tsx`)
- **Tell: four equal stat tiles** (QB 0, RB 0, WR 1, TE 0), then the same information again as four sections below ("0 of 2 to 3").
- **Tell: "Open" as an empty slot.** A word where a shape should be.
- **Tell: two thirds of the screen is void.**
- **Fix:** delete the tile row. Draw the roster as 18 slots along a small snake path (the same shape as the draft-complete reveal), filled as you pick, empty slots as dashed outlines with the round number. The reveal at the end is then the payoff of something you watched fill.

### Board (`board.png`, `BoardGrid.tsx`)
- **Tell: a spreadsheet.** Uniform cells, no direction. Nothing shows that this is a snake draft: rows reverse and the grid does not say so.
- **Tell: empty cells show "5.01" in 20% grey**, eighty times.
- **Fix:** a thin violet line threads the picks made so far in true snake order, turning at row ends (the turn is a small C-arc, the logo's shape). The current cell holds the Rattler's head instead of a mint outline. Empty cells drop their labels except in your column.

### Draft complete (`draft-complete.png`, `CoilReveal.tsx`)
- This is the best screen in the app. It is drawn, it is specific, it has a line with a view ("One anchor back, then all the swings.").
- **Tell: the path is three straight rows with two arcs,** drawn in a uniform 3px line. It is a diagram of a snake, not a snake.
- **Tell: the build card is the standard navy card again.**
- **Fix:** thicken the path to body weight (8px), put the Rattler's head at pick 18 in the smug pose and the violet rattle at pick 1. The path is now literally the logo, made of your team. The build card becomes a sticker: mint fill, dark text, rotated 2 degrees, the one loud moment.

### Results weekly (`results.png`, `results/[id].tsx`)
- **Tell: seventeen identical week chips.** The ceiling week does not look different from week 5 in the strip.
- **Tell: "Finished, of 12"** is a database label.
- **Tell: two position markers per row** ("QB" slot text, then a QB pill).
- **Fix:** the chip strip becomes one coil across the screen whose hump heights are the weekly scores, with the ceiling week as the mint head. Tap a hump to select the week. Drop the duplicate slot label when it equals the position. Add a verdict line under the rank (copy table rows 14 to 18).

### Standings (`standings.png`)
- **Tell: a plain twelve-row table.** "You" is a violet word on a slightly lighter row.
- **Tell: 1st and 12th look the same.** No cut line where the money stops.
- **Fix:** draw the money line as a dashed perforation between 2nd and 3rd with a small "paid above" tag. Your row gets the Rattler chip. Last place gets the bust pose, once, small.

### Live (`live.png`, `(tabs)/drafts.tsx`)
- **Tell: three equal stats in a card** (4 Entries, $40 At stake, $30 Winning).
- **Tell: "Outside the money" three times in a column.** Week 6 of 17 and the app has already given up on your teams.
- **Tell: unlabeled coloured dots with counts** (●4 ●4 ●7 ●3). Round 1 flagged this; it survived.
- **Fix:** one number leads ("$30, on pace") and the other two become a single line under it. The season coil gets 17 humps, one per week, so "week 6" is countable. Dots become "QB 4 · RB 4 · WR 7 · TE 3" in position colours. Status copy gets a pulse (rows 19 to 21).

### Drafts, active and completed (`drafts.png`, `completed.png`)
- **Tell: three identical cards** reading "Two-Minute Drill · Entry 1/2/3 · Pick 73 of 216". Nothing distinguishes them and nothing shows progress, on the one screen that is entirely about progress.
- **Tell: 60% of the screen is empty** under them.
- **Fix:** entries are ticket stubs (section 4.2) and each carries a draft-progress coil with your picks as violet beads (P0-4).

### Rankings (`rankings.png`, `rankings.tsx`)
- **Tell: up and down arrows on every row.** Twenty arrows on screen. This is the admin-panel way to reorder.
- **Tell: initials avatars again.**
- **Fix:** drag handle (long-press to lift, haptic on pick-up and drop) with arrows kept only in the expanded row for accessibility. The tier break is good; make it a C-arc bracket in the left margin instead of a centred rule with a label, so tiers read as coils of players.

### Rename (`rename.png`, `rename.tsx`)
- **Tell: chips, input, preview list.** A form.
- **Tell: the output is the tell.** "Balanced · JAX stack: Thomas+Tuten · #3" is a generated string and looks like one.
- **Fix:** the preview rows render as the ticket stubs they will become in Drafts, so you are naming objects, not rows. Low priority; this is a power-user tool and may stay plain.

### Exposure (`exposure.png`, `(tabs)/exposure.tsx`)
- **Tell: twelve identical rows with identical bars,** all 50%.
- **Tell: the meta line is a data dump** ("ATL · 1 team · avg pick 2 · ADP 2.6 · $10").
- **Tell: the "guy" headline fires on a 2-team sample.**
- **Fix:** keep straight bars here (see the rule in section 3). Cut meta to "ATL · 1 of 2 · pick 2". Group under plain headings by how hard you lean: "All in" (60%+), "Leaning" (30 to 59%), "A taste" (under 30%). Gate the headline.

### You (`account.png`, `(tabs)/account.tsx`)
- **Tell: a settings list.** Balance, three add buttons, three label/value rows, a toggle. The screen named "You" contains nothing about you.
- **Tell: "Drafts 2 / Finished 2 / Mock fees $20"** states the obvious.
- **Fix:** one identity line computed from history at the top, in display type: "Hero RB guy. 2 drafts, 1 pod won." The Rattler sits here in the resting pose as the profile mark (the one screen where the mascot is ambient). Balance area gets the scale pattern.

### Deposit and promo detail (`deposit.png`, `promo-windup.png`)
- **Tell: Windup is a numbered list of four sentences** explaining a spring without drawing a spring. The brand's own metaphor, described in prose.
- **Tell: the promo's primary action is "Back to the lobby".**
- **Fix:** the Springback gauge (section 3.5) replaces steps 1 to 3. Deposit stays plain on purpose: money screens are flat and literal.

---

## 2. The Rattler: character system

### 2.1 Who he is

**Name: Clutch.** A clutch is what you call a nest of snake eggs, and it is what you are, or are not, with eight seconds left in round 14. The logo is "the Rattler"; the character is Clutch. Never "Clutchy", never "Mr.".

**Personality:** the veteran at the end of the bar who has watched ten thousand drafts. Patient, unimpressed, a little smug when you do well, visibly tense when you dawdle. He is on your side but he will not say so.

**Hard rules:**
1. **Clutch never speaks.** No speech bubbles, no first-person copy, no "Clutch says". The app has a voice; Clutch has a face and a rattle. This is what keeps him from becoming a chatbot mascot.
2. **One Clutch per screen, maximum,** and none on money, legal, deposit, rankings, rename or exposure.
3. **He reacts to the user's clock and the user's results only.** Never to bot picks, never to deposits, never to entering a contest. He does not celebrate spending.
4. **Six shapes, no more:** body arc, head polygon, eye, fang, three rattle segments. No limbs, no eyebrows, no hats, no seasonal costumes. Expression comes from the eye, head angle, coil tightness and the rattle.

### 2.2 Base geometry (traced from `assets/logo-mark.png`)

Build `src/components/Rattler.tsx` with `react-native-svg`, `viewBox="0 0 64 64"`. Coordinates are a starting point; snap them to the logo SVG when the logo owner supplies it.

| Part | Primitive | Resting values |
|---|---|---|
| Body | `Path`, stroke only, `strokeLinecap="butt"` | `M41.6 20.2 A18 18 0 1 0 36.2 50.9`, `strokeWidth=11`. A 240 degree arc, centre (30,34), radius 18, opening to the right. |
| Head | `Polygon`, filled, same colour as body | `36,13 50,12 61,21 51,28 39,27`. An angular wedge pointing right and slightly down, overlapping the top end of the arc. Rotation origin for all head poses: the neck at (41,20). |
| Eye | `Polygon` in the background colour (a cut-out, not a pupil) | `46,17 53,19.5 46,20.5`. A slit, sharp end toward the snout. |
| Fang | `Polygon`, body colour | `52,27.5 54.5,33 56,27`. |
| Rattle | three `Rect` capsules, violet `#7C5CFF`, in a `G` whose rotation origin is the tail end (36.2, 50.9) | sizes 5x10 `rx 2.5`, 4.5x8.5 `rx 2.2`, 4x7 `rx 2`; centres (41,50) (46.5,47) (51.5,43.5); each rotated about its own centre -20, -30, -40 degrees so they fan up and to the right. |

**Two renderings, one prop (`variant`):**
- `sticker`: dark `#0B0B14` body on a mint `#2EE6C5` rounded square (radius 28%), exactly the app icon. Used at 40 to 96px for loud moments. May be rotated up to 6 degrees.
- `line`: mint body directly on the dark background, eye cut-out in `#0B0B14`, rattle violet. Used at 20 to 40px inline (banner, list rows, tab bar).

Props: `pose`, `size`, `variant`, `animate` (default true; false under reduced motion, where every pose is a still).

### 2.3 Poses

Each pose is a delta from resting. All transitions use round 1's `spring` token unless stated.

| # | Pose | Exact drawing | Motion | Where it appears |
|---|---|---|---|---|
| 1 | **Resting** | Base geometry. | Still. Every 6 to 10 s (randomised) one rattle twitch: rattle group rotates +8 degrees and back, 120 ms. | You tab header (profile mark, `sticker`, 56px). Lobby header logo. |
| 2 | **Asleep** | Head rotated +38 degrees so the snout rests on the lower body. Eye replaced by a 7px horizontal stroke (closed lid, `strokeWidth 1.6`, round caps). Rattle group rotated +35 degrees so it lies flat. Two tiny C-arcs (radius 2 and 3, stroke 1.4, muted colour) drift up and right of the head in place of "zzz": small coils, not letters. | The whole figure scales 1.0 to 1.03 on a 3 s sine (breathing). Arcs fade and rise 6px on a 3 s loop. | Every `Empty` state (`ui.tsx`), replacing `UnwoundLine`: Drafts tabs, Exposure, queue, "nobody by that name". `line` variant, 72px, muted to 60% opacity. |
| 3 | **Rattle** (you are on the clock) | Head rotated -10 degrees (lifted). Eye slit height doubled (alert). Rattle group raised: rotated -25 degrees. Two short motion arcs either side of the rattle tip (stroke 1.4, violet, 50% opacity). | Rattle group oscillates +/-14 degrees around its raised angle, 70 ms per swing, in bursts: 6 swings, 500 ms rest. Motion arcs flicker with the bursts. Burst rate follows `breathMs`: rest shortens to 250 ms under 10 s and to 0 (continuous) under 5 s. | The "You're up." banner in `draft/[id].tsx`, left of the title, `line`, 40px. Also the Drafts tab bar badge: when any draft has you on the clock, the tab's count badge is replaced by a 14px rattle (three segments only) doing the same burst. |
| 4 | **Sweating** (your clock under `urgentAt`, 10 s on a 30 s clock) | Rattle pose, plus: eye becomes a circle r=3 (wide), body arc radius tightens 18 to 16 with stroke 12 (coiled tighter, drawn by scaling the body group to 0.9 about the centre), one teardrop (`Path`, 3x5, colour `#F4F3FF` at 80%) at (47,9). | Drop slides from (47,9) to (44,15) and fades, 900 ms loop. Rattle continuous. | Same slot as pose 3; it is a state of the banner, not a second Clutch. |
| 5 | **Strike** (your pick landed) | Three frames. *Wind* (80 ms): body scales to 0.86, head pulls back -18 degrees. *Lunge* (120 ms): head translates +10px along its facing direction, rotates +6, a second jaw polygon (`52,24 60,27 51,30`) drops 22 degrees so the mouth is open, fang visible. *Recoil*: springs back to resting with one overshoot. | Total about 450 ms. The Rigid haptic fires on the lunge frame, not on tap. | The banner slot, immediately after your pick is accepted. Then the slot hides until your next turn. Never for autopicks. |
| 6 | **Smug** (draft complete, pod won) | Head rotated -16 degrees (chin up). Eye: the slit with a flat lid, i.e. cover its top half with a body-colour rect so it reads as half-closed. Rattle upright and still at -40 degrees. A forked tongue: two 4px strokes from the snout tip (61,21) at +10 and -20 degrees, stroke 1.4, colour `#FF5C7A`. | Tongue flicks out and in once, 220 ms, then every 4 s. Nothing else moves. | Head of the draft-complete path in `CoilReveal.tsx` (at pick 18). Results hero when you finish 1st or 2nd, `sticker`, 44px, beside the rank. |
| 7 | **Shedding** (loading, refresh) | Resting figure plus a ghost: a copy of the body arc and head outline, `strokeWidth 1.5`, dashed `3 3`, no fill, 35% opacity, offset (-5,+3). | Ghost's `strokeDashoffset` animates so the dashes crawl tail-ward while the ghost drifts a further (-6,+4) and fades; 900 ms loop. Real body draws on once at mount with `strokeDashoffset` (round 1's `wind`, 700 ms). | `WindingUp` in `ui.tsx`, replacing the breathing dot. Pull-to-refresh once the threshold is crossed (section 3.4). |
| 8 | **Bust** (clock ran out, autopilot took over, last place) | Uncoiled: body drawn as a flat sagging line, `M8 44 C22 50 40 38 54 44`, stroke 9. Head at the right end rotated +20 (on the floor). Eye: two crossed 4px strokes. Rattle flat behind at the left end. | Still. One slow rattle twitch on mount, then nothing. | The autopilot banner (`draft/[id].tsx`, replacing the alert-circle icon), 28px. Standings row when you finish 12th, 24px. Used rarely enough to be funny. |

**Acceptance test for the component:** at 24px, with the screen at arm's length, poses 2, 3, 5 and 8 must be distinguishable from resting by silhouette alone. If they are not, exaggerate the head angle before adding detail.

---

## 3. The coil as the app's progress language

**The rule:** a wavy line means *something is filling or running out over time*. A straight bar means *compare these things to each other*. Exposure percentages, weeks-counted bars and anything in a column of like items stay straight, because a wavy bar cannot be compared by length. This rule is what keeps the coil from becoming decoration.

All of the following extend `src/components/SnakeFill.tsx`. Add props: `period` (px), `amp` (px), `humps` (count; overrides period as `w / humps`), `beads` (array of 0..1 positions with colour), `reverse` (drain instead of fill), `phase` (animated, for travel), `head` (`'dot' | 'rattler' | 'none'`).

### 3.1 Pick clock (`Countdown.tsx`), P0
Replace the 3px bar (lines 60 to 62) with a draining coil.
- Full width of the banner, height 16. Starts full, drains from the right; the head dot travels left toward the tail. At the tail end sit the three violet rattle segments, 10px tall.
- Calm (above `urgentAt`): `amp 2.5`, `period 40`, colour `text`. No travel.
- Urgent (below `urgentAt`): `amp` eases to 4.5 and `period` to 22 over 400 ms (the coil tightens), colour `danger`, and the wave travels toward the tail at one period per `breathMs(left)`.
- Last 3 s: the rattle segments shake on each second tick, in sync with `feel.clockTick()`.
- Not your clock: thin (`strokeWidth 1.6`), muted, no rattle, no travel. Bots do not get drama.
- Reduced motion: no travel, no tightening animation; the two states swap instantly.

### 3.2 Draft progress (`draft/[id].tsx` header, Drafts cards), P0
Replace "Round 1 of 18 · pick 2 of 216" as the only progress signal with a coil directly under the header title.
- `humps = rounds` (18): one hump per round, so the round is countable at a glance.
- Fill = `pickIndex / totalPicks`, in muted text colour (the room's progress, not yours).
- `beads` = your 18 picks at `(overallPick - 1) / totalPicks`: made picks are solid violet 3px dots, future picks are 2px hollow violet rings. Your next pick ring pulses when you are within 3 picks.
- The text stays, smaller, right-aligned on the same line as the coil's end.
- The same component at 60% scale goes on each active-draft ticket in `(tabs)/drafts.tsx`, replacing "Pick 73 of 216" as the lead.

### 3.3 Loading (`ui.tsx` `WindingUp`), P0
Clutch pose 7. Under it, the word "Winding up" with no ellipsis; the motion is the ellipsis. If a load lasts longer than 4 s, the line changes to "Still winding. The servers are in the trainer's tent."

### 3.4 Pull-to-refresh (lobby, Drafts, Live), P1
- While pulling: a straight 120px line at the top compresses into a wave. `amp = min(6, pull / 80 * 6)`, period shrinks from 60 to 20 over the same range. It is a spring being loaded by your thumb.
- At the 80px threshold: one `feel.select()` tick and the rattle segments appear at the left end.
- On release: the line snaps flat with one overshoot (`spring`), then Clutch pose 7 runs until data lands.
- Implementation note: this needs a custom header driven by scroll offset rather than the stock `RefreshControl` spinner. Check the current Expo SDK docs before choosing an approach. Do not ship a half version; the stock spinner is better than a janky custom one.

### 3.5 Springback gauge (`promo/[id].tsx`, later the You tab), P1
A spring seen side-on: a zigzag of 8 coils between two end plates, drawn as one polyline, stroke 3, mint.
- Width maps to progress toward the next payout: 100% wide at 0 Turns, 40% wide when the tier is full. Coil count is constant, so the pitch visibly tightens as you draft. Stored energy.
- Left plate is fixed and carries the tier name. Right plate carries the Turn count in the display face and moves.
- Each contest entry: the spring compresses by the earned amount with a `spring` settle and a Light haptic.
- Payout: the spring releases to full width with two overshoots over 600 ms while the paid amount counts up beside it. This is the one place in the app where something visibly springs, which is the point of the name.
- Coordinate with the springback and loyalty owners; this document only specifies the picture.

### 3.6 Tab and segment indicator (`ui.tsx` `Segmented`), P1
The 2px white underline under Players / Queue / My team / Board becomes a 1.5 period coil segment (amp 2, width = label width).
- On change: it stretches flat while travelling (`snap`, 180 ms), then re-coils on arrival with one overshoot.
- Bottom tab bar keeps round 1's mint dot. Do not add a second moving thing down there.

### 3.7 Also convert
- **Contest sheet "Seats taken" row** (`contest/[id].tsx:105`): full-width coil, the count rides above the head dot. P0, 10 minutes, the component exists.
- **Live season card** (`drafts.tsx`): `humps = 17`, one per week; future weeks are the track. P0, one prop.
- **Results week strip** (`results/[id].tsx`): one coil whose hump heights are the weekly totals (normalised to the min/max of the season), ceiling week = mint head dot with the value above it, selected week = white dot. P1.
- **My team roster path** and **board thread** (section 1). P1.

### 3.8 Do not convert
Exposure bars, weeks-counted bars, the entries stepper, switches, text-input focus rings, dividers. If every line wiggles, none of them means anything.

---

## 4. Texture and warmth

### 4.1 Break the card grid: three contest shapes
| Type | Shape | Details |
|---|---|---|
| **Flagship** (Gridiron Gauntlet) | **Ticket.** Full-bleed width, radius 22, with two semicircular notches (r=9) cut from the left and right edges at the line between the title block and the meta block, joined by a dashed perforation (`borderStyle: 'dashed'`, 1px, 30% white). | Top block: title in display 40 and the prize in mint, the screen's one loud colour. Scale pattern (4.4) clipped to the top-right corner at 6% opacity. A "Main event" sticker (4.3) overlapping the top-left corner, rotated -5 degrees. Bottom block (the stub): meta line, coil, seats left. Notches are two absolutely positioned circles in the page background colour; no SVG masking needed. |
| **Fast pods** (Two-Minute Drill, Ticket Punch) | **Card,** as today, but radius 14 and a 3px lighter surface. | The coil stays muted. A small clock glyph and "30s" in mono where the eye lands first, because speed is the product. |
| **Sit-and-go** | **Row, no card.** Hairline dividers, 56px tall. | Name, buy-in, and seats as pips: "● ● ● ○ ○ ○" for 3 of 6 seated. A room filling up is people sitting down, not a percentage. |

Result: the lobby has three visual rhythms instead of one, and a first-time user can tell what matters without reading.

### 4.2 Ticket stubs for entries (`(tabs)/drafts.tsx`)
Each entry in Active, Completed and Live is a stub: 64px left tab holding the entry number in display 32 (or the finishing rank once final), a vertical dashed perforation with half-circle notches top and bottom, then the body. Completed stubs get a punched hole (a 10px circle in the background colour) through the left tab. Entries from the same contest overlap by 8px like a fanned hand of tickets, which also solves the "three identical cards" problem by making sameness the joke.

### 4.3 Stickers and tape
- **Sticker:** filled shape, 2px `#F4F3FF` outline, rotated 3 to 6 degrees, hard offset shadow (2px down-right, black 40%, no blur). Text in the display face. Uses: "Main event" on the flagship, the build name on draft complete ("Hero RB"), "Sprung" on a 25+ point starter (replace the mint text tag), "Paid" on a cashing team.
- **Tape:** a 44x14 strip, off-white at 14% opacity, rotated -8 degrees, with pinked (zigzag) short ends, overlapping a card's top edge. Uses: "soon" on NBA and MLB chips, "mock" on the balance.
- Limit: one sticker and one tape per screen. Rotation angles come from a fixed list of four, picked by item index, so they look placed by hand and do not change between renders.

### 4.4 Scale pattern
Derived from the logo's C-arc. New `src/components/ScalePattern.tsx`: a `react-native-svg` `Pattern`, tile 16x12, containing `M0 12 A8 8 0 0 1 16 12` (stroke 1, `#F4F3FF`), with alternate rows offset by 8px so the arcs overlap like scales. Rendered at 4 to 6% opacity, always clipped to a corner or a band and faded with a linear opacity mask toward the content. Uses: flagship ticket corner, draft-complete header band, You balance block, splash. Never as a full-screen background and never under body text.

Grain: a single 128px tiled noise PNG at 3% over `bg` is a cheap P1 that removes the flat digital black. Skip it if it costs a frame on Android lists.

### 4.5 One loud moment per screen
| Screen | The loud thing | Everything else |
|---|---|---|
| Lobby | Flagship prize, mint | Other prizes go to `text`, not bold white display |
| Contest | The Draft button | Prize in white |
| Draft room | Clutch + the clock coil when you are up; nothing when you are not | Draft pills stay quiet |
| Draft complete | The build sticker | Buttons: mint primary stays, but smaller |
| Results | The rank | Total points drops to 70% size |
| Live | "On pace" money | The 4 / $40 line is muted |
| You | The identity line | Balance stays big but white |

Round 1 gave every screen a 40px white number in the same face. When every screen shouts the same way, it is a template.

### 4.6 Numbers with personality
- **Ranks:** numeral in display, ordinal suffix at 45% size, raised and underlined like a scoreboard ("1" with a small raised "st"). 1st and 2nd mint, in the money violet, the rest `textMuted`. Last place is struck through once, lightly.
- **Points:** integer part large, decimal at 55% size and 60% opacity ("2367" then ".7"). Applies to `formatPts` call sites in results and live.
- **Money:** the "$" at 60% size, top-aligned. "$3M" keeps its compact form on cards; on the ticket, add the full "$3,000,000" in mono under it, because the long number is the thrill.
- **Pick numbers:** "1.04" becomes a two-part tag, round in a small filled square and pick beside it, the way a draft card prints it.
- **Counts that change** (balance, picks away, seats left) roll vertically, digit by digit, 180 ms. The "picks away" number in the banner should tick down like a scoreboard, not swap.
- **Seats left:** above 1,000, compact ("53.7K seats left"). Under 100, exact, and the line changes ("87 seats. Going.").
- Keep the slashed zero in the mono face. It is one of the few accidental bits of character already present.

### 4.7 Copy with a point of view

Voice update to round 1's rules: snake language is now allowed, because the logo is one. Limits: one snake word per screen at most, never "sss", never a pun on a player's name, and Clutch himself never speaks. Money, mock-currency and legal lines remain flat and unchanged; none are touched below. No exclamation marks, no em-dashes.

| # | File | Old | New |
|---|---|---|---|
| 1 | `src/data/promos.ts:52` | `Earn Turns, get Springback` | `The rake bites. Springback bites back.` |
| 2 | `src/data/promos.ts:53` | `Every draft winds the spring. Springback pays some of your fees back.` | `Every entry winds the spring. Every week it pays some fees back.` |
| 3 | `src/data/promos.ts:67` | `Refer a friend` | `Bring the group chat` |
| 4 | `src/data/promos.ts:68` | `They draft once, you both get $25 in mock credit.` | `They draft once, you each get $25 in mock credit. Then you get to beat them.` |
| 5 | `src/data/promos.ts:44` | `$25 to draft. 12-team pods, top 2 move on.` | `$25 a seat. Win your pod or run second and you're still alive.` |
| 6 | `src/app/promo/[id].tsx:47` | `Back to the lobby` (primary button) | `Got it. Find a pod` |
| 7 | `src/app/contest/[id].tsx:156` | `${n} pods open at once. Find them in Drafts.` | `${n} rooms, ${n} clocks. They're all in Drafts.` |
| 8 | `src/app/contest/[id].tsx:163` | `Uses your ${listName} list. Done in seconds.` | `Your ${listName} list drafts for you. Over in seconds, no take-backs.` |
| 9 | `src/app/contest/[id].tsx:105` | `Seats taken` | `Seats gone` |
| 10 | `src/app/draft/[id].tsx:254` | `You're next. Get ready.` | `You're next. Have a name ready.` |
| 11 | `src/app/draft/[id].tsx:270` | `{n} missed in a row. Autopilot's got it, queue first.` | `{n} missed in a row. Autopilot has the wheel.` |
| 12 | `src/app/draft/[id].tsx:365` | `They may already be drafted.` | `Probably gone. Check the board.` |
| 13 | `src/store/useApp.ts:370` | `Clock ran out. Autopick took ${who}.` | `Clock won. Autopick took ${who}.` |
| 14 | `src/app/results/[id].tsx:68` | `Finished, of {teams}` | `of {teams} in your pod` plus a verdict line, rows 15 to 18 |
| 15 | `src/app/results/[id].tsx` (new, rank 1) | none | `Pod's yours.` |
| 16 | `src/app/results/[id].tsx` (new, rank 2) | none | `Second. Pays the same in round one.` |
| 17 | `src/app/results/[id].tsx` (new, ranks 3 to 11) | none | `{n} points short. Blame round {worstRound}.` (the round whose pick scored furthest below its slot's pod average; fall back to `Outdrafted. It happens.`) |
| 18 | `src/app/results/[id].tsx` (new, last) | none | `Dead last. Somebody had to.` |
| 19 | `src/app/(tabs)/drafts.tsx:329` | `Outside the money` | before the final week: `{gap} pts back`; at final: `Missed the cut` |
| 20 | `src/app/(tabs)/drafts.tsx:329` | `Advancing · $30` | `Through · $30` |
| 21 | `src/app/(tabs)/drafts.tsx:278-279` | `At stake` / `Winning` | `Paid in` / `On pace for` |
| 22 | `src/app/(tabs)/drafts.tsx:161` | `Autodrafting from your rankings` | `Your list is driving` |
| 23 | `src/app/(tabs)/drafts.tsx:106` | `No finishes yet.` / `Draft a team and play the season out.` | `No scars yet.` / `Draft a team. The season will hand you some.` |
| 24 | `src/components/draft/QueueList.tsx:34` | `Star a few guys. If your clock runs out, autopick starts here.` | `Flag a few guys. If the clock beats you, autopick starts here.` |
| 25 | `src/app/(tabs)/account.tsx:83` | `A knock when you're up, a snap when your pick lands.` | `A rattle when you're up. A snap when your pick lands.` |

Bonus, same pass: the bot lines in `src/lib/banter.ts` are the best writing in the app, except the six that are meme templates. Replace those:

| Bot | Old | New |
|---|---|---|
| HeroRB | `One back to rule them all.` | `One back. The rest of you can fight over the committee guys.` |
| HeroRB | `Hero acquired.` | `Anchor's down. Receivers till round 9.` |
| CorrelationKing | `Stacked like pancakes.` | `If he eats, they both eat.` |
| TEPremium | `Positional advantage, baby.` | `Your tight end is a guy named Tyler. Mine isn't.` |
| EliteTE | `TE1 energy.` | `Enjoy rounds 12 through 15 at tight end.` |
| AdvanceRate | `Optimizing the funnel.` | `Second place advances too. Read the payouts.` |

And `exposure.tsx:51`: with fewer than 3 teams, replace the "guy" headline with `Two teams in. Too early to call you anything.`

---

## 5. Sound and haptic identity

Coil's signature is the **rattle**, and it replaces round 1's "double knock" as the your-turn alert. In haptics it is a burst of six `selectionAsync()` ticks 45 ms apart (a dry buzz, not a thud), followed 120 ms later by one `Rigid` impact as Clutch lifts his head; add it as `feel.rattle()` in `src/lib/feel.ts` and call it from `feel.yourTurn()`. Under 10 seconds the burst repeats once in place of the Warning notification, and for each of the last three seconds a three-tick burst replaces the single tick, so urgency is felt as the rattle speeding up, in step with the coil tightening and the tail shaking on screen. A landed pick is the strike: one `Rigid` on the lunge frame, nothing else. Draft complete is a single `Success` and then silence, because Clutch is smug, not excited. In sound (still off by default, still three sounds), the rattle is a real one: a 350 ms dry shaker recorded from a maraca or seed pod, pitched down slightly, never a synthesised buzz; the pick is a short woody snap; draft complete is the rattle played once, slowly, like a nod. Nothing ever plays for bots, money, navigation or promotions, and the whole system honours the Haptics toggle, silent mode and reduced motion. The test of success is that a user with the phone face down knows it is their pick, and knows how much time is left, without looking.

---

## 6. Ranked backlog

### P0: about 3.5 hours, no new dependencies (`react-native-svg` and `Animated` are already in use)

| ID | Item | Files | Est. |
|---|---|---|---|
| **P0-1** | **`Rattler` component.** Base geometry, `variant` (`sticker`/`line`), poses 1 resting, 2 asleep, 3 rattle, 4 sweating, 5 strike, 6 smug, 8 bust as static deltas, with the rattle oscillation and strike sequence animated. Reduced motion gives stills. Pose 7 can ship as resting plus the draw-on. | new `src/components/Rattler.tsx`; `src/theme/motion.ts` for the burst timings | 40 min |
| **P0-2** | **Rattle on the clock.** Clutch in the "You're up." banner: rattle on turn start, sweating under `urgentAt`, strike on a landed pick, bust in the autopilot banner. Add `feel.rattle()` and route `yourTurn`, the warning and the last-three ticks through it. Drafts tab badge becomes a shaking rattle when you are on the clock. | `src/app/draft/[id].tsx`, `src/components/draft/Breath.tsx`, `src/lib/feel.ts`, `src/app/(tabs)/_layout.tsx`, `src/components/icons/index.tsx` | 30 min |
| **P0-3** | **Coil pick clock.** `SnakeFill` gains `period`, `amp`, `humps`, `beads`, `reverse`, `phase`. `Countdown` swaps its bar for the draining, tightening coil with the rattle at the tail (section 3.1). | `src/components/SnakeFill.tsx`, `src/components/draft/Countdown.tsx` | 30 min |
| **P0-4** | **Draft progress coil with your picks as beads.** Under the draft header (18 humps, violet beads) and on each active-draft row. Also the two one-prop conversions: 17 humps on the Live season card, and the contest sheet's "Seats gone" row as a coil. | `src/app/draft/[id].tsx`, `src/app/(tabs)/drafts.tsx`, `src/app/contest/[id].tsx` | 25 min |
| **P0-5** | **Clutch in empty and loading states.** `Empty` uses pose 2 in place of `UnwoundLine`; `WindingUp` uses the draw-on Rattler and drops the ellipsis; the 4-second fallback line. | `src/components/ui.tsx` | 15 min |
| **P0-6** | **Break the lobby grid.** Flagship as a ticket (notches, perforation, mint prize, "Main event" sticker, scale-pattern corner); fast pods as tighter cards with white prizes; sit-and-go as pip rows. Add `Sticker` and `ScalePattern`. | `src/components/ContestCard.tsx`, new `src/components/ScalePattern.tsx`, `src/components/ui.tsx` (`Sticker`), `src/app/(tabs)/index.tsx` | 40 min |
| **P0-7** | **Draft complete and results get a face and a verdict.** Reveal path at body weight with the smug head at pick 18 and the rattle at pick 1; build name as a sticker. Results hero: verdict line per rank, Clutch smug for 1st/2nd and bust for last, small-decimal points, raised ordinal. | `src/components/draft/CoilReveal.tsx`, `src/app/results/[id].tsx`, `src/components/ui.tsx` (`formatPts` presentation helper) | 25 min |
| **P0-8** | **Copy pass.** The 25 rows in 4.7, the six banter lines, the exposure gate (3+ teams) and its fallback line. Legal and mock strings untouched. | files listed in 4.7; `src/lib/banter.ts`; `src/app/(tabs)/exposure.tsx` | 25 min |

Then re-shoot every screenshot. Several current captures are stale or duplicated.

### P1: next 2 to 3 days
1. Ticket-stub entries in Drafts with fanned overlap and punched completed stubs (4.2). `(tabs)/drafts.tsx`.
2. Jersey-tag avatar fallback replacing initials circles. `PlayerAvatar.tsx`. Also find out why no headshot loaded in any capture.
3. Springback gauge (3.5). `promo/[id].tsx`, with the springback owner.
4. Results week strip as a scored coil (3.7). `results/[id].tsx`.
5. My team as an 18-slot roster path; board snake thread with the head on the current cell. `MyTeam.tsx`, `BoardGrid.tsx`.
6. Coil segment indicator (3.6). `ui.tsx` `Segmented`.
7. Pull-to-refresh (3.4). Lobby, Drafts.
8. Contextual Draft button (filled only on the row you are about to take) and drag-to-reorder in rankings. `PlayerRow.tsx`, `rankings.tsx`.
9. Rolling digits for balance, picks away and seats left. `ui.tsx`.
10. You tab identity line and exposure grouping ("All in / Leaning / A taste"). `account.tsx`, `exposure.tsx`.
11. Rattle, snap and nod sound files behind the existing off-by-default toggle. `src/lib/feel.ts`.
12. Standings money line as a perforation; tape on "soon" chips; grain tile.

### Deliberately not doing
- **No confetti, coins, fireworks or streak flames.** Robinhood removed confetti under regulatory and press scrutiny in 2021, and this is a paid-entry contest product. Clutch reacts to drafting and results, never to deposits or entries.
- **No mascot on every screen.** One Clutch per screen, none on deposit, legal, rankings, rename or exposure. A mascot that is always present becomes wallpaper within a week, and then an irritant.
- **Clutch does not talk.** No speech bubbles, no tips, no push notifications written in his voice, no guilt.
- **No ambient animation.** Nothing loops unless the user is on the clock or something is loading. The idle rattle twitch on the You tab is the single exception.
- **No wavy version of comparison bars.** Exposure stays straight.
- **No gradients, glows, glass or 3D renders.** Cash App's 3D works because a studio built a full system for it; a few generated 3D snakes would be the most obvious tell possible. Flat shapes from the logo's own geometry only.
- **No second accent.** Mint is action, violet is you and the rattle, position colours are positions. The tongue's red appears in one pose.
- **No costumes or seasonal variants** until the eight poses have shipped and survived a season.
- **No more than one sticker and one tape per screen,** and no rotation on anything a user must read quickly (clock, player names, money).
- **No snake puns on player names, no "sss".** One snake word per screen.
- **No texture on money or legal surfaces.** Deposit and disclosures stay plain; that plainness is part of being trusted.

### Acceptance
Round 1's squint test, tightened: cover the logo and the wordmark on the new `lobby.png`, `draft-room.png` (on the clock) and `drafts.png`. Someone who has seen the app icon once should be able to say which app it is from the shapes alone. Today they could not.

---

## References
- Duolingo, shape language and character guidelines: https://blog.duolingo.com/shape-language-duolingos-art-style/ and https://design.duolingo.com/illustration/characters
- Buck, Cash App illustration system: https://buck.co/work/cash-app-illustration-system
- Robinhood confetti removal: https://www.bloomberg.com/news/articles/2021-03-03/robinhood-weighs-scrapping-its-confetti-animation-after-scrutiny and https://www.bankingdive.com/news/robinhood-axes-its-signature-celebratory-confetti-displays/597647/
- De-slop checklists, 2026: https://uxdesign.cc/how-to-de-slopify-your-designs-4c40c57c1dc9 , https://robotsonpayroll.substack.com/p/how-to-avoid-that-vibe-coded-look , https://www.superdesign.dev/blog/why-ai-design-looks-generic
- Round 1 sources (Sleeper, Linear, Rauno, Apple HIG) remain valid; see `docs/personality-spec.md`.

Note on sources: the search tool returned titles and links only, so the points attributed to these pages are their well-known positions, not fresh quotations.
