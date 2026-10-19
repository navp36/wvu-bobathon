# Bobathon Challenge: Fix a WVU Portal

**Theme: make a WVU system less annoying.**

Every student has a story about a portal that made them click six times for something that should take one. You have already built a registration page with Bob. Now pick a pain point of your own and ship a fix.

## The challenge

Build **one self-contained HTML page** (a prototype) that makes a WVU portal or system better for students. Work solo or in a team of up to three.

You may start from your registration page, the `wvu-campus` MCP tools, or from scratch. If you use real-world frustrations, describe them in general terms. **Do not use any real student or employee information, ever.**

### Need an idea?

| Pain point | A fix could be |
|---|---|
| "Which of my classes is on the wrong campus at the wrong time?" | Schedule checker with a travel-time warning (you built the start of this) |
| "Where can my study group of 5 meet right now?" | Room finder using the `find_study_rooms` tool |
| "What do I still need to graduate?" | Degree progress tracker with a "what if I switch majors" view |
| "I can never find the right office or form." | Plain-language "I need to... " finder for common student tasks |
| "What's open, and until when?" | One page for dining, library, and labs hours with a "open now" filter |
| "Financial aid emails make no sense." | Plain-English explainer of an aid notice (use made-up text) |
| Your own idea | Tell us in one sentence what hurts and who it hurts |

## Rules of the build

1. **One HTML file.** It must open by double-clicking, with no server and no internet needed.
2. **Use Bob for the build.** Planning, code, review. You are judged partly on *how* you used it.
3. **Label your data.** Every data source is marked LIVE or SIMULATED in the page. Everything in this event is simulated.
4. **Protect students.** No real student data. Your page must explain, in plain language, what it collects (ideally nothing).
5. **Keep your workspace rules.** Start from the `.bob/rules` you wrote in the lab, and improve them.

## What to turn in (3 things)

1. Your HTML file.
2. A **"Bob Moment"** of up to 60 seconds in your demo. Show one time Bob surprised you: it caught a bug, refactored something messy, found a privacy leak, or built something you thought would take an hour.
3. Answer in one sentence: **"What would WVU IT need to give us to make this real?"** (for example, "a read-only seat-count API").

## Scoring (100 points)

| | Points |
|---|---|
| Solves a real student problem; works end to end | 30 |
| Honest about data: live vs. simulated labeled, privacy explained | 20 |
| Creative use of Bob (modes, rules, MCP, custom mode) | 25 |
| Polish and accessibility (looks good, keyboard works) | 10 |
| Realistic path to production | 15 |

## Awards

- 🏆 **Best Overall**
- 🛠️ **Most Creative Use of Bob**
- 🚀 **Most Deployable**
- 😅 **Best Bob Moment** (the audience votes)

## Stretch goals (if you finish early)

- Write your own MCP tool: ask Bob to add a new tool to `wvu-campus-mcp` (for example `get_dining_hours`), rebuild it, and use it from your page.
- Create a second custom mode, such as an **Accessibility Auditor** or a **Brutal Honest CIO** that grills your idea.
- Have the Registrar Reviewer score your page, fix the findings, and run it again.

## Tips for working with Bob

- Plan first, then code. Five minutes in Plan mode saves thirty in Code mode.
- If Bob gets something wrong, say what is wrong rather than starting over.
- Put anything you keep repeating into a rule.
- Ask the Registrar Reviewer before you demo, not after.
