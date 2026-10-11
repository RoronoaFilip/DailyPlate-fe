# Daily Plate Phone

A small web app for your phone that captures **barcode photos, meals and new foods** and bundles them into
**one zip file** you send to your computer (for example through Messenger). The Daily Plate desktop app imports
that file: drop it anywhere in the app and each part goes through the usual review screens.

- **No server, no account, no cost.** Everything you log stays on your phone (in the browser's own storage, not in memory) until you share it.
- **Installable.** Add it to your iPhone home screen and it works offline.
- **Same look as the desktop app.** The colour palette is copied from it (light theme only).

```
phone: photo / meal / new food → Outbox → Send (share sheet) → Messenger
computer: download the file → drop it anywhere in Daily Plate → review → saved
```

## What it produces

One zip (named `dailyplate-YYYY-MM-DD.zip`) holding only what you added:

| File | Contents | Desktop import |
|---|---|---|
| `foods.csv` | new foods (`food_name,basis,calories,fat,saturated_fat,carbohydrates,sugars,protein,fiber,omega_3,omega_6`) | Foods |
| `diary-YYYY-MM-DD.csv` | one file per day: `food_name,grams_eaten,meal` | Diary (the date comes from the file name) |
| `photos/barcode-001.jpg`, … | barcode photos (longest side 1600 px) | one new food each, via the barcode lookup |

The desktop app only reads CSV files and photos from a zip, and accepts at most one folder, which is why photos
sit in a single `photos/` folder.

If your phone refuses to share a zip, the app automatically shares the CSV files and photos as separate files
instead, and as a last resort saves the zip so you can share it from the Files app. The Outbox tells you which of
the three happened.

## Getting started

Requirements: Node.js 22.12 or newer (see `.nvmrc`).

```bash
npm install          # then commit the generated package-lock.json
npm start            # dev server at http://localhost:4200
npm test             # unit tests (Vitest, once)
npm run build        # production build in dist/dailyplate-phone/browser
npm run verify       # everything CI runs
```

Other scripts: `npm run check:arch` (architecture rules), `npm run check:theme` (palette),
`npm run check:scripts` (tests of those checks), `npm run fixtures:check` / `fixtures:export` (files shared with
the desktop app's tests).

## Publishing (GitHub Pages)

1. Create the repository and push (it must be **public** for free GitHub Pages; the page contains no data).
2. In *Settings → Pages → Build and deployment → Source*, choose **GitHub Actions**.
3. Set `"version"` in `package.json` (for example `0.1.0`), commit, then tag and push:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

The **Release** workflow checks the tag matches `package.json`, runs all checks and tests, builds with the right
base path, publishes the site on GitHub Pages and attaches the built site as a zip to a GitHub Release. The
**CI** workflow runs the same checks on every push and pull request.

## Installing on your iPhone

1. Open the Pages address in **Safari**.
2. Tap Share → **Add to Home Screen**. Open it from the new icon (the installed app has its own storage).
3. Allow camera access the first time you take a photo.

### First-run checklist (worth doing once on your phone)

- [ ] Add a photo, a meal and a new food; the Outbox badge counts them.
- [ ] Turn on airplane mode, open the app from the home screen icon, and add another meal (offline works).
- [ ] Tap **Send**: does the share sheet offer Messenger, and does the message say *Shared as one zip file*?
      If it says *separate files* or *saved*, the phone refused a zip; the fallback worked, nothing else to do.
- [ ] On the computer, download the file(s) from Messenger and drop them onto Daily Plate.
- [ ] Back in the Outbox choose **Yes, mark as sent**; the items move to the **Sent** tab, where you can delete them one by one or all at once.

## Where your data lives, and what "kept for N days" means

- **Not in memory.** Memory (RAM) is wiped whenever the app is closed or reloaded. Everything you add is saved to the
  browser's **IndexedDB**, which is on the phone's storage and survives closing the app, restarting the phone and
  losing signal. Every time the app opens it reloads its lists from there. That is the point: a meal you logged at
  lunch must still be waiting when you get home.
- **Waiting items never expire.** Photos, meals and foods in the **Outbox** stay until you send or delete them.
- **Sent items are a safety net.** After you mark items as sent they move to the **Sent** tab and are kept, so you can
  send them again if Messenger lost the file. Nothing else needs them. How long they are kept is **your choice**
  (default 7 days): a number of days, `0` to delete them as soon as they are marked as sent, or *keep until I delete
  them*. You can also delete sent items one by one or all at once. Saving a shorter period deletes expired sent items
  immediately, and the page tells you how many first.
- **What can still erase the data.** Clearing the browser's website data, or iOS removing storage of a site that is
  only open in a Safari tab and unused for about a week. Installing the app on the home screen (Share, Add to Home
  Screen) and the app's request for persistent storage guard against this, so **install it**.
- **The app itself** (its code, not your data) is cached by a service worker so it opens offline. A newly published
  version downloads in the background and appears the next time you close and reopen the app.

## Project layout and architecture

```
src/app/
  domain/     framework-free rules, models, CSV and zip writers, validation, the Outbox, and the ports
  data/       adapters for the ports (IndexedDB, camera canvas, share sheet) and the signal state
  ui/         presentational components
  features/   one folder per screen: photo, meal, food, outbox
scripts/      architecture and palette checks, fixture exporter
fixtures/     sample files shared with the desktop app's tests
.claude/      architecture.md and CLAUDE.md: the single architecture this project follows
```

Read [`.claude/architecture.md`](.claude/architecture.md) before changing code.

## Privacy

Nothing is sent anywhere by the app. Photos, meals and foods are stored in your browser until you tap Send, and
then only go where you choose in the share sheet. There are no analytics, no third-party scripts and no network
requests of its own.

## Keeping in step with the desktop app

The CSV headers and file names are a contract with the desktop app's importers. They are pinned by specs in
`src/app/domain/*.spec.ts` and by `fixtures/`, which the desktop repository's `tests/test_phone_export.py` imports
for real. After changing the format: `npm run fixtures:export`, commit, and copy `fixtures/*` into the desktop
repository's `tests/fixtures/phone/`. `.gitattributes` marks `fixtures/**` as `-text` so Git never rewrites their line endings, and the check also ignores CSV line endings, so it passes whether files were checked out on Windows, macOS or Linux.
