# Coil personality spec

**Status:** proposal, Nov 2026. **Scope:** UX/CX feel. No code was changed.
**Inputs:** screenshots in `screenshots/` (lobby, contest, draft-room, board, results, exposure, account, drafts), all of `src/app` and `src/components`, and the "Coil" section of `/mnt/project-files/bestball/brand-options.md`.

**Diagnosis in one line:** Coil works correctly, but it looks and sounds like a default build. It uses the system font, puts the same violet on every button, wraps every fact in a box, uses unicode glyphs for icons, and has no motion, haptics or sound. Its copy is either neutral or written in the voice of an engineering note. The brand idea (a snake draft that coils, then springs) is strong and appears nowhere outside the logo PNG.

> **About sources:** the search tool couldn't return Reddit or X threads directly. The checklist therefore relies on designer essays and audits from 2025–2026 that collect those discussions, plus primary sources: Apple HIG, Expo docs, and interviews with Sleeper and Linear. Every claim below links to its source.

---

## 1. "AI tells" checklist

Legend: **YES** = Coil shows it now · **PARTIAL** = Coil partly shows it · **no** = Coil doesn't show it (keep it that way).

| # | Tell | Source | Coil now | Evidence |
|---|---|---|---|---|
| 1 | Inter or the system sans used for everything, with no display face | [DevelopersDigest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it), [925 Studios](https://www.925studios.co/blog/ai-slop-design-tells), [Mania](https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/) | **YES** | `src/` has no `fontFamily` anywhere. Every screenshot uses the platform sans. The lobby wordmark "Coil" is typed in system bold (`(tabs)/index.tsx` `brand` style), not the lowercase geometric wordmark the brand doc specifies. |
| 2 | The usual "tasteful" AI font pairings: Space Grotesk, Geist, Instrument Serif | [DevelopersDigest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it), [avoid-ai-design](https://github.com/funboy322/avoid-ai-design) | **Risk** | `brand-options.md` recommends **Space Grotesk + Inter**, which is the exact pairing these lists flag. Don't ship it (see §2.5). |
| 3 | "VibeCode purple": indigo/violet as the default primary on every CTA | [DevelopersDigest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it), [dev.to "AI purple problem"](https://dev.to/jaainil/ai-purple-problem-make-your-ui-unmistakable-3ono), [robotsonpayroll](https://robotsonpayroll.substack.com/p/how-to-avoid-that-vibe-coded-look) | **YES** | draft-room.png shows 7 identical `#7C5CFF` "Draft" buttons. The same violet fills the Enter CTA, active chips, segment badges, the on-the-clock banner, toggles and the active tab. Violet means "click", "selected", "you" and "urgent" all at once, so it means nothing. |
| 4 | Always-dark UI with mid-grey body text and ALL-CAPS micro-labels | [DevelopersDigest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it) | **YES** | `MOCK` (lobby), `SORT` (draft-room), `FAST · 30s` and `FLAGSHIP` badges, `FAST DRAFT · 30s PICK CLOCK` (contest.png). `textMuted #9A98B8` carries most of the text. |
| 5 | A badge sitting directly above the headline | [DevelopersDigest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it), [superdesign](https://superdesign.dev/blog/why-ai-design-looks-generic) | **YES** | `FLAGSHIP` + `SLOW · 8h` sits above "The Gridiron Gauntlet" (lobby.png), and a kicker sits above "Two-Minute Drill" (contest.png). Source: `ContestCard.tsx` `badges`. |
| 6 | Rows of identical stat tiles | [DevelopersDigest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it) | **YES** | Every ContestCard repeats the same four columns: Entry / Teams / Rounds / Max entries. "Teams 12, Rounds 18" is the same on every card, so it tells the user nothing. Account has 3 stat cards and contest has a 2×2 info grid. |
| 7 | A card around every block, with cards nested in cards | [Fountain Institute](https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui) | **YES** | account.png has the MockNote box inside the balance Card, plus a stats row of 3 cards. contest.png has 5 bordered boxes before the copy starts. results.png puts 2 hero boxes around 2 numbers. |
| 8 | Colored accent stripe on one edge of a card | [DevelopersDigest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it), [robotsonpayroll](https://robotsonpayroll.substack.com/p/how-to-avoid-that-vibe-coded-look), [Fountain](https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui) | **YES** | `PickStrip.tsx` uses `borderLeftColor: color, borderLeftWidth: 3` (board.png "3.11 Flowers"). `results/[id].tsx` `counted` uses `borderLeftWidth: 3, borderLeftColor: c.accent` (results.png mint stripe on every starter). |
| 9 | One radius, one padding, one weight everywhere, so nothing leads | [superdesign](https://superdesign.dev/blog/why-ai-design-looks-generic), [Mania](https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/) | **YES** | Radii are 16/14/12/10 on every surface. Card padding is 14. `fontWeight: '800'/'900'` appears on almost every label, so bold stops working as emphasis. |
| 10 | Emoji or unicode glyphs as icons, with no icon system | [Fountain](https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui), [robotsonpayroll](https://robotsonpayroll.substack.com/p/how-to-avoid-that-vibe-coded-look) | **YES** | Tabs use `◆ ▤ % ●` (`(tabs)/_layout.tsx` `GLYPH`). The queue star is `☆/★` (`PlayerRow.tsx`). `▲ ▼ ✕` appear in `QueueList.tsx`, `‹ ›` chevrons in the draft and results headers and in drafts.tsx, `✕` in contest, and `!` in `MockNote`. |
| 11 | Small colored dots that don't map to a state anyone can read | [Fountain](https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui) | **PARTIAL** | drafts.png shows 18 unlabeled 8px position squares per row. They encode QB/RB/WR/TE, but nobody can read that at 8px. The brand swatch dots in account.png are a dev tool. |
| 12 | No motion at all, or the same fade on everything | [Mania](https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/) | **YES** | `src/` has no `Animated` or `reanimated` imports. Only `Button` has a 0.98 press scale. The 30s clock is a static bar that re-renders every 250ms (`Countdown.tsx`). |
| 13 | No haptics. Loved apps use them on pick-up and drop | [Apple HIG: Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics.md), [MacStories on Things 3](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/) | **YES** | `expo-haptics` isn't installed. Drafting a player, which is the app's core verb, gives no physical feedback. |
| 14 | Loading, empty and error states skipped or left generic | [Mania](https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/), [UXTeam](https://www.uxteam.com/ai-copy-fixes/) | **YES** | `'Loading…'` and `'Draft not found'` (`results/[id].tsx`, `draft/[id].tsx`). A pick error is plain red text in a box. Empty states are a centered title, body and button with no illustration or brand. |
| 15 | Vague action verbs where verb + object belongs | [UXTeam](https://www.uxteam.com/ai-copy-fixes/) | **YES** | "Results", "Turn off", "Go to lobby", "Back", "Find a draft", and `Enter · $10`. |
| 16 | Em-dash habit in UI strings | [UXTeam](https://www.uxteam.com/ai-copy-fixes/) | **YES** | `drafts.tsx` "Join a draft from the lobby — fast drafts…", `draft/[id].tsx` "Autopilot on — you missed…", `useApp.ts` "Time's up — your pick…" and "Still loading your account — try again", `contest/[id].tsx` "Mock currency – no real money". |
| 17 | The same object called different names | [UXTeam](https://www.uxteam.com/ai-copy-fixes/) | **YES** | "Drafts" is both the lobby section of contests and the tab of your teams. The same feature appears as "Autodraft", "Autopick", "autopilot" and "· auto". "Prizes" (card) and "Prize pool" (detail) both appear. "Pod finish" and "Standings" both describe your finishing position. |
| 18 | Builder leftovers and default identity visible to users | [axonbuild](https://axonbuild.com/blog/how-to-tell-if-an-app-was-vibe-coded/), [AskCodi](https://askcodi.substack.com/p/the-ai-ui-problem-nobody-talks-about) | **YES** | account.png shows "Brand options (preview)" with 3 competitor themes and the text "set in one line (ACTIVE_BRAND)". The persist key is `bestball-app-v1` (`useApp.ts`). |
| 19 | Everything visible at once, with no progressive disclosure | [Mania](https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/) | **YES** | In draft-room.png the first player row starts about halfway down the screen. Header, banner, two toggles, pick strip, segmented control, search + sort and position chips all come first. "Fast bots" is a dev or power setting that sits on every pick. |
| 20 | Numbers formatted carelessly | [Rauno: Invisible details](https://rauno.me/craft/interaction-design) (craft lives in details) | **YES** | results.png shows "143.70 pts", "144" and "157.2" for the same kind of number. drafts.png shows the raw date "11/14/2026". The ADP numbers aren't tabular. |
| 21 | Feels like a spreadsheet, not a hangout | [SGX Sleeper report](https://sgx.studio/product-intelligence/report-sleeper/), [Expa on Sleeper](https://www.expa.com/news/founder-spotlight-sleeper) | **YES** | Bots are only names. There are no reactions, no team identity and nothing to share. The best part of the voice, bot names like `ChalkEater`, `FadeTheField` and `LateRoundQB` in `useApp.ts BOT_NAMES`, is wasted. |
| 22 | Generic confetti-style celebration | [CNBC: Robinhood drops confetti](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html) | no (no celebration at all) | Guardrail: in a money-adjacent product, generic confetti reads as cheap at best and manipulative at worst. Celebrate **the team you built**, not the fact that you spent money (§2.7). |
| 23 | Decorative gradients and glows | [Fountain](https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui), [925 Studios](https://www.925studios.co/blog/ai-slop-design-tells) | no | Keep it that way. The one glow allowed is the on-the-clock pulse, because it means something. |

**Score: 18 of 23 present.** Keep #2, #22 and #23 as guardrails.

---

## 2. The Coil personality system

### 2.1 Character

The brand doc already says it: **"a sharp friend in your draft group chat. Confident, quick, a little wry. Gets excited about variance."** These rules make that operational.

**What fans actually love, and what we borrow from each**

- **Sleeper:** chat-first, with avatars that react to wins and losses. The app "feels like a live hangout rather than a spreadsheet" ([SGX](https://sgx.studio/product-intelligence/report-sleeper/), [Expa](https://www.expa.com/news/founder-spotlight-sleeper)). *Borrow:* bots with personality and reactions.
- **Underdog:** a committed point of view and a running gag in its marketing (dog puns everywhere, "everybody's got a little underdog in them") ([Marketing Brew](https://www.marketingbrew.com/stories/2023/11/01/a-challenger-fantasy-sports-brand-plans-to-take-on-the-big-dogs)). *Borrow:* one metaphor used relentlessly. Ours is **coil / spring / path**.
- **Things 3:** pick-up and drop haptics, plus a task "pops into a card while the rest fades back" ([MacStories](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/)). *Borrow:* a physical draft action.
- **Duolingo, Strava, Arc, Linear:** a streak counter that "rolls over with a bouncy, physical motion", dropped tabs that "snap into place with an elastic bounce", and Linear cards that "settle with a soft bounce" ([Tim Graf roundup](https://timgraf.com/ux-design/the-design-of-joy-how-10-top-apps-use-micro-interactions-to-create-real-moments-of-user-delight/)). *Borrow:* every important number moves physically when it changes.
- **Linear:** "Design for a specific user… opinionated products perform better" and "increase quality by reducing scope" ([Figma / Karri Saarinen](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/)). *Borrow:* cut chrome from the draft room before adding delight.
- **Robinhood:** confetti for first trades was removed after the gamification backlash ([CNBC](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html)). *Avoid:* celebrating spending.

### 2.2 Voice and tone rules

1. **Talk like the group chat, not the help center.** Use second person and contractions. Keep it to 8 words or fewer where possible.
2. **Specific beats clever.** Name the player, the number and the pick. "Puka's top of your queue" beats "Your queue is ready".
3. **One metaphor family only:** coil, wind, spring, path, snap. Never snake puns (that's the Snakebite brand). Never dog puns (that's Underdog).
4. **Excited about variance, calm about money.** Ceiling weeks get the energy. Balances, fees and legal text are flat and literal.
5. **No em-dashes, "Oops", exclamation marks or emoji in system copy** ([UXTeam](https://www.uxteam.com/ai-copy-fixes/)). Use periods.
6. **Verb + object on every button:** "Draft Chase", "Play the season", "Find a pod".
7. **Sentence case everywhere.** Caps are allowed only in position pills (QB/RB/WR/TE) and pick numbers.
8. **One name per thing:** *pod* (a 12-team draft), *contest* (the tournament), *autopick* (one missed pick), *autopilot* (2+ missed picks), *queue*, *ceiling week*.
9. **Legal and mock-currency disclosures are not voice surfaces.** Keep their meaning word for word and only strip the dashes. The compliance owner signs off.
10. **Wry, never mean to the user.** Bots can get roasted. The user can't.

### 2.3 Microcopy rewrites (real strings in the source)

| # | File | Old | New |
|---|---|---|---|
| 1 | `src/app/(tabs)/index.tsx` | section `Drafts` | `Pick a pod` (frees "Drafts" for the tab) |
| 2 | `src/app/(tabs)/index.tsx` | chips `Fast` / `Slow` | `30s picks` / `8h picks` (concrete, which is what drafters actually filter on) |
| 3 | `src/components/ContestCard.tsx` | `{filled} / {max} filled` | `{max-filled} seats left` (urgency from real data; full count goes to detail) |
| 4 | `src/components/ContestCard.tsx` | `{n} entered` | `You're in ×{n}` |
| 5 | `src/components/ContestCard.tsx` | badge `FLAGSHIP` | `Main event` (sentence case, no badge above title; render inline right of title) |
| 6 | `src/app/contest/[id].tsx` | `How it works` | `Draft once. That's the whole job.` |
| 7 | `src/app/contest/[id].tsx` | `Enter · $10` | `Draft for $10` |
| 8 | `src/app/contest/[id].tsx` | `Insufficient mock balance` | `You're $X short (mock). Top up in You.` |
| 9 | `src/app/contest/[id].tsx` | `Max entries reached` | `All 20 of your entries are in` |
| 10 | `src/app/draft/[id].tsx` | `You're on the clock` + `Tap Draft on any player` | `You're up.` + `{N} seconds. Make it count.` (brand-doc line) |
| 11 | `src/app/draft/[id].tsx` | `Queue: {name} is up first` | `Queue says {name}. Your call.` |
| 12 | `src/app/draft/[id].tsx` | `{name} is picking` / `Your pick in {n}` / `You're up next` | `{name} is on the clock` / `{n} picks till you` / `You're next. Get ready.` |
| 13 | `src/app/draft/[id].tsx` | `No picks left for you` | `Roster's full. Sit back.` |
| 14 | `src/app/draft/[id].tsx` | `Draft complete` / `Your team is locked. See how the season plays out.` / button `Results` | `Coiled and loaded.` / `18 picks, zero lineups to set.` / `Play the season` |
| 15 | `src/app/draft/[id].tsx` | `Autopilot on — you missed {n} picks in a row, so we're drafting for you.` / `Turn off` | `{n} missed in a row. Autopilot's got it, queue first.` / `Take it back` |
| 16 | `src/app/draft/[id].tsx` | toggle `Fast bots` | move into a "⋯" sheet as `Speed up the bots` (it's not a per-pick decision) |
| 17 | `src/app/draft/[id].tsx` | `No players match` / `Try a different search or position.` | `Nobody by that name left.` / `They may already be drafted.` |
| 18 | `src/store/useApp.ts` | `Time's up — your pick was made automatically` | `Clock ran out. Autopick took {player}.` |
| 19 | `src/store/useApp.ts` | `Not enough mock balance — add funds in Account` | `You're $X short (mock). Top up in You.` |
| 20 | `src/store/useApp.ts` | `Still loading your account — try again` / `Pick failed` | `One sec, still loading.` / `That pick didn't go through. Try again.` |
| 21 | `src/components/draft/QueueList.tsx` | `Your queue is empty` / `Tap ☆ on any player…` | `Queue's empty.` / `Star a few guys. If your clock runs out, autopick starts here.` |
| 22 | `src/components/draft/QueueList.tsx` | `Autopick takes the first eligible player in your queue.` | `Top of the queue goes first.` |
| 23 | `src/components/draft/MyTeam.tsx` | `No players yet` / `None yet` | `Your first pick lands here.` / `Open` |
| 24 | `src/components/draft/PickStrip.tsx` | `· NOW` / `on the clock` / `upcoming` | remove `NOW` (the pulse says it) / `picking` / *(blank)* |
| 25 | `src/app/(tabs)/drafts.tsx` | `My drafts`; empty `No live drafts` / `Join a draft from the lobby — fast drafts finish in minutes.` / `Go to lobby` | `Your drafts`; `Nothing on the clock.` / `30-second pods fill fast. You'll be picking in a minute.` / `Find a pod` |
| 26 | `src/app/(tabs)/drafts.tsx` | `No completed teams yet` / `Finish a draft and your simulated season shows up here.` | `No teams in the books.` / `Finish a draft and we'll play out the whole season.` |
| 27 | `src/app/(tabs)/drafts.tsx` | `On the clock` / `Up in {n}` / `Filling…` / raw `toLocaleDateString()` | `You're up` / `{n} picks away` / `Finding drafters…` / `Today`, `Yesterday`, `Nov 12` |
| 28 | `src/app/results/[id].tsx` | `Pod finish` / `best week 157.2` | `Finished` / `Ceiling: W2 · 157.2` |
| 29 | `src/app/results/[id].tsx` | `Week 1 · 143.70 pts · highlighted players counted` | `Week 1 · 143.7 · these 8 counted` (one decimal everywhere) |
| 30 | `src/app/results/[id].tsx` | `Weeks counted · points contributed to your total` | `How often each guy made your lineup` |
| 31 | `src/app/(tabs)/exposure.tsx` | `No exposure yet` / `Complete a draft and we'll track…portfolio…` | `Clean slate.` / `Draft a team and we'll show who you keep coming back to.` |
| 32 | `src/app/(tabs)/exposure.tsx` | header `2 completed teams · $15 mock entry fees` | `2 teams · $15 in (mock)` + call-out when any player is 50% or more: `You're the Marvin Mims guy. 100%.` |
| 33 | `src/app/(tabs)/_layout.tsx` | tab `Account` | `You` |
| 34 | `src/app/(tabs)/account.tsx` | `Reset mock account` | `Start over` + confirm `Wipe 2 drafts and reset your $985 mock balance? Can't undo.` |
| 35 | `src/app/draft/[id].tsx`, `results/[id].tsx` | `Loading draft…` / `Loading…` / `Draft not found` | `Winding up…` / `Winding up…` / `That draft's gone.` + `Back to your drafts` |

### 2.4 Motion language: "wind, then release"

Every motion should read as **tension stored, then released**. Elements gather slightly (scale down or delay), then spring out along a path. We never fade things in for decoration. Motion is interruptible and comes from where the content lives ([Rauno](https://rauno.me/craft/interaction-design)).

**Tokens** (add as `src/theme/motion.ts`):

| Token | Value | Use |
|---|---|---|
| `tap` | 90 ms, `Easing.out(Easing.quad)`, scale 0.96 | any Pressable press-in |
| `snap` | 180 ms, `Easing.bezier(0.22, 1, 0.36, 1)` (out-quint) | chip/segment selection, star toggle, row removal |
| `spring` | Reanimated `withSpring({ damping: 14, stiffness: 220, mass: 0.9 })` (≈1 overshoot) | pick confirm, number roll-ups, banner enter |
| `settle` | 280 ms out-quint | sheet/modal content, tab content swap (translateX 12 → 0 + opacity, from the side of the tapped tab) |
| `wind` | 600–900 ms, `Easing.inOut(Easing.cubic)` | draw-on of the draft path (SVG `strokeDashoffset`) and draft-complete only |
| `breath` | 1200 ms loop, sine; 600 ms under 10 s; 300 ms under 5 s | on-the-clock pulse only |

**What moves, and when**

- **Moves:** the on-the-clock state, your pick landing, the pick strip auto-advancing (`scrollToIndex` animated with `snap`), number changes (balance, countdown, points with a vertical roll), and the draft path drawing on at complete.
- **Doesn't move:** list rows on scroll, tab bar, legal text, anything that happens more than about 10 times a minute. A bot pick in fast mode only gets a 180 ms color fill on its strip cell, with no translate. Restraint for frequent actions follows [Rauno](https://rauno.me/craft/interaction-design).
- **Reduced motion:** `useReducedMotion()` (Reanimated) turns `spring` and `wind` into 0 ms and `breath` into a static mint border.
- **Library:** `react-native-reanimated` is already in `node_modules` as a transitive dependency but not declared. Add it with `npx expo install react-native-reanimated`. It's bundled in Expo Go. For P0 you can use the built-in `Animated` with `useNativeDriver: true` and add no new dependencies.

### 2.5 Haptics map (`expo-haptics`, SDK 58 API)

Put this in one wrapper, `src/lib/feel.ts`. It's a no-op on web and when the "Haptics" setting is off (HIG says "make haptics optional": [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/playing-haptics.md)). Each pattern keeps its documented meaning.

| Event | Call | Where |
|---|---|---|
| Your turn starts | `impactAsync(ImpactFeedbackStyle.Heavy)` then 120 ms later `impactAsync(Rigid)` (a "double knock") | `draft/[id].tsx`, `useEffect` on `myTurn` false→true |
| 10 s left on your clock | `notificationAsync(NotificationFeedbackType.Warning)` | `Countdown.tsx` when it crosses the `urgent` threshold (once) |
| Last 3 seconds | `selectionAsync()` each second | `Countdown.tsx` |
| Pick confirmed (you) | `impactAsync(Rigid)` timed to the visual snap | `draft/[id].tsx` `onDraft` when `err === null` |
| Pick rejected or clock expired | `notificationAsync(Error)` | `onDraft` when `err !== null` |
| Star or unstar a queue player | `selectionAsync()` | `PlayerRow.tsx` star |
| Queue reorder ▲▼ | `impactAsync(Light)` | `QueueList.tsx` |
| Chip / Segmented / week chip change | `selectionAsync()` | `ui.tsx` `Chip`, `Segmented`; `results/[id].tsx` weeks |
| Contest entered | `impactAsync(Medium)` | `contest/[id].tsx` `onEnter` ok |
| Draft complete | `notificationAsync(Success)` | first render of `complete` |
| Ceiling week revealed | `impactAsync(Soft)` | results week chip with the max total |
| Autopilot engaged | `notificationAsync(Warning)` | autopilot banner mount |
| **Never** | bot picks, scrolling, tab switches, toggles (the OS already does it) | |

On Android you can optionally map to `performAndroidHapticsAsync(AndroidHaptics.Confirm / Reject / Segment_Tick / Clock_Tick)` for crisper native feel ([Expo Haptics v58](https://docs.expo.dev/versions/v58.0.0/sdk/haptics/)).

### 2.6 Sound (optional, off by default)

Add an Account toggle, "Draft room sounds", off by default. Use `expo-audio` with short (under 150 ms) self-made sounds and respect silent mode. There are only three:

1. **Your turn:** two soft wooden knocks (pairs with the double-knock haptic).
2. **Pick in:** a dry "thock" like a magnet snapping to a board.
3. **Draft complete:** a rising three-note "spring" (about 600 ms).

No sound for bots, timers or money.

### 2.7 Typography

**Don't use Space Grotesk.** It's on every 2025–26 AI-tell list ([DevelopersDigest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it)), even though `brand-options.md` recommends it. All three packages below exist on npm under `@expo-google-fonts/*` (verified):

| Role | Font | Package | Why |
|---|---|---|---|
| Display + big numbers | **Big Shoulders Display** 800/900 | `@expo-google-fonts/big-shoulders-display` | Condensed, scoreboard and stadium DNA (it was made as Chicago's civic typeface). Fits more in 76 px board cells and pick-strip cells. A "2nd" or "$3M" set in it looks like a jumbotron, not a dashboard. Nobody's AI defaults include it. |
| UI and body | **Schibsted Grotesk** 400/600/800 | `@expo-google-fonts/schibsted-grotesk` | A newspaper-media grotesk with a sports-page feel. It's warmer and less "SaaS" than Inter, and still very legible at 12 px. |
| Numeric columns (ADP, points, clock) | **DM Mono** 500 | `@expo-google-fonts/dm-mono` | Real tabular figures for ADP and points columns and the countdown, so digits don't jitter while the clock ticks. |

The **wordmark** must be the lowercase SVG from the brand doc, not typed text (`(tabs)/index.tsx` header).

**Scale:** 40/32/24 display (Big Shoulders), 17/15/13/11 UI (Schibsted). Use at most two weights per screen. Drop the blanket `'800'/'900'`, so bold means something again.

### 2.8 Color roles (keep the brand, change the jobs)

The brand palette is fine. Its *assignment* is the tell (#3). New roles:

- **Violet `#7C5CFF` = you and your path.** Your column on the board, your pick-strip cells, the draft-path line, your rank. It isn't a button color.
- **Mint = release and action.** Primary CTAs ("Draft", "Draft for $10", "Play the season") are mint with `#0B0B14` text. The on-the-clock pulse, ceiling week and the logo dot are also mint. Each screen should have exactly one mint call to action.
- **Fix the hex drift.** The brief says mint is `#2EE6A8`, but `src/theme/brands.ts` and `brand-options.md` use `#2EE6C5`. `RB #3BD9A0` also collides with mint either way. Pick one value for mint (recommend `#2EE6A8`) and move RB to `#4CC38A` so position colors never read as "action".
- **Remove** the left-border stripes (#8) and put the color in the position pill only. Also remove the `FLAGSHIP` badge above the title (#5).

### 2.9 Iconography

Replace the unicode glyphs with **custom SVG icons** (`react-native-svg`, installed with `npx expo install react-native-svg`). They should be drawn in the logo's grammar: a single 2 px round-cap stroke, one continuous line where possible, and the **mint dot as the active state**. The icon is the logo in miniature.

| Tab | Icon | Active state |
|---|---|---|
| Lobby | 3-row snake path (the logo's top half) | mint dot appears at the path end |
| Drafts | stacked pick cards (2 offset rounded rects) | live-draft count badge in mint |
| Exposure | partial ring (pie wedge drawn as one stroke) | mint dot at arc end |
| You | small spiral/coil (logo's curl) | mint dot center |

Put them in `src/components/icons/` (`TabIcon.tsx`, `Star.tsx`, `Chevron.tsx`, `Close.tsx`, `Grip.tsx`). If you need a stopgap before the SVGs are drawn, use `@expo/vector-icons` (`npx expo install @expo/vector-icons`), Feather set only, for one consistent stroke weight: `star`, `chevron-left`, `chevron-right`, `x`, `arrow-up`, `arrow-down`, `alert-circle`. Don't mix sets.

Replace the `☆★` star with a **bookmark-notch** shape that fills mint when queued. The yellow star is a stock rating metaphor, and yellow is already "warning".

### 2.10 Mascot

The brand doc says no mascot, and that's right. **The mint dot is the character**, though. It blinks on the clock, sits at the end of your draft path, bounces once on a ceiling week, and "unwinds" into a flat line on empty states. That's one consistent, cheap and ownable element.

### 2.11 Signature delight moments

1. **On-the-clock "breath."** Your strip cell and the banner border pulse mint (`breath`), and the pulse speeds up under 10 s and 5 s. The banner text becomes "You're up. 30 seconds. Make it count." The double-knock haptic fires and, if sound is on, the knock plays. A screen reader gets `AccessibilityInfo.announceForAccessibility("You're up. 30 seconds.")`. Files: `draft/[id].tsx`, `Countdown.tsx`, `PickStrip.tsx`.
2. **Pick snap along the path.** On Draft, the row compresses (`tap`), the button morphs into a check, and the row collapses (`LayoutAnimation`/Reanimated layout). Your strip cell fills with the position color while a mint dot slides into it along a short curved path (`spring`), with a Rigid haptic at the moment of contact. Files: `PlayerRow.tsx`, `PickStrip.tsx`, `draft/[id].tsx`.
3. **"Your coil": draft complete.** The board scrolls to your column and a violet line **draws through your 18 picks in snake order** (`wind`). It ends in the mint dot, so the logo is literally made of your team. Then a team identity card appears with:
   - **A build name computed from the roster:** count RBs in rounds 1–6. 0 → "Zero RB", 1 → "Hero RB", 3 or more → "Robust RB", otherwise "Balanced".
   - **Your best stack:** a QB plus a pass-catcher from the same NFL team, e.g. "Hurts + A.J. Brown stack".
   - **One wry line,** e.g. "Took the chalk early and the swings late."

   It ends with a Success haptic and the "spring" sound, and the CTA is "Play the season". Files: `draft/[id].tsx`, new `components/draft/CoilReveal.tsx`, archetype logic in `store/results.ts`.
4. **Ceiling-week call-out.** In results, the best week's chip gets a mint dot plus "Ceiling" and auto-selects on first open, with a Soft haptic. Any starter with 25+ points that week gets a "Sprung" tag. The summary line reads "W2 popped for 157.2. That's the week tournaments are won." Files: `results/[id].tsx`.
5. **Bots with personalities.** `BOT_NAMES` already describes archetypes. Give each bot a pool of 3 one-liners, shown under its strip cell for about 2 s after its pick in normal speed only. For example, ChalkEater: "Chalk. Obviously."; LateRoundQB: "Still not taking a QB."; FadeTheField: "Nobody else wanted him. Perfect." Files: `store/useApp.ts`, `PickStrip.tsx`.
6. **"You're the ___ guy" exposure call-out.** If any player is at 50% or more exposure, a banner at the top of Exposure reads "You're the Marvin Mims guy. 2 of 2 teams." It uses the player's position color. Files: `(tabs)/exposure.tsx`.
7. **Unwound empty states.** Each empty state shows the logo path as a flat, loose line, with the dot sitting off to the side. Copy is from §2.3 rows 21, 25, 26 and 31. When data arrives later, the line winds up (`wind`). Files: `ui.tsx` `Empty` (add an `art` prop), new `components/icons/UnwoundLine.tsx`.
8. **Live-ish lobby.** The fill bar on ContestCard becomes a short snaking line that fills along the path, replacing the flat `ProgressBar`. The 4-stat row becomes one line: "$10 · 12-team pods · 30s picks · 5,556 seats left". Files: `ContestCard.tsx`.

### 2.12 Social and community touches (MVP-sized)

- **Share card** (P1): a 1080×1350 image of the "Your coil" card: the path, your 18 picks, the build name and the Coil wordmark. Use `react-native-view-shot` + `expo-sharing`. It needs no backend, and every share spreads the logo.
- **Bot banter** (P1): see delight moment #5. It's cheap and makes a solo mock draft feel populated.
- **Pick reactions** (P2): long-press any strip cell for 3 reactions (🔥 / 🧊 / 🤡). Emoji are fine here because they're content, not icons. Bots react to your picks 20% of the time.
- **Draft with a friend** (P2): `coil://contest/{id}?pod=…` deep link that seats a friend in the same pod (scheme already `coil` in `app.json`). Needs backend.
- **Weekly "Sprung" digest** (P2): a local notification on sim day, e.g. "3 of your teams hit a ceiling week. Ja'Marr Chase did 41."

---

## 3. Prioritized implementation backlog

**P0** fits in roughly 5 hours for one engineer, uses Expo Go-compatible packages only, and needs no backend.

| ID | Item | Files | Est. |
|---|---|---|---|
| **P0-1** | **Type system.** `npx expo install expo-font @expo-google-fonts/big-shoulders-display @expo-google-fonts/schibsted-grotesk @expo-google-fonts/dm-mono`. Load the fonts in the root layout and hold the splash until they're ready. Add `src/theme/type.ts` tokens (`display`, `title`, `body`, `label`, `num`). Apply them to the wordmark area, screen titles, prize/rank/points hero numbers, Countdown, ADP and points columns. Drop the blanket `'800'/'900'` weights. | `src/app/_layout.tsx`, new `src/theme/type.ts`, `ui.tsx`, `(tabs)/index.tsx`, `ContestCard.tsx`, `contest/[id].tsx`, `results/[id].tsx`, `Countdown.tsx`, `PlayerRow.tsx` | 75 min |
| **P0-2** | **Color roles and tell removal.** Make the CTAs mint with dark text (`Button` primary, `PlayerRow` Draft, `QueueList` Draft) and keep violet for "you". Unify the mint hex and move RB off mint. Delete the left-border stripes. Move the `FLAGSHIP` badge inline. Hide "Brand options" behind `__DEV__`. | `theme/brands.ts`, `ui.tsx`, `PlayerRow.tsx`, `QueueList.tsx`, `PickStrip.tsx`, `results/[id].tsx`, `ContestCard.tsx`, `(tabs)/account.tsx` | 40 min |
| **P0-3** | **Haptics.** `npx expo install expo-haptics`. Add the `src/lib/feel.ts` wrapper (no-op on web, setting-gated). Wire up the events from §2.5: your turn, 10 s warning, pick ok/error, star, chips/segments, contest entered, draft complete. | new `src/lib/feel.ts`, `draft/[id].tsx`, `Countdown.tsx`, `PlayerRow.tsx`, `ui.tsx`, `contest/[id].tsx` | 45 min |
| **P0-4** | **On-the-clock pulse and pick snap (v1).** Use built-in `Animated` for a looping mint border on the banner and current strip cell with accelerating `breath`. Add a press scale to every Pressable through `tap`. Use `LayoutAnimation` for drafted-row removal. Animate the pick strip with `scrollToIndex` on new picks. Respect reduced motion. | `draft/[id].tsx`, `PickStrip.tsx`, `Countdown.tsx`, `ui.tsx`, new `src/theme/motion.ts` | 60 min |
| **P0-5** | **Copy pass.** Apply §2.3 rows 1–35. Remove every em-dash from UI strings and use one decimal for points. Add relative dates in Drafts. Rename the Account tab to You. Route legal and mock strings to compliance unchanged except for dashes. | all files listed in §2.3 | 50 min |
| **P0-6** | **Tab icons and glyph purge (stopgap).** `npx expo install @expo/vector-icons react-native-svg`. Replace `GLYPH` with 4 inline SVG tab icons with the mint-dot active state (§2.9). Swap `☆★▲▼✕‹›!` for Feather icons. | `(tabs)/_layout.tsx`, new `components/icons/*`, `PlayerRow.tsx`, `QueueList.tsx`, `draft/[id].tsx`, `results/[id].tsx`, `contest/[id].tsx`, `(tabs)/drafts.tsx`, `ui.tsx` `MockNote` | 45 min |

**P1** is the next 2–3 days and builds the signature moments.

- **P1-1** "Your coil" draft-complete reveal, with build-name and stack logic and a team identity card (§2.11 #3). Files: `draft/[id].tsx`, new `CoilReveal.tsx`, `store/results.ts`.
- **P1-2** Ceiling-week call-out, "Sprung" tags, summary line, Soft haptic (§2.11 #4). Files: `results/[id].tsx`.
- **P1-3** Bot one-liners on picks (§2.11 #5). Files: `store/useApp.ts`, `PickStrip.tsx`.
- **P1-4** Unwound-line empty states and the "Winding up…" loader (§2.11 #7). Files: `ui.tsx`, `components/icons/UnwoundLine.tsx`.
- **P1-5** Declutter the draft room. Move Autodraft and Speed-up-bots into a "⋯" sheet. Show Autodraft state as a chip in the header only when it's on. Aim for the first player row in the top third of the screen. Files: `draft/[id].tsx`.
- **P1-6** ContestCard rework: one-line meta and a snaking fill line (§2.11 #8). Files: `ContestCard.tsx`, `ui.tsx`.
- **P1-7** Share card. Files: `CoilReveal.tsx`, plus `react-native-view-shot` and `expo-sharing`.
- **P1-8** Migrate motion to Reanimated springs, and add the path-traced pick snap (§2.11 #2). Files: `PickStrip.tsx`, `PlayerRow.tsx`.
- **P1-9** "You're the ___ guy" exposure banner. Files: `(tabs)/exposure.tsx`.
- **P1-10** Settings for haptics and sounds, with sound off by default, using `expo-audio` and the 3 sounds. Files: `(tabs)/account.tsx`, `src/lib/feel.ts`, `store/useApp.ts`.

**P2** is later.

- Lowercase SVG wordmark component (`components/brand/Wordmark.tsx`), and a 3-screen first-run onboarding: "Draft once" → "Your best lineup sets itself" → "Wind it up".
- Pick reactions, draft-with-a-friend deep links, weekly "Sprung" digest notifications.
- Readable roster mini-bars to replace the 8px position squares in Drafts. Use segmented counts such as "QB 2 · RB 5 · WR 8 · TE 3".
- Custom Android haptics via `performAndroidHapticsAsync`, and a light theme using the `#F6F5FF` background from the brand doc.
- Rename the persist key from `bestball-app-v1` to `coil-v1`, with a migration.

**Acceptance check for all of this.** Do a reverse squint test ([robotsonpayroll](https://robotsonpayroll.substack.com/p/how-to-avoid-that-vibe-coded-look)): show a fresh person or model the new lobby.png and draft-room.png and ask "what tool built this?" If the answer is a tool rather than "a fantasy app", keep going.
