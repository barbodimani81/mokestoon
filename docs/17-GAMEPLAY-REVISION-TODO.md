# F7 — Gameplay Revision TODO for Codex

**Status:** Owner-requested revision brief  
**Priority:** P0 — Core gameplay and UX correction  
**Scope:** Inspect the existing running game and repository, reconcile the implementation with this brief, update the project documentation, then implement the approved changes.  
**Product owner:** Barbod

> This document is a new, authoritative product-owner request. Where it conflicts with older interaction or UI descriptions, this document takes precedence. Do not discard unrelated confirmed requirements from the existing F7 specifications.

---

Verification and implementation status are recorded in [the local gameplay audit](reviews/gameplay-revision-audit.md). Candidate approvals are tracked in [the activity catalog](18-ACTIVITY-CATALOG-BRAINSTORM.md).

## 0. Mission and working rules

The current game has progressed through its original implementation phases, but the actual gameplay does not match the intended experience. The goal is not to restart the project or blindly rebuild it. The goal is to inspect what exists, identify the mismatch, and revise the existing systems into the interaction model below.

### Mandatory rules

- Read `AGENTS.md` and the relevant documents in `docs/` before changing code.
- Inspect the current Git working tree, branch, recent commits, project structure, scripts, and existing tests. Preserve uncommitted user work. Do not reset, clean, overwrite, or force-push anything.
- Inspect the **actual locally running game** in a browser using the URL/port found from the project configuration or running process. Do not guess a port. If browser automation is unavailable, report that limitation and use the available logs, tests and screenshots; do not claim to have visually inspected the app.
- Inspect the actual local source code and current implementation. The public repository may not match the local working tree. Treat the local working tree as the implementation source of truth.
- Compare the running game and code against this document and the existing F7 specifications. Report concrete gaps before making broad changes.
- Reuse and refactor existing systems where sound. Avoid creating parallel versions of character selection, tasks, stations, menus, localization, rewards or progression.
- Keep the app runnable. Make changes in small, testable increments and run the relevant tests/build after each coherent area of work.
- Do not invent apartment geometry, character details, prices, reward amounts, activity rules or other owner decisions.
- Keep internal identifiers, code, database fields and API contracts stable and in English unless a migration is technically necessary. The Persian requirement applies to all player-facing game content.
- Do not claim a feature is complete merely because a component or placeholder exists. Verify the complete player journey.

### First action: audit

Before implementation, produce a short audit in the Codex response or a new file such as `docs/reviews/gameplay-revision-audit.md` containing:

1. How the current game starts and its local URL.
2. The currently implemented gameplay loop.
3. How character selection, request display, station/object selection and action menus currently work.
4. Which stations and activities are already implemented and which are placeholders.
5. Current localization status and any hardcoded player-facing strings.
6. Current character rendered size and how sprites/hitboxes are configured.
7. Current Faaz rewards, wallet, unlock catalog and purchase flow.
8. Which previously specified character details and mini-events are present, missing, broken or only visual placeholders.
9. Relevant tests and current baseline results.
10. A prioritized implementation plan with dependencies and files likely to change.

Do not stop after the audit unless a genuine product decision blocks the core flow. Use reasonable, reversible implementation choices for ordinary engineering details and record them in the docs.

---

## 1. P0 — Replace the interaction model with character → station → popup item selection

### Owner requirement

A request must be visible above the character who wants something. The player should select the character first, then select the station where the activity should happen, then choose the exact item/action from a popup menu. The character should navigate to the station and perform the selected activity.

The intended interaction is **not** a generic action button that immediately starts an activity from a character context menu.

### Required interaction sequence

Implement a clear, stateful, tap-first flow:

1. A character has a pending request. Display a readable request bubble directly above that character's head.
2. The player taps that character. Mark the character as selected and enter `select_station` mode.
3. Highlight only the stations valid for that character/request. Give clear visual feedback that the player must now tap a destination station.
4. The player taps a valid station on the apartment map.
5. Open a **popup menu** for that station. The popup lists only valid items/actions for the selected character, current request, station, unlock state and character state.
6. The player selects an item/action in the popup.
7. Create a player-directed task/intent. The character navigates to the station's interaction anchor, then performs the activity after reaching it and validating its preconditions.
8. Show task progress and state changes. On completion, resolve the request, apply its consequences and grant any eligible reward.

Provide clear back/cancel behavior at each selection step. The player must be able to cancel selection without accidentally assigning a task.

### Request bubbles above characters

- Every active request must be represented above the relevant character, not hidden only in a side panel.
- The bubble should include a short Persian request label and/or a recognizable icon.
- Examples: `ژله می‌خوام` and `می‌خوام برم بالکن سیگار بکشم`.
- Show urgency/patience in a readable way; never communicate urgency through color alone.
- The bubble must follow the character while moving and remain legible at phone size.
- Avoid bubbles covering faces, important map elements or each other. Use a sensible stacking/offset strategy when several requests are active.
- If a compact request list is retained, it must focus/select the same character when tapped; it must not replace the above-head request bubbles.
- After a request is accepted, update the bubble to an accepted/in-progress state. On completion, remove or resolve it visibly. On expiry, show the consequence and the character's reaction.

### Station selection

The current station categories are:

- Food — `خوراکی`
- Cleaning — `نظافت`
- Entertainment — `سرگرمی`
- Music — `موسیقی`
- Sleep — `خواب`
- WC — `دستشویی`
- Balcony — `بالکن`

A station can be a physical object or a semantic interaction zone. Examples include the kitchen counter/fridge/sink, TV/console area, speaker/music control, bed/sofa, guest WC/master bathroom and balcony area.

Requirements:

- Keep station IDs stable and independent of their Persian labels.
- Store station positions/anchors in the map or interaction configuration, not scattered hardcoded coordinates in character logic.
- Show which stations are valid after character selection. Invalid stations should not silently accept taps.
- Explain why a station is unavailable when useful: locked, occupied, unreachable, character busy, missing item, or incompatible request.
- Support more than one interaction anchor where multiple characters can use the same station, while preventing sprites from standing on top of one another.
- Preserve the one-screen fixed top-down apartment camera.

### Popup menus — mandatory for all item/action selection

**Every selection of an item or activity option must use a popup menu.** This applies across all stations and other game screens, not only food.

Examples:

- Food: choose jelly, snacks, meal, drink, etc.
- Cleaning: choose dishwashing, sweeping, mopping, tidying, taking out trash, etc.
- Entertainment: choose TV, PS4, Kinect, guitar, boxing or another unlocked activity.
- Music: choose track or vibe.
- Sleep: choose bed/sofa/rest action when relevant.
- WC: choose the appropriate available bathroom/action.
- Balcony: choose cigarette, IQOS, sitting, socializing or another unlocked activity.
- Progression/shop: choose the unlock to inspect and purchase.

Popup behavior:

- On mobile, use a proper modal or bottom-sheet popup with a clear title, item list, close/back control and safe-area handling.
- On desktop, it may be positioned near the selected station, but it must still be a distinct popup rather than an inline expansion embedded in the map.
- Prevent taps from passing through the popup to the apartment underneath it.
- Keep the current character and station context visible in the popup.
- Each option must show its Persian name, relevant icon/asset, availability/locked state and any cost or requirement.
- Only show actions valid for the selected character/station/request. Do not offer dead controls.
- A single available choice must still use the popup pattern; do not bypass the interaction model inconsistently.
- Support keyboard focus/escape on desktop and touch targets suitable for mobile.

### Required example A — Parsa prepares jelly

This full multi-stage journey is an acceptance test:

1. Parsa has a request bubble above his head: `ژله می‌خوام`.
2. The player taps Parsa.
3. The player taps the kitchen/food station.
4. A popup appears with valid food actions. The player selects `تهیه ژله`.
5. Parsa walks to the kitchen interaction anchor and performs the preparation animation/action.
6. When preparation is complete, Parsa carries/places the jelly in the fridge. The jelly enters a `cooling`/`not_ready` state with a visible status indicator.
7. When the jelly is ready, show a clear ready indicator on the fridge/item and make the follow-up action available.
8. The player must direct Parsa again; do not make him automatically eat it. The player taps Parsa, taps the fridge/food station, and chooses `خوردن ژله` from a popup.
9. Parsa walks to the fridge/appropriate interaction anchor, retrieves/eats the jelly, and completes the follow-up action.
10. Update the request/state correctly and award Faaz only for eligible completed task stages as defined by the reward configuration. Never pay twice for the same completion event.

The task system must support multi-stage activities with intermediate outputs, storage/readiness states and a second player command. Do not fake the preparation and fridge stages with a single instant animation.

### Required example B — Mahan smokes on the balcony

1. Mahan has a request bubble above his head indicating that he wants to smoke.
2. The player taps Mahan.
3. The player taps the balcony station.
4. A popup appears with valid smoking/activity choices for Mahan, including the configured cigarette/IQOS options.
5. The player selects an option.
6. Mahan walks to a valid balcony anchor and starts the smoking activity.
7. The activity state, animation, request resolution and any reward are handled consistently.

Do not automatically teleport Mahan to the balcony or start the animation before he reaches the station.

### Task and navigation state handling

- Use the existing intent/task/state architecture if it is sound; extend it rather than creating a separate command system.
- At minimum represent: character selected, awaiting station, popup open, action selected, pathing, performing, waiting for a prerequisite/readiness state, completed, failed and cancelled.
- Prevent duplicate active tasks for a character unless a defined group activity supports it.
- Player-directed tasks must not be randomly abandoned by ambient AI.
- If no path exists, the character is blocked, the station becomes unavailable or a prerequisite fails, show a Persian explanation and return the interaction flow to a recoverable state.
- Do not leave a character, request, modal or task permanently stuck after cancellation, path failure or app reload.
- Persist any multi-stage activity state that must survive a reload.

### Acceptance criteria

- [ ] Request bubbles appear above all characters with active requests.
- [ ] Tapping a character enters station-selection mode.
- [ ] Valid stations are highlighted and invalid ones cannot be assigned accidentally.
- [ ] Tapping a station opens a popup menu.
- [ ] Every item/action selection uses a popup; no station silently starts an item action.
- [ ] Selecting an action sends the character to the station before the activity starts.
- [ ] The Parsa jelly preparation → fridge cooling → ready → player-directed eating journey works end to end.
- [ ] The Mahan balcony smoking journey works end to end.
- [ ] Back, cancel, unavailable station, no-path, interruption and reload cases recover cleanly.
- [ ] Mobile touch and desktop mouse interactions both work.

---

## 2. P0 — Increase character visual size

The characters currently appear too small. Make them more prominent and easier to tap/read.

Requirements:

- Inspect the current rendered size and camera/map scale first.
- Start by testing approximately **15–20% larger rendered character sprites** than the current baseline. This is an initial tuning target, not an instruction to distort the artwork.
- Keep the five characters visually consistent in overall scale while preserving their distinct body shapes and relative proportions from the character specification.
- Separate visual sprite scale from physics/collision/navigation footprint and touch-selection hit area. Do not blindly enlarge collision geometry with the sprite.
- Increase touch hit areas enough that selecting a character is reliable on a phone.
- Verify that larger sprites do not obscure the map, request bubbles, interactable stations or other characters.
- Re-check the fixed full-apartment camera at realistic mobile viewport sizes and desktop.

### Acceptance criteria

- [ ] All five characters are visibly easier to recognize and tap.
- [ ] Their individual silhouettes and proportions remain distinct.
- [ ] Larger sprites do not break navigation, collision, station alignment or animation anchors.
- [ ] Request bubbles remain readable and correctly anchored.
- [ ] Screenshots or browser evidence are captured at a representative phone viewport and desktop viewport.

---

## 3. P0 — Brainstorm and organize all station activities/items

The game must have meaningful, varied, discoverable activities at every station. Create a proper brainstorm before expanding the catalog.

### Required deliverable

Create `docs/18-ACTIVITY-CATALOG-BRAINSTORM.md` (or an equivalent clearly named document if a suitable catalog already exists). Include a structured activity/item brainstorm for every station listed below.

For each candidate, include:

- Stable proposed ID.
- Persian player-facing name.
- Station/category.
- What the player does: character → station → popup choice.
- Which characters can do it and any character-specific preference.
- Required objects/unlocks/prerequisites.
- Character animation and expected visible result.
- Duration/readiness/intermediate state, if applicable.
- Whether it is single-character, pair or group activity.
- Whether it is already implemented, missing, a confirmed requirement, or only a proposal.
- Relative implementation effort: small / medium / large.
- Gameplay/replay value and dependencies.

Brainstorm broadly, but keep the main loop comprehensible. Avoid adding an inventory/crafting/skill-tree system unless the product owner explicitly approves it.

### Station brainstorm coverage

#### A. Food — `خوراکی`

Audit and brainstorm actions involving:

- Fridge inspection/opening; characters complain when nothing good is available.
- Choosing food/drinks from a popup.
- Preparing food at the kitchen counter or suitable appliance.
- Jelly preparation, placing it in the fridge, cooling/readiness and later eating.
- Snacks, sweets and character food preferences (including Barbod's love of sweets).
- Eating, sharing food, offering food to another character and food-related social moments.
- Empty-fridge requests, snack stealing and food cleanup.
- Meals and possible time-of-day variation, without assuming an unapproved final menu.

Do not make every food action instant. Model preparation, storage, readiness, serving/eating and cleanup where appropriate.

#### B. Cleaning — `نظافت`

Audit and brainstorm:

- Washing dishes at the sink.
- Sweeping/mopping floors.
- Tidying the living room/sofa.
- Taking out trash and clearing clutter.
- Cleaning spills and post-party mess (empty bottles, dishes and clutter) if approved as a recurring consequence.
- Cleaning challenge/quick cleanup event.
- Kavian's higher likelihood of initiating cleaning and dishwashing; other characters can help or be assigned.

Cleaning must have visible before/after states and actual character movement/animations, not only a progress number.

#### C. Entertainment — `سرگرمی`

Audit and brainstorm:

- Watching TV alone or together.
- PS4 gaming and multiplayer couch sessions (in-game group activity; not network multiplayer).
- Kinect/dance activities.
- Guitar/music performance if available.
- Boxing between Kavian and Mahan.
- Phone scrolling/social moments.
- Parham's PS4 and `mench` activity label. Preserve the existing owner wording; do not guess what “mench” means. Keep it flagged for owner clarification if necessary.
- Missing TV remote mini-event.
- Sofa disputes/fighting over the best seat.

#### D. Music — `موسیقی`

Audit and brainstorm:

- Selecting a track and selecting a vibe as separate concepts.
- Chill / Deep House.
- Hard / Infected Mushroom / hard techno.
- Persian music.
- Birthday/party music.
- User-provided playlist integration later; music files are not available yet.
- Music-driven lighting, dance probability, ambient behavior and group mood.
- Temporary event music overrides, including techno during the shared group joint event, with restoration of the previous track/vibe afterward.

The game must remain fully playable with no music files installed. Use silence or a clearly identified placeholder; do not invent or bundle copyrighted tracks.

#### E. Sleep — `خواب`

Audit and brainstorm:

- Going to the master bed or sleeping/resting on the sofa.
- Rest/nap based on fatigue and time of day.
- End-of-night tiredness and the daily cycle.
- Character choice of sleeping location where appropriate.
- Recovery/wake-up behavior and interruption rules.

#### F. WC — `دستشویی`

Audit and brainstorm:

- Requests to use the guest WC or master bathroom as permitted by the map/owner-approved rules.
- Bathroom occupancy and queue behavior when two friends need the WC.
- Waiting, impatience and comedic queue reactions.
- Door/occupied states and recovery when a character cancels.

Do not invent extra bathrooms or alter the floor plan. Preserve the distinction between the guest WC and the master bathroom.

#### G. Balcony — `بالکن`

Audit and brainstorm:

- Smoking cigarette/IQOS individually or together.
- Sitting/relaxing at balcony furniture.
- Conversation/socializing.
- Watching the view or spending quiet time.
- Group gathering when an event calls for it.
- Interactions with the balcony table/chairs as unlockable objects if applicable.

Keep cigarette/IQOS behavior as an occasional ambient/requested activity, not a permanently looping animation.

### Cross-station and apartment-wide mini-event audit

Check the current game against the following already discussed mini-details. Mark each one as implemented, partially implemented, missing, broken or proposal; do not assume that a UI placeholder means the mechanic works.

- [ ] Fridge complaint / “nothing good to eat” moment.
- [ ] Unexpected doorbell / guest arrival.
- [ ] Bathroom queue when two characters need the WC.
- [ ] Missing TV remote.
- [ ] Snack thief.
- [ ] Friends sitting together and scrolling phones.
- [ ] Cleaning challenge.
- [ ] Legendary night.
- [ ] Sofa dispute.
- [ ] Foonfoonak rapid-tap event: someone calls “فون‌فونک”, the others must repeat it quickly; the player taps the characters before the timer expires.
- [ ] Shared joint event: participants gather, take out sunglasses, techno starts, shared elbow-swing dance, jumping/hugging and happy tongue-out reactions.
- [ ] Temporary savage reaction when a character loses patience; restore normal behavior after a short cooldown.
- [ ] Character-specific signature reactions and dances.
- [ ] Day/night atmosphere and end-of-night exhaustion/sleep.

Some of these are described as liked ideas or proposals in older discussion, not necessarily mandatory baseline features. Preserve the existing status classification in the docs. Do not silently promote a proposal to confirmed scope. Put missing candidates into the brainstorm for owner review.

### Brainstorming rule

The purpose of this document is to let the product owner review and add activities. **Do not automatically implement every newly brainstormed idea.** Clearly separate:

1. Existing confirmed requirements that must be implemented.
2. Previously liked/accepted ideas that are part of the intended design direction.
3. New suggestions that require owner approval.

After producing the catalog, identify a small recommended first batch based on gameplay value, dependency and effort. Keep unapproved ideas marked `PROPOSED — OWNER REVIEW REQUIRED`.

---

## 4. P0 — Translate the entire player-facing game into Persian

The game must be Persian-first. All player-facing text must be in Persian. Do not leave English UI labels mixed into the shipped experience.

### Required coverage

- Main menu and onboarding/tutorial.
- Character names and status panels.
- Above-head request bubbles.
- Station names and highlights.
- Every popup/menu/item/action label.
- Food, entertainment, music, cleaning, sleep, WC and balcony content.
- Confirmation, cancel, back, close and pause controls.
- Faaz wallet, reward notifications, unlock catalog, prices and purchase confirmations.
- F7 Score, leaderboard, profile and account screens.
- Loading, offline, synchronization, error, empty and success states.
- Tooltips, notifications, event descriptions and mini-event instructions.
- Settings, accessibility, audio and help text.
- Any other visible text rendered by the game or surrounding web UI.

### Localization and RTL requirements

- Set the player-facing locale to `fa-IR`.
- Set correct right-to-left layout for UI and text. Do **not** mirror the apartment/map coordinates or reverse gameplay navigation just because the UI is RTL.
- Use proper Persian glyph shaping, connected letters, punctuation and bidirectional text handling for mixed Persian/Latin strings such as `F7`.
- Select a readable Persian font with suitable licensing. Bundle/self-host it reliably; do not rely on a font installed on the user's device.
- Use Persian display labels for stations, actions, characters and currency. Suggested station labels are `خوراکی`، `نظافت`، `سرگرمی`، `موسیقی`، `خواب`، `دستشویی`، `بالکن`.
- Display Faaz as `فاز` (or the existing owner-approved Persian spelling) and F7 Score as `امتیاز F7` in the UI. Keep internal IDs such as `faaz`, `f7_score` and `station.food` unchanged.
- Format numbers, dates and time consistently for `fa-IR`. Avoid mixing Persian and Latin digits unpredictably; define and test one policy.
- Do not translate stable code IDs, API field names, logs or developer-facing documentation.
- Centralize player-facing strings in the existing localization/i18n system. If none exists, add a proper typed message catalog rather than scattering Persian literals through components and game logic.
- Search the source/build for visible English strings and document any intentional exceptions (e.g. the product name F7 or technical proper nouns).

### Copy quality

Use natural, concise Persian suitable for a casual game and the characters' tone. Do not use stiff machine-translated wording. Keep short request labels readable above character heads. Keep wording consistent across bubbles, popups, tutorials and notifications.

### Acceptance criteria

- [ ] The default game experience is fully Persian.
- [ ] No unintended English player-facing strings remain.
- [ ] RTL layout works on mobile and desktop.
- [ ] Persian glyph shaping and mixed Farsi/Latin content render correctly.
- [ ] The font loads reliably on a clean browser/device.
- [ ] All new activity/menu/request text is added to the central message catalog.

---

## 5. P0 — Make Faaz rewards and unlock purchases a complete gameplay system

Implement the player-facing Faaz loop end to end:

1. The character completes an eligible task/activity.
2. The game shows a clear completion state and the Faaz reward amount.
3. The Faaz wallet increases by the confirmed reward.
4. The player opens the unlock/catalog popup.
5. The player selects an item/unlock and sees its Persian description, cost and prerequisites.
6. The player confirms the purchase in a popup confirmation step.
7. If the balance is sufficient and prerequisites are met, the purchase succeeds, Faaz is deducted and the item/activity becomes available.
8. If not affordable or not eligible, show a clear Persian reason. Never allow a negative balance.
9. The purchase and unlock remain after reload/re-login according to the current persistence architecture.

### Reward rules

- Award Faaz after successful completion of eligible tasks, not merely when a request appears or when the player opens a menu.
- A single completion event must not pay more than once. Use existing idempotency/ledger patterns.
- Rewards and prices must be data/config driven; do not hardcode values inside UI or action handlers.
- Do not invent final reward amounts or purchase prices. Keep owner-unapproved values clearly marked as development defaults and add the required tuning decisions to `docs/16-OPEN-DECISIONS.md`.
- Keep **Faaz** (spendable wallet) separate from **F7 Score** (non-spendable ranking score). Never let the player spend F7 Score or use wallet balance for leaderboard ranking.
- If a task has multiple stages, define exactly which stage(s) can reward Faaz and prevent duplicate reward for retry/reload.
- For authenticated/cloud play, the server remains authoritative for wallet mutations and purchases. Do not accept a client-supplied final balance or arbitrary reward amount.
- If an offline/local pending reward is supported, label it as pending until reconciled with the server. Do not present an unconfirmed server reward as final.

### Catalog candidates to audit

Use the existing catalog and owner decisions. Candidate unlockables already discussed include TV/equipment, PS4, Kinect, balcony table/chairs, guitar, new food/snack options, drink variants, music/vibe options, the joint event, indoor smoking and cosmetics such as a Russian hat. Do not add a third bathroom or alter the real apartment layout. Do not activate unapproved entries or assign final prices without owner approval.

### Acceptance criteria

- [ ] Completing an eligible task displays the reward and increases Faaz exactly once.
- [ ] Wallet balance is visible in the Persian HUD.
- [ ] Unlocks are browsable through popup menus.
- [ ] Purchase confirmation and insufficient-balance states work.
- [ ] A successful purchase deducts Faaz and unlocks the item exactly once.
- [ ] Balance and unlock state survive reload and account synchronization.
- [ ] F7 Score remains separate and non-spendable.
- [ ] Duplicate requests/retries cannot duplicate rewards or purchases.

---

## 6. P1 — Restore and audit the small character/gameplay details

Do not reduce the characters to generic agents. Compare the live game with `docs/03-CHARACTER-SPECIFICATION.md` and the other existing design docs. Verify the visual, behavioral and event details below.

### Shared details

- Every character can show the tongue-out happy gesture.
- All characters can perform the shared elbow-swing dance: hands start down, elbows swing up to the right, then the left, repeatedly.
- Cigarette smoking is a frequent but occasional ambient/social behavior, not a permanently running animation.
- Each character has the specified IQOS color.
- Losing patience can trigger a temporary, character-specific savage reaction. It must not permanently change personality or lock out normal play.
- The shared joint event sequence is: gather participants → sunglasses → techno override → shared elbow-swing dance → jumping/hugging → happy reactions/tongue-out → resolve event and restore previous music/state.

### Character-specific audit

- **Barbod:** red Under Armour jacket, white shorts, beard, not-long hair, black water bottle, red IQOS, likes dancing/sweets, low patience, often falls; excited raised-hands jump.
- **Kavian:** bulky build, grey-blue hoodie, black pants, glasses, medium messy hair, slight beard, black IQOS; prefers cleaning/dishes but others can help; physically sets up TV/console equipment; individual moonwalk; boxing with Mahan; helps/socializes/hugs/laughs.
- **Mahan:** lean, almost bald, long beard, grey long-sleeved shirt and grey sweatpants, grey IQOS; boxing with Kavian; gets especially jumpy in the appropriate wasted/high-energy state; hands-up side-to-side swing.
- **Parsa:** tall/lean, green hoodie, grey shorts, short hair, slight beard, black IQOS; calm, likes rolling the joint, TV, balcony and group dance; handshake-then-kiss greeting remains a neutral friendly gesture until its exact choreography is approved.
- **Parham:** black hoodie and sweatpants, glasses, distinctive mustache/no beard, black IQOS; PS4 and `mench`, techno dancing, food, low patience; belly laugh while also raising both hands; often watches TV/scrolls phones with Parsa.

Do not change approved character clothing, face, hair, accessories or personality just to make implementation easier. Missing animation assets should be reported and represented through explicit placeholders, not invented as final art.

### Acceptance criteria

- [ ] Existing character specification is audited against actual code and assets.
- [ ] Missing details are listed with implementation/asset dependencies.
- [ ] All feasible confirmed behaviors are wired to actual gameplay state/events, not only decorative animations.
- [ ] Temporary placeholder behavior is clearly documented.

---

## 7. P1 — UI feedback and onboarding for the new interaction loop

Provide a short first-session tutorial in Persian that teaches the exact sequence:

**Tap character → tap station → choose an item from the popup → watch the character go and do it.**

The tutorial should demonstrate a simple request and can be dismissed/replayed. Do not block returning players every session.

Every step must provide feedback:

- Which character is selected.
- What station the player should choose next.
- Why certain stations are highlighted/disabled.
- Which popup is open and which character/station it belongs to.
- Whether the character is walking, performing, waiting, ready for a follow-up command or finished.
- What reward was earned and whether it is server-confirmed.

Keep the apartment visible as the main game screen. Menus should not obscure more of the apartment than necessary.

---

## 8. Documentation updates are mandatory

After the audit and as implementation decisions become clear, update the existing docs **wherever necessary**. Do not leave contradictory older instructions in place.

At minimum review/update:

- `docs/00-MASTER-INDEX.md` — add this revision brief and state document precedence/status.
- `docs/02-GAME-DESIGN.md` — replace the older generic interaction sequence with the required character → station → popup item → task flow; define multi-stage requests and station loop.
- `docs/03-CHARACTER-SPECIFICATION.md` — preserve character-specific behaviors and note required scale/readability adjustments if relevant.
- `docs/05-UI-UX-SPECIFICATION.md` — request bubbles, station selection, popup menu rules, selection/cancel states, Persian-only player-facing UI and onboarding.
- `docs/06-TECHNICAL-ARCHITECTURE.md` — update only if the implemented interaction/i18n/reward architecture requires a real architectural change.
- `docs/07-DATABASE-SCHEMA.md` — update persistence for multi-stage tasks, stored outputs/readiness or catalog/reward changes if needed.
- `docs/08-API-CONTRACTS.md` — update API/OpenAPI contracts only if actual API changes are required.
- `docs/09-GAMEPLAY-SYSTEMS.md` — task state machine, station resolution, multi-stage activities, task rewards and event behavior.
- `docs/10-ASSET-AND-AUDIO-PIPELINE.md` — character scale/animation assets, Persian font and localization assets, station/item assets.
- `docs/12-TESTING-AND-ACCEPTANCE.md` — end-to-end tests and Persian/RTL tests for all flows above.
- `docs/14-IMPLEMENTATION-ROADMAP.md` — add a gameplay-revision workstream or revised milestones; do not falsely preserve old completion statuses for features that do not pass the new criteria.
- `docs/16-OPEN-DECISIONS.md` — add unresolved owner decisions such as final reward values/prices and activity approval; do not mark unknown items confirmed.
- `docs/18-ACTIVITY-CATALOG-BRAINSTORM.md` — create the station-by-station brainstorm described in section 3.
- `README.md` and `AGENTS.md` — update entry points/agent instructions only where necessary so future agents see this revision brief and current product truth.

If an item does not require a document change, do not edit it merely for activity. Keep the master index and open-decision register consistent with all changes.

### Documentation quality rules

- Separate `CONFIRMED`, `IMPLEMENTATION DEFAULT`, `PROPOSAL`, and `OPEN — OWNER DECISION REQUIRED`.
- Include dates for newly recorded owner decisions.
- Never silently convert a proposal into a confirmed requirement.
- Do not delete historical decisions; supersede them with an explicit dated entry.
- Update acceptance criteria to describe behavior that can actually be tested.

---

## 9. Suggested execution order

Use this order to reduce rework:

1. **Audit:** inspect current local repo and running game; record gaps and baseline.
2. **Interaction foundation:** implement the character-selection → station-selection → popup-action flow, task-state handling and request bubbles.
3. **End-to-end examples:** complete the Parsa jelly and Mahan balcony smoking journeys before expanding the item catalog.
4. **Station catalog brainstorm:** inspect current behavior, create `docs/18-ACTIVITY-CATALOG-BRAINSTORM.md`, distinguish existing/confirmed/proposed items and identify the first recommended batch.
5. **Persian localization:** centralize text, set `fa-IR`/RTL behavior and translate all player-facing content, including the new flows.
6. **Character size/details:** tune render size and audit character-specific behaviors/animations.
7. **Faaz loop:** connect task completion to idempotent rewards and popup-based purchases/unlocks.
8. **Mini-event reconciliation:** restore missing confirmed/approved details and leave unapproved proposals for owner review.
9. **Regression and documentation:** test the full game, update all affected docs and provide evidence.

These are work packages for the revision, not a requirement to restart the completed original roadmap from M0.

---

## 10. Definition of done

This revision is complete only when:

- [ ] The real running game has been inspected before and after the changes.
- [ ] The player can complete the character → station → popup item selection flow on mobile and desktop.
- [ ] The Parsa jelly multi-stage example works end to end, including fridge readiness and a second player-directed command.
- [ ] The Mahan balcony smoking example works end to end.
- [ ] All item/action selection is presented through popup menus.
- [ ] Request bubbles display above characters and remain readable.
- [ ] Characters are visibly larger without breaking the map, pathfinding or hitboxes.
- [ ] The game is fully Persian in all player-facing screens and has correct RTL rendering.
- [ ] Completing eligible tasks rewards Faaz exactly once.
- [ ] Faaz purchases unlock real content and persist correctly; F7 Score remains non-spendable.
- [ ] The seven station categories each have an audited activity catalog and brainstorm.
- [ ] Existing agreed character details and mini-events are audited, with missing items implemented or explicitly marked as asset/owner blockers.
- [ ] New unapproved ideas are documented as proposals and are not silently shipped.
- [ ] Unit, integration and end-to-end tests pass; production build succeeds.
- [ ] Relevant documentation, OpenAPI contracts and migrations are updated where required.
- [ ] No regressions are introduced in authentication, saves, leaderboard, map rendering, audio controls or deployment.

### Final Codex report

At completion, report:

1. What was wrong in the original gameplay and what changed.
2. Which tasks are complete, partial, blocked or awaiting owner approval.
3. The exact files changed, including all documentation updates.
4. The Persian localization coverage and any intentional non-Persian exceptions.
5. The activity brainstorm summary and which suggestions need owner approval.
6. Tests, commands and production build results.
7. Screenshots or browser evidence of the principal flows at mobile and desktop sizes.
8. Remaining asset requirements, owner decisions and known limitations.

Do not claim the revision is finished if any of the P0 acceptance criteria fail.
