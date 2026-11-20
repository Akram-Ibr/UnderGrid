# UnderGrid demo script (about 2 minutes 30)

**Best demo (two real devices):** start a shared server (`npm run build && npm run start:lan`, or the hosted address). Open the desktop app on one computer and the web address on a friend's computer or phone, and in the desktop app set Network, Shared server to the same address. Send a report on one, and show it appearing on the other within a few seconds, then confirm it from the second device. Then cut one device with the shutdown switch, report offline, and restore it to show the report catching up.

**Single-computer fallback:** run `npm run desktop`. When the UnderGrid window opens, choose **File, New resident window** (Ctrl+N or Cmd+N) and place the two windows side by side (window B is the "second resident"; its title says resident 2). You can also use `npm run build && npm start` and two browser windows at `http://localhost:3001`. In the Network screen of both (click the status pill), open **Technical details and demo data** and press **Reset demo data** so the starting scenario is clean. Use a 1080p screen recording and read from this script.

| Time | Screen | Say | Do |
|---|---|---|---|
| 0:00 | **Home** | "Two billion people live in the Hollow. The Directorate says everything is fine. Residents on the deep levels know it is not. UnderGrid is built from what residents actually report." | Let the headline and the three live numbers sit for a moment. |
| 0:20 | **Real numbers** tab | "The Directorate says zero outages, zero unsafe water, 26 degrees. Residents verified something very different." | Point at the Directorate row against the Residents row. |
| 0:35 | **Map** tab | "Solid markers are verified by three different people. Dashed ones are still waiting. This flood has two of three confirmations. I can see it, so I confirm it." | Click **Confirm it** on the Flooding card in window A. Watch the tunnel turn red and close. |
| 0:55 | Map, Safe route | "The moment it is verified the tunnel closes and the route planner detours around it." | Point at the route summary mentioning closed tunnels. |
| 1:05 | **Fair share** tab | "This is the cross-section of the Hollow. The bar is what UnderGrid gives each level, the tick is what the Directorate rule gives. Level 6 gets nothing under the Directorate rule. Under UnderGrid it gets about three quarters, and every reason is spelled out." | Level 6 is open by default. Tap Level 1 to show what upper levels give up. |
| 1:40 | Fair share, supply | "Supply tighter tomorrow? Change it and the allocation updates." | Open **Change how much power there is**, drag the slider down, then switch to Water. |
| 1:50 | **Alerts** tab | "Alerts only come from verified reports and supply shortfalls, and every one explains why." | Open **Why this alert** on the blackout risk card. |
| 2:00 | **Network** (click the status pill), both windows | "Now the Directorate cuts the network." | Click **Simulate Directorate shutdown** in both windows. The pill turns red. |
| 2:10 | **Report** button in window A | "Offline, I report unsafe water on level 6." | Report Unsafe water at junction 040. |
| 2:20 | Window B, **Map** | "It appears on the second device with no server at all. When the network returns, both devices sync." | Show the new report in B, then click **Restore the network** in both and show the pill return to Online. |
| 2:30 | Close | "UnderGrid: real numbers from the people who live there, shared fairly, working when everything else is shut off." | |

**Tips:** keep window A on the left. Do one full rehearsal first because the shutdown step is the one judges remember. If the flood is already verified from a previous take, open Network, then **Technical details and demo data**, and press **Reset demo data**. Use the Dim theme for the recording unless your screen recorder washes out dark colors, then switch to Light from the footer.
