# 01 — Product Requirements

## 1. Product summary

F7 is a single-player, top-down apartment-life simulation about five friends sharing a real 55 m² apartment. The player handles requests, coordinates activities, keeps the apartment functional and manages an escalating social atmosphere. The humor comes from recognizable friend behavior, autonomous reactions, neglected requests and chaotic shared events.

The product is a mobile-first web game that can be installed as a PWA. A player can play the simulation alone, sign in to retain progress and compete with friends on a leaderboard. This is not a real-time multiplayer game.

## 2. Product goals

1. Make the apartment and the five friends recognizable, not generic.
2. Produce a playable loop quickly, then improve fidelity and content without rewriting the architecture.
3. Make characters feel alive through semi-autonomous movement, needs, requests and distinct reactions.
4. Make Faaz progression understandable and rewarding without introducing complex RPG skill trees.
5. Make music a gameplay/atmosphere control, not a background-only setting.
6. Persist player identity and ranking score across devices through accounts and backend storage.
7. Ship a stable, responsive web build with a practical production deployment path.

## 3. Non-goals for first release

- Real-time co-op or simultaneous player control.
- A procedurally generated or freely remodelable apartment.
- Multiple apartments or multiple floor levels.
- A deep character skill tree, equipment system or stat progression.
- Public social feeds, chat, voice, trading or user-generated public content.
- Dedicated native iOS/Android applications.
- A competitive esports-grade anti-cheat system. Initial score validation should be robust against accidental bugs and basic tampering, not claimed to be cheat-proof.

## 4. Target experience

A player opens the game and immediately sees the complete apartment from above. The five friends are visible or are in a known interior location. Characters may sit, smoke, talk, rest, dance or perform light ambient actions. Requests appear when a friend needs something. The player taps a character, taps a highlighted station, chooses an item in its Persian popup, and observes the character carry it out. Successful activities can award Faaz and F7 Score according to separate rules.

As the player progresses, they unlock objects and activities such as balcony furniture, TV, PS4, Kinect, guitar, additional snacks, drinks, and music/vibe options. The apartment's physical structure stays the same. The room's lighting, soundtrack and character behavior can change with day/night and music mode.

## 5. Personas

- **Player / friend-group member:** wants a funny, quick session, recognizable characters and a sense of shared history.
- **Returning player:** expects saved unlocks, Faaz and F7 Score to remain consistent after signing in on another device.
- **Game owner / operator:** needs to tune prices, rewards, asset catalogs and feature flags without hardcoding every value into the game loop.

## 6. Functional requirements

### FR-01 — Apartment scene
- Render one fixed top-down map containing the entire apartment.
- No camera scrolling, zoom-dependent navigation or room scene transitions in normal gameplay.
- Support walls, doors, windows, furniture, interaction points, collision areas and navigation obstacles.
- Do not finalize geometry until the source floor plan is confirmed.

### FR-02 — Characters
- Render five distinct characters: Barbod, Kavian, Mahan, Parsa and Parham.
- Each has a stable ID, visual definition, preferred activities, patience level, ambient behavior and signature reactions.
- Characters move autonomously for ambient activity but remain available for player-directed tasks.
- A character's response must be readable: moving, waiting, performing, blocked, completed, impatient or resting.

### FR-03 — Requests and patience
- Characters can issue visible requests.
- Requests have a type, target, urgency, state, timeout/patience value and reward definition.
- Ignored/expired requests can trigger funny consequences, including temporary savage behavior.
- Savage mode is temporary and character-specific; it is not a permanent personality replacement.

### FR-04 — Interactions and activities
- Tapping a character or object opens contextual actions relevant to current state and unlocks.
- The player can direct a character to a target or activity.
- The system prevents invalid actions, duplicate task execution and pathing into blocked space.
- Activities include socializing, watching TV, playing PS4, Kinect, boxing between Kavian and Mahan, dancing, sitting on the balcony, eating, smoking, cleaning and washing dishes, subject to unlocks and game state.

### FR-05 — Economy
- Faaz is the spendable in-game currency.
- F7 Score is a separate cumulative, non-spendable ranking score.
- Rewards and costs are data-driven, not scattered constants.
- A transaction must have a reason, stable event ID and idempotency key.
- The server must not accept client-supplied wallet balances.

### FR-06 — Progression
- Unlocks focus on objects, areas/access, activities, music/vibe choices and consumable catalogs.
- The apartment topology remains fixed.
- Candidate unlocks include balcony access/furniture, TV, PS4, Kinect, guitar, second WC (subject to the real apartment representation and product-owner confirmation), snacks, drink variants, indoor smoking option, Russian hat, music/vibe modes and joint event.
- Prices and ordering are not confirmed. Keep catalog data configurable and use placeholder values only in development.

### FR-07 — Time and atmosphere
- Provide a simulated day/evening/night cycle.
- Time changes lighting, ambiance and context-appropriate behavior; it must not reset progress.
- Food and activity availability may be time-aware, but exact menus/timings are configurable.

### FR-08 — Music and vibe
- Player can select a track or playlist and a gameplay vibe.
- Vibe affects lighting, energy, idle behavior and dance likelihood.
- Chill/deep house, hard techno/Infected Mushroom, Persian, birthday and special event moods are defined in the game-design doc.
- Player can control volume and mute.
- Personal audio import is a requirement; the initial implementation default is local file selection stored on the device, not server upload. Confirm before implementing cross-device audio sync.

### FR-09 — Social/chaos events
- Include the explicitly liked events listed in `02-GAME-DESIGN.md`, prioritizing their small, testable implementations.
- Events must not soft-lock the simulation or make core requests impossible.

### FR-10 — Accounts and leaderboard
- Player can register/sign in and retain profile, save, unlocks, Faaz and F7 Score.
- Leaderboard ranks players by F7 Score, never by Faaz balance.
- User must be able to sign out and recover account access through the chosen authentication flow.
- Friend-group visibility/invite model is still an open decision; the API must allow private groups without forcing global public profiles.

### FR-11 — Save and offline behavior
- The game should remain playable during a temporary network outage after the initial game bundle is loaded.
- Locally generated progress events are queued for sync.
- Server-confirmed currency and score changes are canonical. UI must distinguish pending from confirmed rewards when offline.
- Do not silently overwrite a newer cloud save with an older local snapshot.

## 7. Non-functional requirements

- **Performance:** target stable 60 FPS on recent mid-range mobile devices; scale effects/particles on slower devices. Initial load should be kept small through asset atlases and lazy loading of optional audio.
- **Responsive:** fit the complete map on screen without scrolling. Support mobile portrait and landscape; optimize the primary composition once the map aspect ratio is known.
- **Accessibility:** readable text, high-contrast request indicators, non-color-only status cues, keyboard support on desktop, reduced motion option, audio controls.
- **Reliability:** graceful API failure; local gameplay should not crash when authentication or leaderboard is unavailable.
- **Security:** HTTPS, secure session handling, authorization, validated inputs, rate limits and server-side ledger invariants.
- **Maintainability:** modular game systems, deterministic domain logic where possible, typed API contracts, tests and versioned migrations.

## 8. Analytics and success indicators

Do not add third-party tracking by default. Provide an internal event interface that can be connected later. Useful measures include session length, requests completed, request expiry rate, unlocked items, tutorial completion, crash rate, FPS and sync failures. Collect only what is necessary and disclose analytics if enabled.

## 9. Release scope

**Minimum playable release:** apartment scene, five placeholder-to-final character sprites, movement/pathfinding, contextual interactions, basic requests/patience, Faaz and F7 Score event rewards, local save, sign-in, cloud save, leaderboard, basic unlock catalog, day/night, audio controls, PWA installability and production deployment.

**Post-core content:** full mini-event set, advanced music-reactive choreography, expanded unlock catalog, polished group events and final birthday/endgame sequence.
