# 15 — Implementation Agent Runbook

## Goal

Turn the F7 specification into a fully tested and deployable first release, without changing the product's confirmed identity or silently resolving owner-only decisions.

## First session checklist

1. Inspect repository state, branch, existing files and build status.
2. Read `AGENTS.md` and all mandatory documents from `00-MASTER-INDEX.md`.
3. Create a short implementation plan for M0 only.
4. Identify blockers in `16-OPEN-DECISIONS.md` and map-dependent work.
5. Scaffold the monorepo and add the smallest runnable vertical slice.
6. Report exact files created, commands executed, test results and unresolved blockers.

## First vertical slice

Before adding complex content, implement a small end-to-end slice:
- load a placeholder apartment scene;
- render one placeholder character;
- select the character;
- issue one move/interact command;
- navigate to one valid anchor;
- complete one simple activity;
- emit a typed local event;
- persist local simulation state.

Then generalize to all five characters and real map/asset data. Do not hardcode an approximate floor plan just to make the first screenshot look complete.

## Task protocol

Every task must specify:
- requirement/document reference;
- scope and non-goals;
- files/modules expected to change;
- acceptance criteria;
- tests to run;
- owner decision required, if any.

Work on the smallest task that creates a verified increment. Do not rewrite the entire repository without inspection and a migration plan.

## Definition of a good implementation

- Domain rules have tests and do not depend on Phaser rendering.
- Phaser scenes orchestrate systems; state transitions live in testable modules.
- Stable IDs are used for characters, actions, objects, requests and unlocks.
- API contracts are defined once in OpenAPI and shared with the frontend.
- Wallet/score changes are server validated and idempotent.
- UI handles offline, pending, rejected and conflict states.
- Every external dependency has a clear reason and is pinned.
- No hardcoded secrets, fake success states or dead UI controls.

## What not to do

- Do not invent or approximate the final apartment topology.
- Do not replace the five character specs with generic NPC behavior.
- Do not add real-time multiplayer.
- Do not combine Faaz and F7 Score.
- Do not use arbitrary client-side reward amounts as canonical.
- Do not put copyrighted reference songs in the production bundle without rights.
- Do not upload private photos or private audio by default.
- Do not add infrastructure because it is fashionable.
- Do not claim that tests, build, migration or deployment passed unless they were actually run.

## Handling open decisions

When blocked, do one of the following:
1. Continue on independent tasks.
2. Implement an adapter/interface with a clearly documented placeholder if the missing choice can be injected later.
3. Ask the owner one specific question if the decision blocks core implementation.

Do not pick a value that changes product behavior and present it as confirmed. Record assumptions and decisions in `16-OPEN-DECISIONS.md`.

## Completion report format

At the end of each milestone report:
- **Completed:** concrete features and files.
- **Validation:** exact commands and pass/fail results.
- **Known defects:** severity and reproduction steps.
- **Assumptions:** defaults used and why.
- **Blockers:** owner input needed.
- **Next milestone:** smallest next tasks.

## Release candidate handover

Include exact build/deploy commands, environment variable list, migration procedure, health-check URL, backup/restore procedure, monitoring access path and rollback steps. Never include secret values in the handover.
