# Poker Planning · ServiceNow

A lightweight planning‑poker board for estimating stories from ServiceNow Agile
(Motorhub). Single self‑contained `planning-poker.html` file — no build step, no
dependencies. Open it in a browser to run.

## What it does

- **Lobby** — set your player identity (name, animal avatar, colour), then **create a
  new session** (you become its facilitator) or **join** an existing one from the list.
- **Host = facilitator** — whoever creates a session is its facilitator; a private host
  token is kept in that browser. The shared join link never carries it, so players can't
  become facilitator. No shared password (replaces the old `admin` / `admin123`).
- **Shareable link** — creating a session pops an "Invite your team" link (Jira‑style);
  send it and people join *this* session as players. Re‑openable any time via **Share link**.
- **Team session history** — active and completed sessions are listed in the lobby for
  the whole team (persisted in Supabase), with sprint, progress, facilitator, and date.
- **User menu** — click your avatar to change your name/avatar, switch theme, copy the
  share link, or leave back to the lobby.
- **Sprint + backlog** — pick a sprint and pull its stories (Epic, Product, Release,
  State, Priority). Estimated stories drop into a "Completed / estimated" group.
- **AI overview** — each story shows a plain‑language summary generated from its
  Short description, Story Details, and Acceptance criteria, with risk/dependency tags.
- **Voting room** — a responsive radial poker table (scales for up to ~10 players).
  Anonymous until reveal; cards animate while voting and flip to show points on reveal.
- **Browse vs. lock** — while idle, players can look around the backlog freely; once the
  facilitator starts a round, everyone is pulled to the active story and locked to it.
- **Facilitator controls** — Start / timer / Reveal / Reset / write‑back; players join
  via the shared link and only vote.
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

## ServiceNow integration (secure server proxy)

ServiceNow is reached through a **Vercel serverless function** at
[`api/servicenow.js`](api/servicenow.js) — the browser calls `/api/servicenow`, the
function calls ServiceNow server-to-server. This keeps credentials **off the browser**
and sidesteps CORS. The facilitator's gear panel only holds a non-secret story filter and
the **Test connection** / **Save & pull stories** buttons.

**Setup — add these in Vercel → Project → Settings → Environment Variables**, then redeploy:

| Variable | Required | Notes |
|---|---|---|
| `SN_INSTANCE` | ✅ | e.g. `https://acme.service-now.com` |
| `SN_AUTH` |  | `basic` (default) or `oauth` |
| `SN_USER`, `SN_PASSWORD` | for basic | integration user credentials |
| `SN_CLIENT_ID`, `SN_CLIENT_SECRET` | for oauth | client-credentials grant |
| `SN_TOKEN_URL` |  | default `/oauth_token.do` |
| `SN_STORY_PATH` |  | default `/api/now/table/rm_story` |
| `SN_QUERY` |  | default encoded query, e.g. `active=true^sprintLIKESprint 11` |
| `SN_PROXY_TOKEN` |  | if set, callers must send a matching `x-proxy-token` header |

Then open the gear → **Test connection** (confirms the server reached ServiceNow) →
**Save & pull stories**. The pulled backlog is broadcast to everyone in the session.

> **Security note.** Credentials live only in Vercel env vars, never in the client. The
> proxy is **read-only** (test + list stories). It has no user auth of its own, so anyone
> who knows the URL can read the story list — fine for an internal tool; put real
> authentication in front of it (or set `SN_PROXY_TOKEN` + a small auth layer) before
> exposing anything sensitive. Also add ServiceNow-side rate limits / a least-privilege
> integration user.
>
> **Local dev:** `/api/*` only runs on Vercel (or `vercel dev`); a plain static server
> returns 404 for it, and the app shows a clear "check env vars" message.

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
4. (Optional) Set two secrets in the same block:
   - `const TEAM_PASSKEY = '…'` — required at **Create & host** (set `''` to disable the gate).
   - `const SUPER_PASSKEY = '…'` — the **admin password**. Click the **🔒 Admin** button in
     the lobby and enter it to unlock **Close** and **Delete** on sessions (and **Clear
     history**). Click again to lock.

**Session lifecycle.** Sessions stay joinable for **3 days from last activity**, then move
to a **History** list in the lobby (also where completed/closed sessions land). A
facilitator leaving an active session is asked whether to **keep it active** or **end it**
(so active sessions don't pile up); super-admins can **Close** any active session.

**Demo mode.** A lobby “Try the demo” button runs a local sandbox (bots + sample stories,
big DEMO banner) — nothing is saved or shared.

If these are left as placeholders, the app runs **single-player** (a live indicator in the
header shows "Offline · realtime not configured"), which is handy for local testing.

**Rooms.** Each session gets its own room, keyed off the `?session=<id>` URL parameter.
Creating a session in the lobby generates the id; the **Share link** button gives you the
player link to send out.

### Shared session history (one extra table)

The lobby's team-wide list of sessions is stored in a Supabase table. The publishable key
can't create tables, so run this once in **Supabase → SQL Editor → New query → Run**:

```sql
create table if not exists public.sessions (
  id          text primary key,
  name        text,
  sprint      text,
  facilitator text,
  status      text default 'active',
  estimated   int  default 0,
  total       int  default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.sessions enable row level security;

-- Prototype-grade: allow the browser (anon/publishable key) to read & write.
-- Tighten this before production.
grant usage on schema public to anon;
grant select, insert, update, delete on public.sessions to anon;

drop policy if exists "sessions public access" on public.sessions;
create policy "sessions public access" on public.sessions
  for all to anon using (true) with check (true);
```

Until this table exists the app still works — you can create and join sessions by link —
the lobby just shows "history isn't set up yet" instead of the team list.

## ⚠️ Still prototype-grade — before production

- **ServiceNow reads are live via the proxy; write-back is not wired yet.** Pulling the
  backlog works server-side (see above). The confirmed estimate + work note are still only
  composed/logged client-side — wiring `PATCH rm_story/{sys_id}` through the proxy is the
  next step. The proxy also has no auth of its own (read-only); add real auth before
  exposing sensitive data.
- **Facilitator (host) auth is client-side.** The host token lives in the creator's
  browser `localStorage`. It's sturdier than a shared password (nothing to leak, and the
  player link can't grant it), but it isn't server-enforced — a determined user could still
  fake the facilitator flag in devtools. Enforce roles server-side for production, and note
  the host role is per-browser (clearing storage or switching device drops it).
- **Session table is prototype-grade.** The RLS policy above lets any anon client read/write
  the `sessions` table. Fine for an internal tool; lock it down (or put it behind auth)
  before anything sensitive.
- **Live round state has no persistent store.** Realtime presence/broadcast is ephemeral;
  if the facilitator leaves mid-round, in-flight round state is lost (confirmed estimates
  are still written to the session record + `localStorage`). Move to a shared store for
  fully durable sessions.

## Run

- **Live:** deploy the folder (e.g. Vercel) with Supabase configured, then share the join link.
- **Local/offline:** open `planning-poker.html` in any modern browser (single-player).
