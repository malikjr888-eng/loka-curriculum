# Loka's 30-Day Curriculum (phone app)

A small app you install from the browser. It works offline and saves everything on your phone. You don't need an account.

## Install it on your phone

**iPhone (use Safari, not Chrome):**
1. Open the app link in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then tap **Add**.
4. Open it from the new "Loka 30" icon on your home screen.

**Android (use Chrome):**
1. Open the app link in **Chrome**.
2. Tap **Install** if a banner shows up. If not, tap the **⋮** menu and choose **Install app** (or **Add to Home screen**).
3. Open it from the new "Loka 30" icon.

Open it once while you're online. After that it works without internet.

## Backup and moving to a new phone

- Your ticks, notes and your own lessons are saved **only on that phone**.
- Tap **Export backup** at the bottom of the app to save a `.json` file (iPhone: choose "Save to Files", or send it to yourself on WhatsApp or email).
- On the new phone, install the app, tap **Import backup**, and choose that file.
- Export a backup every week or two. If you delete the app from your home screen, its data is deleted too.

## Files

| File | What it does |
|---|---|
| `index.html` | The page structure |
| `styles.css` | Colors, fonts and layout (light and dark) |
| `data.js` | **All lesson content.** Edit lessons and links here |
| `app.js` | Ticks, notes, progress, your own lessons, backup |
| `sw.js` | Offline support |
| `manifest.webmanifest`, `icons/` | App name and home-screen icon |
| `fonts/` | Fonts stored in the app so they work offline |
| `manhag.html` | The original single-page version (kept for reference) |

**After you change any file:** open `sw.js` and change `VERSION` (for example `loka-v1` → `loka-v2`). If you skip this, phones keep showing the old version. Phones get the update the next time the app is opened online; close and reopen it once more to see it.
