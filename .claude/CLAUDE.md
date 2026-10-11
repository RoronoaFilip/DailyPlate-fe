# Daily Plate Phone

Static, no-backend Angular web app (installable on an iPhone) that captures barcode photos, meals and new foods
and bundles them into one zip for the Daily Plate **desktop** app to import. There is no server and no account:
data lives in the phone's IndexedDB until it is shared (Messenger, via the share sheet).

@architecture.md

## Commands

- `npm install` once, then commit `package-lock.json`.
- `npm start` runs the dev server. `npm test` runs the unit tests once. `npm run build` makes a production build.
- `npm run verify` runs everything CI runs (architecture, palette, script tests, fixtures, tests, build).

## Rules for changes

- Respect the dependency rule in `architecture.md`; `npm run check:arch` must pass.
- The CSV headers and file names in `domain/csv.ts` and `domain/bundle.ts` are a contract with the desktop app's
  importers. Changing them means: update the specs, run `npm run fixtures:export`, and update the desktop repo's
  `tests/fixtures/phone/` and its tests.
- Zip layout rule (desktop side): only CSV files and photos are used; at most one folder (`photos/`).
- Keep the desktop palette. Do not add a dark theme. Keep text readable without colour.
- No runtime network calls and no third-party runtime scripts; nothing the user logs may leave the phone except
  through the share sheet they trigger. Never add analytics.
- Outbox data lives only in IndexedDB through the `OutboxStore` port. Small preferences (such as how long sent items are
  kept) go through the `SettingsStore` port, whose adapter uses localStorage. Never put photos, meals or foods there.
- Write the test first for anything in `domain/`.
