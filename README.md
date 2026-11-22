# TANGLAW

**Total Area Navigation and Guided Local Awareness Watch**

A community safety web app (prototype) built as a requirement for CS 117 - Software Engineering. TANGLAW shows a live risk map of the surrounding area, lets citizens report emergencies and hazards, lets barangay responders handle them, lets park managers handle park reservations, and gives the admin a console to oversee everything. The app is available in **English and Filipino**.

---

## Features

### Citizen
- Live map with colour-coded risk zones (Low / Medium / High) that change by time of day. Low areas show the map's own colours; only Medium and High are tinted.
- "Why this rating" breakdown: hazard reports, known risk areas, recent incidents, crowd, nearby responders, nearby police / hospitals / barangay halls, street lighting after dark, and time of day
- Emergency (SOS) report with GPS pin, and live incident status tracking (Reported → Responder Route → On-Site → Resolved)
- Automatic check-in prompt after lingering in a High Risk zone (3, 5 or 10 minutes, default 5, chosen in Settings). Contacts are alerted if you don't reply within 60 seconds. If there is no connection, the alert is kept and sent automatically when you are back online.
- Emergency contacts with consent (they must accept) and secure, expiring live-location links
- Hazard reports with photo and map pin. A report raises the risk around it right away (at half weight until someone verifies it) and stops once it is marked fixed.
- Park reservations with availability checking, and **cancelling** a pending or approved reservation with an optional reason
- In-app notices when a reservation is approved, declined or cancelled by someone else
- Language choice (English / Filipino) when creating an account, changeable later in Settings

### Barangay Responder
- Time in / time out (password-confirmed) with an attendance log
- Incident queue sorted by distance, with Accept, Arrived and Resolved actions
- Review, approve, reject and mark hazards as fixed
- See other on-duty responders and chat with them

### Park Manager
- Add and manage parks (pin and radius), and **close or reopen** a park temporarily
- Approve or reject reservation requests; **cancel an approved reservation** by choosing a reason (Maintenance or repair, Bad weather, Safety concern, Double-booked, Event at the park, or Other with a typed reason)
- Facility schedule view
- Review hazards near managed parks: approve, reject and mark fixed
- **Foot traffic** for each park: visitors today, last 7 days, busiest hour and an hourly chart
- See other managers online and use the staff chat

### Admin
- Live map of all online users, incidents and parks; statistics and responder time log
- Staff chat with all responders or managers, including alerts that must be acknowledged
- **Manage** tab (admin console):
  - **Users:** see registered citizens, suspend or reactivate accounts
  - **Incident reports:** view active and resolved incidents, mark resolved, delete
  - **Reservations:** approve, reject or cancel (with a reason) any reservation
  - **Maintenance reports:** approve, reject, mark fixed or delete hazard reports, with photos
  - **Parks and safety places:** close or reopen parks, see foot traffic, and add or remove police stations, hospitals, barangay halls and well-lit areas

### Automatic reservation cancelling
Reservations for **today** that have not ended yet are cancelled automatically, with the reason shown to the person who booked, when:
- the park is **temporarily closed**, or
- an **unresolved incident** within the park's radius plus 250 m has lasted **more than 30 minutes**.

New bookings for today are blocked while either condition holds. Reservations on future dates are not affected.

Other reservation rules: parks are open 6:00 AM to 10:00 PM, and the minimum booking is 30 minutes.

---

## Requirements

- [Node.js](https://nodejs.org/) **version 18 or newer** (LTS recommended)
- Internet connection (map tiles, Leaflet and fonts load from CDNs; the tunnel also needs internet)
- A modern browser (Chrome, Edge, Safari, Firefox)

The server has **no dependencies**, so you do not need to run `npm install`.

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
   npm start
   ```
   (`npm run dev` does the same thing, or run `node server.js`.)
4. You should see:
   ```
   TANGLAW on http://localhost:3000
   ```
   Leave this window open. The app is now running on your computer at <http://localhost:3000>.

No setup file is needed. Without a `.env` file the app uses the default staff codes (below) and free map tiles.

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
> The tunnel link changes every time you restart `npm run tunnel`. The tunnel script uses port 3000.

### 4. Stop the app

Press `Ctrl + C` in each Command Prompt window.

---

## Using the App

### Create an account

1. On the first screen, enter your **Name**, **Email** and **Password** (6+ characters).
2. Choose your **Language / Wika**: English or Filipino. You can change it later in Settings.
3. Choose **I am a**: Citizen, Barangay responder, Park manager or Admin.
4. Staff roles need an **access code** (see below). Citizens need none.
5. Tap **Create account**. Next time, use **Log in**.

> Accounts are stored only in the browser of the device where they were created. Use the same device and browser to log back in.

### Access codes

Staff roles are protected by codes. These are the defaults:

| Role | `.env` variable | Default |
|------|-----------------|---------|
| Barangay responder | `RESPONDER_CODE` | `BPSO2026` |
| Park manager | `MANAGER_CODE` | `PARK2026` |
| Admin | `ADMIN_CODE` | `ADMIN2026` |

To change them, create a `.env` file (see Configuration) and restart the server.

### Allow location access

When your browser asks, choose **Allow** for location. If you blocked it by mistake, enable it in the browser's site settings. On phones, use the `https` tunnel link so GPS works.

### Suggested demo flow

1. **Responder** (device A): create an account, go to the Map tab, tap **Time in** and enter your password.
2. **Citizen** (device B): create an account and press **Emergency** to send a report.
3. **Responder**: open the Incidents tab, tap **Accept and respond**, then **Mark arrived** and **Mark resolved**. The citizen sees the status update live.
4. **Park manager** (device C): add a park on the Map tab (tap the map to drop a pin, or use your GPS location).
5. **Citizen**: open Parks, choose the park, pick a time and request a reservation.
6. **Park manager**: open Requests and approve it. The citizen gets an in-app notice.
7. **Park manager**: cancel the approved reservation and pick a reason, or tap **Close** on the park to see today's reservations cancel automatically. The citizen sees the reason under My requests.
8. **Admin** (device D): watch everyone live on the Map tab, then open **Manage** to review users, incidents, reservations, hazards and foot traffic, or add a police station under Parks and safety places and see the risk drop around it.
9. Switch any account to **Filipino** in Settings to see the translated interface.

### Testing helpers (Settings, Citizen)

- **Check-in prompt after:** choose 3, 5 or 10 minutes.
- **Demo mode**: shortens the check-in timer to 10 seconds and links expire after 1 minute.
- **Simulate High Risk at my location**: test the check-in without going anywhere.
- **Simulate a crowd / responder nearby**: see how safety in numbers lowers the risk.
- **Show simulated risk areas / Reshuffle**: toggle or regenerate the prototype risk hotspots.

---

## Configuration

Everything here is optional. To change a setting, copy `.env.example` to `.env` (same folder as `server.js`), edit it, and restart the server:

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

> Do not share or commit your real `MAP_API_KEY` or staff codes publicly. Share `.env.example` instead of `.env`.

---

## Project Structure

```
tanglaw/
├── index.html      App shell
├── app.js          Client-side logic (views, map, risk model, admin console, sync)
├── lang.js         Filipino dictionary used when the language is set to Filipino
├── styles.css      Styling
├── server.js       Node.js server: static files + JSON API (no dependencies)
├── data.json       Shared data (incidents, hazards, reservations, parks, chat…). Created automatically
├── .env.example    Example settings (copy to .env to use)
├── package.json    Scripts: start, dev, tunnel
├── package-lock.json
└── README.md
```

### How it works
- **Frontend**: plain HTML, CSS and JavaScript with [Leaflet](https://leafletjs.com/) for maps. Text is written in English; when Filipino is chosen, `lang.js` translates it as it appears on screen. Names, places and dates stay as typed.
- **Backend**: a single Node.js server that stores shared data in `data.json`.
- **Risk model**: rule-based (no machine learning). Hazard reports, recent incidents, simulated hotspots and darkness (reduced by well-lit areas) raise risk, scaled by time of day. Crowds, on-duty responders and nearby police stations, hospitals or barangay halls lower it.
- **Privacy**: live locations and expiring alert links are kept in memory only and are never saved as a location trail. Foot traffic saves only hourly visitor counts per park, never names or locations.

### Prototype limitations
- Accounts and passwords are stored only in the user's own browser (the password is not encrypted). Staff access uses shared codes, not individual logins.
- The risk map uses simulated hotspot data. It has not been compared against historical crime data, so the 85% accuracy target in the study is not validated by this prototype.
- Foot traffic only counts people who have the app open with location sharing on.
- Suspending a user blocks reservations and hazard reports, but cannot stop them from using the map or SOS, which is intentional.
- This is a web app, not a native mobile app.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm` is not recognized | Install Node.js from nodejs.org, then reopen Command Prompt. |
| `Port 3000 already in use` | Close the other app using it, or set `PORT=3001` in `.env` (the tunnel script is fixed to port 3000, so edit it in `package.json` too). |
| Location not working on phone | Use the `https://…trycloudflare.com` link, and allow location in browser settings. |
| Tunnel link does not open | Make sure `npm start` is still running and your internet is on. Restart `npm run tunnel` to get a new link. |
| Map looks blank | Check your internet connection. If you use a map key, verify `MAP_API_KEY`, `MAP_STYLE` and allowed domains. The app falls back to free tiles automatically on key errors. |
| "No account on this device yet" | Accounts live in the browser where you created them. Create a new account on this device. |
| Some text is still in English after choosing Filipino | Names, places and dates are not translated. Any other English text is a missing dictionary entry; add it to `lang.js`. |
| "Account suspended" screen | An admin suspended the account. Ask an admin to reactivate it under Manage → Users. |
| Want a clean start | In Settings tap **Reset all data**, and delete `data.json` (the server creates a new empty one on the next start). |

---

## Disclaimer

TANGLAW is a school prototype and **does not replace 911** or official emergency services. Call 911 for life-threatening emergencies.
