# 05 — UI/UX Specification

## 1. UX principles

- The apartment is the main screen. UI must support the simulation rather than compete with it.
- Actions are tap-first and contextual.
- Current character state and pending requests must be readable at a glance.
- Avoid dense management dashboards; this is a game, not hotel-operations software.
- Essential functions remain usable on a small mobile screen.

## 2. Main HUD

Required persistent indicators:
- Faaz wallet balance.
- F7 Score total.
- Current music/track and vibe indicator.
- Settings/audio control.
- Progression/unlock access.
- Request indicators attached to characters or in a compact request list.

Show pending/unconfirmed status when rewards are queued offline. Never display a local optimistic reward as definitively server-confirmed.

## 3. Character selection

On tapping a character:
- Highlight the selected character without hiding the map.
- Show name, current mood/activity and active request.
- Show only currently valid action choices.
- Provide a clear close/back action.
- If the character is busy, explain whether the action can queue, interrupt or is unavailable.

Context menus must avoid overlapping the selected character and must reposition near screen edges.

## 4. Object selection

On tapping an interactable object:
- Display object name and locked/available state.
- Show required unlock cost or prerequisite when locked.
- Show available actions and eligible characters.
- Explain why an action is unavailable (e.g. character busy, no path, item locked).

## 5. Requests

- Use a visible icon and short text label.
- Use a timer/progress ring or clear urgency indicator; do not rely on color alone.
- Keep the number of simultaneous prominent request cards bounded.
- Allow tapping a request to focus/highlight its character and relevant object.
- Expired requests should visibly resolve into a reaction/state change.

## 6. Menus and screens

Minimum screens/panels:
- Main game HUD.
- Character contextual action panel.
- Object contextual action panel.
- Unlock/catalog panel.
- Music and vibe panel.
- Pause/settings panel.
- Sign-in/register/account panel.
- Leaderboard panel.
- Offline/sync state indicator.
- First-session tutorial overlay.

Do not add unrelated inventory, crafting, social chat or skill-tree screens in the first release.

## 7. Mobile interaction

- Minimum comfortable touch target: approximately 44 CSS px where practical.
- No hover-only action or essential information.
- Prevent accidental browser selection/dragging on the game canvas while retaining accessible controls.
- Support device safe areas/notches.
- Avoid requiring precision taps on tiny character sprites; provide a generous selection hit area.
- Keep audio controls reachable without opening several nested menus.

## 8. Desktop interaction

- Mouse click and keyboard focus should work for menus.
- Optional keyboard shortcuts can be added for pause/settings, but must be documented and not conflict with browser controls.
- Do not make keyboard shortcuts mandatory for core gameplay.

## 9. Visual hierarchy

1. Characters and requests.
2. Interactable objects and immediate action state.
3. Faaz and F7 Score.
4. Music/vibe and progression entry points.
5. Secondary settings.

Use the established detailed 16-bit pixel-art direction and bright wood theme. Exact typography, panel styling and color tokens should be defined in a design-token file once an approved visual reference is available.

## 10. Feedback states

Every important action needs immediate feedback:
- Selected / highlighted.
- Character moving.
- Action started / progress.
- Action completed / reward pending.
- Reward confirmed by server.
- Invalid action / no path / locked item.
- Offline / sync pending / sync failed.
- Purchase accepted or rejected.

Use short text and animation together; never rely on sound alone.

## 11. Accessibility and comfort

- Mute and volume sliders.
- Reduced motion option that limits screen shake, flashing and intense particles.
- Clear text contrast and scalable UI text.
- Important information not conveyed by color alone.
- Avoid flashing effects; respect reduced-motion preferences.
- Provide pause control and prevent accidental irreversible purchases.
