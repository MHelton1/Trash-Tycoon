# Idle Roundsman

(First called Trash Tycoon; the repository keeps that name so the privacy policy link stays the same.)

<!-- contents: made by tools/mdtoc.js, run it again after changing headings -->
## Contents

- [Play it](#play-it)
- [How the game works](#how-the-game-works)
- [Files](#files)

<!-- /contents -->

An idle game built on the Roundsman world: start with one pickup and a trailer in Maple Hollow and grow a waste company however you like. No outside packages; plain HTML, CSS and JavaScript, the same way Roundsman is built.

## Play it

- **In a browser:** open `dist/idle-roundsman.html` (one file, works offline), or serve the `web/` folder (`npx http-server web`) and open it.
- **iPhone, quickest:** put the `web/` folder on any HTTPS address, open it in Safari, Share, Add to Home Screen. It works with no signal after the first load.
- **Android app:** every push builds a test APK on GitHub (Actions > Build Android app > the run > Artifacts). Send `app-debug.apk` to a phone and open it (allow "install unknown apps"). Test APKs share one fixed test key, so a new one installs over the old one and keeps your save. A test APK and the Google Play version are signed differently, so switching between them needs an uninstall (copy your save code first).
- **Google Play:** see [docs/guides/PLAY_STORE.md](docs/guides/PLAY_STORE.md) for the signed release build and every Play Console answer.
- **iPhone App Store build (needs a Mac, Xcode and the $99/year Apple developer account):**
  ```
  cd apps/mobile && npm ci
  node scripts/prepare.js web
  npx cap add ios && npx capacitor-assets generate --ios
  npx cap open ios
  ```
  Then Signing > your team, Product > Archive, upload to TestFlight.

Unlike the Roundsman wrapper, the game is packed inside the app, so it needs no server.

<sub>[Back to contents](#contents)</sub>

## How the game works

| Way to grow | What it does |
|---|---|
| Ride along / flyers | Tap for cash and sign-ups early on. |
| Trucks | Pickup, rear loader, automated side loader (residential), front loader (commercial), roll-off (construction). Each needs a driver and a parking spot. |
| Drivers | Rookies, pros and veterans. At 15 drivers you can hire route supervisors: each covers 15 drivers for +10% stops and 25% fewer breakdowns. |
| Yards | Your driveway parks 4 trucks; each yard adds 10. Yard levels upgrade every yard at once: Gravel lot (10 spots), Shop yard (15, cheaper repairs), Depot (25, cheaper fuel), Regional hub (45, cheaper dump fees). |
| Mechanics | Fewer breakdowns, faster roadcalls. Roadcalls can be rushed for cash. |
| Towns | Six named towns per region, then more that keep getting bigger forever. |
| Regions | Six regions, from Maple Valley (easy) to Capital Metro (brutal). Each is its own branch with its own cash: money never moves between them, and a new branch starts with a set amount (Lake Country $100K up to Capital Metro $100B). Switch back and forth any time; the branches you are not in keep running at 15% speed, up to 100% with a regional manager (5 levels, priced from 5% of what the region took to open). |
| Getting run out | In the harder regions a reputation under 15 for two minutes gets you run out: the region shuts you out for 30 minutes and half its customers leave (trucks and yards wait for you), and you go to your best other branch. In Capital Metro the branch is gone until you rebrand the company. The first change from the starting name is free, after that it costs 2% of everything earned (at least $25K), and each comeback starts 10 reputation lower. |
| Marketing | Faster sign-ups. You can pause sign-ups per service when your trucks can't keep up. |
| Roundsman software | Seven modules (route planner, price alignment, customer portal, truck reports, roadcall dispatch, payroll, offline route book). |
| Big moves | Commercial license, roll-off permit, automated arms, recycling (prices move daily), sorting plant, transfer station, landfill (others pay you), natural gas fleet, compost. |
| Contracts | Offers pop up (an HOA, a strip mall, a hospital renovation) if you have room on your trucks. |
| Reputation | Missed pickups drop it; a low reputation slows sign-ups and loses customers. |
| Sell the company | After $1M earned, sell for Legacy stars (+10% revenue each) and spend them on permanent perks. |
| Trophies | 83 of them, each +2% revenue for good. The Route tab always shows the next three goals. |

Routes keep running while you are away (4 hours to start, more with upgrades). The game saves on the device every few seconds, and a save code moves it to another phone.

<sub>[Back to contents](#contents)</sub>

## Files

- `web/engine.js`: the whole simulation and all the numbers (trucks, towns, prices, achievements). Tuning happens here.
- `web/ui.js`, `web/style.css`, `web/index.html`: the screens.
- `web/sw.js`, `web/manifest.webmanifest`, `web/icons/`: offline play and home-screen install.
- `apps/mobile/`: the Capacitor 8 wrapper. `android/` is the Android project (targets API 36, release signing from GitHub secrets). It adds two plugins: AdMob for optional rewarded ads and Google Play Billing for the Supporter Pack, both driven from `web/money.js`.
- `.github/workflows/build-android.yml`: tests, then builds the test APK and the signed Play bundle on GitHub.
- `docs/`: the website and privacy policy, served by GitHub Pages. `docs/guides/` holds the developer guides (index: `docs/guides/README.md`); the site leaves them out (`docs/_config.yml`).
- `store/`: Google Play listing text, icon, feature graphic and screenshots.
- `test/engine.test.js`: `node test/engine.test.js`.
- `tools/sim.js`: a bot that plays greedily and prints when it hits each milestone (`node tools/sim.js 6`), for checking pacing after changing numbers.
- `tools/bundle.js`: rebuilds `dist/idle-roundsman.html`. `tools/icons.js` redraws every icon and the wordmark banners from `store/logo.svg`.
