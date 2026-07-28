# Poker Planning · ServiceNow

A lightweight planning‑poker board for estimating stories from ServiceNow Agile
(Motorhub). Single self‑contained `planning-poker.html` file — no build step, no
dependencies. Open it in a browser to run.

## What it does

- **Join screen** — each person picks a display name, an animal avatar, and a colour.
- **Sprint + backlog** — pick a sprint and pull its stories (Epic, Product, Release,
  State, Priority). Estimated stories drop into a "Completed / estimated" group.
- **AI overview** — each story shows a plain‑language summary generated from its
  Short description, Story Details, and Acceptance criteria, with risk/dependency tags.
- **Voting room** — a responsive radial poker table (scales for up to ~10 players).
  Anonymous until reveal; cards animate while voting and flip to show points on reveal.
- **Roles** — a facilitator signs in (default `admin` / `admin123`) to get Start /
  timer / Reveal / Reset / write‑back controls; everyone else joins via the public
  link as players and only votes.
- **Countdown timer** — facilitator sets 0:15 / 0:30 / 1:00; auto‑reveals at zero.
- **Locking** — a vote is confirmed before it locks (no switching after submit).
- **Auto‑reveal** — the board reveals automatically once everyone has locked in.
- **Tie handling** — on a split vote, one voter per tied value is randomly picked to
  explain their reasoning, then the team re‑votes or the facilitator records the number.
- **Write‑back** — the confirmed estimate is written to the story's points field and a
  work note (`Planning poker: sized X (votes …)`) is composed for ServiceNow; the board
  then advances everyone to the next unsized story.
- **Resume later** — confirmed estimates are persisted so a sprint review can be
  paused and picked up another time.
- **Themes** — Cream (default), Light, Dark, Midnight, Forest, Sunset.
- **Admin panel** — configure the ServiceNow Table API endpoints and auth (see below).

## Admin / integration settings

Open the gear (facilitator only). Configure:

- Instance base URL
- GET stories endpoint — default `/api/now/table/rm_story`
- PATCH story endpoint — default `/api/now/table/rm_story/{sys_id}`
- Auth: **Basic** (username/password) or **OAuth 2.0 client credentials**
  (token URL, client ID, client secret)

## Live multiplayer (Supabase Realtime)

Seats, votes, reveals, the timer, and which story is open are synced across everyone in
the same room via [Supabase Realtime](https://supabase.com/docs/guides/realtime)
(presence + broadcast) — no database schema required. When you share the join link,
everyone who opens it joins the **same** live session. Cards stay anonymous until reveal
(actual values are only broadcast when the facilitator reveals).

**Setup (~5 minutes, one-time):**

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project: **Settings → API**, copy the **Project URL** and the **anon public** key.
3. In `planning-poker.html`, near the top of the `<script>` block, fill in:
   ```js
   const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
   ```
   Both are safe to commit — the anon key is a public client key. Commit and redeploy.

If these are left as placeholders, the app runs **single-player** (a live indicator in the
header shows "Offline · realtime not configured"), which is handy for local testing.

**Rooms.** The room is keyed off the `?session=` parameter in the URL (default
`motorhub-sprint11`). Use the facilitator's **Copy public join link** button to share it.

## ⚠️ Still prototype-grade — before production

- **ServiceNow data + write-back are still mock.** Stories are built-in demo data and
  `PATCH rm_story/{sys_id}` isn't wired. Real ServiceNow access needs a **server-side
  proxy** (never expose credentials/secrets in the browser).
- **Facilitator auth is client-side.** The in-file `admin` / `admin123` login is not real
  security — anyone with the password (or devtools) can facilitate. Enforce roles
  server-side for production.
- **Room state has no persistent store.** Realtime presence/broadcast is ephemeral; if the
  facilitator leaves mid-round, live round state is lost (confirmed estimates are still
  kept in `localStorage` per device). Move to a shared store for durable sessions.

## Run

- **Live:** deploy the folder (e.g. Vercel) with Supabase configured, then share the join link.
- **Local/offline:** open `planning-poker.html` in any modern browser (single-player).
