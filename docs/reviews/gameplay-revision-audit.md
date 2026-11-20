# Local gameplay audit · 2026-11-20

The audit used the uncommitted working tree on main, based on 679c234. The preceding commits are 17769a5 and 5388cba. Local Vite on port 5174 proxies the Go playtest API on 8081. PostgreSQL and the test mailbox run in Docker. The alternate local entry on 5173 redirects to the same origin. The normal startup commands are in the README.

Before editing, desktop Chromium and iPhone-sized WebKit opened the real apartment. Both showed Barbod’s snack request and completed it by pressing Accept request once. Screenshots are in build/qa/revision-before-{desktop,phone}.png. Neither journey required picking an object or a popup item.

| Area | Observed baseline |
|---|---|
| Commands | Friend and destination selects, Go, one-click request acceptance and inline action buttons. Tapping a requester preselected its destination. A gold pictogram sat beside the name. |
| Activities | Timed snacks, dishes, counter cleanup, balcony break, rest, paired chat, dance, TV, PS4 and Kavian’s equipment setup use real navigation and household state. One active request at a time. No jelly output, cooling, second command, smoking choices, WC task or music station. |
| Presentation | Fixed full apartment, individually authored provisional animated figures, 61–95 CSS px frames depending on scale. Body hit testing uses the sprite bounds and a 22 px fallback around the foot. Day/night, low patience reactions, fatigue, cleaning preference and paired chat work. See the station catalog for feature-by-feature gaps. |
| Language | Apartment, preview, account, rankings, notices, audio, backups, canvas names, timers and action labels are English. No shared Persian catalog or bundled Persian font. |
| Economy | The local catalog awards 5 Faaz and 3 separate score points per eligible request. TV costs 10 Faaz and PS4 costs 15 with TV. All are development values. The Go ledger and per-owner offline queue exist. Purchases are inline and completion lacks a confirmed amount announcement. |
| Art / events | Directional walking, shared dance and provisional reactions exist. Smoking props, happy tongue, distinct signature choreography, group gathering/music overrides and most mini-events do not have complete playable journeys. |
| Tests | Unit suites cover movement, simulation, saves, economy and assets. Playwright covers map, visuals, audio, request, accounts, offline sync and purchase. Existing UI assertions use the old English command path. |

Implementation order follows revision §9. Extend the session and existing checkpoint contract, then replace the resident controls and map picking with one station command path. Exercise both named requests before reviewing expansion candidates. Centralize Persian copy and font, adjust scale and hit testing, connect the shop and feedback to the ledger, reconcile confirmed details, then exercise real mobile and desktop browser flows and update the specifications.

## Verification and scope

Before revision, formatting/lint, the Go tests and production build passed; all 26 frontend unit tests passed. Of 39 baseline browser cases, 38 passed. The iPhone preview navigation case reported an exception while the apartment was still initializing. The baseline command stopped there, before the real-API browser suite.

The new local build was played against Vite 5174, the Go API on 8081 and PostgreSQL with fresh, independent desktop Chromium and iPhone 13 WebKit contexts. Each performed both named requests, reloaded during cooling, explicitly ate, received two rewards, bought a TV in the confirmation dialog, reloaded again and used the unlocked TV activity. After the purchase the wallet was 0 Faaz and the ranking score was 6. A separate browser verified paired boxing, Kavian's moonwalk, pause/resume and replaying the dismissed tutorial. The fixed-camera rotation, persistence, audio and account tests remain part of the regression suites.

The visible text of the apartment, account and character preview was checked after loading at both viewport sizes. The UI uses fa-IR and RTL. Product mark F7, email addresses, user-chosen names, URLs and internal IDs retain their spelling. Map coordinates remain left-to-right. The bundled font and its license are served locally. Physical handsets, production sign-in infrastructure, deployment and public multiplayer were outside this local verification.

| Character or event | Runtime audit |
|---|---|
| Barbod | Red jacket, shorts, beard and black bottle on existing provisional rig. Red IQOS, bounded reaction and raised-hand happiness. Final jacket detail, sweet-specific food item and fall/get-up choreography still pending. |
| Kavian | Grey-blue, bulky, glasses. Weighted cleanup, real device setup, paired boxing and an individual moonwalk. Neutral interaction and temporary poses until art approval. |
| Mahan | Lean grey figure, almost bare head and beard. Distinct cigarette/grey IQOS choices, sparring with Kavian and raised-arm reaction. Wasted-state jumping depends on D-014. |
| Parsa | Tall green hoodie, shorts and black IQOS. Jelly and balcony use real anchors. The friendly gesture in chat is provisional pending D-015. |
| Parham | Black outfit, glasses, mustache, black IQOS. PS4 after setup, food preference and belly/raised-hand reaction. Mench needs definition. |
| Shared | Elbow swing, finite smoking sessions, colored IQOS, tongue-out happy pose, reversible patience reaction and simulated night fatigue/rest. |
| Joint gathering | Confirmed sequence, unavailable in the playable catalog. D-013/D-014 leave its unlock and entry conditions open. Sunglasses, group jump/hug choreography and the temporary techno override are outstanding. |
| WC queue | Exclusive guest-WC occupancy and release work. Multi-person order and queue comedy remain proposed. |
| Fridge complaint, visitors, missing remote, snack thief, shared phone scrolling, cleaning challenge, Legendary night, sofa dispute, Foonfoonak | Liked concepts with missing release rules, recorded individually in the station brainstorm. They are not shipped as playable events. |

### Browser evidence

The following captures are from the live development origin. The iframe-free gameplay screenshots use the running application and real input.

| View | Desktop | iPhone-sized WebKit |
|---|---|---|
| Before revision | [Desktop](../../build/qa/revision-before-desktop.png) | [Phone](../../build/qa/revision-before-phone.png) |
| Request and scale | [Desktop](../../build/qa/revision-desktop-request.png) | [Phone](../../build/qa/revision-phone-request.png) |
| Food popup | [Desktop](../../build/qa/revision-desktop-food.png) | [Phone](../../build/qa/revision-phone-food.png) |
| Ready fridge after reload | [Desktop](../../build/qa/revision-desktop-fridge.png) | [Phone](../../build/qa/revision-phone-fridge.png) |
| Balcony choices | [Desktop](../../build/qa/revision-desktop-balcony.png) | [Phone](../../build/qa/revision-phone-balcony.png) |
| Confirmation | [Desktop](../../build/qa/revision-desktop-purchase.png) | [Phone](../../build/qa/revision-phone-purchase.png) |
| Unlocked TV | [Desktop](../../build/qa/revision-desktop-unlocked-tv.png) | [Phone](../../build/qa/revision-phone-unlocked-tv.png) |
