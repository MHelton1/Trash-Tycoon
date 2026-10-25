# Trash Tycoon

An idle game built on the Roundsman world: start with one pickup and a trailer in Maple Hollow and grow a waste company however you like. No outside packages; plain HTML, CSS and JavaScript, the same way Roundsman is built.

## Play it

- **In a browser:** open `dist/trash-tycoon.html` (one file, works offline), or serve the `web/` folder (`npx http-server web`) and open it.
- **iPhone, quickest:** put the `web/` folder on any HTTPS address, open it in Safari, Share, Add to Home Screen. It works with no signal after the first load.
- **Android app:** every push builds a test APK on GitHub (Actions > Build Android app > the run > Artifacts). Send `app-debug.apk` to a phone and open it (allow "install unknown apps").
- **Google Play:** see [PLAY_STORE.md](PLAY_STORE.md) for the signed release build and every Play Console answer.
- **iPhone App Store build (needs a Mac, Xcode and the $99/year Apple developer account):**
  ```
  cd apps/mobile && npm ci
  node scripts/prepare.js web
  npx cap add ios && npx capacitor-assets generate --ios
  npx cap open ios
  ```
  Then Signing > your team, Product > Archive, upload to TestFlight.

Unlike the Roundsman wrapper, the game is packed inside the app, so it needs no server.

## How the game works

| Way to grow | What it does |
|---|---|
| Ride along / flyers | Tap for cash and sign-ups early on. |
| Trucks | Pickup, rear loader, automated side loader (residential), front loader (commercial), roll-off (construction). Each needs a driver and a parking spot. |
| Yards | Your driveway parks 4 trucks; each yard adds 10. |
| Mechanics | Fewer breakdowns, faster roadcalls. Roadcalls can be rushed for cash. |
| Towns | Six named towns, then regions that keep getting bigger forever. |
| Marketing | Faster sign-ups. You can pause sign-ups per service when your trucks can't keep up. |
| Roundsman software | Seven modules (route planner, price alignment, customer portal, truck reports, roadcall dispatch, payroll, offline route book). |
| Big moves | Commercial license, roll-off permit, automated arms, recycling (prices move daily), sorting plant, transfer station, landfill (others pay you), natural gas fleet, compost. |
| Contracts | Offers pop up (an HOA, a strip mall, a hospital renovation) if you have room on your trucks. |
| Reputation | Missed pickups drop it; a low reputation slows sign-ups and loses customers. |
| Sell the company | After $1M earned, sell for Legacy stars (+10% revenue each) and spend them on permanent perks. |
| Trophies | 83 of them, each +2% revenue for good. The Route tab always shows the next three goals. |

Routes keep running while you are away (4 hours to start, more with upgrades). The game saves on the device every few seconds, and a save code moves it to another phone.

## Files

- `web/engine.js`: the whole simulation and all the numbers (trucks, towns, prices, achievements). Tuning happens here.
- `web/ui.js`, `web/style.css`, `web/index.html`: the screens.
- `web/sw.js`, `web/manifest.webmanifest`, `web/icons/`: offline play and home-screen install.
- `apps/mobile/`: the Capacitor 8 wrapper. `android/` is the Android project (targets API 36, no permissions, release signing from GitHub secrets).
- `.github/workflows/build-android.yml`: tests, then builds the test APK and the signed Play bundle on GitHub.
- `docs/`: the website and privacy policy, served by GitHub Pages.
- `store/`: Google Play listing text, icon, feature graphic and screenshots.
- `test/engine.test.js`: `node test/engine.test.js`.
- `tools/sim.js`: a bot that plays greedily and prints when it hits each milestone (`node tools/sim.js 6`), for checking pacing after changing numbers.
- `tools/bundle.js`: rebuilds `dist/trash-tycoon.html`. `tools/icons.py` redraws the icons.
