# TANGLAW

**Total Area Navigation and Guided Local Awareness Watch**

A community safety web app (prototype) built as a requirement for CS 117 - Software Engineering. TANGLAW shows a live risk map of the surrounding area, lets citizens report emergencies and hazards, lets barangay responders handle them, and lets park managers handle park reservations.

---

## Features

### Citizen
- Live map with colour-coded risk zones (Low / Medium / High) that change by time of day
- "Why this rating" breakdown (hazards, crowd, nearby responders, incidents)
- Emergency (SOS) report with GPS pin, and live incident status tracking
- Automatic check-in prompt after lingering in a High Risk zone; contacts are alerted if you don't reply
- Emergency contacts with consent (they must accept) and secure, expiring live-location links
- Hazard reports with photo and map pin
- Park reservations with availability checking

### Barangay Responder
- Time in / time out (password-confirmed) with an attendance log
- Incident queue sorted by distance, with Accept, Arrived and Resolved actions
- Review, approve, reject and mark hazards as fixed
- See other on-duty responders and chat with them

### Park Manager
- Add and manage parks (pin and radius), close or reopen a park
- Approve, reject or cancel reservation requests; facility schedule view
- See hazards near managed parks and other managers online
- Staff chat

### Admin
- Live map of all online users, incidents and parks
- Statistics, responder time log
- Staff chat with all responders or managers, including alerts that must be acknowledged

---

## Requirements

- [Node.js](https://nodejs.org/) (LTS version recommended)
- Internet connection (map tiles, Leaflet and fonts load from CDNs; the tunnel also needs internet)
- A modern browser (Chrome, Edge, Safari, Firefox)

The server has **no runtime dependencies**, so you do not need to run `npm install` to start the web app.

---

## Getting Started

### 1. Get the project

If you received the project as a **.zip** file, extract it first (right-click → *Extract All…* on Windows). Remember where you extracted it.

### 2. Start the server

1. Open **Command Prompt** (press `Win + R`, type `cmd`, press Enter).
2. Go to the project folder:
   ```
   cd path\to\tanglaw
   ```
   Example: `cd C:\Users\YourName\Downloads\tanglaw`
3. Start the server:
   ```
   npm run dev
   ```
4. You should see:
   ```
   TANGLAW on http://localhost:3000
   ```
   Leave this window open. The app is now running on your computer at <http://localhost:3000>.

### 3. Make it reachable from your phone (tunnel)

Phone browsers only allow GPS on secure (`https`) pages, and other devices cannot reach `localhost`. The tunnel gives your app a public HTTPS link.

1. Open **another Command Prompt window** (or a new tab in Windows Terminal).
2. Go to the same project folder:
   ```
   cd path\to\tanglaw
   ```
3. Start the tunnel:
   ```
   npm run tunnel
   ```
   The first run may download `cloudflared` automatically (the `--yes` flag accepts this).
4. Look for a link in the output that looks like:
   ```
   https://something-random-words.trycloudflare.com
   ```
5. Open that link on your phone or any other device. Share it with classmates or testers so everyone uses the same app.

> Keep **both** windows open while using the app. Closing either one stops the server or the link.
> The tunnel link changes every time you restart `npm run tunnel`.

### 4. Stop the app

Press `Ctrl + C` in each Command Prompt window.

---

## Using the App

### Create an account

1. On the first screen, enter your **Name**, **Email** and **Password** (6+ characters).
2. Choose **I am a**: Citizen, Barangay responder, Park manager or Admin.
3. Staff roles need an **access code** (see below). Citizens need none.
4. Tap **Create account**. Next time, use **Log in**.

> Accounts are stored only in the browser of the device where they were created. Use the same device and browser to log back in.

### Access codes

Staff roles are protected by codes set in the `.env` file:

| Role | `.env` variable | Default |
|------|-----------------|---------|
| Barangay responder | `RESPONDER_CODE` | `BPSO2026` |
| Park manager | `MANAGER_CODE` | `PARK2026` |
| Admin | `ADMIN_CODE` | `ADMIN2026` |

Change them in `.env` and restart `npm run dev` for them to take effect.

### Allow location access

When your browser asks, choose **Allow** for location. If you blocked it by mistake, enable it in the browser's site settings. On phones, use the `https` tunnel link so GPS works.

### Suggested demo flow

1. **Responder** (device A): create an account, go to the Map tab, tap **Time in** and enter your password.
2. **Citizen** (device B): create an account and press **Emergency** to send a report.
3. **Responder**: open the Incidents tab, tap **Accept and respond**, then **Mark arrived** and **Mark resolved**. The citizen sees the status update live.
4. **Park manager** (device C): add a park on the Map tab (tap the map to drop a pin, or use your GPS location).
5. **Citizen**: open Parks, choose the park, pick a time and request a reservation.
6. **Park manager**: open Requests and approve or reject it.
7. **Admin** (device D): watch everyone live on the Map tab and message staff in Chat.

### Testing helpers (Settings, Citizen)

- **Demo mode**: shortens the check-in timer to 10 seconds and links expire after 1 minute.
- **Simulate High Risk at my location**: test the check-in without going anywhere.
- **Simulate a crowd / responder nearby**: see how safety in numbers lowers the risk.
- **Show simulated risk areas / Reshuffle**: toggle or regenerate the prototype risk hotspots.

---

## Configuration

Create or edit a `.env` file in the project root:

```
RESPONDER_CODE=BPSO2026
MANAGER_CODE=PARK2026
ADMIN_CODE=ADMIN2026

# Optional: better map tiles. Without a key, free CARTO tiles are used.
MAP_PROVIDER=maptiler      # or: mapbox
MAP_STYLE=streets
MAP_API_KEY=your-key-here

# Optional: change the port (default 3000)
PORT=3000
```

> Do not share or commit your real `MAP_API_KEY` or staff codes publicly.

---

## Project Structure

```
tanglaw/
├── index.html      App shell
├── app.js          All client-side logic (views, map, risk model, sync)
├── styles.css      Styling
├── server.js       Node.js server: static files + JSON API (no dependencies)
├── data.json       Shared data (incidents, hazards, reservations, parks, chat…)
├── .env            Access codes and map settings
├── package.json    Scripts: dev, tunnel
└── README.md
```

### How it works
- **Frontend**: plain HTML, CSS and JavaScript with [Leaflet](https://leafletjs.com/) for maps.
- **Backend**: a single Node.js server that stores shared data in `data.json`.
- **Privacy**: live locations and expiring alert links are kept in memory only and are never saved as a location trail.
- **Risk model**: rule-based (no machine learning). Approved hazards, recent incidents and simulated hotspots raise risk, scaled by time of day. Crowds and on-duty responders nearby lower it.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm` is not recognized | Install Node.js from nodejs.org, then reopen Command Prompt. |
| `Port 3000 already in use` | Close the other app using it, or set `PORT=3001` in `.env` (and use the same port for the tunnel script). |
| Location not working on phone | Use the `https://…trycloudflare.com` link, and allow location in browser settings. |
| Tunnel link does not open | Make sure `npm run dev` is still running and your internet is on. Restart `npm run tunnel` to get a new link. |
| Map looks blank | Check your internet connection. If you use a map key, verify `MAP_API_KEY`, `MAP_STYLE` and allowed domains. The app falls back to free tiles automatically on key errors. |
| "No account on this device yet" | Accounts live in the browser where you created them. Create a new account on this device. |
| Want a clean start | In Settings tap **Reset all data**, and/or delete the contents of `data.json` (keep the file as `{}`). |

---

## Disclaimer

TANGLAW is a school prototype and **does not replace 911** or official emergency services. Call 911 for life-threatening emergencies.