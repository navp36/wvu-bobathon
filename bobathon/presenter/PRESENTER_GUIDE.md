# Presenter guide (do not share with students)

## Suggested run of show (adjust to your slot)

| Time | Segment | Notes |
|---|---|---|
| 0:00 – 0:20 | Slides: what Bob is, modes, rules, MCP | Keep it short; students want to build |
| 0:20 – 0:30 | **Live demo by you**: 3-minute version of Lab Step 1 and 3 | Show the "wow" first: Bob calls a tool and finds the conflict |
| 0:30 – 1:30 | **Guided lab** (`starter/LAB_GUIDE.md`) | You walk the room; most trouble is in Step 3 (MCP) |
| 1:30 – 1:40 | Break | |
| 1:40 – 3:10 | **Hackathon** (`starter/HACKATHON_BRIEF.md`) | 90 min of building |
| 3:10 – 3:50 | **Demos** (3 min each, plus the 60-second Bob Moment) | Cap at about 8 finalists |
| 3:50 – 4:00 | CIO remarks, awards | |

## Prep checklist (day before)

- [ ] Every student machine has Bob installed and can sign in. Test this first; it is the most common blocker.
- [ ] Node.js 18+ installed (the MCP server needs it).
- [ ] Share the `starter` folder (zip it, or put it in a repo). **Do not include `presenter/`.**
- [ ] Run `./starter/setup.sh` yourself on a clean machine.
- [ ] Open `presenter/registration.reference.html` in a browser so you know what "good" looks like.
- [ ] Decide on a fallback: if MCP fails for someone, `presenter/answer-key/.bob/` has the finished files to copy in.
- [ ] Confirm with WVU IT that no real student data is on the machines or in the prompts.

## What the lab proves to the audience

| Lab step | Bob capability | Why the CIO cares |
|---|---|---|
| Modes | Plan before Code; a read-only Ask mode | Control: Bob is not an unsupervised bot |
| Rules | Standards applied automatically | Governance: one file sets branding, privacy, accessibility for everyone |
| MCP | Bob uses a tool for real answers, not guesses | Integration: connects to systems WVU already has |
| Custom mode | A reviewer that cannot edit files | Safety: permissions are defined, not trusted |

## Honest caveats (say these out loud)

- **All data is simulated.** The course, travel, and room data are fictional. Do not present them as WVU data.
- The MCP server here is a prototype reading local files. A production version needs authentication, read-only scoped access, and approval from the registrar and IT.
- Output varies from run to run. Bob's wording and layout will not match the reference page exactly; that is normal.
- I tested the MCP server over stdio and rendered the reference page. I have **not** run the lab end to end inside Bob, so do a full dry run first and adjust any wording in the guide that doesn't match your Bob version (mode names and menu labels in particular).

## If Bob's mode names differ from the guide

The guide uses Ask, Plan, Code, and Advanced. Bob's docs list these as built-in modes, but your build may label them differently (for example, "Agent"). Check the mode selector and adjust the guide.

## Judges' notes for the CIO

Give the CIO one question to ask every finalist: *"What would you need from IT to ship this?"* It surfaces integration and security thinking and keeps the discussion on WVU's systems.

## Files

| File | Purpose |
|---|---|
| `registration.reference.html` | What a finished lab page looks like (for you only) |
| `answer-key/.bob/rules/wvu-style.md` | The rules file students write in Step 2 |
| `answer-key/.bob/mcp.json` | The MCP config students write in Step 3 |
| `answer-key/.bob/custom_modes.yaml` | The custom mode students write in Step 4 |
