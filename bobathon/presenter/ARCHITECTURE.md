# Architecture Document: Smart Class Registration
**Event:** WVU Bobathon Reference Build  
**Pattern:** Ephemeral Client-Side Reactive Single-Page Application (Zero-Footprint Prototype)  
**Branding & Standards:** WVU Blue (`#002855`), Old Gold (`#EAAA00`), WCAG 2.1 AA Accessibility  

---

## 1. Executive Summary & Solution Concept

The **Smart Class Registration** prototype demonstrates how client-side intelligence can instantly validate student course registration against three simultaneous constraint vectors:
1. **Academic Prerequisites:** Validates chosen course prerequisites against in-memory student completion records.
2. **Time Overlaps:** Detects same-day time collisions between selected sections across weekly time blocks.
3. **Inter-Campus Transit Feasibility:** Computes transit time buffers between physical campuses (Evansdale, Downtown, Health Sciences) and alerts students if the interval between consecutive classes is shorter than transit requirements.

---

## 2. High-Contrast System Architecture Diagram

```mermaid
graph TB
  subgraph Client["<b>1 · CLIENT BROWSER (Pure In-Memory Single-Page App)</b>"]
    direction TB
    UI["<b>User Interface Layer</b><br/>• Interactive Completed Course Chips<br/>• Catalog Search, Campus & Seat Filters<br/>• Real-time Weekly Schedule Timetable"]
    State["<b>In-Memory State Store</b><br/>• completed (Set of Course Codes)<br/>• picked (Array of Selected Section IDs)<br/>• activeFilter criteria"]
    Solver["<b>⚡ Multi-Constraint Feasibility Engine</b><br/>• Prerequisite Rule Validator<br/>• Same-Day Time Interval Collision Solver<br/>• Evansdale ↔ Downtown ↔ Health Sci Transit Gap Check"]
  end

  subgraph DataLayer["<b>2 · STATIC SIMULATED DATASETS (Embedded)</b>"]
    CoursesData[("<b>📚 COURSES Dataset</b><br/>10 Courses · 16 Sections<br/>Codes, Prereqs, Schedule, Seats, Rooms")]
    TravelData[("<b>🚌 TRAVEL Transit Matrix</b><br/>Evansdale ↔ Downtown: 25 min<br/>Downtown ↔ Health Sci: 20 min<br/>Evansdale ↔ Health Sci: 30 min")]
  end

  subgraph Enterprise["<b>3 · PRODUCTION ENTERPRISE INTEGRATION (Roadmap)</b>"]
    SSO["<b>Campus SSO / SAML</b><br/>Institutional Student Identity"]
    SIS["<b>Banner SIS API</b><br/>Live Seat Inventory & Registration"]
    Audit["<b>Degree Works API</b><br/>Verified Student Transcripts"]
    Transit["<b>PRT & Shuttle API</b><br/>Real-Time Transit Delays"]
  end

  UI -->|"User toggles courses & sections"| State
  CoursesData -->|"Loads catalog & section metadata"| UI
  State -->|"Supplies active selections"| Solver
  CoursesData -.->|"Prerequisite rules"| Solver
  TravelData -.->|"Campus transit thresholds"| Solver
  Solver -->|"Renders conflict alerts & visual warnings"| UI

  SSO -.->|"OAuth 2.0 Bearer Token"| Audit
  Audit -.->|"Auto-fills completed history"| State
  SIS -.->|"Live seat counts"| CoursesData
  Transit -.->|"Live delay adjustments"| TravelData

  classDef clientUI fill:#eef4fc,stroke:#002855,stroke-width:2.5px,color:#002855,font-size:13px;
  classDef clientState fill:#e6ecf5,stroke:#002855,stroke-width:2.5px,color:#002855,font-size:13px;
  classDef solver fill:#fffbeb,stroke:#d97706,stroke-width:3px,color:#78350f,font-size:13.5px;
  classDef dataStore fill:#f8fafc,stroke:#334155,stroke-width:2.5px,color:#0f172a,font-size:13px;
  classDef enterprise fill:#fbf7ff,stroke:#7c3aed,stroke-width:2px,stroke-dasharray: 5 5,color:#4c1d95,font-size:13px;

  class UI clientUI;
  class State clientState;
  class Solver solver;
  class CoursesData,TravelData dataStore;
  class SSO,SIS,Audit,Transit enterprise;
```

---

## 3. Component Details & Data Flow

| Layer | Component | Implementation | Responsibility |
|---|---|---|---|
| **Presentation** | UI Controls & DOM | Vanilla JS + semantic HTML5 | Responsive course catalog, live filter triggers, completed course chips, and weekly visual timetable. |
| **State** | Reactive In-Memory Store | `Set` & `Array` in JavaScript closure | Ephemeral storage of selected section IDs and completed course prerequisites. |
| **Logic** | Feasibility Solver | `feasibility(secs)` function | Iterates pairwise across scheduled days, calculates time deltas ($gap = start_2 - end_1$), and verifies against transit matrix ($gap \ge need$). |
| **Data** | Static Synthetic Datasets | `COURSES` & `TRAVEL` objects | Fictional WVU catalog data with section times, seats, rooms, prerequisites, and inter-campus transit matrix. |
| **Enterprise (Future)** | Student Information System | REST API / GraphQL | Live Banner SIS seat counts, Degree Works transcript validation, and PRT transit alerts. |

---

## 4. Security, Privacy & Non-Functional Requirements (FERPA Compliance)

- **Zero Persistence:** No student selections are stored in `localStorage`, cookies, or remote databases.
- **Client-Side Execution:** The application executes 100% inside the client sandbox with no external tracking or telemetry.
- **Synthetic Data Guarantee:** Fictional student courses and simulated schedules eliminate all risk of exposing confidential academic or personal records.
- **Accessibility:** Fully accessible via keyboard navigation, high-contrast focus rings (`#EAAA00`), and semantic ARIA live regions for screen readers.
