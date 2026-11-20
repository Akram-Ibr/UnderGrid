# UnderGrid: Devpost draft

**Tagline:** Real numbers from the people who live underground, shared fairly, working even when the network is cut.

## Inspiration
The Life Underground brief describes a Hollow where the deep levels lose power first, the Directorate's numbers do not match what people see, and the network can be shut off at any time. We noticed all three problems share one cause: the people who live there have no trusted way to share what is really happening. We wanted the data to come from residents, and the app to keep working when everything else is cut.

## What it does
UnderGrid lets any resident report a flood, outage, unsafe water, heat, or spare supplies in seconds. A report becomes public only when three different residents confirm it. Verified reports then power:
- a live tunnel map where verified floods close tunnels and a safe-route planner detours around them,
- a fair-share allocation of power, water and food, drawn as a cross-section of the Hollow so the unfairness of the Directorate rule is visible, with a plain-language reason for every level,
- early warnings with a "why this alert" breakdown,
- a Real Numbers page that puts the Directorate's figures next to what residents verified,
- an offline-first design with peer-to-peer sync and a one-click "Directorate shutdown" demo.

## How we built it
React and TypeScript front end, installable as a PWA with a service worker that precaches the whole app. The engine (verification, routing, allocation, alerts) is pure TypeScript and runs on every device, so nothing depends on a server. Reports and votes are stored as an append-only event log in IndexedDB, merged by id, which means any order of delivery converges to the same state. Nearby devices exchange events directly; a small Node and Express server collects them when a link is available. The tunnel graph is a simplified stylization inspired by a campus sewer map, with manholes as junctions and pipes as tunnels. 19 automated tests cover the engine, and we tested the full flow in a real browser, including reloading fully offline.

## Challenges we ran into
- Making fairness explainable, not just fair. Our first reason text said a level's needs were "met under both rules" while its bar showed a big cut. We rewrote it so upper levels see exactly what they give up.
- Keeping offline honest. Our first service worker left the fonts uncached, so the app lost its typography the moment the network was cut. We now generate a complete precache list at build time.
- Verification that resists casual abuse: distinct devices only, no self-confirmation, expiry, and a deterministic rate limit that every device applies identically.

## Accomplishments we're proud of
- One connected solution instead of separate features: a single event log feeds the map, the allocation, the alerts, and the real numbers.
- It really works with the server cut. Two devices exchange reports with no server, then both catch the server up.
- Every number the app shows can say why it is that number.

## What we learned
Trust is a feature. Showing "2 of 3 confirmations" on screen did more for credibility than any algorithm. Also, designing for a dark, hot, failing environment pushed us toward large touch targets, a legible font, and no dependence on anything external.

## What's next
Bluetooth and local Wi-Fi sync on real phones, stronger device trust against coordinated spam, per-neighborhood allocation, space-sharing reports, and extending the same verified-data approach to health tracking and the return to the surface.

## Built with
React, TypeScript, Vite, IndexedDB, Service Worker, BroadcastChannel, Node.js, Express, Electron, Render, Vitest

## Try it
Link to GitHub repository: _add link_
Live app (web, same server as the desktop app): _add link_
Demo video: _add link_

*All data in the demo is simulated.*
