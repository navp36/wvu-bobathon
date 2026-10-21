# WVU Bobathon judging hub

A small shared server plus a single-page app so every judge scores on their own device and the organizer sees results live. No dependencies: Node 18+ only.

> All projects, teams, judges and scores that ship in sample mode are **synthetic**.

## Run it

```bash
cd bobathon/judging/server
ORGANIZER_PIN=482913 node server.js      # pick your own PIN
```

Open `http://localhost:3000`. Judges on other devices use your machine's LAN address (for example `http://192.168.1.20:3000`) and must be on the same network. If you omit `ORGANIZER_PIN` a random one is printed at start-up.

Options: `PORT` (default 3000), `DATA_FILE` (default `server/data.json`, git-ignored).

## Before the event

1. Organizer tab → sign in with the PIN.
2. **Reveal & settings → Start a clean event** (removes the sample data).
3. **Judges**: add each approved judge. **Projects**: add each entry.
4. Share the URL. Judges open the **Judge** tab, choose their name and a project.

## During the event

| Who | Tab | What they do |
|---|---|---|
| Judges | Judge | Pick name + project, ask the 9 questions, rate 5 criteria (1–10), submit. Submitting locks that judge/project pair. |
| Organizer | Organizer → Progress | See Pending / Scored / Completed per team and which judges are in. Live standings are visible here even while the public board is hidden. |
| Projector | Scoreboard | Stays on "Judging in progress" (no scores, ranks or totals) until you reveal. |

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
- Judges aren't individually authenticated: anyone can pick any name from the list. Fine for a supervised room, not for anything adversarial.
- Data lives in one JSON file on the host. Back it up (`server/data.json`) if the event matters.
- Do not enter student contact details; names only.
- Tested in headless Chrome only. Not yet tried on Safari/Firefox or on real phones, and not with many judges at once.

## Standalone fallback

`JUDGE_RUBRIC.html` (one folder up) is the single-file, offline scorecard with no server. Use it if the network fails.
