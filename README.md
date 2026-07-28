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

## ⚠️ Prototype status — before production

This is a front‑end prototype. Data, timer, other players, and write‑back are simulated
in the browser. To make it real:

1. **Backend / proxy.** ServiceNow Table API calls (and OAuth token exchange) must run
   server‑side. Never expose a client secret or store credentials in the browser.
2. **Live multiplayer.** The timer, votes, seats, and "who's the facilitator" need a
   shared backend (e.g. websocket) so all participants see the same state — today each
   browser is independent.
3. **Real auth + roles.** Replace the in‑file facilitator login with real
   authentication and enforce the facilitator role server‑side.
4. **Persistence.** Session/resume data currently lives in `localStorage` (per device);
   move it to the backend so the whole team resumes the same session.
5. **Write‑back.** Wire `PATCH rm_story/{sys_id}` with `story_points` + `work_notes`.

## Run

Open `planning-poker.html` in any modern browser. That's it.
