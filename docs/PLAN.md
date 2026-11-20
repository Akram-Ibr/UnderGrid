# UnderGrid

**An offline-first, crowdsourced survival grid for the Hollow.**
Residents collect and share the real numbers (floods, power, water, heat, supplies). UnderGrid turns them into verified alerts and fair resource allocation, deepest levels first, and keeps working when the Directorate shuts the network down.

Built for Patriot HackFest Fall 2026, track: **Life Underground** (route: *Sustainability Underground*).

---

## 1. The problem

In 2087, two billion people live in the Hollow, a network of cities in old mines and subway tunnels. Life runs on rationing. The Directorate controls the air, the network, and movement between levels. The upper levels get light, fresh air, and space. The deeper you live, the darker, hotter, and sicker it gets, and the deep levels lose power first.

Three things make this worse:
1. **Resources are not shared fairly.** When power runs short, the deep levels always lose.
2. **Official numbers don't match reality.** The Directorate's public figures can't be trusted.
3. **The network can be shut off at any time.** Any tool that needs the network fails exactly when people need it.

## 2. Our answer

UnderGrid is a web app that:
- lets any resident **report conditions** (flood, no power, bad water, overheating, blocked tunnel, supplies available) in seconds;
- **verifies reports through the crowd** (nothing goes public until multiple different people confirm it);
- shows a live **hazard map** built on a sewer/tunnel graph, Waze-style;
- runs a **fair-share allocation engine** for power, water, and food, with the deepest levels prioritized and every decision explained;
- publishes **"Real Numbers"** gathered by residents next to the official ones;
- **keeps working offline** and syncs peer-to-peer when the main network is cut.

## 3. Priorities (from the track brief)

1. Help everyone, but address the **deepest levels first**.
2. The app must **still work if the network is shut off**.
3. The Directorate's numbers don't match reality, so **regular people collect and share the real numbers**.

## 4. Track coverage (Group A: Power, Water, Living Conditions)

| # | Track question | How UnderGrid addresses it | Priority |
|---|---|---|---|
| 2 | Share limited power, water, and food fairly | Allocation engine with a need score and a fairness comparison | **Main** |
| 3 | Stop the lower levels from getting too hot | Temperature reports feed the need score; heat layer on the map | **Sub-priority** |
| 1 | Warn people before power or air shuts off | Early-warning alerts from clustered reports plus a supply-vs-demand forecast | Supported |
| 4 | Detect unsafe drinking water | "Bad water" report type; flagged taps; reroute to clean sources | Supported |
| 5 | Prevent sewage floods, keep tunnels safe | Waze-style hazard map on the tunnel graph; safe-route search | Flagship section |
| 6 | More living space / sharing crowded space | Pitch as future work, or a light "space available" report type | Stretch |
| 7 (Group B) | Communicate when the network is shut down | Offline-first PWA with peer-to-peer sync | Core requirement |

Group B (#7, #8) is touched only through the offline and sync design. Groups C and D are out of scope and mentioned only as future work.

## 5. App sections (tabs along the top)

1. **Map:** tunnel/sewer graph with hazards color-coded by segment, level filter, confidence shown per report.
2. **Report:** large icon-based form (flood, no power, bad water, overheating, blocked tunnel, supplies available) with severity and location.
3. **Resources:** where supplies are, plus a "running low" collection flow for neighborhoods that are short.
4. **Fair Share:** allocation engine output, explanations, and the "Directorate vs. UnderGrid" comparison.
5. **Alerts:** early warnings per level and neighborhood, in plain language.
6. **Real Numbers:** statistics aggregated from verified resident reports, shown beside the "official" figures.
7. *(Settings/Status)* connection state, "Directorate shutdown" demo toggle, and peer sync status.

## 6. Crowdsourcing rules (real-world constraints)

- **Multi-reporter threshold:** a report is *unverified* until at least **N different users** (default N = 3) report or confirm it. Only then does it appear to everyone as a public hazard.
- **Confidence meter:** each report shows progress, such as "2 of 3 confirmations."
- **Confirm / dismiss ("still there?")** votes raise or lower confidence.
- **Auto-expiry:** reports fade after a set time unless re-confirmed, so old floods do not linger.
- **Anti-abuse:** one vote per user per report, rate limits, and clustering by location and time so a flood of fake reports from one source carries little weight.
- **Anonymity by default:** no real identity is required. Users get a random device ID. This matters when the Directorate controls the network.

## 7. Offline-first and network shutoff

This is the most distinctive requirement and must be designed in from day one.

- **PWA with a service worker** so the app loads with no connection.
- **Local storage (IndexedDB)** holds the map, reports, and resources.
- **Outbox queue:** reports created offline are stored and sent when any connection returns.
- **Peer-to-peer sync** (WebRTC or a simulated mesh) lets nearby devices exchange reports when the central server is unreachable.
- **Conflict handling:** reports are append-only with timestamps and unique IDs, so merging is safe and duplicates are dropped.
- **Demo toggle:** a "Directorate shutdown" switch cuts the server link, and the demo shows reports still flowing between devices.

## 8. Fair-share allocation engine

**Goal:** divide limited power, water, and food across levels or neighborhoods fairly, with deeper and more vulnerable areas prioritized, and explain every result.

**Inputs per zone (level or neighborhood):** population, current supply, demand, temperature, verified hazard count, hours since last full service, depth.

**Need score (starting point, tune during build):**

```
need = w1 * (demand - supply) / demand
     + w2 * heat_stress(temperature)
     + w3 * depth_factor(level)
     + w4 * hazard_count
     + w5 * hours_since_last_service
```

**Allocation:** distribute each resource in proportion to `need * population` (weighted fair share), then cap each zone at its demand and redistribute leftovers. A linear-programming version (SciPy or PuLP) with a minimum-per-person floor can be a stretch goal.

**Comparison view:** compute a second allocation using the "Directorate rule" (upper levels first) and show both side by side, with per-zone differences.

**Explainability:** every zone gets a one-line reason, for example: *"Level 14 receives priority 1: 3 confirmed reports, 41 C, lowest water supply, 9 hours since last service."*

**Early warnings:** if projected supply drops below projected demand for a zone, or several verified reports cluster there, raise an alert with an estimated time window.

## 9. Map and tunnel graph

- Base map concept: a **sanitary sewer map of the GMU campus** (numbered manholes connected by pipe segments around Patriot Center). Model **manholes as nodes** and **pipes as edges** in a GeoJSON graph.
- For the Hollow story, relabel the network as tunnels and assign nodes to levels.
- A hazard on an edge marks it blocked; connected edges inherit reduced confidence or risk.
- **Safe-route search** (Dijkstra or BFS) finds a path that avoids blocked or flooded segments.
- Use a **simplified, digitized graph**, not a copy of every real detail, and check whether the source data is public. Label all data as simulated.

## 10. System architecture

```
                ┌─────────────────────────────────┐
                │  PWA client (React + Leaflet)   │
                │  Map | Report | Resources       │
                │  Fair Share | Alerts | Numbers  │
                └──────┬───────────────┬──────────┘
                       │               │
           IndexedDB + outbox     WebRTC peer sync
           (offline storage)      (when server is down)
                       │               │
                       ▼               ▼
              ┌─────────────────────────────┐
              │  Sync layer (merge/dedupe)  │
              └──────────────┬──────────────┘
                             │ (when network is up)
                             ▼
              ┌─────────────────────────────┐
              │  FastAPI backend            │
              │  - Reports API              │
              │  - Verification (N unique)  │
              │  - Allocation engine        │
              │  - Alert/forecast service   │
              └──────────────┬──────────────┘
                             ▼
              ┌─────────────────────────────┐
              │  Supabase / Postgres        │
              └─────────────────────────────┘
```

### Core data model

| Table | Key fields |
|---|---|
| `levels` | id, name, depth, population, base_temp |
| `nodes` | id, level_id, lat, lng, label |
| `edges` | id, from_node, to_node, status |
| `reports` | id, type, node_id/edge_id, severity, created_at, expires_at, status (unverified/verified/expired), device_id |
| `confirmations` | id, report_id, device_id, vote (confirm/dismiss), created_at |
| `resources` | id, type (power/water/food), location, quantity, updated_at |
| `allocations` | id, zone_id, resource, amount, priority, reason, created_at |
| `alerts` | id, zone_id, message, window_start, window_end, severity |

## 11. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + React + Tailwind (or React + Vite) | Fast to build; dark mode friendly |
| Map | Leaflet or MapLibre GL + GeoJSON | Free, no API key, works with cached tiles |
| Offline | Service worker (Workbox) + IndexedDB (Dexie) | Core of the offline story |
| P2P sync | WebRTC (PeerJS) or simulated mesh | Demoable in the browser |
| Backend | FastAPI (Python) | Fast to write; good for the engine |
| Database | Supabase (Postgres + realtime) | Quick setup, live updates |
| Engine | Python (weighted fair share; optional SciPy/PuLP) | Explainable output |
| Graph/routing | NetworkX (backend) or a JS graph library | Safe-route search |
| Hosting | GitHub + Vercel (web) + Render/Railway (API) | Free tiers |

## 12. Repository structure

```
undergrid/
  apps/
    web/              # Next.js PWA
    api/              # FastAPI backend
  packages/
    engine/           # allocation + forecast logic
    graph/            # tunnel graph + routing
  data/
    graph.geojson     # simplified tunnel/sewer graph
    seed_reports.json # simulated reports for the demo
  scripts/
    seed.py           # generates simulated data
  docs/
    architecture.png
    demo-script.md
  README.md
```

## 13. Demo script (2 to 3 minutes)

1. **Setup (15s):** the Hollow, the deep levels, and the Directorate's numbers that don't match reality.
2. **Report (30s):** a resident on a deep level reports flooding in a tunnel. It shows as "unverified, 1 of 3."
3. **Crowd verifies (20s):** two more residents confirm. The hazard turns public on the map and the segment is marked blocked.
4. **Safe route (15s):** the app reroutes a user around the flooded segment.
5. **Fair Share (30s):** open the tab and show the allocation shifting toward the affected deep level, with the one-line explanation and the Directorate-vs-UnderGrid comparison.
6. **Alert (15s):** an early warning fires for neighboring levels.
7. **Real Numbers (15s):** residents' verified figures beside the "official" ones, with a visible mismatch.
8. **Shutdown (30s):** flip the "Directorate shutdown" toggle. The server link drops, a report is made offline, and it syncs peer-to-peer to a second device.
9. **Close (10s):** one line on the bigger picture and future work.

## 14. Winning factors checklist

- [ ] One connected solution (map + allocation + real numbers + offline), not separate features
- [ ] Scripted demo scenario that follows a single resident's story
- [ ] "Directorate vs. UnderGrid" side-by-side comparison
- [ ] Every allocation and alert is explained in plain language
- [ ] Visible trust mechanics (confirmation meter, expiry, anti-abuse)
- [ ] Offline mode that actually works in the demo
- [ ] Anonymity and privacy addressed in the pitch
- [ ] Accessible, dark, low-bandwidth friendly UI with large icon buttons
- [ ] Simulated data clearly labeled as simulated
- [ ] Polished README, architecture diagram, and Devpost writeup
- [ ] Demo video recorded by Thursday, submission well before the deadline

## 15. Scope guardrails

**Must have:** map with hazard reports and confirmation logic, Fair Share tab with explanations, Real Numbers tab, offline mode with the shutdown demo.
**Should have:** early-warning alerts, safe-route search, Resources tab.
**Nice to have:** peer-to-peer sync beyond a simple simulation, LP-based allocation, space-sharing reports.
**Out of scope (mention as future work):** surface return, medical care, food growing, SMS/radio fallback.

Avoid adding AI for show. If AI is used, keep it purposeful, such as turning clustered reports into a plain-language alert.

## 16. Timeline

| Day | Focus |
|---|---|
| Mon Nov 16 | Finalize plan, repo, graph digitization, seed data |
| Tue Nov 17 | Map, report flow, confirmation logic |
| Wed Nov 18 | Allocation engine, Fair Share tab, alerts |
| Thu Nov 19 | Offline/PWA, shutdown demo, Real Numbers tab, record demo video |
| Fri Nov 20 | Polish, README, Devpost, **submit well before 11:00 PM (no extensions)** |

## 17. Devpost outline

Inspiration, What it does, How we built it, Challenges we ran into, Accomplishments we're proud of, What we learned, What's next for UnderGrid.

## 18. Demo comparison rubric (to pick which demo to submit)

Score each candidate demo from 1 to 5:

| Criterion | What to look for |
|---|---|
| Story clarity | Can a stranger follow it in under 3 minutes? |
| Works live | No crashes; offline toggle actually works |
| Track fit | Clearly serves the deep levels first; covers #2 and #3 |
| Originality | Offline plus crowd verification plus fairness comparison |
| Explainability | Every output says why |
| Polish | Consistent design, no placeholder text |
| Technical depth | Real graph logic, allocation algorithm, sync |
| Demo-ability | Easy to run from the README in minutes |

## 19. Team

*(Add names and roles.)* Suggested split: map and frontend, backend and reports API, allocation engine, offline/PWA and demo polish.

## 20. Open questions

- Team size and who owns each area?
- Source of the sewer map data (public GMU GIS, or a stylized graph)?
- Final value of N for verification and the need-score weights?
- Which stack does the team prefer for the frontend (Next.js vs. Vite)?

---

*All data in the demo is simulated. UnderGrid is a hackathon project built for a fictional scenario.*
