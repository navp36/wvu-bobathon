# WVU Bobathon judging hub

A small shared server plus a single-page app so every judge scores on their own device and the organizer sees results live. No dependencies: Node 18+ only.

> All projects, teams, judges and scores that ship in sample mode are **synthetic**.

## Run it

```bash
cd bobathon/judging/server
ORGANIZER_PIN=482913 JUDGE_PASSWORD=choose-a-word node server.js
```

Open `http://localhost:3000`. Judges on other devices use your machine's LAN address (for example `http://192.168.1.20:3000`) and must be on the same network. If you omit `ORGANIZER_PIN` a random one is printed at start-up.

Options: `JUDGE_PASSWORD` (default `admin`; change it before the real event), `PORT` (default 3000), `DATA_FILE` (default `server/data.json`, git-ignored).

## Before the event

1. Organizer tab → sign in with the PIN.
2. **Reveal & settings → Start a clean event** (removes the sample data).
3. **Projects**: add each entry. **Judges** is optional: judges add themselves (below), but you can pre-approve names.
4. Share the URL and the judge password with your judges.

## During the event

| Who | Tab | What they do |
|---|---|---|
| Judges | Judge | A popup asks for the judge password, then their name. That adds them to the approved list and unlocks the scorecard. They pick a project, ask the 9 questions, rate 5 criteria (1–10) and submit. Submitting locks that judge/project pair and grays the project out in their dropdown. |
| Organizer | Organizer → Progress | See Pending / Scored / Completed per team and which judges are in. Live standings are visible here even while the public board is hidden. |
| Projector | Scoreboard | Stays on "Judging in progress" (no scores, ranks or totals) until you reveal. |

## Judge access

- Opening the **Judge** tab shows a sign-in popup. Step 1 is the shared judge password, step 2 is the judge's name. The name is added to the approved judges list and appears on the organizer's progress board.
- The server issues that browser a secret token. Every score is attributed to the token's owner, not to a name sent by the page, so one judge can't submit as another.
- Projects a judge has scored are disabled (grayed out) in their dropdown and their scorecard opens read-only.
- A name can be signed in on one device at a time. If a judge changes phones, they use **Sign out** first, or the organizer clicks **Reset sign-in** on the Judges tab. Their submitted scores are always kept.
- The organizer can pre-approve a name; that person claims it when they sign in with the password.

## The reveal

Organizer → **Reveal & settings**. Each click advances the public board:

1. Honorable mentions (3rd and below, top 5)
2. Runner-up
3. Winner (gold spotlight, confetti unless the viewer prefers reduced motion)

**Back one step** and **Hide scoreboard** undo it. The projector updates on its own.

## After the awards

Turn on **Release team feedback**. Students open **My team's feedback**, pick their project, and see their average, per-criterion scores and judges' comments **without judge names**. Private "overall comments" are never shown to students.

## How the rules are enforced

- **One score per judge per project** is enforced on the server (HTTP 409), not just by disabling the form, so a second tab or a retry can't create a duplicate. Five simultaneous identical submissions were tested: one succeeded, four were rejected.
- All scores are validated server-side (integers 1–10, every criterion required, text length limits).
- Organizer actions require the PIN in the `x-admin-pin` header (constant-time compare).
- Judges with submitted scores can't be removed; deleting a project warns that its scores go with it.
- Averages are the mean across the judges who have scored that team. Ties share a rank.
- Rendering uses text nodes only, so notes containing HTML are shown literally.

## Limits to know about

- This is an event tool, not a hardened service. The PIN travels in a header over plain HTTP on your LAN; don't expose it to the internet.
- Judge access is one shared password. Anyone who has it can become a judge, and the default is `admin`. The password check has no rate limiting, so choose a non-obvious word and keep the server on a trusted network.
- The sample judges ("Dr. Sample Judge A" etc.) are unclaimed, so anyone with the password could sign in as one. Use **Start a clean event** before real judging.
- Judge tokens are kept in the browser's local storage and only their hash is stored on the server.
- Data lives in one JSON file on the host. Back it up (`server/data.json`) if the event matters.
- Do not enter student contact details; names only.
- Tested in headless Chrome only. Not yet tried on Safari/Firefox or on real phones, and not with many judges at once.

## Standalone fallback

`JUDGE_RUBRIC.html` (one folder up) is the single-file, offline scorecard with no server. Use it if the network fails.
