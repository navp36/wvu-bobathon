#!/usr/bin/env node
// wvu-campus-mcp: SIMULATED WVU campus data exposed to Bob over MCP.
// Every response carries "dataSource": "SIMULATED" so UIs built on top can label it honestly.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod/v4";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const load = (f: string) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));

const courses = load("courses.json");
const travel = load("travel.json");
const rooms = load("rooms.json");

const DAYS = ["M", "T", "W", "R", "F"] as const;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const reply = (payload: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify({ dataSource: "SIMULATED", ...(payload as object) }, null, 2) }],
});
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

const server = new McpServer({ name: "wvu-campus-mcp", version: "0.1.0" });

server.registerTool(
  "search_courses",
  {
    description:
      "Search the simulated WVU course catalog. Returns courses with sections (days, times, campus, seats). Filter by text, campus, or only sections with open seats.",
    inputSchema: z.object({
      query: z.string().optional().describe("Matches course code or title, e.g. 'CS' or 'calculus'"),
      campus: z.enum(["Downtown", "Evansdale", "Health Sciences"]).optional(),
      openSeatsOnly: z.boolean().optional().describe("Only return sections that still have seats"),
    }),
  },
  async ({ query, campus, openSeatsOnly }) => {
    const q = query?.toLowerCase();
    const results = courses.courses
      .filter((c: any) => !q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
      .map((c: any) => ({
        ...c,
        sections: c.sections.filter(
          (s: any) => (!campus || s.campus === campus) && (!openSeatsOnly || s.seats > 0),
        ),
      }))
      .filter((c: any) => c.sections.length > 0);
    return reply({ term: courses.term, count: results.length, courses: results });
  },
);

server.registerTool(
  "check_prerequisites",
  {
    description: "Check whether a student can take a course given the course codes they have already completed.",
    inputSchema: z.object({
      courseCode: z.string().describe("e.g. 'CS 310'"),
      completed: z.array(z.string()).describe("Course codes already completed, e.g. ['CS 110','CS 220']"),
    }),
  },
  async ({ courseCode, completed }) => {
    const course = courses.courses.find((c: any) => c.code.toLowerCase() === courseCode.toLowerCase());
    if (!course) return fail(`Unknown course '${courseCode}'. Use search_courses to list valid codes.`);
    const done = new Set(completed.map((c) => c.toLowerCase()));
    const missing = course.prereqs.filter((p: string) => !done.has(p.toLowerCase()));
    return reply({ courseCode: course.code, eligible: missing.length === 0, missingPrereqs: missing });
  },
);

server.registerTool(
  "check_schedule_feasibility",
  {
    description:
      "Given section ids, detect time conflicts and campus-to-campus travel that cannot be made between back-to-back classes (uses simulated travel times).",
    inputSchema: z.object({ sectionIds: z.array(z.string()).min(2).describe("e.g. ['CS220-01','MATH150-01']") }),
  },
  async ({ sectionIds }) => {
    const all = courses.courses.flatMap((c: any) => c.sections.map((s: any) => ({ ...s, course: c.code })));
    const picked: any[] = [];
    for (const id of sectionIds) {
      const s = all.find((x: any) => x.id.toLowerCase() === id.toLowerCase());
      if (!s) return fail(`Unknown section '${id}'. Use search_courses to list valid section ids.`);
      picked.push(s);
    }
    const issues: string[] = [];
    for (let i = 0; i < picked.length; i++) {
      for (let j = i + 1; j < picked.length; j++) {
        const [a, b] = [picked[i], picked[j]];
        for (const day of a.days.filter((d: string) => b.days.includes(d))) {
          const [first, second] = toMin(a.start) <= toMin(b.start) ? [a, b] : [b, a];
          const gap = toMin(second.start) - toMin(first.end);
          const need = travel.minutes[first.campus][second.campus];
          if (gap < 0) issues.push(`${day}: ${a.course} and ${b.course} overlap.`);
          else if (gap < need)
            issues.push(
              `${day}: ${first.course} (${first.campus}) -> ${second.course} (${second.campus}) leaves ${gap} min but travel needs ${need} min.`,
            );
        }
      }
    }
    return reply({ feasible: issues.length === 0, issues });
  },
);

server.registerTool(
  "get_travel_time",
  {
    description: "Simulated travel time in minutes between two WVU campuses (walk + shuttle).",
    inputSchema: z.object({
      from: z.enum(["Downtown", "Evansdale", "Health Sciences"]),
      to: z.enum(["Downtown", "Evansdale", "Health Sciences"]),
    }),
  },
  async ({ from, to }) => reply({ from, to, minutes: travel.minutes[from][to] }),
);

server.registerTool(
  "find_study_rooms",
  {
    description: "Find simulated study rooms that are free for a day and time window.",
    inputSchema: z.object({
      day: z.enum(DAYS),
      start: z.string().regex(/^\d{2}:\d{2}$/).describe("24h HH:MM"),
      end: z.string().regex(/^\d{2}:\d{2}$/).describe("24h HH:MM"),
      campus: z.enum(["Downtown", "Evansdale", "Health Sciences"]).optional(),
      minCapacity: z.number().int().positive().optional(),
      feature: z.string().optional().describe("e.g. 'quiet', 'whiteboard', 'outlets'"),
    }),
  },
  async ({ day, start, end, campus, minCapacity, feature }) => {
    const s = toMin(start);
    const e = toMin(end);
    if (e <= s) return fail("end must be after start.");
    const free = rooms.rooms.filter(
      (r: any) =>
        (!campus || r.campus === campus) &&
        (!minCapacity || r.capacity >= minCapacity) &&
        (!feature || r.features.includes(feature)) &&
        !r.busy[day].some(([bs, be]: [string, string]) => s < toMin(be) && e > toMin(bs)),
    );
    return reply({ day, start, end, count: free.length, rooms: free.map(({ busy, ...r }: any) => r) });
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
  console.error("wvu-campus-mcp running on stdio (SIMULATED data)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
