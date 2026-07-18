# Baby Bets 🍼

A mobile party game for Phoebe & David's baby shower: a Kalshi-style gender
prediction market with coins, baby trivia to earn more coins, and a live
gender reveal that pays out the pot.

- **Guests** join with just their name, start with 2 🪙, bet on 💙 Boy or 🩷 Girl
  (parimutuel: winners split the losing side's coins pro-rata), and earn +1 🪙
  per correct trivia answer.
- **The host** gets a passcode-protected dashboard (`/admin`) with everyone's
  coins/bets/trivia at a glance, open/close switches for betting and trivia,
  and the big red reveal button.
- **The reveal** (`/reveal`) pushes live to every open phone: confetti in the
  winning color, the announcement, and the winners' circle.

Stack: Next.js (static export) + Supabase (Postgres + Realtime) + GitHub Pages.
No server of our own — phones talk directly to Supabase; all writes go through
SQL functions so coins can't be forged.

## One-time setup (~5 minutes)

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com) (any name, any region near you).
2. Open [supabase/setup.sql](supabase/setup.sql), change the admin passcode on
   the line marked `CHANGE_ME`, and optionally swap in your own trivia
   questions at the bottom of the file.
3. In the Supabase dashboard: **SQL Editor → New query**, paste the whole file, **Run**.
4. Grab your keys from **Project Settings → API**: the *Project URL* and the
   *anon public* key.

### 2. Local dev

```bash
cp .env.local.example .env.local   # paste in the URL + anon key
npm install
npm run dev                        # http://localhost:3000
```

### 3. Deploy to GitHub Pages

1. Push this repo to GitHub as a **public** repo named `baby-bets`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Repo **Settings → Secrets and variables → Actions → Variables**: add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Push to `main` (or run the *Deploy to GitHub Pages* workflow manually).
   The site lands at `https://<you>.github.io/baby-bets/`.

> Deploying under a different repo name? Update `NEXT_PUBLIC_BASE_PATH` in
> [.github/workflows/deploy.yml](.github/workflows/deploy.yml) to match.

## Party-day runbook 🎉

| When | What you do (in `/admin`) |
| --- | --- |
| Before the party | Betting is open by default — share the site link/QR with the invite |
| Party starts | Open **Trivia** so people can earn coins |
| Drama peak | Close **Trivia**, give a "last bets!" warning, then close **Betting** |
| The moment | Pick 💙 or 🩷, hit **Reveal** — every open phone gets confetti + payouts |
| After | `/leaderboard` shows final standings for prizes |

Notes:

- The admin passcode is whatever you set in `setup.sql`. To change it later,
  re-run just that `insert into admin_config…` statement with a new value.
- To reset the whole game (fresh coins, no bets): run in the SQL Editor:
  ```sql
  delete from trivia_answers; delete from bets; delete from players;
  update game_state set betting_open = true, trivia_open = false,
    revealed = false, actual_gender = null, payouts_settled = false where id = 1;
  ```
- Editing trivia: `delete from trivia_questions;` then re-run the questions
  block at the bottom of `setup.sql` with your own content.

## How the market works

Live odds are the pool split, shown Kalshi-style as ¢ prices (62¢ = 62% of
coins say Boy). At the reveal, each winner receives their stake back plus
`stake × losing_pool ÷ winning_pool` (floored; leftover coins from rounding go
one-each to the biggest backers). If nobody backed the true gender, every
stake is refunded.
