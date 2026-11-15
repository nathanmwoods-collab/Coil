# Springback: the in-app loyalty program

**Status:** mock only, Nov 2026. Every amount in the app is mock currency. Nothing here is a live offer, and nothing here is legal advice.

Springback replaces the earlier "Windup / Turns" framing everywhere in the app. It is Concept C of the loyalty proposal (`loyalty-program.md`, §1), chosen by the founder: no points currency and no status tiers to learn. There is one published schedule. The more rake you have paid this season, the higher the share that springs back every Wednesday as entry credit, with no playthrough.

## The rate card

The single source is `src/data/springback.ts`. The app, the engine and the tests all read it. Change the program by changing that file.

| Gauge | Season rake paid | Springs back (marginal) | About this much in entry fees at 12% rake |
|---|---|---|---|
| Light | $0 to $25 | 4% | $0 |
| Medium | $25 to $100 | 8% | $210 |
| Heavy | $100 to $1,000 | 16% | $835 |
| Max Load | $1,000 and up | 26% | $8,335 |

Rates are marginal, like tax brackets. Each rate applies only to rake paid after reaching that gauge, so there are no cliffs and moving up never lowers what was already earned. The effective rate on a whole season is always at or below the marginal rate. Example: $600 of season rake earns $1 + $6 + $80 = $87, which is 14.5% effective while the marginal rate is 16%.

### How the four gauges were derived

The proposal's tier table has five tiers at 4 / 8 / 14 / 20 / 26%, starting at about $0 / $24 / $96 / $396 / $1,500 of rake. Collapsing to four:

- **Light** and **Medium** keep the first two tiers (4% and 8%), with the Medium threshold rounded from $24 to $25.
- **Heavy** merges the 14% and 20% tiers into one 16% bracket that starts at $100.
- **Max Load** keeps the 26% top marginal rate and starts at $1,000 of rake instead of $1,500.

Cost check against the five-tier schedule, as Springback paid on a season's rake: $600 of rake pays $87 here and $89 there. $1,500 of rake pays $281 here and $270 there (about 4% more). Below $100 of rake the two schedules are the same to within cents.

## Rules as built

1. **Rake is published.** Every contest carries `rakePct` and the contest sheet shows it: 12% for tournaments, 10% for Sit & Go rooms. A data test checks that each prize pool matches its published rake.
2. **Accrual.** Each entry accrues Springback when it is entered: the rake on that entry, run through the marginal brackets from the season rake already paid.
3. **Payout.** Everything accrued pays on the next Wednesday (15:00 UTC) as Springback credit. A week that totals less than a cent rolls to the next Wednesday.
4. **No playthrough.** Credit is good for contest entries. One use: enter with it, and whatever that team wins is cash.
5. **Credit is separate from cash** and is spent first by default. The user can turn that off on the Springback screen or the contest sheet.
6. **Credit does not earn.** The part of an entry paid with Springback credit accrues no Springback and does not count toward the gauge.
7. **Season reset.** The gauge goes back to Light when a new season opens. Credit already paid stays for 12 months.

## Where it shows up

- **Springback screen** (`src/app/springback.tsx`), from the You tab, the lobby card, the lobby gauge chip, the contest sheet and the payout toast: the spring gauge, pending amount, effective versus marginal in one sentence, rake to the next gauge, the rate card, the rules and the ledger.
- **Lobby:** a live Springback card in the promo rail and a gauge chip under the balance.
- **Contest sheet:** the rake, and "This entry springs back $X on Wednesday" for the selected number of entries.
- **Draft complete:** "+$X Springback pending".
- **Wednesday payout:** a toast, "Springback landed: $X in entry credit", then the spring lets go on the Springback screen.
- **Lab** (You tab) and the bottom of the Springback screen: "Advance to Wednesday" moves the mock Springback clock forward and pays out what is pending.

Code: math in `src/engine/springback.ts` (pure, tested), state in `src/store/useApp.ts`.

## Not built in the mock

- The 12-month credit expiry and its 30-day and 7-day reminders.
- The season reset. "Start over" in the You tab is the only reset.
- Prize winnings are not paid into the cash balance anywhere in the app yet, so "winnings are cash" is copy only.
- The proposal's other rewards (satellite tickets, tools, gated lobbies, VIP host).
- The proposal's top tier carried a responsible-gaming check and a cash option. Max Load has neither.

## Needs counsel review before anything real ships

These come from §8 of the proposal. They are flags from one read of each source, not legal advice.

- **Referral rewards.** Massachusetts appears to prohibit rewards tied to referrals (940 CMR 34.00). The "Refer a friend" promo in `src/data/promos.ts` is a placeholder and must be suppressed by state once counsel confirms the rule in force.
- **Promo terms.** Massachusetts requires the material terms of a promotional offer to be disclosed before the user gives anything of value, and limits new-customer offers to 30 days of account maintenance. The first-deposit match and the Springback terms need a per-state review and a terms screen shown before first deposit.
- **Whether Springback is a "bonus"** under each state's rules. That decides which disclosure and expiry rules apply. The 12-month expiry itself may need review.
- **Deposit caps** (for example MA $1,000 a month). Higher gauges may be unreachable in capped states. Decide whether to disclose that.
- **Marketing limits.** No ads that create false urgency or encourage chasing losses, and no targeting by dormancy. Springback copy stays flat and literal, with no countdown pressure and no messaging about losing a gauge.
- **Max Load and responsible gaming.** Decide whether the top gauge needs the source-of-funds or responsible-gaming check the proposal attached to its top tier.
- **Tax treatment** of promotional credit by state, which changes the net cost of the program.
- **Entry caps.** No gauge raises a contest's entry cap.
