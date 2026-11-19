# 02 — Game Design Document

## 1. Design pillars

1. **Recognizable F7:** the apartment and friends must feel specific to this group.
2. **Readable chaos:** the player can understand why something is happening even when several things happen at once.
3. **Low-friction direction:** tap a person or object, choose an action, observe the result.
4. **Autonomy with consequences:** friends have their own ambient behavior, but requests need player attention.
5. **Progress through the apartment:** unlock objects, activities and atmosphere, not complex character skill trees.

## 2. Core loop

1. Friends perform ambient activities and generate requests.
2. The player notices a request or chooses an activity.
3. The player selects a character and target/action.
4. The character navigates to the target and performs the activity.
5. The system resolves success, failure, interruption or expiry.
6. Eligible events award Faaz and F7 Score separately.
7. The player spends Faaz on apartment objects, activities, music or catalog unlocks.
8. The apartment becomes more interactive; event combinations become more varied.
9. At night, friends become tired and settle into beds/sofa; a new in-game day can begin.

The loop should be fun without requiring the player to click continuously. Ambient animations and social interactions fill gaps between requests.

## 3. Camera and spatial rules

- Camera is fixed, top-down and framed to show the entire apartment.
- No scrolling between rooms.
- One continuous apartment scene; doors can be traversed as walkable connections, not separate levels.
- Character positions and furniture placement must follow the confirmed real floor plan.
- UI overlays may occupy screen edges, but must not permanently obscure important navigation areas.

## 4. Character autonomy

Characters use a lightweight behavior/state model. An autonomous character may choose from eligible ambient actions such as idle, sit, talk, smoke, rest or observe the TV. Player-assigned tasks have higher priority than ambient actions. High-priority scripted events may temporarily reserve participating characters.

Suggested priority order (default):
1. Safety/recovery state (unstuck, path recovery).
2. Required event sequence participation.
3. Player-assigned task.
4. Active request response.
5. Needs/energy/rest.
6. Ambient/social behavior.

Do not let ambient AI repeatedly cancel player commands. Use cooldowns and state transitions to avoid jitter.

## 5. Requests

A request contains:
- `request_id`, `character_id`, `request_type`, optional `target_object_id`.
- `created_at_game_time`, `expires_at_game_time` or patience budget.
- `status`: pending, accepted, in_progress, completed, failed, expired, cancelled.
- UI label/icon, urgency and a configured reward key.

Examples: wants food, wants to smoke, wants to watch TV, wants to play PS4, needs the bathroom, asks for music/activity, asks for help cleaning. These are examples; exact request catalog is data-driven.

When a request is ignored, its character's patience decreases. Expiry may trigger a temporary savage reaction, dramatic gesture, interruption or comedic complaint. Do not make failure permanently disable a character.

## 6. Activities and interactions

### Confirmed / strongly established activities
- Socializing, sitting, balcony time and watching TV.
- PS4 and Kinect play after their unlocks.
- Boxing between Kavian and Mahan.
- Group and individual dancing.
- Eating snacks/food.
- Smoking as ambient behavior or a requested interaction.
- Drinking and group social rituals as recurring party activities.
- Cleaning and dishwashing, most often initiated by Kavian but available to others.
- Resting/sleeping when tired.

### Interaction model

- Tap character: show current state and a context menu of valid actions.
- Tap object: show valid object actions and eligible characters.
- Select action: create an intent; character navigates to an interaction anchor; action starts only when reachable and preconditions pass.
- Long tasks show progress/status and can be interrupted by higher priority events.
- If no action is currently valid, explain why instead of showing a dead control.

## 7. Faaz and F7 Score

**Faaz** is the wallet currency used for purchases/unlocks. It can increase or decrease. **F7 Score** is an accumulated score used for rankings and achievements; it can only increase through approved score events and cannot be spent.

Keep both as separate ledgers and separate UI values. Do not derive score from wallet balance. Reward values, caps and purchase costs live in a versioned configuration/catalog. Initial numbers are intentionally not specified because the owner has not approved prices or balance tuning.

Potential scoring dimensions (proposal, not mandatory): successful requests, challenge results, hosted parties, cleaning streaks and special events. The baseline leaderboard is total F7 Score.

## 8. Progression and unlock catalogue

The apartment layout never expands or changes shape. The player unlocks interactable content. Candidate list:

- Balcony access, table and chairs.
- TV and associated setup; Kavian walks over and physically sets up the TV/equipment.
- PS4, Kinect and activities associated with each.
- Guitar.
- New snack/food options and drink variants.
- Music tracks/vibe modes.
- Joint event.
- Indoor smoking option.
- Russian hat/cosmetic item.
- Second WC is mentioned as a possible unlock but conflicts with the confirmed real-apartment topology (one guest WC plus one master bathroom). Do not add a third bathroom or alter the floor plan; resolve the intended meaning with the owner.

Each unlock has stable ID, display name, category, cost, prerequisites, effect, icon/asset reference and release flag. Catalog values must be editable without changing simulation code.

## 9. Music and atmosphere

Track and vibe are separate concepts:
- **Track:** selected audio source.
- **Vibe:** gameplay/visual profile that affects behavior and lighting.

Modes:
- Chill / deep house: calmer lighting, resting, conversation, balcony use and relaxed dance frequency.
- Hard / Infected Mushroom / hard techno: stronger energy, dynamic/neon lighting and spontaneous dance behavior.
- Persian: warm golden/orange lighting and social group behavior.
- Birthday: party lighting and decorations; unlock/availability remains progression-controlled.
- Special override: boxing music or joint-event techno can temporarily override the selected track, then restore the previous selection.

Specific song references supplied by the owner include Siavash Ghomayshi, “In Che Hessie” by Sohrab Pakzad, “Tavalod” by Andy and Infected Mushroom. They are reference preferences, not bundled audio assets. Production audio must be owner-provided or appropriately licensed.

## 10. Shared joint event sequence

A distinct group event, gated behind the relevant unlock and game-state preconditions:
1. Eligible friends gather at the event location.
2. The group interaction starts.
3. All participants take out sunglasses.
4. Techno music starts (temporarily overriding the current track).
5. Everyone performs the shared elbow-swing dance: hands start down, elbows swing up alternately toward right and left.
6. The sequence escalates into jumping and hugging.
7. Characters show happy reactions, including the shared tongue-out gesture.
8. Event resolves, awards configured rewards and restores the previous music selection.

Do not make every character permanently dance or jump after the event. It is a bounded scripted sequence. Individual cigarette smoking and the shared group ritual are separate ambient/activity concepts.

## 11. Events and mini-games

Explicitly liked event concepts:
- Fridge inspection: a friend opens the fridge and complains that nothing good is available; can generate food requests.
- Doorbell: unexpected guests/visitors arrive.
- Bathroom queue: two friends need the WC at the same time; player manages order.
- Missing TV remote: interrupts TV activity until found.
- Snack thief: someone takes another person's snack.
- Phone/social moment: friends sit together or scroll phones.
- Cleaning challenge: clear clutter/dirty dishes within a time window.
- Legendary night: multi-stage high-energy party event.
- Sofa dispute: friends compete for the same seat.
- Foonfoonak: a character yells “foonfoonak”; all characters must repeat it quickly, and the player taps them within a short timer. Timing, tap feedback and reward must be fair and configurable.

Additional ideas such as neighbor complaints, power outages or birthday chaos are proposals only. Do not treat them as committed release scope.

## 12. Day/night and end of session

Day/night changes visual light and behavior. At late night, fatigue increases and characters may go to bed or sleep on the sofa. A new in-game day can reset daily request schedules, not persistent progression, wallet or total score. Use simulated time so sessions do not require waiting real hours.

Food examples mentioned include koobideh and zereshk polo ba morgh; represent them as configurable menu items, not mandatory recipes.

## 13. Birthday / endgame

The owner proposed an unlockable birthday party that invites five extra people, taking the group from five to ten and creating an “animal party.” This is **Proposal**, not a locked release requirement. Keep architecture able to add guest NPCs, but do not spend the first-release schedule implementing ten-character crowd simulation before the core five-character game is stable.

## 14. Tuning principles

- Keep simultaneous high-priority requests limited so the game remains readable.
- Do not punish new players with unavoidable request expiry.
- Make request failure funny, not permanently destructive.
- Avoid random behavior that breaks pathing or hides character identity.
- Put timing, probability, reward values and unlock prices in config/catalog data.
