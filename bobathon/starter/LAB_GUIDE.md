# Lab: Build a Smart Class Registration Page with Bob

**Time:** ~60 minutes · **Level:** anyone who can open a terminal · **You will build:** a single-file registration page that catches schedule conflicts and impossible campus-to-campus trips.

You will use four Bob features, in this order. Each one changes what Bob produces, and you will see the difference yourself.

| Step | Feature | What you will see |
|---|---|---|
| 1 | **Modes** (Ask, Plan, Code) | Same Bob, different jobs and different permissions |
| 2 | **Rules** | Bob follows your team's standards without being reminded |
| 3 | **MCP** | Bob reads real data from a tool instead of making it up |
| 4 | **Custom mode** | You build your own specialist teammate |

> **All data in this lab is simulated.** No real WVU or student information is used anywhere.

---

## Step 0: Setup (5 min)

1. From the `bobathon` folder, run `./starter/setup.sh`. It installs and builds a small server of simulated WVU data (courses, travel times, rooms).
2. In Bob, **open the `starter` folder as your workspace**.

You should see a `wvu-campus-mcp` folder and nothing else. That is intentional.

---

## Step 1: Modes. Ask, then Plan, then Code (15 min)

Bob has different modes for different jobs. Switch with the mode selector in the Bob panel.

**1a. Ask mode.** Ask about code without changing anything:

```
Look at wvu-campus-mcp/data. What kinds of campus data are in here, and what questions could a student answer with it?
```

**1b. Plan mode.** Design before building:

```
I want a single-file HTML class registration page for WVU students. Plan it: what should it show, what checks should it run, and what could go wrong? Keep it to one file.
```

Read the plan. Change one thing you disagree with and tell Bob.

**1c. Code mode.** Build it:

```
Build the plan as registration.html in this folder. Use the course data from wvu-campus-mcp/data/courses.json and travel.json, embedded directly in the file.
```

Open `registration.html` in your browser and add some classes.

**Checkpoint:** you have a working page. Notice how it looks. Colors, fonts, and wording are whatever Bob guessed. Keep this version open in a tab. You will compare against it in a moment.

---

## Step 2: Rules. Teach Bob your standards once (10 min)

Rules are instructions Bob follows in every conversation, so you never have to repeat them.

1. Create the file `.bob/rules/wvu-style.md` in your workspace.
2. Paste in these rules (or write your own):

```markdown
# WVU Bobathon house rules

## Look and feel
- Use WVU Blue #002855 as the primary color and Old Gold #EAAA00 as the accent.
- Single self-contained HTML file: inline CSS and JS, no CDN links, no network requests.

## Honesty about data
- Label every piece of data LIVE or SIMULATED in the UI.
- Show a visible "Simulated data" badge in the header whenever any data is simulated.
- Add a "Where this data comes from" table: source, status, and what it would take to make it live.

## Student privacy
- Never collect, store, or transmit student information. No cookies, localStorage, or analytics.
- Add a short "How this protects student information" section in plain language.

## Quality
- WCAG 2.1 AA basics: labels on every input, visible keyboard focus, no color-only meaning.
- Include loading, empty, and error states wherever data is shown.
```

3. In **Code** mode:

```
Update registration.html to follow our workspace rules.
```

Reload the page and compare with the earlier tab.

**Checkpoint:** WVU colors, a "Simulated data" badge, a data-source table, and a privacy section appeared. You never described any of them in the prompt. That is what rules are for. In a real team, you would commit `.bob/rules/` so everyone gets the same behavior.

---

## Step 3: MCP. Connect Bob to a data source (15 min)

MCP (Model Context Protocol) lets Bob call tools. So far Bob has been reading files. Now you will give it a tool.

1. Create `.bob/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "wvu-campus": {
      "command": "node",
      "args": ["${workspaceFolder}/wvu-campus-mcp/build/index.js"]
    }
  }
}
```

2. Open Bob's settings, go to the **MCP** tab, and confirm `wvu-campus` shows as connected. You should see five tools: `search_courses`, `check_prerequisites`, `check_schedule_feasibility`, `get_travel_time`, `find_study_rooms`.

3. In **Advanced** mode (the mode that can use MCP tools), ask a question that needs the tool:

```
Use the wvu-campus tools. I've completed CS 110 and MATH 150. Can I take CS 220 and MATH 251 this term? If I pick CS220-01 and MATH150-01, does my schedule work?
```

Watch Bob call the tools instead of guessing. Open the tool call and read what it returned. Every response includes `"dataSource": "SIMULATED"`.

4. Now ask for something no file could answer:

```
I'm at Evansdale and have a free hour on Tuesday from 10:00 to 11:00. Find me a quiet study room.
```

5. Put it to work. Back in **Code** mode:

```
Using what the wvu-campus tools told you about travel times, improve registration.html so that if two back-to-back classes are on different campuses without enough travel time, it warns the student and says how many minutes short they are.
```

**Checkpoint:** a student can add `CS220-01` and `MATH150-01` and see a warning that they cannot get from Evansdale to Downtown in 10 minutes.

---

## Step 4: Build your own teammate (10 min)

A custom mode is a specialist you define: its role, what it is allowed to do, and when to use it.

1. Open Bob settings, then **Modes**, then **Edit Project Modes**. This opens `.bob/custom_modes.yaml`. Add:

```yaml
customModes:
  - slug: registrar-reviewer
    name: 🛡️ Registrar Reviewer
    description: Read-only reviewer for privacy, accessibility, and data honesty
    roleDefinition: >-
      You are a skeptical university IT reviewer. You review student-facing web pages
      for privacy leaks, accessibility problems, and misleading data claims. You never
      modify files; you report findings.
    whenToUse: Use after building a page, to get a review before showing it to anyone.
    customInstructions: |-
      Report in this format:
      1. PRIVACY: anywhere student data could be collected, stored, or sent.
      2. ACCESSIBILITY: missing labels, focus problems, color-only meaning, contrast.
      3. DATA HONESTY: any data not clearly labeled live vs simulated.
      4. VERDICT: "Ready to show a CIO" or "Fix first", with the top 3 fixes.
      Quote the exact line or element for every finding. Say "none found" when true.
    groups:
      - read
      - mcp
```

Note `groups`: this mode can read and use MCP tools, but it has **no edit or command permission**. It cannot change your files even if asked.

2. Switch to **Registrar Reviewer** and ask: `Review registration.html.`
3. Try to trick it: `Fix the problems you found.` Watch it decline and tell you what to change instead.
4. Switch back to Code mode and ask Bob to apply the top fix.

---

## What you just did

You went from an empty folder to a tested, branded, privacy-aware page driven by data from a tool, reviewed by a custom specialist. You wrote one rules file, one MCP config, and one mode. That is the pattern teams use to make Bob follow *their* standards.

Your page is the starting point for the hackathon. Keep the workspace as is.

## If something goes wrong

| Problem | Fix |
|---|---|
| `wvu-campus` doesn't show as connected | Did `setup.sh` finish? Check that `wvu-campus-mcp/build/index.js` exists. Then toggle the server off and on in the MCP tab. |
| Bob says it can't find the tools | You may be in a mode without MCP access. Switch to Advanced. |
| Bob ignores the rules | Confirm the file is at `.bob/rules/wvu-style.md` in the workspace you opened. |
| Page looks broken | Ask Bob: `Open registration.html in a browser and tell me what's wrong.` or ask in Ask mode to explain the error. |
| Stuck | Compare with `presenter/registration.reference.html` if your instructor shared it. |
