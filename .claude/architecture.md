# Architecture: layered domain, ports and adapters, feature slices

This project follows **one** architecture. Follow it; do not mix in others (no NgRx, no module-per-feature
NgModules, no barrel files that hide where things live).

The idea in one sentence: **business rules live in a framework-free `domain` layer that talks to the outside
world only through abstract "ports"; Angular code (`data`, `ui`, `features`) sits around it, and dependencies
only point inwards.**

## Layers and folders

```
src/app/
  domain/            pure TypeScript. No Angular, no rxjs, no browser globals except web standards
                     (TextEncoder, Uint8Array). Models, rules, CSV/zip writers, validation, the Outbox,
                     and the ports (abstract classes) the outside world must implement.
  data/              adapters: Angular services that implement domain ports (IndexedDB, camera/canvas,
                     share sheet) and the signal-based state the pages read (OutboxState).
  ui/                dumb, reusable presentational components: inputs/outputs only, no services, no state
                     beyond what is passed in (status message, form field, tab bar).
  features/<name>/   one folder per screen/route (photo, meal, food, outbox, sent). Smart standalone components:
                     they read state, call domain functions, and compose ui components.
  app.ts, app.config.ts, app.routes.ts   the composition root: the ONLY place ports are bound to adapters.
```

## Dependency rule (enforced by `npm run check:arch`, also run in CI)

| From            | May import                                   |
|-----------------|----------------------------------------------|
| `domain`        | itself only (specs may also import `vitest`) |
| `data`          | `domain`                                     |
| `ui`            | `domain` (types)                             |
| `features/<x>`  | `domain`, `data`, `ui`, and its own folder   |
| app root files  | anything                                     |

Never: a feature importing another feature (move the shared piece down to `ui`, `data` or `domain`);
`domain` importing Angular; `data` or `ui` importing a feature; `ui` importing `data`.

## Ports and adapters

- A port is an abstract class in `domain/ports.ts` (`OutboxStore`, `SettingsStore`, `PhotoShrinker`, `FileSharer`). It doubles as
  the Angular injection token.
- An adapter lives in `data/` and `extends` the port (`IndexedDbOutboxStore`, `CanvasPhotoShrinker`,
  `WebShareSharer`, `LocalStorageSettingsStore`).
- `app.config.ts` binds them: `{ provide: OutboxStore, useClass: IndexedDbOutboxStore }`.
- Domain classes that need a port take it in the constructor (`new Outbox(store, newId, now)`); `app.config.ts`
  builds them with a factory. Tests pass in-memory fakes (`domain/testing.ts`).

## State

- Signals only. `data/outbox-state.ts` (`OutboxState`) holds the outbox as signals and is the single way pages
  read or change it. Pages keep their own small UI state (form errors, messages) in component signals.
- No global store library. No RxJS unless a real stream appears.
- Forms are typed Reactive Forms for the controls; **validation is a domain function** (`validateMeal`,
  `validateFood`) run on submit, so the rules are unit-tested without Angular and error text is shown in words.

## Components

- Standalone, `ChangeDetectionStrategy.OnPush`, `inject()` for dependencies, `input()` for inputs, built-in
  control flow (`@if`, `@for` with `track`). Templates are inline while small.
- File names follow the Angular style guide without type suffixes: `meal-page.ts` exports `MealPage`.
- Each feature route is lazy-loaded with `loadComponent` and ends in `-page.ts`.
- Zoneless: do not rely on zone.js. Change detection is driven by signals and template event listeners.

## Testing

- `domain/**/*.spec.ts` carry most of the tests (Vitest, run by `ng test`). Anything with logic belongs in the
  domain so it can be tested without a browser.
- `data/` adapters stay thin and are checked by hand on a real phone (the checklist is in the README).
- `scripts/*.test.mjs` test the architecture checker itself (`node --test`).
- `fixtures/` holds the files the desktop app's tests import. If the CSV or zip layout changes, run
  `npm run fixtures:export`, commit, and copy them to the desktop repo's `tests/fixtures/phone/`.

## Look and feel

- The colours are the desktop app's light palette, as CSS custom properties in `src/styles.css`. Light theme only.
- State is never shown by colour alone: always words or a symbol too (see `ui/status-message.ts`).
- Base font stays 16px (smaller makes iOS Safari zoom into fields). Touch targets are at least 44px.

## How to add something

1. New rule or calculation: write the failing spec in `domain/`, then the code. Keep it framework-free.
2. New outside dependency (storage, sensor, network): add a port to `domain/ports.ts`, an adapter in `data/`,
   bind it in `app.config.ts`.
3. New screen: `features/<name>/<name>-page.ts`, a lazy route in `app.routes.ts`, a tab in `ui/tab-bar.ts`.
   Retention, expiry and bulk-delete rules live in `domain/retention.ts` and `domain/outbox.ts`, not in the page.
4. Run `npm run verify` before pushing.
