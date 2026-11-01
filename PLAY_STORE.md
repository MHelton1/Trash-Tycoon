# Publishing Idle Roundsman on Google Play

Everything in the app is already set up for Google Play's current rules:

| Rule | How this app meets it |
|---|---|
| Package name (fixed forever after the first upload) | `app.roundsman.idle` |
| New apps must target Android 16 (API 36) from August 31, 2026 | Targets API 36, compiles against API 36, runs on Android 7.0 and newer |
| Uploads must be an Android App Bundle (.aab), signed | The build workflow makes a signed `.aab` with your upload key |
| Every update needs a higher version code | The workflow uses the run number, so it goes up on every build |
| Privacy policy for every app | https://mhelton1.github.io/Trash-Tycoon/privacy-policy.html, also inside the game (Company > Settings > Privacy) |
| Data safety must match what the app does | The app collects nothing, asks for no permissions (not even internet) and contains no ads, analytics or third-party code |
| Edge-to-edge screens on Android 15 and 16 | The header and tab bar stay clear of the status and navigation bars |
| No 32-bit-only native code, 16 KB page support | The app has no native code, so neither applies |
| Original name, icon and art | All drawn for this game; no other app found using the name Idle Roundsman |

## 1. Add your upload key to GitHub (once)

Your upload key is in the project files, in `idle-roundsman-signing/`. It is **not** in the GitHub repo, because the repo is public.

1. Open `idle-roundsman-signing/github-secrets.txt`.
2. On GitHub, open the repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
3. Add the four secrets from the file (`TT_KEY_ALIAS`, `TT_KEYSTORE_PASSWORD`, `TT_KEY_PASSWORD`, `TT_KEYSTORE_BASE64`), copying each name and value exactly.
4. Save `upload-key.jks` and `github-secrets.txt` somewhere private, like a password manager. Every update must be signed with this key. If it is ever lost, Google can reset it (Play Console > Test and release > App integrity > Upload key reset).

## 2. Build the release

1. GitHub repo > **Actions** > **Build Android app** > **Run workflow**. Type the version (1.0.0 the first time) and run it.
2. When it finishes (about 5 minutes), scroll to **Artifacts** at the bottom of the run:
   - `Idle-Roundsman-google-play-…` holds `app-release.aab`, which is the file for Google Play.
   - `Idle-Roundsman-test-apk-…` holds `app-debug.apk`, which you can install straight onto your own phone to try it.

Each push to the repo also runs the tests and builds both files.

## 3. Create the app in Play Console

Play Console (play.google.com/console, $25 one-time developer fee) > **Create app**:
- App name: **Idle Roundsman**
- Default language: English (United States)
- App or game: **Game**. Free or paid: **Free**
- Tick the two declarations.

## 4. App content answers

Play Console > **Policy and programs** > **App content**. Answer each section like this:

| Section | Answer |
|---|---|
| Privacy policy | `https://mhelton1.github.io/Trash-Tycoon/privacy-policy.html` |
| App access | All functionality is available without any access restrictions |
| Ads | No, my app does not contain ads |
| Content rating | Fill in the questionnaire with category **Game**. Answer **No** to violence, fear, sexual content, language, drugs, alcohol, tobacco, gambling and simulated gambling, users interacting or sharing content, sharing location, and digital purchases. The expected rating is Everyone / PEGI 3. |
| Target audience | **13–15, 16–17 and 18 and over**. "Could your app unintentionally appeal to children?" **No**. (Including under-13 ages is allowed because the game collects nothing, but it adds the Families policy review.) |
| Data safety | "Does your app collect or share any of the required user data types?" **No**. That completes the form. |
| Advertising ID | No, the app does not use an advertising ID |
| Government apps | No |
| Financial features | My app doesn't provide any financial features |
| Health | My app does not have any health features |
| News apps | No |

## 5. Store listing

Fill in **Main store listing** from `store/listing.md` and upload the images in `store/` (icon, feature graphic, six phone screenshots). Google also requires a contact email shown on the listing; use one you are happy to make public.

## 6. Testing, then production

- **Personal developer account (created after November 2023):** Google requires a **closed test** first. Create a closed testing track, upload the `.aab`, and add at least **12 testers** (their Google account emails). At least 12 must opt in and stay opted in for **14 days in a row**. After that, **Apply for production** appears on the Dashboard.
- **Organization account:** you can go straight to **Production** > **Create new release**.

On the first upload, accept **Play App Signing** (Google keeps the final signing key; your upload key only proves an update came from you).

Google's review of a new app usually takes a few days, sometimes longer.

## Updating the game later

Change the code, run the workflow with a higher version (1.0.1, 1.1.0 …), and upload the new `.aab` to the same track. The version code rises on its own.
