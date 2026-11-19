# 09 — Gameplay Systems Specification

## 1. Simulation architecture

Use a fixed-step simulation update, default 10 ticks/second, independent of render FPS. Rendering interpolates positions. The simulation should be deterministic under seeded randomness for unit tests. Avoid reward calculations tied to frame counts or wall-clock drift.

## 2. Character state machine

Suggested states:
- `idle`
- `walking`
- `waiting_for_interaction`
- `performing_activity`
- `socializing`
- `dancing`
- `resting`
- `sleeping`
- `event_participant`
- `blocked/recovering`

Mood is a separate axis: neutral, happy, annoyed, savage, tired, excited. An activity transition must define entry conditions, duration, exit conditions, interruption policy and animation mapping.

## 3. Intent and task system

An intent identifies who should do what, where and why. Example fields:
- `intent_id`, `character_id`, `action_id`, `target_id`.
- source: player, request, autonomous AI, scripted event.
- priority and creation simulation tick.
- status: queued, pathing, executing, completed, failed, cancelled.

Player intents outrank ambient choices. A higher-priority request/event can interrupt only activities whose policy allows it. Prevent duplicate active intents for one character unless the activity explicitly supports group participation.

## 4. Pathfinding

- Derive walkability from the map collision/navigation layer.
- Use A* or another grid/polygon pathfinder appropriate to the map.
- Validate destination anchors before path search.
- Re-path on obstruction; cap retries.
- When no path exists, keep the character in a stable state and show an explanation.
- Add soft separation so friends do not stack exactly on the same point.

## 5. Requests and patience

Request lifecycle: pending → accepted → in progress → completed/failed; pending can expire; any active request may be cancelled by an approved event or invalidated target.

Patience is a bounded timer/value. It decreases according to configured request urgency and game mode. On expiry:
1. Mark request expired.
2. Apply the configured failure consequence.
3. Enter a short character-specific savage reaction if eligible.
4. Apply no reward for the failed request unless a future design explicitly awards partial credit.
5. Restore normal AI after the reaction cooldown.

Do not stack savage timers indefinitely. Barbod and Parham have low patience; Kavian and Mahan medium; Parsa is calm. Exact numeric values are tuning data, not canon.

## 6. Ambient behavior

Ambient behavior fills idle time and should use weighted choices with cooldowns and context checks. Examples include sitting, talking, smoking, watching TV, using the balcony, lying on the sofa, phone scrolling and casual dancing. A character with an active player task or high-priority request should not randomly abandon it.

Kavian has a higher preference/eligibility for cleaning and dishwashing. Others may help when assigned or when a cleaning challenge is active. Mahan has increased jumping/energy behavior only in the appropriate wasted/high-energy state. Keep all behavior probability values configurable.

## 7. Party intensity

The owner wants control over how intense a social session gets. Model individual character state separately from the global party atmosphere:
- Individual state: energy, fatigue and optional intoxication/consumption state.
- Global state: social energy/party intensity, affected by music mode, events and group participation.

Suggested atmosphere labels Chill → Warming Up → Party Mode → Legendary Night are a tuning vocabulary, not final UI labels. Changes should affect behavior and visuals but must not permanently alter character identity or save corrupt state. Exact consumption mechanics and controls require product-owner sign-off; keep the first playable loop independent of them.

## 8. Music/vibe system

Represent track source and vibe profile separately. A vibe profile contains:
- lighting palette/intensity profile;
- ambient animation weights;
- dance frequency multiplier;
- optional particle/effect settings;
- optional allowed event overrides.

Special event music stores the previous selection, starts its override, then restores the previous track on completion/cancellation. Handle browser autoplay restrictions by starting audio only after a user gesture and displaying an explicit play control when needed.

## 9. Event sequencer

A scripted group event is a sequence of steps with participant eligibility, timeout, animation, audio cue and cancellation policy. For the shared joint event:
- validate unlock, location and participant state;
- gather eligible participants at event anchors;
- execute sunglasses animation;
- start techno override;
- play shared elbow-swing dance;
- play jump/hug escalation;
- trigger tongue-out happy reactions;
- resolve event and rewards;
- restore previous music and unlock normal AI.

If a participant becomes unavailable or pathfinding fails, choose a defined fallback (wait briefly or cancel gracefully); never lock all friends indefinitely.

## 10. Mini-event implementations

Implement each as an independent module with start conditions, duration, success/fail conditions, reward key and cleanup:
- Fridge complaint/food request.
- Doorbell/guest arrival.
- Bathroom queue.
- Missing remote.
- Snack thief.
- Phone/social moment.
- Cleaning challenge.
- Legendary night.
- Sofa dispute.
- Foonfoonak rapid-tap event.

Additional events remain proposals. Mini-events must not be required for core game progression unless explicitly configured.

## 11. Faaz and F7 Score reward pipeline

A completed local action emits a typed gameplay event with a unique UUID. The client may show a pending reward. The backend validates the event type, payload, allowed reward, cooldown/cap and account state, then writes separate wallet and score ledger entries. The response confirms accepted deltas. The UI updates confirmed totals only from server response.

Reward table belongs in a versioned catalog/config. Do not hardcode reward amounts in multiple systems. Purchases deduct Faaz and create unlocks atomically on the server.

## 12. Day/night and fatigue

Simulated time advances through defined phases, not real clock hours. Lighting and available ambient behavior update from the phase. Fatigue can rise from long activity/late game time; sleeping/resting reduces it. Starting a new in-game day resets daily schedule state only, not account progression, wallet or total score.

## 13. Persistence and recovery

Persist enough state to restore an interrupted session: game day/time, character position/state, active event if safe to resume, non-ledger progress and preferences. If a scripted event cannot be resumed safely, terminate it into a consistent state. Wallet and score are always reloaded from canonical server records.

## 14. Tuning configuration

Keep tunable values in typed config/catalog data: request durations, patience budgets, ambient weights, pathfinding retry limits, activity durations, reward keys, costs, party thresholds, music multipliers and event cooldowns. Provide sensible development defaults, but mark prices and reward values as unapproved until the owner confirms balance.
