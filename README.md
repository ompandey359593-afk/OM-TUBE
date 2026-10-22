# OM Tube (free starter)

OM Tube is a mobile-first, installable web app/PWA starter with a premium dark interface, local video search, a player, and a Shorts-style feed.

## What works now
- Add video files from your Android phone or computer.
- Videos are stored in this browser's IndexedDB on that device.
- Search your local library by title.
- Play/pause/seek with the browser's video player.
- Browse the same collection in a vertical-video-style Shorts feed.
- Delete videos from the local library.
- No ads are displayed by OM Tube.

## Important limits
This starter is **not yet a multi-user YouTube replacement** and is not a native APK. It is a PWA that can be installed from a supported browser. Uploads stay on the device/browser where you added them. They do not reach other users and can be lost if browser site data is cleared or the device is reset. Keep original files backed up.

The Shorts view is a feed layout, not a full algorithmic recommendation engine. This starter does not include accounts, cloud upload, comments, likes, creator channels, moderation, or a remote video catalog.

## Run it free on your computer
1. Unzip the project.
2. Install Python 3 if needed.
3. Open a terminal in the `om_tube` folder.
4. Run `python -m http.server 8000`.
5. Open `http://localhost:8000` in your browser.

A local server is used because browser storage and PWA features may not work correctly when opening `index.html` directly as a file.

## Try it on your Android phone for free
For the easiest first test, host the folder on a static HTTPS host that offers a free tier (for example, GitHub Pages). Create a repository, upload the files in this folder, enable Pages for the main branch, and open the resulting HTTPS site on your phone. In Chrome, use the browser menu and choose **Install app** or **Add to Home screen** (wording varies). Then launch OM Tube from the home screen.

For local-network testing, your computer and phone can be on the same Wi-Fi, but you must run the server bound to your network interface and open the computer's LAN IP from the phone. HTTPS is recommended for installability.

## What a real public video platform needs
To let different people upload and watch the same videos, add:
- **Backend/API:** authentication, video metadata, permissions, and upload processing.
- **Object storage:** video files and thumbnails. Free quotas are limited and can change.
- **Database:** users, titles, channel info, likes, comments, and moderation status.
- **Transcoding/streaming:** multiple resolutions and adaptive playback; this can become the largest cost.
- **Abuse and copyright controls:** report flow, takedown process, upload limits, and content moderation.
- **Privacy/security:** secure upload rules, access controls, backups, and retention policies.

A ₹0 prototype can use free tiers, but a public platform with meaningful storage and bandwidth is rarely guaranteed to stay free. Review current provider limits before inviting users.

## Android APK later
This PWA can be wrapped in an Android project (for example, with Capacitor) after you have a hosted HTTPS URL. Building an APK locally can be free with Android Studio, but Play Store publishing has its own developer registration fee. Do not promise users YouTube's entire catalog or ad-free YouTube playback; use your own videos or content whose license and playback terms permit your intended use.

## Project files
- `index.html` — app structure
- `styles.css` — responsive visual design
- `app.js` — IndexedDB storage, search, upload, playback, Shorts feed
- `manifest.json` — installable app metadata
- `sw.js` — service worker for app-shell caching


## YouTube API connection (added in this version)
1. Open Google Cloud Console: https://console.cloud.google.com/
2. Create/select a project, enable **YouTube Data API v3**, then create an API key in APIs & Services → Credentials.
3. Restrict the key to **YouTube Data API v3**. Once hosted, add your site as an HTTP referrer restriction. Never send your key to anyone or commit it to a public repository.
4. Host this app over HTTPS, open it, tap the ⚙ button, and enter your key. The key is saved in this browser's local storage.
5. Type a search phrase. YouTube results appear above your local collection. Tap a result to play it in YouTube's official embedded player.

The browser-based API key is visible to people who can inspect the page/network. This is acceptable only for a personal prototype with strict API/referrer restrictions; a public product should route API calls through a backend that keeps credentials private and applies rate limits. Google may change quotas and terms. The API does not provide a way to disable YouTube's own ads in playback. The embedded player is intentionally not hidden or bypassed.
