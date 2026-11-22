// TANGLAW prototype. Device UI state lives in localStorage; shared data lives on server.js.

/* ---------- Constants & state ---------- */

const KEY = 'tanglaw';
const $   = s => document.querySelector(s);

const app = $('#app');
const ov  = $('#ov');

let st = JSON.parse(localStorage.getItem(KEY) || 'null') || {
  in: false,
  user: null,
  incident: null,
  links: [],
  demo: false,
  force: false,
  crowdSim: false,
  respSim: false,
  share: true
};

const save = () => localStorage.setItem(KEY, JSON.stringify(st));

// Chat read-markers are kept per channel (older builds stored a single number).
if (!st.chatSeen || typeof st.chatSeen != 'object') st.chatSeen = { mgr: +st.chatSeen || 0 };

/* ---------- Helpers ---------- */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&':  '&amp;',
  '<':  '&lt;',
  '>':  '&gt;',
  '"':  '&quot;',
  "'":  '&#39;'
}[c]));

const uid = () => Math.random().toString(36).slice(2, 8);

/* Timing / limits (demo mode uses shorter windows) */
const GRACE   = 60;
const LIM     = () => st.demo ? 10  : (st.lim || 5) * 60;   // seconds; the user can pick 3, 5 or 10 minutes in Settings
const TTL     = () => st.demo ? 60  : 900;

const LV = ['Low', 'Medium', 'High'];

const STEPS = [
  ['Reported',      'Report received'],
  ['Responder Route', 'Responder is on the way'],
  ['On-Site',       'Responder has arrived'],
  ['Resolved',      'Incident closed']
];

const FAC = [
  'Basketball court',
  'Covered pavilion',
  'Playground',
  'Open lawn'
];

const OPEN  = '06:00';
const CLOSE = '22:00';

/* Time formatting / parsing */
const f12 = t => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const rng = r => r.start ? `${f12(r.start)}–${f12(r.end)}` : r.slot;

/* Reservation cancelling */
const MREASONS = ['Maintenance or repair', 'Bad weather', 'Safety concern', 'Double-booked', 'Event at the park', 'Other'];
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const upc = r => r.date > today() || (r.date == today() && r.end > nowHM());
const cxInfo = r => r.status != 'Cancelled' ? '' :
  `<br>Cancelled ${r.cancelBy == 'auto' ? 'automatically' : r.cancelBy == 'manager' ? 'by the park manager' : r.cancelBy == 'admin' ? 'by an administrator' : 'by you'}` +
  (r.cancelReason ? ': ' + esc(r.cancelReason) : '') + (r.cancelNote ? ' (' + esc(r.cancelNote) + ')' : '');

const today = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

const toMin = t => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const CATS = [
  'Broken streetlight',
  'Pothole',
  'Flooded road',
  'Damaged facility',
  'Other'
];

/* ---------- Mutable runtime vars ---------- */

let pos        = { lat: 14.5995, lng: 120.9842, live: false };
let highSince  = null;
let checkin    = null;
let quiet      = 0;
let sig        = '';
let tt;

/* ---------- Roles ---------- */

const ROLES = {
  citizen: {
    home: 'home',
    nav: [
      ['home',     'Map'],
      ['reserve',  'Parks'],
      ['contacts', 'Contacts'],
      ['settings', 'Settings']
    ]
  },
  responder: {
    home: 'hub',
    nav: [
      ['hub',      'Map'],
      ['chat',     'Chat'],
      ['settings', 'Settings']
    ]
  },
  manager: {
    home: 'pmap',
    nav: [
      ['pmap',     'Map'],
      ['manage',   'Requests'],
      ['chat',     'Chat'],
      ['schedule', 'Schedule'],
      ['settings', 'Settings']
    ]
  },
  admin: {
    home: 'admin',
    nav: [
      ['admin',    'Map'],
      ['console',  'Manage'],
      ['chat',     'Chat'],
      ['settings', 'Settings']
    ]
  }
};

/* Which hash routes each role is allowed to render */
const ROUTES = {
  citizen:   ['home', 'sos', 'incident', 'reserve', 'reserved', 'requests', 'report', 'contacts', 'link', 'settings'],
  responder: ['hub', 'chat', 'settings'],
  manager:   ['pmap', 'manage', 'chat', 'schedule', 'report', 'settings'],
  admin:     ['admin', 'console', 'a-users', 'a-inc', 'a-res', 'a-hz', 'a-places', 'chat', 'settings']
};

const LABEL = {
  citizen:   'Citizen',
  responder: 'Barangay responder',
  manager:   'Park manager',
  admin:     'Admin'
};

/* Role accent colors (no color defined for admin) */
const RC = {
  citizen:   '#e98a6b',
  responder: '#4f9a6c',
  manager:   '#6a8fd8'
};

const CC = '#8a6fd1';   // colour for close (emergency) contacts

const role = () => st.user?.role || 'citizen';

/* Where the back arrow on the hazard report screen goes */
const backH = () => role() == 'manager' ? '#/pmap' : '#/home';

const route = () => {
  if (!st.in) return '';
  const r = (location.hash || '').split('/')[1] || '';
  return ROUTES[role()].includes(r) ? r : ROLES[role()].home;
};

/* ---------- GPS (adaptive sampling) ---------- */

let gstate = 'idle';   // idle | locating | live | denied | error | unsupported
let wid    = null;     // watchPosition id
let hiAcc  = null;     // whether the current watch uses high accuracy

/* Screens where we need frequent, accurate fixes */
const wantHi = () =>
  ['home', 'incident', 'link', 'hub', 'pmap'].includes(route()) ||
  highSince != null ||
  !!checkin;

function startGPS() {
  if (!navigator.geolocation) {
    gstate = 'unsupported';
    return;
  }

  const hi = wantHi();

  /* Already watching at the accuracy we want — nothing to do */
  if (wid !== null && hi === hiAcc) return;

  if (wid !== null) navigator.geolocation.clearWatch(wid);

  hiAcc = hi;
  if (!pos.live) gstate = 'locating';

  wid = navigator.geolocation.watchPosition(
    p => {
      pos = {
        lat:   p.coords.latitude,
        lng:   p.coords.longitude,
        live:  true,
        acc:   Math.round(p.coords.accuracy)
      };
      gstate = 'live';
    },
    e => {
      gstate = e.code == 1 ? 'denied' : 'error';
      if (e.code == 1) pos.live = false;
    },
    {
      enableHighAccuracy: hi,
      maximumAge:         hi ? 2000  : 30000,
      timeout:            20000
    }
  );
}

const gpsLabel = () => pos.live
  ? `GPS live, ±${pos.acc} m`
  : ({
      locating:    'Locating…',
      denied:      'Location blocked. Allow it in browser settings.',
      unsupported: 'GPS not supported'
    }[gstate] || 'Using demo location');

/* ---------- Rule-based risk model (no ML) ----------
   Every place starts at Low (risk 0). Risk is only ever raised by real signals:
   approved hazard reports and recent incidents. Time of day scales them.
   Crowds and nearby on-duty responders LOWER the risk (safety in numbers).
   Medium >= 0.25, High >= 0.55. Tune the constants below. */

/* Darkness by hour: 0 = full daylight, 1 = deep night */
const DARK = [
  1, 1, 1, 1, .7, .4, .1, 0,          // 00–07
  0, 0, 0, 0, 0, 0, 0, 0,             // 08–15
  0, .1, .4, .7, .9, 1, 1, 1          // 16–23
];

/* Linear interpolation between hour buckets */
const dark = h => {
  h = (h % 24 + 24) % 24;
  const a = Math.floor(h), f = h - a;
  return DARK[a] * (1 - f) + DARK[(a + 1) % 24] * f;
};

const tlabel = h => {
  h = Math.floor(((h % 24) + 24) % 24);
  return h >= 21 || h < 4 ? 'Late night'
       : h < 7            ? 'Before sunrise'
       : h < 17           ? 'Daytime'
       : h < 19           ? 'Dusk'
                          : 'Evening';
};

const nowH = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

/* hourOv: map time-of-day preview only (null = use real clock) */
let hourOv = null;
const viewH = () => hourOv ?? nowH();

/* Base weight per hazard type (unlisted types default to .15) */
const HW = {
  'Broken streetlight': .3,
  'Flooded road':       .35,
  'Pothole':            .2,
  'Damaged facility':   .2
};

/* Smooth falloff, 0 beyond R metres */
const bump = (d, R) => {
  const x = d / R;
  return x >= 1 ? 0 : (1 - x * x) ** 2;
};

/* Gentle distortion so zones are irregular, not perfectly round */
const wob = (la, lo) =>
  1
  + .22 * Math.sin(la * 11000 + 1.7) * Math.cos(lo * 9500 + .4)
  + .1  * Math.sin((la + lo) * 21000);

/* Simulated risk areas (prototype data).
   The world is cut into ~275 m cells. About 22% of cells hold a hotspot (random but stable, so every
   device sees the same map). Roughly 90% of the map stays Low. About 40% of hotspots are alleyways, which are
   far worse after dark; the rest are other spots such as poorly lit streets or vacant lots.
   "Reshuffle" in Settings changes the seed. */
const SC = .0025;
const SKIND = ['Poorly lit street', 'Vacant lot', 'Flood-prone road', 'Isolated footpath'];
const simOn = () => st.simRisk !== false;

const hsh = (i, j, k, sd) => {
  let x = Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k + 1, 83492791) ^ Math.imul(sd, 2654435761);
  x = Math.imul(x ^ (x >>> 15), 2246822519);
  x = Math.imul(x ^ (x >>> 13), 3266489917);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

const zmemo = new Map();

function simCell(i, j) {
  const sd = st.simSeed || 1, key = i + ',' + j + ',' + sd;
  if (zmemo.has(key)) return zmemo.get(key);
  if (zmemo.size > 6000) zmemo.clear();

  let z = null;
  if (hsh(i, j, 0, sd) < .22)
    z = {
      lat:  (i + .2 + .6 * hsh(i, j, 1, sd)) * SC,
      lng:  (j + .2 + .6 * hsh(i, j, 2, sd)) * SC,
      w:    .35 + .6 * hsh(i, j, 3, sd) ** 1.5,         // mostly moderate, a few severe
      R:    95 + 85 * hsh(i, j, 4, sd),                   // radius in metres
      kind: hsh(i, j, 5, sd) < .4 ? 'Alleyway' : SKIND[Math.floor(hsh(i, j, 6, sd) * 4)]
    };
  zmemo.set(key, z);
  return z;
}

function simAround(la, lo) {
  const ci = Math.floor(la / SC), cj = Math.floor(lo / SC), out = [];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const z = simCell(ci + a, cj + b);
    if (z) out.push(z);
  }
  return out;
}

let SV  = [];                  // safety places: police, hospitals, barangay halls, well-lit areas
let HZ  = [];                  // raw hazards
let HZA = [];                  // hazards flattened for scoring
let SIG = { crowd: [], incidents: [], resp: [] };

const crowdSrc = () => st.crowdSim
  ? SIG.crowd.concat([{ lat: pos.lat, lng: pos.lng, n: 10 }])
  : SIG.crowd;

/* On-duty responders (approximate positions from the server).
   The demo toggle adds one about 55 m from you. */
const respSrc = () => st.respSim
  ? (SIG.resp || []).concat([{ lat: pos.lat + .0005, lng: pos.lng }])
  : (SIG.resp || []);

/* Protection: crowds and responders make a place safer.
   - Crowd: each busy cell (3+ people) offsets up to .4 of risk within ~150 m (a bit less at night).
   - Responder: an on-duty responder offsets up to .3 within ~300 m.
   - Together: a responder close by makes the crowd's protection count up to twice as much.
   Total protection is capped at .6: a crowd plus a responder can bring a moderate hazard down to Low,
   but a severe hotspot (risk above .6 before protection) stays elevated. */
function risk(la, lo, h, cs, rs) {
  cs = cs || crowdSrc();
  rs = rs || respSrc();

  const dk    = dark(h);
  const w     = wob(la, lo);
  const K     = 111320 * Math.cos(la * Math.PI / 180);   // metres per degree longitude
  const dist  = (a, b) => Math.hypot((la - a) * 110540, (lo - b) * K);

  let hz = 0, sf = 0, rp = 0, ic = 0, fc = 0, sm = 0, nz = null, nzv = 0;            // hazard / crowd shield / responder shield / incident / forced
  let people = 0, nh = 0, ni = 0, rd = null;             // nearby counts, nearest responder (m)

  /* Approved hazards: streetlights and flooding worsen in the dark */
  for (const s of HZA) {
    const d = dist(s.lat, s.lng);
    const f = bump(d / w, 150);
    if (d < 150) nh++;
    if (!f) continue;
    const lightPenalty = s.cat == 'Broken streetlight' ? .3 + .7 * dk : 1 + .5 * dk;
    hz += (HW[s.cat] ?? .15) * f * lightPenalty * (s.status == 'Pending' ? .5 : 1);   // reported hazards count at once; half weight until verified
  }

  /* Crowd density: more people nearby = safer */
  for (const c of cs) {
    const d = dist(c.lat, c.lng);
    if (d < 100) people += c.n;
    const f = bump(d / w, 150);
    if (f) sf += Math.min(.4, .05 * (c.n - 2)) * f * (1 - .25 * dk);
  }
  sf = Math.min(.4, sf);

  /* On-duty responders: closer = safer */
  for (const x of rs) {
    const d = dist(x.lat, x.lng);
    if (rd == null || d < rd) rd = d;
    rp += .3 * bump(d / w, 300);
  }
  rp = Math.min(.3, rp);

  /* Emergency services (police, hospital, barangay hall) within ~500 m add safety.
     Well-lit areas remove the small after-dark penalty that every other place carries. */
  let es = 0, lit = 0, ns = null;
  for (const s of SV) {
    const d = dist(s.lat, s.lng);
    if (s.kind == 'Well-lit area') { lit += bump(d / w, 150); continue; }
    es += .2 * bump(d / w, 500);
    if (!ns || d < ns.d) ns = { d, name: s.name, kind: s.kind };
  }
  es = Math.min(.2, es);
  lit = Math.min(1, lit);
  const ld = .12 * dk * (1 - lit);

  /* Recent incidents: linear decay over 6 hours */
  const t = Date.now();
  for (const x of SIG.incidents) {
    const age = (t - x.t) / 36e5;
    if (age >= 6) continue;
    const d = dist(x.lat, x.lng);
    if (d < 200) ni++;
    ic += .4 * (1 - age / 6) * bump(d / w, 200) * (1 + .5 * dk);
  }
  ic = Math.min(.4, ic);   // repeat reports at one spot can't stack the area into High on their own

  /* Simulated risk areas: alleyways are about half as risky by day and 30% worse than baseline at night */
  if (simOn())
    for (const z of simAround(la, lo)) {
      const v = z.w * bump(dist(z.lat, z.lng) / w, z.R) * (z.kind == 'Alleyway' ? .7 + .6 * dk : 1 + .4 * dk);
      if (!v) continue;
      sm += v;
      if (v > nzv) { nzv = v; nz = z; }
    }

  /* Demo toggle: force a hotspot at the user's position */
  if (st.force) fc = .8 * bump(dist(pos.lat, pos.lng) / w, 150);

  const raw    = hz + ic + fc + sm + ld,
        shield = Math.min(.6, sf * (1 + rp / .3) + rp + es),
        r      = Math.max(0, Math.min(1, raw - shield));

  return {
    r, raw, shield, hz, cr: sf, rp, ic, sm, nz, people, nh, ni, dk, rd, es, ld, lit, ns,
    lvl:   r < .25 ? 0 : r < .55 ? 1 : 2,
    score: Math.round((1 - r) * 100)
  };
}

/* ---------- UI helpers ---------- */

function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove('on'), 4000);
}

const head = (t, b = '') => `<header>${
  b ? `<a class="back" href="${b}" aria-label="Back">‹</a>` : ''
}<h1>${t}</h1></header>`;

const topbar = s => `<header class="top"><div><h1 class="brand">TANGLAW</h1><p class="sub">${s}</p></div><span id="gps" class="chip"></span></header>`;

/* Routes that hide the bottom dock (full-screen / detail views) */
const DK = ['home', 'hub', 'reserve', 'reserved', 'requests', 'manage', 'pmap', 'chat', 'schedule', 'contacts', 'settings', 'admin', 'console', 'a-users', 'a-inc', 'a-res', 'a-hz', 'a-places'];

const dock = a => {
  const on = { requests: 'reserve', reserved: 'reserve', 'a-users': 'console', 'a-inc': 'console', 'a-res': 'console', 'a-hz': 'console', 'a-places': 'console' }[a] || a;   // "My requests" highlights the Parks tab
  return `<nav class="dock">${ROLES[role()].nav.map(([h, l]) => `
    <a href="#/${h}" class="${on == h ? 'on' : ''}">${l}<b class="bdg" data-bd="${h}" hidden></b></a>
  `).join('')}</nav>`;
};

function badges() {
  const c = {
    hub:     hubData.length + HZ.filter(h => h.status == 'Pending').length,
    manage:  RES.filter(r => r.status == 'Pending approval' && owns(r)).length,
    contacts: CT.filter(c => c.to.id == st.user.id && c.status == 'pending').length,
    chat:    unreadChat()
  };
  document.querySelectorAll('[data-bd]').forEach(e => {
    const n = c[e.dataset.bd] || 0;
    e.textContent = n || '';
    e.hidden = !n;
  });
}

const tabs = a => `<nav class="tabs">
  <a href="#/reserve"  class="${a == 'reserve'  ? 'on' : ''}">Reserve</a>
  <a href="#/reserved" class="${a == 'reserved' ? 'on' : ''}">Reserved</a>
  <a href="#/requests" class="${a == 'requests' ? 'on' : ''}">My requests</a>
</nav>`;

const tag = s => `<em class="tag ${
  /Approved|Fixed|accepted|Accepted/.test(s) ? 'ok'
  : /Rejected|Cancelled|declined|Declined/.test(s)     ? 'no'
                                             : 'wait'
}">${s}</em>`;

const btn = (a, id, to, l) => `<button class="mini go" data-act="${a}" data-id="${esc(id)}" data-to="${to}">${l}</button>`;

const HOURS = [
  ['',   'Now'],
  ['4',  'Before sunrise (4 AM)'],
  ['8',  'Morning (8 AM)'],
  ['14', 'Afternoon (2 PM)'],
  ['19', 'Evening (7 PM)'],
  ['23', 'Late night (11 PM)']
];

/* Risk colour key, shared by every map legend */
const RK = '<span><i style="background:transparent;border:1px solid var(--mut)"></i>Low (no tint)</span>' +
           '<span><i style="background:var(--mid)"></i>Medium</span>' +
           '<span><i style="background:var(--hi)"></i>High</span>';

/* Time-of-day picker + current zone + explanation (citizen and responder maps) */
const zoneBlock = () => `
  <label class="tsel">Risk by time of day
    <select name="hour">
      ${HOURS.map(([v, l]) => `<option value="${v}" ${(hourOv == null ? '' : String(hourOv)) == v ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
  </label>
  <p id="zone"></p>
  <details class="why"><summary>Why this rating</summary><div id="why"></div></details>`;

/* ---------- Views ---------- */
const authView = () => `
  <h1 class="brand">TANGLAW</h1>
  <p class="sub">Total Area Navigation and Guided Local Awareness Watch</p>
  <form data-f="auth">
    <label>Name (new accounts)<input name="name" autocomplete="name"></label>
    <label>Email<input name="email" type="email" required autocomplete="email"></label>
    <label>Password<input name="pass" type="password" required minlength="6"></label>
    <label>Language / Wika
      <select name="lang">
        <option value="en" ${st.lang != 'fil' ? 'selected' : ''}>English</option>
        <option value="fil" ${st.lang == 'fil' ? 'selected' : ''}>Filipino</option>
      </select>
    </label>
    <label>I am a
      <select name="role">
        ${Object.keys(LABEL).map(k => `<option value="${k}">${LABEL[k]}</option>`).join('')}
      </select>
    </label>
    <label id="rc" hidden>
      <span id="rct">Access code</span>
      <input name="code" autocomplete="off">
    </label>
    <button class="btn" name="m" value="login">Log in</button>
    <button class="btn ghost" name="m" value="reg">Create account</button>
  </form>
  <p class="note">By creating an account you allow barangay officials to see your live location while the app is open. It is never saved as a trail, and you can pause sharing in Settings.</p>
  <p class="note">Prototype: accounts are stored only on this device.</p>
`;

/* ---------- Admin console (FR-15) ---------- */
let AU = [], auSig = '', AINC = [], aiSig = '', TRF = {}, trSig = '';
const aF = { inc: 'active', res: 'pending', hz: 'review' };
const SVK = ['Police station', 'Hospital', 'Barangay hall', 'Well-lit area'];
const fmtT = t => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const chips = (k, list) => `<div class="fchips">${list.map(([v, l, n]) =>
  `<button class="mini ${aF[k] == v ? 'go' : ''}" data-act="afil" data-id="${k}:${v}">${l}${n != null ? ` (${n})` : ''}</button>`).join('')}</div>`;

/* Foot traffic: today, last 7 days, busiest hour, and an hourly bar strip */
function trafHTML(pid) {
  const d = TRF[pid] || {}, tz = new Date().getTimezoneOffset() * 6e4,
        sum = o => Object.values(o || {}).reduce((x, y) => x + y, 0),
        day = d[today()] || {};
  let wk = 0;
  for (let k = 0; k < 7; k++) wk += sum(d[new Date(Date.now() - k * 864e5 - tz).toISOString().slice(0, 10)]);
  const pk = Object.entries(day).sort((x, y) => y[1] - x[1])[0],
        mx = Math.max(1, ...Object.values(day));
  return `<div class="stats">
      <div class="stat"><b>${sum(day)}</b><span>Visitors today</span></div>
      <div class="stat"><b>${wk}</b><span>Last 7 days</span></div>
      <div class="stat"><b>${pk ? f12(pk[0] + ':00') : '–'}</b><span>Busiest hour today</span></div>
    </div>
    <div class="tbars">${Array.from({ length: 16 }, (_, k) => k + 6).map(h => `<i style="height:${Math.max(4, Math.round((day[h] || 0) / mx * 100))}%"></i>`).join('')}</div>
    <div class="axis"><span>6 AM</span><span>2 PM</span><span>10 PM</span></div>`;
}

const suspView = () => `
  <h1 class="brand">TANGLAW</h1>
  <div class="card"><b>Account suspended</b>
    <p>An administrator has suspended this account. You cannot reserve parks or report hazards right now. Please contact your barangay office.</p></div>
  <a class="btn sosbtn" href="tel:911">Call 911</a>
  <button class="btn ghost" data-act="logout">Log out</button>`;

async function syncAdmin() {
  const r = route();
  let ch = false;

  if (r == 'a-users') {
    const u = await api('users?all=1'), s = JSON.stringify(u);
    if (s != auSig) { AU = u; auSig = s; ch = true; }
  }
  if (r == 'a-inc') {
    const i = await api('incidents?all=1'), s = JSON.stringify(i.map(x => [x.id, x.status, x.responder?.id]));
    if (s != aiSig) { AINC = i; aiSig = s; ch = true; }
  }
  if ((r == 'a-places' && role() == 'admin') || (r == 'manage' && role() == 'manager')) {
    const t = await api('traffic' + (role() == 'manager' ? '?mid=' + st.user.id : '')), s = JSON.stringify(t);
    if (s != trSig) { TRF = t; trSig = s; ch = true; }
  }
  if (ch) render();
}

const V = {

  console: () => head('Manage') + [
      ['a-users',  'Users',                    'Accounts: view, suspend or reactivate'],
      ['a-inc',    'Incident reports',         `${hubData.length} active`],
      ['a-res',    'Reservations',             `${RES.filter(r => r.status == 'Pending approval').length} pending`],
      ['a-hz',     'Maintenance reports',      `${HZ.filter(h => h.status == 'Pending').length} to review`],
      ['a-places', 'Parks and safety places',  `${PARKS.length} parks · ${SV.length} places`]
    ].map(([h, t, s]) => `<a class="card" href="#/${h}"><b>${t}</b><span>${s}</span></a>`).join(''),

  'a-users': () => head('Users', '#/console') +
    '<p class="note">Citizens registered on this server. A suspended user cannot reserve parks or report hazards and sees a notice in the app. Emergency calling stays available.</p>' +
    (AU.map(u => `<div class="row">
        <div><b>${esc(u.name)}</b><span>${u.online ? 'Online now' : 'Offline'}</span></div>
        <div>${u.suspended ? '<em class="tag no">Suspended</em> ' : ''}<button class="mini ${u.suspended ? 'go' : ''}" data-act="usus" data-id="${esc(u.id)}" data-to="${u.suspended ? 0 : 1}">${u.suspended ? 'Reactivate' : 'Suspend'}</button></div>
      </div>`).join('') || '<p class="note">No registered users yet.</p>'),

  'a-inc': () => {
    const L = AINC.slice().sort((x, y) => y.created - x.created), f = aF.inc,
          sh = L.filter(i => f == 'all' || (f == 'active' ? i.status < 3 : i.status == 3));
    return head('Incident reports', '#/console') +
      chips('inc', [['active', 'Active', L.filter(i => i.status < 3).length], ['done', 'Resolved', L.filter(i => i.status == 3).length], ['all', 'All', L.length]]) +
      (sh.map(i => `<div class="card">
          <b>${esc(i.type)}</b>
          <span>${esc(i.by || 'Citizen')} · ${fmtT(i.created)}${i.note ? '<br>' + esc(i.note) : ''}</span><br>
          <span><em>${STEPS[i.status][0]}</em>${i.responder ? ' · ' + esc(i.responder.name) : ''}</span><br>
          ${i.status < 3 ? btn('ainc', i.id, 3, 'Mark resolved') : ''}
          <a class="mini" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${i.lat},${i.lng}">Navigate</a>
          <button class="mini" data-act="adel" data-id="inc:${i.id}">Delete</button>
        </div>`).join('') || '<p class="note">No incidents here.</p>');
  },

  'a-res': () => {
    const L = RES.slice().sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start)),
          pend = L.filter(r => r.status == 'Pending approval'),
          up = L.filter(r => r.status == 'Approved' && upc(r)),
          oth = L.filter(r => !pend.includes(r) && !up.includes(r)).reverse(),
          sh = aF.res == 'pending' ? pend : aF.res == 'up' ? up : oth;
    return head('Reservations', '#/console') +
      chips('res', [['pending', 'Pending', pend.length], ['up', 'Upcoming', up.length], ['past', 'Past or cancelled', oth.length]]) +
      (sh.map(r => `<div class="row">
          <div>
            <b>${esc(r.fac)}</b>
            <span>${r.pname ? esc(r.pname) + ' · ' : ''}${esc(r.date)}, ${rng(r)}<br>${esc(r.by || '')}${r.purpose ? ' · ' + esc(r.purpose) : ''}${cxInfo(r)}</span><br>
            ${r.status == 'Pending approval' ? btn('rs', r.id, 'Approved', 'Approve') + btn('rs', r.id, 'Rejected', 'Reject') : ''}
            ${r.status == 'Approved' && upc(r) ? `<button class="mini" data-act="rcx" data-id="${esc(r.id)}">Cancel reservation</button>` : ''}
          </div>
          ${tag(r.status)}
        </div>`).join('') || '<p class="note">Nothing here.</p>');
  },

  'a-hz': () => {
    const by = s => HZ.filter(h => h.status == s).slice().reverse(),
          sh = by({ review: 'Pending', active: 'Approved', fixed: 'Fixed', rejected: 'Rejected' }[aF.hz]);
    return head('Maintenance reports', '#/console') +
      chips('hz', [['review', 'To review', by('Pending').length], ['active', 'Active', by('Approved').length], ['fixed', 'Fixed', by('Fixed').length], ['rejected', 'Rejected', by('Rejected').length]]) +
      (sh.map(h => `<div class="card">
          ${h.photo ? `<img class="hzimg" src="/api/hazards/${esc(h.id)}/photo" loading="lazy" alt="">` : ''}
          <b>${esc(h.cat)}</b>
          <span>${esc(h.desc)}<br>${esc(h.by || 'Citizen')} · ${fmtT(h.created)}</span><br>
          ${h.status == 'Pending' ? btn('hzs', h.id, 'Approved', 'Approve') + btn('hzs', h.id, 'Rejected', 'Reject') : ''}
          ${h.status == 'Approved' ? btn('hzs', h.id, 'Fixed', 'Mark fixed') : ''}
          <a class="mini" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}">Navigate</a>
          <button class="mini" data-act="adel" data-id="hz:${h.id}">Delete</button>
        </div>`).join('') || '<p class="note">Nothing here.</p>');
  },

  'a-places': () => head('Parks and safety places', '#/console') + '<h2>Parks</h2>' +
    (PARKS.map(p => `<div class="card">
        <b>${esc(p.name)}</b>
        <span>Park manager: ${esc(p.mname || '?')}</span><br>
        ${p.closed ? '<em class="tag no">Temporarily closed</em> ' : ''}<button class="mini" data-act="pkcl" data-id="${esc(p.id)}" data-to="${p.closed ? 0 : 1}">${p.closed ? 'Reopen' : 'Close'}</button>
        ${trafHTML(p.id)}
      </div>`).join('') || '<p class="note">No parks yet.</p>') +
    '<h2>Safety places</h2><p class="note">Police stations, hospitals and barangay halls lower the risk around them. Well-lit areas cancel the small extra risk after dark.</p>' +
    (SV.map(s => `<div class="row"><div><b>${esc(s.name)}</b><span>${s.kind}</span></div><button class="mini" data-act="svdel" data-id="${esc(s.id)}">Remove</button></div>`).join('') || '<p class="note">No safety places yet.</p>') +
    `<h2>Add a safety place</h2>
    <form data-f="svc">
      <label>Name<input name="name" required maxlength="60"></label>
      <label>Type<select name="kind">${SVK.map(k => `<option>${k}</option>`).join('')}</select></label>
      <div class="two">
        <label>Latitude<input name="lat" required inputmode="decimal"></label>
        <label>Longitude<input name="lng" required inputmode="decimal"></label>
      </div>
      <button type="button" class="btn ghost" data-act="svloc">Use my current location</button>
      <button class="btn">Add place</button>
    </form>`,


  /* Citizen home */
  home: () => {
    const i = st.incident;
    return `${topbar('Kumusta, ' + esc(st.user.name))}
      <div id="map" class="map"></div>
      <div class="legend">
        <span><i style="background:transparent;border:1px solid var(--mut)"></i>Low (no tint)</span>
        <span><i style="background:var(--mid)"></i>Medium</span>
        <span><i style="background:var(--hi)"></i>High</span>
        <span><i style="background:#e98a6b"></i>You</span>
        <span><i style="background:${CC}"></i>Close contacts</span>
      </div>
      <label class="tsel">Risk by time of day
        <select name="hour">
          ${HOURS.map(([v, l]) => `<option value="${v}" ${(hourOv == null ? '' : String(hourOv)) == v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
      <p id="zone"></p>
      <details class="why"><summary>Why this rating</summary><div id="why"></div></details>
      <p id="linger" class="note"></p>
      ${i ? `<a class="card inc" href="#/incident"><b>Active incident</b><span>${STEPS[i.status][0]}</span></a>` : ''}
      <div class="two">
        <a class="btn ghost" href="#/report">Report hazard</a>
        <a class="btn sosbtn" href="#/sos">Emergency</a>
      </div>`;
  },

  /* Responder: one map page. Incidents, hazards and team switch underneath it, so the map never reloads. */
  hub: () => `${topbar('Responder: ' + esc(st.user.name))}
    <div id="duty"></div>
    <div id="map" class="map"></div>
    <div class="legend">
      ${RK}
      <span><i style="background:#e98a6b"></i>You</span>
      <span><i style="background:${RC.responder}"></i>Responders</span>
    </div>
    ${zoneBlock()}
    <div id="hpanel"></div>`,

  /* Park manager */
  manage: () => {
    const pr = RES.filter(r => r.status == 'Pending approval' && owns(r)),
          sortT = (x, y) => (x.date + x.start).localeCompare(y.date + y.start),
          ap = RES.filter(r => r.status == 'Approved' && owns(r) && upc(r)).sort(sortT),
          mine = PARKS.filter(p => p.mid == st.user.id),
          cx = RES.filter(r => r.status == 'Cancelled' && owns(r)).slice().sort((x, y) => (y.cancelled || 0) - (x.cancelled || 0)).slice(0, 5);
    return head('Reservation requests') +
      (pr.map(r => `<div class="row">
          <div>
            <b>${esc(r.fac)}</b>
            <span>${r.pname ? esc(r.pname) + ' · ' : ''}${esc(r.date)}, ${rng(r)}<br>${esc(r.by || '')}${r.purpose ? ' · ' + esc(r.purpose) : ''}</span><br>
            ${btn('rs', r.id, 'Approved', 'Approve')}${btn('rs', r.id, 'Rejected', 'Reject')}
          </div>
        </div>`).join('') || '<p class="note">No pending requests for your parks.</p>') +
      `<h2>Approved reservations</h2>` +
      (ap.map(r => `<div class="row">
          <div>
            <b>${esc(r.fac)}</b>
            <span>${r.pname ? esc(r.pname) + ' · ' : ''}${esc(r.date)}, ${rng(r)}<br>${esc(r.by || '')}${r.purpose ? ' · ' + esc(r.purpose) : ''}</span><br>
            <button class="mini" data-act="rcx" data-id="${esc(r.id)}">Cancel reservation</button>
          </div>
          ${tag('Approved')}
        </div>`).join('') || '<p class="note">No upcoming approved reservations.</p>') +
      (cx.length ? `<h2>Recently cancelled</h2>` + cx.map(r => `<div class="row">
          <div><b>${esc(r.fac)}</b><span>${r.pname ? esc(r.pname) + ' · ' : ''}${esc(r.date)}, ${rng(r)}${cxInfo(r)}</span></div>
          ${tag('Cancelled')}
        </div>`).join('') : '') +
      (mine.length ? `<h2>Foot traffic</h2>` + mine.map(p => `<div class="card"><b>${esc(p.name)}</b>${trafHTML(p.id)}</div>`).join('') +
        '<p class="note">Counts of app users who were inside the park area, per hour. Only counts are kept, never names or trails.</p>' : '') +
      '<p class="note">You only see requests for parks you added. Open the Schedule tab to see what is booked for a facility. Reservations are also cancelled automatically when a park is closed, or an incident near it stays unresolved for more than 30 minutes.</p>';
  },

  /* Park manager: map of parks, hazards near them, other managers */
  pmap: () => `${topbar('Park manager: ' + esc(st.user.name))}
    <div id="map" class="map"></div>
    <div class="legend">
      ${RK}
      <span><i style="background:#e98a6b"></i>You</span>
      <span><i style="background:${RC.manager}"></i>Other managers</span>
      <span><i style="background:var(--hi)"></i>Hazard</span>
    </div>
    <a class="btn ghost" href="#/report">Report a hazard near a park</a>
    <h2>Hazards near your parks</h2>
    <div id="pmhz"></div>
    <h2>Park managers online</h2>
    <div id="pmgr"></div>
    <h2>Your parks</h2>
    <div id="pmpk"></div>
    <form data-f="park">
      <label>Park name<input name="name" required maxlength="60"></label>
      <label>Area to watch
        <select name="r">
          <option value="100">100 m around the pin</option>
          <option value="200" selected>200 m around the pin</option>
          <option value="300">300 m around the pin</option>
          <option value="500">500 m around the pin</option>
        </select>
      </label>
      <button class="btn ghost">Add park at the pin</button>
    </form>
    <p class="note">Tap the map to drop a pin. Without a pin, your GPS location is used. Hazards within the area plus 250 m show up in your list. Every park you add here becomes available for citizens to reserve.</p>`,

  /* Staff chat. Responders talk with each other and the admin; park managers likewise; the admin sees both. */
  chat: () => {
    const R = role(), adm = R == 'admin', ch = curCh();
    return head(adm ? 'Staff chat' : R == 'responder' ? 'Responders chat' : 'Park managers chat') +
      `<p class="sub">${adm
        ? 'Visible to all ' + (ch == 'resp' ? 'responders' : 'park managers') + '.'
        : 'Visible to all ' + (R == 'responder' ? 'responders' : 'park managers') + ' and the admin.'}</p>` +
      (adm ? `<nav class="tabs">
        <button type="button" class="${ch == 'resp' ? 'on' : ''}" data-act="chtab" data-id="resp">Responders</button>
        <button type="button" class="${ch == 'mgr' ? 'on' : ''}" data-act="chtab" data-id="mgr">Park managers</button>
      </nav>` : '') + `
      <div id="msgs" class="msgs"></div>
      <form data-f="chat">
        <div class="cform">
          <input name="text" placeholder="${adm ? 'Message ' + (ch == 'resp' ? 'responders' : 'park managers') : R == 'responder' ? 'Message responders and admin' : 'Message park managers and admin'}" maxlength="500" autocomplete="off" required>
          <button class="btn">Send</button>
        </div>
        ${adm ? `<label class="chk"><input type="checkbox" name="alert"><span>Send as an alert<br><small>Recipients get a pop-up they must acknowledge.</small></span></label>` : ''}
      </form>`;
  },

  schedule: () => {
    const ps = mine();
    return head('Facility schedule') + (ps.length ? `
      <label>Park<select name="park">${ps.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
      <div class="two">
        <label>Facility<select name="fac">${FAC.map(f => `<option>${f}</option>`).join('')}</select></label>
        <label>Date<input type="date" name="date" value="${today()}"></label>
      </div>
      <div id="avail"></div>`
      : '<p class="note">You have no parks yet. Add one on the Map tab and it appears here and in the citizens’ Parks tab.</p>');
  },

  /* Admin: live view of everyone */
  admin: () => `${topbar('Admin: ' + esc(st.user.name))}
    <div id="stats" class="stats"></div>
    <div id="map" class="map"></div>
    <div class="legend">
      ${RK}
      <span><i style="background:${RC.citizen}"></i>Citizens</span>
      <span><i style="background:${RC.responder}"></i>Responders</span>
      <span><i style="background:${RC.manager}"></i>Park managers</span>
    </div>
    <div class="two">
      <a class="btn ghost" href="#/chat" data-act="chto" data-id="resp">Message responders</a>
      <a class="btn ghost" href="#/chat" data-act="chto" data-id="mgr">Message park managers</a>
    </div>
    <div class="fchips">
      ${[['all', 'Everyone'], ['citizen', 'Citizens'], ['responder', 'Responders'], ['manager', 'Park managers']]
        .map(([k, l]) => `<button class="mini ${adminF == k ? 'go' : ''}" data-act="pf" data-id="${esc(k)}">${l}</button>`).join('')}
    </div>
    <h2>People</h2>
    <div id="plist"></div>
    <h2>Responder time log</h2>
    <div id="tlog"></div>
    <p class="note">Only people who are online with location sharing on appear on the map. Nothing is stored as a trail.</p>`,

  sos: () => head('Emergency', '#/home') + `
    <form data-f="sos">
      <button class="sos" type="submit">Report emergency<small>Tap to send</small></button>
      <p class="note">${pos.live ? `GPS pin attached (±${pos.acc} m)` : 'GPS unavailable. Using a demo location.'}</p>
      <label>Add a note (optional)<textarea name="note" rows="2" maxlength="200"></textarea></label>
    </form>
    <p class="note">TANGLAW does not replace 911. <a href="tel:911"><u>Call 911</u></a> for life-threatening emergencies.</p>`,

  incident: () => {
    const i = st.incident;
    if (!i) return head('Incident status', '#/home') + '<p class="note">No active incident.</p>';
    return head('Incident status', '#/home') + `
      <div id="map2" class="map sm"></div>
      <ol class="tl">
        ${STEPS.map((s, k) => `<li class="${k < i.status ? 'done' : k == i.status ? 'now' : ''}"><b>${s[0]}</b><span>${s[1]}</span></li>`).join('')}
      </ol>
      <div class="row"><div><b>Assigned responder</b><span>${i.responder ? esc(i.responder.name) : 'Waiting for assignment'}</span></div></div>
      <div class="row"><div><b>${esc(i.type)}</b><span>GPS pin ${i.lat.toFixed(5)}, ${i.lng.toFixed(5)}${i.note ? '. ' + esc(i.note) : ''}</span></div></div>
      <p class="note">${i.sent ? 'Status updates automatically.' : 'No connection. This report will send automatically when you are back online.'}</p>` +
      (i.status == 3 ? '<button class="btn" data-act="close">Close incident</button>' : '');
  },

  reserve: () => head('Parks') + tabs('reserve') + (PARKS.length ? (PARKS.some(p => p.id == selPark) || (selPark = PARKS[0].id), `
    <div id="map2" class="map md"></div>
    <p class="note">Tap a park on the map, or pick it below, to see what is open there.</p>
    <form data-f="res">
      <label>Park<select name="park">${PARKS.map(p => `<option value="${esc(p.id)}" ${p.id == selPark ? 'selected' : ''}>${esc(p.name)}${pos.live ? ' · ' + km(pos.lat, pos.lng, p.lat, p.lng).toFixed(1) + ' km away' : ''}</option>`).join('')}</select></label>
      <label>Facility<select name="fac">${FAC.map(f => `<option>${f}</option>`).join('')}</select></label>
      <label>Date<input type="date" name="date" required min="${today()}" value="${today()}"></label>
      <div id="avail"></div>
      <div class="two">
        <label>Start time<input type="time" name="start" value="08:00" min="${OPEN}" max="${CLOSE}" required></label>
        <label>End time<input type="time" name="end" value="10:00" min="${OPEN}" max="${CLOSE}" required></label>
      </div>
      <div id="vstat"></div>
      <label>Purpose<input name="purpose" maxlength="80"></label>
      <button class="btn">Request reservation</button>
    </form>`)
    : '<p class="note">No parks are open for reservation yet. A park shows up here as soon as a park manager adds it on their map.</p>'),

  reserved: () => {
    const t = today(),
          rows = RES.filter(r => r.status != 'Rejected' && r.status != 'Cancelled' && r.date >= t && (!rvPark || r.pid == rvPark))
            .slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    let last = '';
    return head('Parks') + tabs('reserved') + `
      <label>Park<select name="rvpark">
        <option value="">All parks</option>
        ${PARKS.map(p => `<option value="${esc(p.id)}" ${p.id == rvPark ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
      </select></label>` +
      (rows.map(r => {
        const h = r.date != last ? `<h2>${r.date == t ? 'Today' : esc(r.date)}</h2>` : '';
        last = r.date;
        return h + `<div class="row">
          <div><b>${esc(r.fac)}</b><span>${r.pname ? esc(r.pname) + ' · ' : ''}${rng(r)}${r.uid == st.user.id ? ' · yours' : ''}</span></div>
          <em class="tag ${r.status == 'Approved' ? 'no' : 'wait'}">${r.status == 'Approved' ? 'Reserved' : 'Pending'}</em>
        </div>`;
      }).join('') || '<p class="note">Nothing is reserved yet. Open times show on the Reserve tab.</p>') +
      '<p class="note">Pending means a park manager has not decided yet. Those times can still be requested by someone else until approved.</p>';
  },

  requests: () => {
    const m = RES.filter(r => r.uid == st.user.id).slice().reverse();
    return head('Parks') + tabs('requests') +
      (m.length
        ? m.map(r => `<div class="row">
            <div><b>${esc(r.fac)}</b><span>${r.pname ? esc(r.pname) + ' · ' : ''}${esc(r.date)}, ${rng(r)}${cxInfo(r)}</span>${(r.status == 'Pending approval' || r.status == 'Approved') && upc(r) ? `<br><button class="mini" data-act="rcx" data-id="${esc(r.id)}">Cancel reservation</button>` : ''}</div>
            ${tag(r.status)}
          </div>`).join('')
        : '<p class="note">No requests yet. Use the Reserve tab to book a facility.</p>') +
      '<p class="note">The manager of that park reviews each request.</p>';
  },

  report: () => head('Report a hazard', backH()) + `
    <div id="map2" class="map md"></div>
    <p class="note">Tap the map to place the pin. Default is your GPS location.</p>
    <form data-f="hz">
      <label>Photo<input type="file" name="photo" accept="image/*" capture="environment"></label>
      <label>Category<select name="cat">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
      <label>Describe the hazard<textarea name="desc" rows="3" required maxlength="300"></textarea></label>
      <button class="btn">Submit for review</button>
    </form>
    <p class="note">Your report raises the risk level of that area right away. A responder, park manager or admin then verifies it, and the area recovers once it is fixed.</p>
    <h2>Your reports</h2>
    <div id="mine"></div>`,

  contacts: () => head('Emergency contacts') + `
    <div id="ctlist"></div>
    <h2>Add a contact</h2>
    <label>Search by name<input id="ctq" type="search" placeholder="Type at least 2 letters" autocomplete="off"></label>
    <div id="ctres"></div>
    <p class="note">They must have a TANGLAW account and accept your request. Once they do, they receive your alerts and you can see each other on the map while you are both online and sharing location.</p>` +
    (st.links.length ? `<a class="btn ghost" href="#/link/${esc(st.links.at(-1).id)}">Preview what a contact receives</a>` : ''),

  link: () => head('Secure expiring link', '#/contacts') + `
    <div id="map2" class="map sm"></div>
    <div id="lkbox"><p class="note">Loading…</p></div>`,

  settings: () => head('Settings') + `
    <div class="row">
      <div><b>${esc(st.user.name)}</b><span>${LABEL[role()]} · ${esc(st.user.email)}</span></div>
    </div>
    <label>Language / Wika
      <select name="lang">
        <option value="en" ${st.lang != 'fil' ? 'selected' : ''}>English</option>
        <option value="fil" ${st.lang == 'fil' ? 'selected' : ''}>Filipino</option>
      </select>
    </label>` +
    (role() == 'citizen' ? `<label>Check-in prompt after staying in a High Risk zone
      <select name="lim">
        ${[3, 5, 10].map(n => `<option value="${n}" ${(st.lim || 5) == n ? 'selected' : ''}>${n} minutes</option>`).join('')}
      </select>
    </label>` : '') +
    (role() != 'admin' ? `<label class="chk">
        <input type="checkbox" data-act="share" ${st.share !== false ? 'checked' : ''}>
        <span>Share my live location with barangay officials<br><small>Only while the app is open. Not saved as a trail. Also counts anonymously toward crowd levels.${
          role() == 'manager' ? ' Other park managers see you on their map.'
          : role() == 'citizen' ? ' Contacts who accepted you see you on their map.' : ''
        }</small></span>
      </label>` : '') +
    (role() == 'citizen' ? `<label class="chk">
        <input type="checkbox" data-act="demo" ${st.demo ? 'checked' : ''}>
        <span>Demo mode<br><small>Check-in after 10 s instead of your chosen time. Links expire after 1 min.</small></span>
      </label>
      <label class="chk">
        <input type="checkbox" data-act="force" ${st.force ? 'checked' : ''}>
        <span>Simulate High Risk at my location<br><small>Lets you test the check-in without walking anywhere.</small></span>
      </label>
      <label class="chk">
        <input type="checkbox" data-act="crowdSim" ${st.crowdSim ? 'checked' : ''}>
        <span>Simulate a crowd at my location<br><small>Adds about 10 people here. A crowd makes the area safer.</small></span>
      </label>
      <label class="chk">
        <input type="checkbox" data-act="respSim" ${st.respSim ? 'checked' : ''}>
        <span>Simulate a responder nearby<br><small>Adds an on-duty responder about 55 m away. Together with a crowd the effect is stronger.</small></span>
      </label>` : '') + `
    <label class="chk">
      <input type="checkbox" data-act="simRisk" ${st.simRisk !== false ? 'checked' : ''}>
      <span>Show simulated risk areas<br><small>Prototype data: random alleyways, poorly lit streets and similar spots that raise the risk level. Everywhere else stays Low.</small></span>
    </label>
    <button class="btn ghost" data-act="reseed">Reshuffle simulated areas</button>
    <p class="note">Location is used only while the app is open and is not saved as a trail.</p>
    <button class="btn ghost" data-act="logout">Log out</button>
    <button class="btn ghost" data-act="reset">Reset all data</button>`
};

/* ---------- Map: Leaflet + live GPS + irregular risk zones ---------- */
let M = null, ML = null, RL = null, follow = true, mapSig = '', rkey = '',
    CFG = {}, hubData = [], hubSig = '', RES = [], pinLL = null,
    PEOPLE = [], pplSig = '', adminF = 'all', fitted = false, LK = null, lastLk = 0,
    PARKS = [], parkSig = '', MGR = [], mgrSig = '', NEAR = [], nearSig = '',
    RSP = [], rspSig = '', TLOG = [], hubTab = 'inc', hubHtml = '', dutyHtml = '',
    chTab = 'resp', chSigs = {}, chInit = {}, selPark = '', rvPark = '';

const CHS = { mgr: [], resp: [] };   // chat messages per channel

const ZC = ['', '#f4cf72', '#f1938f'];   // medium / high fills (Low is left untinted, so index 0 is unused)

/* Maps that show the risk layer (every role's home map) and how far out they can zoom */
const MINZ = { home: 16, hub: 15, pmap: 15, admin: 14 };
const hasRisk = () => !!MINZ[route()];

function tiles() {
  const k = CFG.mapKey, s0 = CFG.style,
        free = () => L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap © CARTO'
        });

  if (!k || CFG.bad) return free();

  const t = CFG.provider == 'mapbox'
    ? L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/${s0 || 'light-v11'}/tiles/512/{z}/{x}/{y}@2x?access_token=${k}`, {
        tileSize: 512, zoomOffset: -1, maxZoom: 19, attribution: '© Mapbox © OpenStreetMap'
      })
    : L.tileLayer(`https://api.maptiler.com/maps/${s0 || 'streets-v2'}/{z}/{x}/{y}.png?key=${k}`, {
        maxZoom: 19, attribution: '© MapTiler © OpenStreetMap contributors'
      });

  let n = 0;
  t.on('tileerror', () => {
    if (++n == 3 && M) {
      CFG.bad = 1;
      M.removeLayer(t);
      free().addTo(M);
      toast('Map provider rejected the key or style. Showing the free map. Check MAP_API_KEY, MAP_STYLE and allowed domains.');
    }
  });
  return t;
}

function killMap() {
  if (M) { M.remove(); M = null; ML = null; RL = null; }
  mapSig = '';
  rkey = '';
}

function initMap() {
  const el = $('#map') || $('#map2');
  if (!el) return;
  const r = route();

  if (typeof L === 'undefined') {
    el.innerHTML = '<p class="note pad">Map could not load. Check your connection.</p>';
    return;
  }

  M = L.map(el, { zoomControl: false, zoomSnap: .5, minZoom: MINZ[r] || 3 })
       .setView([pos.lat, pos.lng], el.id == 'map' && r != 'hazards' ? 17 : 16);
  tiles().addTo(M);

  // One opacity for the whole risk layer: no seams or double-tinting.
  const pn = M.createPane('rzone');
  pn.style.zIndex = 250;
  pn.style.opacity = .32;
  pn.style.pointerEvents = 'none';

  RL = L.layerGroup().addTo(M);
  ML = L.layerGroup().addTo(M);

  follow = !['report', 'admin', 'hazards', 'pmap', 'reserve'].includes(r);
  M.on('dragstart', () => follow = false);
  M.on('moveend', () => { if (hasRisk()) riskLayer(); });
  if (r == 'report' || r == 'pmap') M.on('click', e => { pinLL = e.latlng; drawMap(); });
  addRecenter();

  setTimeout(() => M && M.invalidateSize(), 60);
  drawMap();
}

// Contour the continuous risk field into filled, irregular polygons (marching squares).
function riskLayer() {
  if (!M || !RL) return;

  const c = M.getCenter(), S = .003,
        cl = Math.round(c.lat / S) * S,
        co = Math.round(c.lng / S) * S,
        h = viewH();

  const key = [
    cl.toFixed(4), co.toFixed(4), Math.round(h * 4),
    hzSigA(), sgSig, svSig,
    st.force ? pos.lat.toFixed(4) + pos.lng.toFixed(4) : '',
    st.crowdSim ? pos.lat.toFixed(4) + pos.lng.toFixed(4) : '',
    st.respSim ? pos.lat.toFixed(4) + pos.lng.toFixed(4) : '',
    simOn(), st.simSeed || 1
  ].join('|');
  if (key == rkey) return;
  rkey = key;
  RL.clearLayers();

  const N = 62, G = .00018, la0 = cl - N * G, lo0 = co - N * G,
        cs = crowdSrc(), rs = respSrc(), V = [];
  for (let i = 0; i <= 2 * N; i++) {
    V[i] = [];
    for (let j = 0; j <= 2 * N; j++) V[i][j] = risk(la0 + i * G, lo0 + j * G, h, cs, rs).r;
  }

  const P = { pane: 'rzone', interactive: false, weight: 1, fillOpacity: 1, opacity: 1 };

  // Low is the default and is left untinted, so the map shows its own colours there.
  // Only Medium and High are drawn as overlays.

  [[.25, 1], [.55, 2]].forEach(([t, k]) => {
    const polys = [];
    for (let i = 0; i < 2 * N; i++) for (let j = 0; j < 2 * N; j++) {
      const q = [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]], ring = [];
      for (let a = 0; a < 4; a++) {
        const [ia, ja] = q[a], [ib, jb] = q[(a + 1) % 4],
              va = V[ia][ja], vb = V[ib][jb],
              pa = [la0 + ia * G, lo0 + ja * G],
              pb = [la0 + ib * G, lo0 + jb * G];
        if (va >= t) ring.push(pa);
        if ((va >= t) != (vb >= t)) {
          const f = (t - va) / (vb - va);
          ring.push([pa[0] + f * (pb[0] - pa[0]), pa[1] + f * (pb[1] - pa[1])]);
        }
      }
      if (ring.length > 2) polys.push([ring]);
    }
    if (polys.length) L.polygon(polys, { ...P, color: ZC[k], fillColor: ZC[k] }).addTo(RL);
  });

  simMarkers(la0, lo0, 2 * N * G);
}

/* Small dots on the known risk areas, so the colour on the map has a name (tap or hover for the type) */
function simMarkers(la0, lo0, span) {
  if (!simOn()) return;
  for (let i = Math.floor(la0 / SC); i <= Math.floor((la0 + span) / SC); i++)
    for (let j = Math.floor(lo0 / SC); j <= Math.floor((lo0 + span) / SC); j++) {
      const z = simCell(i, j);
      if (z)
        L.circleMarker([z.lat, z.lng], { radius: 4, color: '#fff', weight: 1.5, fillColor: '#c65a55', fillOpacity: .9 })
         .bindTooltip(z.kind + (z.kind == 'Alleyway' ? ' · riskier after dark' : '')).addTo(RL);
    }
}

const hzSigA = () => HZA.map(h => h.id + h.status).join();

/* Recenter button on every map (top right) */
function addRecenter() {
  const Ctl = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const b = L.DomUtil.create('button', 'rc');
      b.type = 'button';
      b.title = 'Recenter map';
      b.setAttribute('aria-label', 'Recenter map');
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
      L.DomEvent.disableClickPropagation(b);
      L.DomEvent.on(b, 'click', recenter);
      return b;
    }
  });
  M.addControl(new Ctl());
}

function pickPark(id) {
  selPark = id;
  const sel = document.querySelector('[name=park]'), p = PARKS.find(x => x.id == id);
  if (sel) sel.value = id;
  if (p && M) M.setView([p.lat, p.lng], Math.max(M.getZoom(), 16));
  mapSig = '';
  drawMap();
  drawAvail();
}

function recenter() {
  if (!M) return;
  const r = route();

  // Admin has no position of their own: fit everyone instead.
  if (r == 'admin') {
    const b = L.latLngBounds(PEOPLE.map(p => [p.lat, p.lng]).concat(hubData.map(h => [h.lat, h.lng])));
    if (b.isValid()) M.fitBounds(b.pad(.3), { maxZoom: 17 });
    else toast('Nobody is online with location sharing on.');
    return;
  }

  const P = r == 'link' && LK && !LK.gone ? LK : pos;
  if (P === pos && !pos.live) toast(gpsLabel());

  M.setView([P.lat, P.lng], Math.max(M.getZoom(), 16));
  follow = !['report', 'hazards', 'pmap', 'reserve'].includes(r);   // keep following only where that is the norm
  mapSig = '';
  drawMap();
}

const mine = () => PARKS.filter(p => p.mid == st.user.id);

/* A reservation is mine to decide if it is for one of my parks (older requests with no park: any manager) */
const owns = r => !r.pid || !PARKS.some(p => p.id == r.pid) || PARKS.some(p => p.id == r.pid && p.mid == st.user.id);

/* Pending or approved hazards within a managed park's area plus 250 m, nearest first */
function hzNearParks() {
  const ps = mine();
  return HZ.filter(h => h.status == 'Approved' || h.status == 'Pending')
    .map(h => {
      let b = null;
      ps.forEach(p => {
        const d = km(p.lat, p.lng, h.lat, h.lng) * 1000;
        if (d <= p.r + 250 && (!b || d < b.d)) b = { h, p, d };
      });
      return b;
    })
    .filter(Boolean)
    .sort((a, b) => a.d - b.d);
}

/* Permanent map label */
const lbl = c => ({ permanent: true, direction: 'top', offset: [0, -8], className: 'lbl' + (c ? ' ' + c : '') });

function drawMap() {
  if (!M) return;

  const r = route(), big = !!$('#map'), i = st.incident,
        P = r == 'link' && LK && !LK.gone ? LK : pos,
        adm = r == 'admin', pm = r == 'pmap', mgr = role() == 'manager',
        near = mgr ? new Set(hzNearParks().map(x => x.h.id)) : null;

  const k = [
    P.lat.toFixed(5), P.lng.toFixed(5), pos.lat.toFixed(5), pos.lng.toFixed(5), pos.acc,
    HZ.map(h => h.id + h.status).join(),
    pinLL ? pinLL.lat + ',' + pinLL.lng : '',
    i ? i.id + i.status : '',
    hubSig, pplSig, adminF, parkSig, mgrSig, nearSig, rspSig, selPark
  ].join('|');

  if (hasRisk()) riskLayer();

  if (adm && !fitted && PEOPLE.length) {
    fitted = true;
    const b = L.latLngBounds(PEOPLE.map(p => [p.lat, p.lng]));
    if (b.isValid()) M.fitBounds(b.pad(.3), { maxZoom: 17 });
  }

  if (r == 'reserve' && !fitted && PARKS.length) {
    fitted = true;
    const b = L.latLngBounds(PARKS.map(p => [p.lat, p.lng]).concat(pos.live ? [[pos.lat, pos.lng]] : []));
    if (b.isValid()) M.fitBounds(b.pad(.3), { maxZoom: 17 });
  }

  // Park manager map: once, frame their parks together with their own position.
  if (pm && !fitted && PARKS.length) {
    fitted = true;
    const ps = mine().length ? mine() : PARKS,
          b = L.latLngBounds(ps.map(p => [p.lat, p.lng]).concat([[pos.lat, pos.lng]]));
    if (b.isValid()) M.fitBounds(b.pad(.3), { maxZoom: 17 });
  }

  if (follow && k != mapSig) M.setView([P.lat, P.lng], M.getZoom());
  if (k == mapSig) return;
  mapSig = k;
  ML.clearLayers();

  /* Parks: manager map, manager's hazard report map, admin map */
  if (pm || adm || r == 'home' || r == 'reserve' || (r == 'report' && mgr))
    PARKS.forEach(p => {
      const own = p.mid == st.user.id, c = L.circle([p.lat, p.lng], {
          radius: p.r, color: RC.manager, weight: own || p.id == selPark && r == 'reserve' ? 2 : 1, dashArray: '6 6',
          fillColor: RC.manager, fillOpacity: own || p.id == selPark && r == 'reserve' ? .12 : .05, interactive: false
        });
      if (r != 'reserve')
        c.bindTooltip(esc(p.name) + (own || r == 'home' ? '' : ' · ' + esc(p.mname || 'manager')),
          { permanent: true, direction: 'center', className: 'lbl pk' });
      c.addTo(ML);
    });

  // Reserve screen: one tappable pin per park; the chosen one is larger and darker
  if (r == 'reserve')
    PARKS.forEach(p => L.circleMarker([p.lat, p.lng], {
        radius: p.id == selPark ? 11 : 8, color: '#fff', weight: 3,
        fillColor: p.id == selPark ? '#3d5c9c' : RC.manager, fillOpacity: 1
      })
      .on('click', () => pickPark(p.id))
      .bindTooltip(esc(p.name), lbl('mg')).addTo(ML));

  if (!adm) {
    if (pos.acc && r != 'link')
      L.circle([pos.lat, pos.lng], { radius: pos.acc, stroke: false, fillColor: '#e98a6b', fillOpacity: .15, interactive: false }).addTo(ML);

    // You
    L.circleMarker([pos.lat, pos.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#e98a6b', fillOpacity: 1 })
      .bindTooltip('You', lbl()).addTo(ML);

    // The contact who sent the alert
    if (r == 'link' && LK && !LK.gone)
      L.circleMarker([LK.lat, LK.lng], { radius: 9, color: '#fff', weight: 3, fillColor: CC, fillOpacity: 1 })
        .bindTooltip(esc(LK.name), lbl('ct')).addTo(ML);
  }

  // Close contacts (accepted, online and sharing)
  if (r == 'home')
    NEAR.forEach(n => L.circleMarker([n.lat, n.lng], { radius: 8, color: '#fff', weight: 3, fillColor: CC, fillOpacity: 1 })
      .bindTooltip(esc(n.name), lbl('ct')).addTo(ML));

  // Other responders on duty: named, so you can tell who is where
  if (r == 'hub')
    RSP.filter(x => x.id != st.user.id)
      .forEach(x => L.circleMarker([x.lat, x.lng], { radius: 8, color: '#fff', weight: 3, fillColor: RC.responder, fillOpacity: 1 })
        .bindTooltip(esc(x.name) + ' · Responder', lbl('rs')).addTo(ML));

  // Other park managers
  if (pm)
    MGR.filter(m => m.id != st.user.id)
      .forEach(m => L.circleMarker([m.lat, m.lng], { radius: 8, color: '#fff', weight: 3, fillColor: RC.manager, fillOpacity: 1 })
        .bindTooltip(esc(m.name) + ' · Park manager', lbl('mg')).addTo(ML));

  if (big && ['home', 'hub', 'admin', 'pmap'].includes(r))
    HZ.filter(h => h.status == 'Approved' ||
                   (h.status == 'Pending' && (h.uid == st.user.id || role() == 'responder' || (near && near.has(h.id)))))
      .forEach(h => {
        const p = h.status == 'Pending';
        L.marker([h.lat, h.lng], { icon: L.divIcon({ className: 'hzpin' + (p ? ' pend' : ''), html: p ? '?' : '!', iconSize: [22, 22] }) })
         .bindTooltip(esc(h.cat) + (p ? ' (pending review)' : '')).addTo(ML);
      });

  if (big && ['home', 'hub', 'admin', 'pmap'].includes(r))
    SV.forEach(s => L.circleMarker([s.lat, s.lng], { radius: 6, color: '#fff', weight: 2, fillColor: s.kind == 'Well-lit area' ? '#e0b430' : '#3d5c9c', fillOpacity: 1 })
      .bindTooltip(esc(s.name) + ' · ' + s.kind).addTo(ML));

  if (adm)
    PEOPLE.filter(p => adminF == 'all' || p.role == adminF)
      .forEach(p => L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 2, fillColor: RC[p.role] || '#999', fillOpacity: 1 })
        .bindTooltip(esc(p.name) + ' · ' + LABEL[p.role], p.role == 'citizen' ? {} : lbl(p.role == 'responder' ? 'rs' : 'mg')).addTo(ML));

  if (pinLL && (r == 'report' || pm))
    L.marker([pinLL.lat, pinLL.lng], { icon: L.divIcon({ className: 'hzpin sosp', html: pm ? 'Park' : 'Pin', iconSize: [34, 22] }) }).addTo(ML);

  if (big && ['hub', 'admin'].includes(r))
    hubData.forEach(h => L.marker([h.lat, h.lng], { icon: L.divIcon({ className: 'hzpin sosp', html: 'SOS', iconSize: [36, 22] }) })
      .bindTooltip(esc(h.type)).addTo(ML));

  if (i && role() == 'citizen')
    L.marker([i.lat, i.lng], { icon: L.divIcon({ className: 'hzpin sosp', html: 'SOS', iconSize: [36, 22] }) }).addTo(ML);
}

/* ---------- Render ---------- */
function render() {
  document.documentElement.lang = st.lang == 'fil' ? 'fil' : 'en';
  sig = '';
  hubSig = '';
  hubHtml = '';
  dutyHtml = '';
  killMap();

  if (!st.in) {
    app.innerHTML = authView();
    return;
  }

  if (role() == 'citizen' && st.suspended) {
    app.innerHTML = suspView();
    return;
  }

  startGPS();

  const r = route(), arg = (location.hash || '').split('/')[2];
  pinLL = null;
  fitted = false;

  app.innerHTML = V[r](arg) + (DK.includes(r) ? dock(r) : '');
  if ($('#map') || $('#map2')) initMap();

  if (['home', 'hub', 'admin', 'pmap'].includes(r)) drawTracker();
  if (r == 'pmap') { drawPM(); syncMgr().catch(() => {}); }
  if (r == 'chat') { drawChat(); syncChat().catch(() => {}); }
  if (r == 'hub') { drawDuty(); renderHub(); syncHub().catch(() => {}); }
  if (r == 'admin') { drawAdmin(); syncHub().catch(() => {}); }
  if (r == 'reserve' || r == 'schedule') drawAvail();
  if (r == 'report') drawMine();
  if (r == 'contacts') drawContacts();
  if (r == 'link') loadLink();

  badges();
  syncData().catch(() => {});
  if (role() == 'admin' || role() == 'manager') syncAdmin().catch(() => {});
  sync();
}

function drawTracker() {
  drawMap();

  const g = $('#gps');
  if (g) g.textContent = gpsLabel();
  if (!$('#zone')) return;

  const h = viewH(),
        s = [
          pos.lat.toFixed(5), pos.lng.toFixed(5), hourOv,
          st.force, st.crowdSim, st.respSim, hzSigA(), sgSig, simOn(), st.simSeed,
          Math.floor(Date.now() / 6e4)
        ].join('|');

  if (s == sig) return;
  sig = s;

  const a = risk(pos.lat, pos.lng, h),
        bar = (k, v, c) => `<div><span>${k}</span><div class="bar"><i style="width:${Math.round(Math.min(1, v) * 100)}%${c ? ';background:' + c : ''}"></i></div></div>`,
        cw = a.people >= 8 ? 'Crowded' : a.people >= 4 ? 'Busy' : 'Quiet';

  $('#zone').innerHTML = `Current zone: <b>${LV[a.lvl]} risk</b>, safety ${a.score}/100${
    hourOv != null ? ` <small>(preview: ${tlabel(h)})</small>` : ''
  }${a.nz && a.sm > .08 ? `<br><small>Known risk area nearby: ${a.nz.kind.toLowerCase()}.</small>` : ''
  }${a.raw > a.r ? '<br><small>A crowd or responder nearby is lowering the risk here.</small>' : ''}`;

  $('#why').innerHTML =
    bar('Hazard reports nearby', a.hz / .55) +
    bar('Known risk areas', a.sm / .6) +
    `<div><span>Area type</span><em>${a.nz && a.sm > .04 ? a.nz.kind : 'Ordinary street'}</em></div>` +
    bar('Recent incidents', a.ic / .5) +
    bar('Crowd nearby (adds safety)', a.cr / .4, 'var(--lo)') +
    bar('Responder nearby (adds safety)', a.rp / .3, 'var(--lo)') +
    bar('Police, hospital or barangay hall nearby (adds safety)', a.es / .2, 'var(--lo)') +
    bar('Street lighting after dark', a.ld / .12) +
    `<div><span>Nearest emergency service</span><em>${a.ns && a.ns.d < 1000 ? esc(a.ns.name) : 'None nearby'}</em></div>` +
    `<div><span>People within 100 m</span><em>${a.people} · ${cw}</em></div>` +
    `<div><span>Nearest on-duty responder</span><em>${a.rd != null && a.rd < 600 ? 'about ' + Math.round(a.rd / 10) * 10 + ' m' : 'None nearby'}</em></div>` +
    `<div><span>Time of day</span><em>${tlabel(h)}${a.dk > 0 ? ' · raises risk' : ''}</em></div>` +
    `<div><span>Hazard reports within 150 m</span><em>${a.nh}</em></div>`;
}

/* ---------- Reservation availability ---------- */
const mm = n => f12(`${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`),
      hhmm = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

const occ = (fac, date, pid) => RES
  .filter(r => r.fac == fac && r.date == date && (r.pid || '') == (pid || '') && r.status != 'Rejected' && r.status != 'Cancelled')
  .sort((x, y) => x.start.localeCompare(y.start));

function freeGaps(rows) {
  const O = toMin(OPEN), C = toMin(CLOSE);
  let cur = O;
  const free = [];
  rows.forEach(r => {
    const s = toMin(r.start);
    if (s > cur) free.push([cur, s]);
    cur = Math.max(cur, toMin(r.end));
  });
  if (cur < C) free.push([cur, C]);
  return free;
}

// Is the chosen window bookable? Returns a verdict plus the closest free windows of the same length.
function slotState(fac, date, a, b, pid) {
  const O = toMin(OPEN), C = toMin(CLOSE), rows = occ(fac, date, pid),
        now = new Date(), nm = now.getHours() * 60 + now.getMinutes(),
        isToday = date == today();

  if (!date || isNaN(a) || isNaN(b))
    return { ok: false, kind: 'warn', title: 'Pick your time', msg: 'Choose a date, start time and end time.' };
  if (b <= a)
    return { ok: false, kind: 'bad', title: 'Check your time', msg: 'The end time must be after the start time.' };
  if (b - a < 30)
    return { ok: false, kind: 'bad', title: 'Too short', msg: 'The minimum booking is 30 minutes.' };
  if (a < O || b > C)
    return { ok: false, kind: 'bad', title: 'Outside park hours', msg: `The park is open ${f12(OPEN)} to ${f12(CLOSE)}.` };
  if (isToday && a < nm)
    return { ok: false, kind: 'bad', title: 'Time has passed', msg: `${mm(a)} has already passed today. Start later than now.` };

  const pkc = PARKS.find(x => x.id == pid);
  if (pkc && pkc.closed && date == today())
    return { ok: false, kind: 'bad', title: 'Park closed', msg: `${pkc.name} is temporarily closed today. Pick another day.` };

  const bad = rows.find(r => a < toMin(r.end) && b > toMin(r.start));
  if (!bad)
    return { ok: true, kind: 'ok', title: 'Available', msg: `${mm(a)}–${mm(b)} is free on ${date}.` };

  const d = b - a, from = isToday ? Math.max(O, Math.ceil(nm / 15) * 15) : O;
  const sug = freeGaps(rows)
    .map(([x, y]) => [Math.max(x, from), y])
    .filter(([x, y]) => y - x >= d)
    .map(([x, y]) => {
      const s = Math.min(Math.max(a, x), y - d);
      return [s, s + d];
    })
    .sort((p, q) => Math.abs(p[0] - a) - Math.abs(q[0] - a))
    .slice(0, 2);

  return {
    ok: false, kind: 'bad', title: 'Not available',
    msg: `Overlaps ${rng(bad)}, which is ${bad.status == 'Approved' ? 'already reserved' : 'pending approval'}.`,
    sug
  };
}

function availHTML(fac, date, a, b, pid, list = true) {
  const O = toMin(OPEN), C = toMin(CLOSE), T = C - O, rows = occ(fac, date, pid),
        pc = (x, y) => `left:${(x - O) / T * 100}%;width:${Math.max(0, y - x) / T * 100}%`,
        free = freeGaps(rows),
        chk = a != null && b != null && !isNaN(a) && !isNaN(b) && b > a,
        s = chk ? slotState(fac, date, a, b, pid) : null;

  return `<div class="avbar">
      ${rows.map(r => `<i class="sg ${r.status == 'Approved' ? 'rs' : 'pd'}" style="${pc(toMin(r.start), toMin(r.end))}"></i>`).join('')}
      ${chk ? `<i class="sg sel ${s.ok ? '' : 'bad'}" style="${pc(Math.max(a, O), Math.min(b, C))}"></i>` : ''}
    </div>
    <div class="axis"><span>6 AM</span><span>10 AM</span><span>2 PM</span><span>6 PM</span><span>10 PM</span></div>
    <div class="legend">
      <span><i style="background:var(--lo)"></i>Available</span>
      <span><i style="background:var(--mid)"></i>Pending</span>
      <span><i style="background:var(--hi)"></i>Reserved</span>
      ${chk ? '<span><i class="selkey"></i>Your time</span>' : ''}
    </div>
    <p><b>Open windows:</b> ${free.length ? free.map(([x, y]) => mm(x) + '–' + mm(y)).join(', ') : 'Fully booked'}</p>
    ${!list ? '<a class="mini" href="#/reserved">See everything reserved</a>' : rows.map(r => `<div class="row">
        <span>${rng(r)}${r.by ? ' · ' + esc(r.by) : ''}</span>
        <em class="tag ${r.status == 'Approved' ? 'no' : 'wait'}">${r.status == 'Approved' ? 'Reserved' : 'Pending'}</em>
      </div>`).join('')}`;
}

function drawAvail() {
  const el = $('#avail');
  if (!el) return;

  const q = n => document.querySelector(`[name=${n}]`)?.value;
  if (!q('date')) return void (el.innerHTML = '<p class="note">Choose a date to see availability.</p>');

  const a = q('start') ? toMin(q('start')) : null,
        b = q('end') ? toMin(q('end')) : null;
  el.innerHTML = availHTML(q('fac'), q('date'), a, b, q('park'), !$('[data-f=res]'));

  const vs = $('#vstat');
  if (!vs) return;

  const s = slotState(q('fac'), q('date'), a ?? NaN, b ?? NaN, q('park'));
  vs.innerHTML = `<div class="vs ${s.kind}" role="status">
      <b>${s.ok ? '✓' : s.kind == 'bad' ? '✕' : '!'} ${s.title}</b>
      <span>${s.msg}</span>
      ${(s.sug || []).length ? `<span>Try instead: ${
        s.sug.map(([x, y]) => `<button type="button" class="mini go" data-act="slot" data-s="${hhmm(x)}" data-e="${hhmm(y)}">${mm(x)}–${mm(y)}</button>`).join('')
      }</span>` : ''}
    </div>`;

  const bt = document.querySelector('[data-f=res] .btn');
  if (bt) bt.disabled = !s.ok;
}

function drawMine() {
  const el = $('#mine');
  if (!el) return;

  const m = HZ.filter(h => h.uid == st.user.id).slice().reverse();
  el.innerHTML = m.length
    ? m.map(h => `<div class="row">
        ${h.photo ? `<img class="thumb" src="/api/hazards/${esc(h.id)}/photo" alt="">` : ''}
        <div><b>${esc(h.cat)}</b><span>${esc(h.desc)}</span></div>
        ${tag(h.status == 'Pending' ? 'Pending review' : h.status)}
      </div>`).join('')
    : '<p class="note">No reports yet.</p>';
}

/* ---------- Server sync ---------- */
const api = async (p, b, m) => {
  const r = await fetch('/api/' + p, b
    ? {
        method: m || 'POST',
        headers: { 'content-type': 'application/json', 'x-code': st.user?.code || '' },
        body: JSON.stringify(b)
      }
    : { headers: { 'x-code': st.user?.code || '' } });
  if (!r.ok) throw new Error(r.status);
  return r.json();
};

// Haversine distance in km.
const km = (a, b, c, d) => {
  const r = x => x * Math.PI / 180,
        h = Math.sin(r(c - a) / 2) ** 2 +
            Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

const ago = t => {
  const m = Math.round((Date.now() - t) / 6e4);
  return m < 1 ? 'just now' : m + ' min ago';
};

let hzSig = '', resSig = '', sgSig = '', svSig = '', busy = 0, lastPres = 0,
    CT = [], AL = [], ctSig = '', seenAl = new Set();

/* Parks that managers pinned. Everyone reads them: citizens pick one to reserve, managers see their own. */
async function syncParks() {
  const ps = await api('parks'),
        pg = ps.map(p => [p.id, p.name, p.r, p.lat, p.lng, p.mid, p.closed || ''].join()).join('|');
  if (pg == parkSig) return;

  PARKS = ps;
  parkSig = pg;

  const r = route();
  if (r == 'reserve' || r == 'reserved' || r == 'schedule' || r == 'manage') render();
  else { if (r == 'pmap') drawPM(); drawMap(); }
}

async function syncData() {
  const r0 = route(),
        h = await api('hazards'),
        hs = JSON.stringify(h.map(x => [x.id, x.status]));

  if (hs != hzSig) {
    HZ = h;
    HZA = h.filter(x => x.status == 'Approved' || x.status == 'Pending');
    hzSig = hs;
    sig = '';
    if (r0 == 'hub') renderHub();
    else if (r0 == 'report') drawMap(), drawMine();
    else if (r0 == 'a-hz' || r0 == 'console') render();
    else { drawMap(); if (r0 == 'pmap') drawPM(); }
  }

  await syncParks().catch(() => {});

  const sv = await api('services').catch(() => SV), ss = JSON.stringify(sv);
  if (ss != svSig) {
    SV = sv;
    svSig = ss;
    sig = '';
    if (r0 == 'a-places') render();
    else { drawMap(); if (hasRisk()) drawTracker(); }
  }

  const g = await api('signals'), gs = JSON.stringify(g);
  if (gs != sgSig) {
    SIG = { ...g, resp: g.resp || [] };
    sgSig = gs;
    sig = '';
    if (hasRisk()) drawTracker();
  }

  // Managers need reservations everywhere (for the Requests badge), others only on their own screens.
  if (role() == 'manager' || role() == 'citizen' || ['manage', 'schedule', 'admin', 'console', 'a-res'].includes(r0)) {
    const rr = await api('reservations'),
          rs = JSON.stringify(rr.map(x => [x.id, x.status]));
    if (rs != resSig) {
      RES = rr;
      resSig = rs;
      notifyRes(rr);
      if (r0 == 'requests' || r0 == 'reserved' || r0 == 'manage' || r0 == 'a-res' || r0 == 'console') render();
      else if (r0 == 'admin') drawAdmin();
      else if (r0 == 'reserve' || r0 == 'schedule') drawAvail();
    }
  }

  badges();
}

/* In-app notice when a reservation you made is approved, declined or cancelled by someone else */
function notifyRes(rr) {
  if (role() != 'citizen') return;
  const mine = rr.filter(r => r.uid == st.user.id);
  if (!st.resSeen) {
    st.resSeen = Object.fromEntries(mine.map(r => [r.id, r.status]));
    save();
    return;
  }
  for (const r of mine) {
    const was = st.resSeen[r.id];
    if (was && was != r.status && r.cancelBy != 'citizen') {
      const what = `${r.fac}, ${r.date}`;
      if (r.status == 'Approved') toast('Reservation approved: ' + what);
      else if (r.status == 'Rejected') toast('Reservation declined: ' + what);
      else if (r.status == 'Cancelled') toast('Reservation cancelled: ' + what + (r.cancelReason ? ` (${r.cancelReason})` : ''));
    }
    st.resSeen[r.id] = r.status;
  }
  save();
}

function presence() {
  if (role() == 'admin' || st.share === false || !pos.live || Date.now() - lastPres < 8000) return;
  lastPres = Date.now();
  api('presence', { id: st.user.id, name: st.user.name, lat: pos.lat, lng: pos.lng }).catch(() => {});
}

async function sync() {
  if (!st.in || busy) return;
  busy = 1;
  try {
    await syncData().catch(() => {});
    presence();

    const R = role();

    if (R == 'responder' || R == 'admin') await syncHub();

    if (R == 'admin') {
      PEOPLE = await api('people');
      TLOG = await api('timelogs').catch(() => TLOG);
      pplSig = PEOPLE.map(p => p.id + p.lat.toFixed(4) + p.lng.toFixed(4)).join();
      drawAdmin();
    }

    if (R == 'manager') await syncMgr().catch(() => {});
    if (R == 'admin' || R == 'manager') await syncAdmin().catch(() => {});
    if (R != 'citizen') await syncChat().catch(() => {});

    if (R == 'citizen') {
      // Contacts first, so a failing incident call can never block them.
      await regUser();
      await syncContacts().catch(() => {});

      const i = st.incident;
      if (i) {
        // Offline-first: flush the queued report as soon as we're back online.
        if (!i.sent) {
          await api('incidents', { id: i.id, type: i.type, note: i.note, lat: i.lat, lng: i.lng, by: st.user.name });
          i.sent = true;
          save();
          if (route() == 'incident') render();
        }
        const r = await api('incidents/' + i.id);
        if (r.status != i.status || r.responder?.id != i.responder?.id) {
          const ch = r.status != i.status;
          i.status = r.status;
          i.responder = r.responder;
          save();
          if (ch) toast(`Incident update: ${STEPS[i.status][0]}`);
          if (['home', 'incident'].includes(route())) render();
        }
      }

      if (pos.live)
        st.links.filter(l => l.exp > Date.now())
                .forEach(l => api('alerts/' + l.id + '/loc', { lat: pos.lat, lng: pos.lng }, 'PATCH').catch(() => {}));

    }
  } catch {} finally {
    busy = 0;
  }
}

setInterval(sync, 3000);

async function syncHub() {
  const u = st.user;
  if (role() == 'responder' && st.duty && pos.live)
    await api('responders', { id: u.id, name: u.name, lat: pos.lat, lng: pos.lng, duty: true });

  hubData = await api('incidents');

  if (role() == 'responder') {
    RSP = await api('responders').catch(() => RSP);
    rspSig = RSP.map(x => x.id + x.lat.toFixed(5) + x.lng.toFixed(5)).join();
  }

  renderHub();
  badges();
}

/* ---- Time in / time out: the on-duty switch. Asks for the account password and is logged on the server. ---- */
const clock = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dt    = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dur   = ms => {
  const m = Math.max(0, Math.floor(ms / 6e4));
  return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
};

const closeOv = () => { ov.hidden = true; ov.innerHTML = ''; };

function openCancel(id) {
  const r = RES.find(x => x.id == id);
  if (!r) return;
  const mgr = role() != 'citizen';
  ov.hidden = false;
  ov.innerHTML = `<div class="sheet">
      <h2>Cancel reservation?</h2>
      <p class="note">${esc(r.fac)} · ${r.pname ? esc(r.pname) + ' · ' : ''}${esc(r.date)}, ${rng(r)}${mgr ? '<br>Booked by ' + esc(r.by || 'a citizen') : ''}</p>
      <form data-f="rcancel">
        <input type="hidden" name="id" value="${esc(r.id)}">
        ${mgr ? `<label>Reason
            <select name="rsn" required>
              <option value="">Choose a reason</option>
              ${MREASONS.map(x => `<option>${x}</option>`).join('')}
            </select></label>
          <label><span id="rnl">Note to the citizen (optional)</span><input name="note" maxlength="200"></label>`
        : `<label>Reason (optional)<textarea name="note" rows="3" maxlength="200" placeholder="Why are you cancelling?"></textarea></label>`}
        <button class="btn sosbtn">Cancel reservation</button>
        <button type="button" class="btn ghost" data-act="ovx">Keep reservation</button>
      </form>
    </div>`;
}

const dutyHTML = () => {
  if (st.duty && !st.dutySince) st.dutySince = Date.now();
  return `<div class="card duty ${st.duty ? 'on' : ''}">
      <b>${st.duty ? 'On duty' : 'Off duty'}</b>
      <span>${st.duty
        ? `Timed in at ${clock(st.dutySince)} · ${dur(Date.now() - st.dutySince)} on shift. Your location is shared so reports go to the nearest responder.`
        : 'Time in to share your location and receive incident routing. Time out when your shift ends.'}</span>
      <button class="btn ${st.duty ? 'ghost' : ''}" data-act="clock">${st.duty ? 'Time out' : 'Time in'}</button>
    </div>`;
};

function drawDuty() {
  const el = $('#duty');
  if (!el) return;
  const h = dutyHTML();
  if (h != dutyHtml) { dutyHtml = h; el.innerHTML = h; }
}

function openClock() {
  ov.hidden = false;
  ov.innerHTML = `<div class="sheet">
      <h2>${st.duty ? 'Time out' : 'Time in'}</h2>
      <p class="note">Enter your account password to ${st.duty ? 'end' : 'start'} your shift.</p>
      <form data-f="clock">
        <input name="pw" type="password" autocomplete="current-password" placeholder="Password" required>
        <button class="btn">${st.duty ? 'Confirm time out' : 'Confirm time in'}</button>
        <button type="button" class="btn ghost" data-act="ovx">Cancel</button>
      </form>
    </div>`;
  setTimeout(() => ov.querySelector('input')?.focus(), 50);
}

/* ---- Responder panel under the map: Incidents | Hazards | Team ---- */
function hubPanelHTML() {
  const me = st.user.id,
        inc = hubData
          .map(i => ({ ...i, d: km(pos.lat, pos.lng, i.lat, i.lng) }))
          .sort((a, b) => (b.responder?.id == me) - (a.responder?.id == me) || a.d - b.d),
        ph = HZ.filter(h => h.status == 'Pending').slice().reverse(),
        ap = HZ.filter(h => h.status == 'Approved').slice().reverse(),
        team = RSP.filter(x => x.id != me)
          .map(x => ({ ...x, d: km(pos.lat, pos.lng, x.lat, x.lng) }))
          .sort((a, b) => a.d - b.d);

  const tabs = `<nav class="tabs">${
    [['inc', 'Incidents', inc.length], ['hz', 'Hazards', ph.length], ['team', 'Team', team.length]]
      .map(([k, l, n]) => `<button type="button" class="${hubTab == k ? 'on' : ''}" data-act="htab" data-id="${esc(k)}">${l}${n ? ` (${n})` : ''}</button>`).join('')
  }</nav>`;

  if (hubTab == 'hz') {
    const hc = (h, x) => `<div class="card">
        ${h.photo ? `<img class="hzimg" src="/api/hazards/${esc(h.id)}/photo" loading="lazy" alt="">` : ''}
        <b>${esc(h.cat)}</b>
        <span>${esc(h.desc)}<br>${esc(h.by || 'Citizen')} · ${km(pos.lat, pos.lng, h.lat, h.lng).toFixed(1)} km away · ${ago(h.created)}</span><br>
        ${x}
        <a class="mini" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}">Navigate</a>
        <button class="mini" data-act="hzf" data-id="${esc(h.id)}">Show on map</button>
      </div>`;
    return tabs + `
      <h2>To review (${ph.length})</h2>
      ${ph.map(h => hc(h, btn('hzs', h.id, 'Approved', 'Approve') + btn('hzs', h.id, 'Rejected', 'Reject'))).join('') || '<p class="note">Nothing to review.</p>'}
      <h2>Active hazards (${ap.length})</h2>
      ${ap.map(h => hc(h, btn('hzs', h.id, 'Fixed', 'Mark fixed'))).join('') || '<p class="note">No active hazards.</p>'}
      <p class="note">Reported hazards raise the risk level around them (half weight until approved) until marked fixed.</p>`;
  }

  if (hubTab == 'team')
    return tabs + (team.length
      ? team.map(x => `<div class="row">
          <div>
            <b>${esc(x.name)}</b>
            <span><i class="dot" style="background:${RC.responder}"></i>On duty · ${x.d.toFixed(1)} km away · seen ${ago(x.ts)}</span>
          </div>
          <div>
            <button class="mini" data-act="rsf" data-id="${esc(x.id)}">Show</button>
            <a class="mini" href="#/chat">Message</a>
          </div>
        </div>`).join('')
      : '<p class="note">No other responders are on duty with a live location right now.</p>') +
      '<p class="note">Responders who are timed in appear on the map with their name. Use Chat to reach them and the admin.</p>';

  return tabs + (inc.length ? inc.map(i => {
    const own = i.responder?.id == me,
          go = (to, l) => `<button class="mini go" data-act="inc" data-id="${esc(i.id)}" data-to="${to}">${l}</button>`;
    return `<div class="card ${i.nearest == me ? 'inc' : ''}">
        <b>${esc(i.type)}</b>
        <span>${esc(i.by || 'Citizen')} · ${i.d.toFixed(1)} km away · ${ago(i.created)}${i.nearest == me ? ' · nearest to you' : ''}</span>
        ${i.note ? `<span>${esc(i.note)}</span>` : ''}
        <p>${tag(STEPS[i.status][0])} <small>${i.responder ? esc(i.responder.name) : 'Unassigned'}</small></p>
        ${!i.responder ? go(1, 'Accept and respond') : ''}
        ${own && i.status == 1 ? go(2, 'Mark arrived') : ''}
        ${own && i.status == 2 ? go(3, 'Mark resolved') : ''}
        <a class="mini" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${i.lat},${i.lng}">Navigate</a>
        <button class="mini" data-act="focus" data-id="${esc(i.id)}">Show on map</button>
      </div>`;
  }).join('') : '<p class="note">No active incidents.</p>');
}

function renderHub() {
  hubSig = hubData.map(i => i.id + i.status + i.lat).join();

  const el = $('#hpanel');
  if (!el) {
    if (route() == 'admin') drawAdmin();
    return;
  }

  // Only the panel below the map is redrawn. The map itself is never rebuilt when you switch tabs.
  const h = hubPanelHTML();
  if (h != hubHtml) { hubHtml = h; el.innerHTML = h; }
  drawDuty();
  drawMap();
}

/* ---------- Admin: everyone's live location ---------- */
function drawAdmin() {
  const s = $('#stats');
  if (!s) return;

  const by = r => PEOPLE.filter(p => p.role == r).length;

  s.innerHTML = [
    [by('citizen'), 'Citizens online'],
    [by('responder'), 'Responders online'],
    [by('manager'), 'Park managers online'],
    [hubData.length, 'Active incidents'],
    [HZ.filter(h => h.status == 'Pending').length, 'Hazards to review'],
    [RES.filter(r => r.status == 'Pending approval').length, 'Pending requests']
  ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');

  const ord = { responder: 0, manager: 1, citizen: 2 },
        rows = PEOPLE
          .filter(p => adminF == 'all' || p.role == adminF)
          .sort((a, b) => ord[a.role] - ord[b.role] || a.name.localeCompare(b.name));

  $('#plist').innerHTML = rows.map(p => `<div class="row">
      <div>
        <b>${esc(p.name)}</b>
        <span>
          <i class="dot" style="background:${RC[p.role]}"></i>${LABEL[p.role]}${p.duty ? ' · on duty' : p.role == 'responder' ? ' · off duty' : ''} · seen ${ago(p.ts)}<br>
          ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}
        </span>
      </div>
      <div>
        <button class="mini" data-act="pfocus" data-id="${esc(p.id)}">Show</button>
        ${p.role == 'citizen' ? '' : `<a class="mini" href="#/chat" data-act="chto" data-id="${esc(p.role == 'responder' ? 'resp' : 'mgr')}">Message</a>`}
      </div>
    </div>`).join('') || '<p class="note">Nobody is online with location sharing on.</p>';

  // Responder attendance: time in / time out
  const tl = $('#tlog');
  if (tl) tl.innerHTML = TLOG.length
    ? TLOG.slice().reverse().slice(0, 15).map(l => `<div class="row">
        <div>
          <b>${esc(l.name)}</b>
          <span>In ${dt(l.in)}${l.out ? ` · Out ${dt(l.out)} · ${dur(l.out - l.in)}` : ` · ${dur(Date.now() - l.in)} so far`}</span>
        </div>
        <em class="tag ${l.out ? '' : 'ok'}">${l.out ? 'Timed out' : 'On duty'}</em>
      </div>`).join('')
    : '<p class="note">No responder has timed in yet.</p>';

  drawMap();
}

/* ---------- Park manager: parks, other managers, chat ---------- */
/* Chat channels: 'resp' = responders + admin, 'mgr' = park managers + admin. The admin reads both. */
const myCh  = () => role() == 'admin' ? ['resp', 'mgr'] : role() == 'responder' ? ['resp'] : ['mgr'];
const curCh = () => role() == 'admin' ? chTab : myCh()[0];

const unreadChat = () => myCh().reduce((n, ch) =>
  n + (CHS[ch] || []).filter(x => x.uid != st.user?.id && x.t > (st.chatSeen[ch] || 0)).length, 0);

async function syncMgr() {
  if (role() != 'manager') return;

  const m = await api('managers'),
        mg = m.map(x => x.id + x.lat.toFixed(5) + x.lng.toFixed(5)).join();
  if (mg != mgrSig) {
    MGR = m;
    mgrSig = mg;
    if (route() == 'pmap') drawPM();
    drawMap();
  }
}

async function syncChat() {
  if (!['manager', 'responder', 'admin'].includes(role())) return;

  for (const ch of myCh()) {
    const c = await api('chat?ch=' + ch),
          cg = c.length + ':' + (c.at(-1)?.id || '');
    if (cg == chSigs[ch]) continue;

    const known = new Set((CHS[ch] || []).map(x => x.id)),
          fresh = chInit[ch] ? c.filter(x => !known.has(x.id) && x.uid != st.user.id && !x.alert) : [];
    chInit[ch] = true;
    CHS[ch] = c;
    chSigs[ch] = cg;

    if (route() == 'chat' && ch == curCh()) drawChat();
    else if (fresh.length) toast(`${fresh.at(-1).name}: ${fresh.at(-1).text.slice(0, 80)}`);
  }

  checkAlerts();
  badges();
}

/* Admin alerts pop up until acknowledged, wherever the person is in the app. */
function checkAlerts() {
  if (checkin || !ov.hidden) return;
  if (st.alertSeen == null) st.alertSeen = Date.now() - 18e5;

  const a = myCh().flatMap(ch => CHS[ch] || [])
    .filter(m => m.alert && m.uid != st.user.id && m.t > st.alertSeen && Date.now() - m.t < 36e5)
    .sort((x, y) => x.t - y.t)[0];
  if (a) showAlert(a);
}

function showAlert(a) {
  ov.hidden = false;
  ov.innerHTML = `<div class="sheet">
      <h2>Alert from ${esc(a.name)}</h2>
      <p>${esc(a.text)}</p>
      <button class="btn sosbtn" data-act="alok" data-t="${a.t}">Acknowledge</button>
      <p class="note">${clock(a.t)}</p>
    </div>`;
  navigator.vibrate?.([300, 150, 300]);
}

function drawPM() {
  const me = st.user.id, ps = mine();

  const hz = $('#pmhz');
  if (hz) {
    const rows = hzNearParks();
    hz.innerHTML = !ps.length
      ? '<p class="note">Add a park below to see hazards around it.</p>'
      : rows.length
        ? rows.map(({ h: x, p, d }) => `<div class="card">
            ${x.photo ? `<img class="hzimg" src="/api/hazards/${esc(x.id)}/photo" loading="lazy" alt="">` : ''}
            <b>${esc(x.cat)}</b>
            <span>${esc(x.desc)}<br>${Math.round(d / 10) * 10} m from ${esc(p.name)} · ${ago(x.created)}</span><br>
            ${tag(x.status == 'Pending' ? 'Pending review' : x.status)}
            ${x.status == 'Pending' ? btn('hzs', x.id, 'Approved', 'Approve') + btn('hzs', x.id, 'Rejected', 'Reject') : x.status == 'Approved' ? btn('hzs', x.id, 'Fixed', 'Mark fixed') : ''}
            <button class="mini" data-act="hzf" data-id="${esc(x.id)}">Show on map</button>
          </div>`).join('')
        : '<p class="note">No reported hazards near your parks.</p>';
  }

  const g = $('#pmgr');
  if (g) {
    const o = MGR.filter(m => m.id != me);
    g.innerHTML = o.length
      ? o.map(m => {
          const pk = PARKS.filter(p => p.mid == m.id).map(p => esc(p.name)).join(', ');
          return `<div class="row">
              <div>
                <b>${esc(m.name)}</b>
                <span><i class="dot" style="background:${RC.manager}"></i>${pk ? pk + ' · ' : ''}seen ${ago(m.ts)}</span>
              </div>
              <div>
                <button class="mini" data-act="mgf" data-id="${esc(m.id)}">Show</button>
                <a class="mini" href="#/chat">Message</a>
              </div>
            </div>`;
        }).join('')
      : '<p class="note">No other park managers are online with location sharing on.</p>';
  }

  const k = $('#pmpk');
  if (k) k.innerHTML = ps.length
    ? ps.map(p => `<div class="row">
        <div><b>${esc(p.name)}</b><span>${p.r} m around the pin${p.closed ? ' · Temporarily closed' : ''}</span></div>
        <div>
          <button class="mini" data-act="pkcl" data-id="${esc(p.id)}" data-to="${p.closed ? 0 : 1}">${p.closed ? 'Reopen' : 'Close'}</button>
          <button class="mini" data-act="pkf" data-id="${esc(p.id)}">Show</button>
          <button class="mini" data-act="pkrm" data-id="${esc(p.id)}">Remove</button>
        </div>
      </div>`).join('')
    : '<p class="note">No parks yet. Add one below so hazards around it show up here.</p>';
}

function drawChat() {
  const el = $('#msgs');
  if (!el) return;

  const me = st.user.id, ch = curCh(), list = CHS[ch] || [],
        stick = !el.children.length || el.scrollHeight - el.scrollTop - el.clientHeight < 60;

  el.innerHTML = list.length
    ? list.map(m => `<div class="msg ${m.uid == me ? 'me' : ''} ${m.alert ? 'al' : ''}">
        ${m.uid == me ? '' : `<b>${esc(m.name)}${m.role == 'admin' ? ' · Admin' : ''}</b>`}
        ${m.alert ? '<b class="alt">Alert</b>' : ''}
        <p>${esc(m.text)}</p>
        <small>${new Date(m.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
      </div>`).join('')
    : `<p class="note">No messages yet. ${role() == 'admin' ? 'Send the first one.' : 'Say hi to the team.'}</p>`;

  if (stick) el.scrollTop = el.scrollHeight;

  if (list.length) { st.chatSeen[ch] = list.at(-1).t; save(); }
  badges();
}

/* Keeps the name directory current. Runs for every signed-in citizen, not only at login,
   so people who were already signed in when the directory was added can still be found. */
let lastReg = 0;
function regUser() {
  if (role() != 'citizen' || Date.now() - lastReg < 6e4) return;
  lastReg = Date.now();
  return api('users', { id: st.user.id, name: st.user.name })
    .then(r => {
      const s = !!r.suspended;
      if (s != !!st.suspended) { st.suspended = s; save(); render(); }
    })
    .catch(() => { lastReg = 0; });
}

/* ---------- Contacts: search by name, consent required ---------- */
async function syncContacts() {
  const me = st.user.id;
  const [c, a, nb] = await Promise.all([
    api('contacts?uid=' + me),
    api('alerts?to=' + me),
    api('nearby?uid=' + me).catch(() => [])
  ]);
  if (st.pendingAlert) {
    const pa = st.pendingAlert;
    if (Date.now() > pa.exp) { st.pendingAlert = null; save(); }
    else {
      await api('alerts', pa);
      st.links.push({ id: pa.id, exp: pa.exp });
      st.pendingAlert = null;
      save();
      toast('Alert sent to your contacts.');
    }
  }

  const s = JSON.stringify([c, a.map(x => x.id)]);

  // Accepted contacts who are online and sharing appear on the map.
  const ns = nb.map(x => x.id + x.lat.toFixed(5) + x.lng.toFixed(5)).join();
  if (ns != nearSig) {
    NEAR = nb;
    nearSig = ns;
    if (route() == 'home') drawMap();
  }

  a.forEach(x => {
    if (!seenAl.has(x.id)) {
      seenAl.add(x.id);
      if (Date.now() - x.ts < 12e4)
        toast(`${x.name} may need help. Open Contacts to see their location.`),
        navigator.vibrate?.([300, 150, 300]);
    }
  });

  if (s != ctSig) {
    CT = c;
    AL = a;
    ctSig = s;
    if (route() == 'contacts') drawContacts();
    badges();
  }
}

function drawContacts() {
  const el = $('#ctlist');
  if (!el) return;

  const me = st.user.id,
        out = CT.filter(c => c.from.id == me),
        inc = CT.filter(c => c.to.id == me && c.status == 'pending'),
        acc = CT.filter(c => c.to.id == me && c.status == 'accepted');

  const al = AL.length
    ? `<h2>Alerts for you</h2>${
        AL.map(x => `<a class="card inc" href="#/link/${esc(x.id)}">
            <b>${esc(x.name)} may need help</b>
            <span>Tap to see their live location. Expires automatically.</span>
          </a>`).join('')
      }`
    : '';

  const rq = inc.length
    ? `<h2>Requests for you</h2>${
        inc.map(c => `<div class="row">
            <div>
              <b>${esc(c.from.name)}</b><span>wants you as an emergency contact. If you accept, you receive their alerts and you can see each other on the map while you are both online.</span><br>
              ${btn('cta', c.id, 'accepted', 'Accept')}
              ${btn('cta', c.id, 'declined', 'Decline')}
            </div>
          </div>`).join('')
      }`
    : '';

  const mine = `<h2>Your contacts</h2>${
    out.map(c => `<div class="row">
        <div>
          <b>${esc(c.to.name)}</b>
          <span>
            ${c.status == 'declined'
              ? `<button class="mini go" data-act="ctadd" data-id="${esc(c.to.id)}" data-n="${esc(c.to.name)}">Ask again</button>`
              : ''}
            <button class="mini" data-act="ctrm" data-id="${esc(c.id)}">Remove</button>
          </span>
        </div>
        ${tag(c.status == 'accepted' ? 'Consent accepted' : c.status == 'declined' ? 'Declined' : 'Consent pending')}
      </div>`).join('') || '<p class="note">No contacts yet. Search a name below to add someone to alert if you miss a check-in.</p>'
  }`;

  // People who accepted to be a contact for someone else: they stay visible and can be stopped.
  const wh = acc.length
    ? `<h2>You are a contact for</h2>${
        acc.map(c => `<div class="row">
            <div>
              <b>${esc(c.from.name)}</b>
              <span><button class="mini" data-act="ctrm" data-id="${esc(c.id)}">Stop</button></span>
            </div>
            ${tag('Accepted')}
          </div>`).join('')
      }`
    : '';

  el.innerHTML = al + rq + mine + wh;
}

let sq = 0;

async function ctSearch(v) {
  const el = $('#ctres');
  if (!el) return;

  v = v.trim();
  if (v.length < 2) { el.innerHTML = ''; return; }

  const n = ++sq;
  let r = [];
  try {
    r = await api('users?q=' + encodeURIComponent(v) + '&me=' + st.user.id);
  } catch {
    el.innerHTML = '<p class="note">Could not search. Check your connection.</p>';
    return;
  }

  if (n != sq || !$('#ctres')) return;

  const have = new Map(CT.filter(c => c.from.id == st.user.id).map(c => [c.to.id, c.status]));

  el.innerHTML = r.map(u => {
    const s = have.get(u.id);
    return `<div class="row">
      <div><b>${esc(u.name)}</b><span>ID ${esc(u.id)}</span></div>
      ${s && s != 'declined'
        ? tag(s == 'accepted' ? 'Accepted' : 'Requested')
        : `<button class="mini go" data-act="ctadd" data-id="${esc(u.id)}" data-n="${esc(u.name)}">${s ? 'Ask again' : 'Add'}</button>`}
    </div>`;
  }).join('') || '<p class="note">No one found. They need to create a TANGLAW account first.</p>';
}

/* ---------- Secure expiring link (recipient view) ---------- */
async function loadLink() {
  lastLk = Date.now();
  const id = (location.hash || '').split('/')[2];
  try {
    LK = await api('alerts/' + id);
  } catch {
    LK = { gone: true };
  }
  drawLink();
  drawMap();
}

function drawLink() {
  const el = $('#lkbox');
  if (!el) return;

  if (!LK || LK.gone || Date.now() > LK.exp) {
    el.innerHTML = `<div class="sheet">
        <h2>This link has expired</h2>
        <p class="note">Ask the sender to share their location again.</p>
      </div>`;
    return;
  }

  const s = Math.ceil((LK.exp - Date.now()) / 1000);
  el.innerHTML = `<h2>${esc(LK.name)}’s live location</h2>
    <p class="note">${LK.lat.toFixed(5)}, ${LK.lng.toFixed(5)} · updated ${ago(LK.ts)}</p>
    <p class="tag wait">Link expires in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</p>
    <a class="btn ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${LK.lat},${LK.lng}">Navigate</a>`;
}

/* ---------- Check-in and escalation ---------- */
function openCheckin() {
  checkin = { end: Date.now() + GRACE * 1000 };
  ov.hidden = false;
  ov.innerHTML = `<div class="sheet">
      <h2>Are you okay?</h2>
      <p>You have stayed in a High Risk zone.</p>
      <button class="btn" data-act="ok">I’m OK</button>
      <p class="note">Contacts are alerted if no reply in <span id="cd">${GRACE}</span> s.</p>
      <p class="note">Private, one-tap dismiss</p>
    </div>`;
  navigator.vibrate?.([300, 150, 300]);
}

function closeCheckin() {
  checkin = null;
  ov.hidden = true;
  ov.innerHTML = '';
}

async function escalate() {
  closeCheckin();

  const now = Date.now(),
        to = CT.filter(c => c.from.id == st.user.id && c.status == 'accepted').map(c => c.to.id);
  let msg;

  if (to.length) {
    const id = uid() + uid() + uid(),
          exp = now + TTL() * 1000;
    try {
      await api('alerts', { id, name: st.user.name, to, lat: pos.lat, lng: pos.lng, exp });
      st.links.push({ id, exp });
      msg = `Alert sent to ${to.length} contact${to.length > 1 ? 's' : ''} with an expiring location link.`;
    } catch {
      st.pendingAlert = { id, name: st.user.name, to, lat: pos.lat, lng: pos.lng, exp };
      msg = 'No connection. Your alert will be sent automatically as soon as you are back online. You can also call your contacts or 911.';
    }
  } else {
    msg = 'No contact has accepted yet, so no alert was sent. Add contacts in Contacts.';
  }

  if (!st.incident)
    st.incident = { id: uid(), type: 'Unanswered check-in', status: 0, sent: false, lat: pos.lat, lng: pos.lng, note: '' };

  quiet = now + LIM() * 1000;
  highSince = null;
  save();
  toast(msg);
  sync();

  if (['home', 'incident', 'contacts'].includes(route())) render();
}

/* ---------- 1-second tick: linger timer, countdown ---------- */
setInterval(() => {
  if (!st.in) return;
  startGPS();

  const now = Date.now(), r = route();

  if (role() == 'citizen') {
    // Check-ins always use the real time, not the map preview.
    const a = risk(pos.lat, pos.lng, nowH());
    if (a.lvl == 2 && now > quiet) {
      highSince ??= now;
      if (!checkin && now - highSince >= LIM() * 1000) openCheckin();
    } else highSince = null;

    if (checkin) {
      const s = Math.ceil((checkin.end - now) / 1000);
      if (s <= 0) escalate();
      else { const c = $('#cd'); if (c) c.textContent = s; }
    }
  }

  if (r == 'hub') drawDuty();

  if (r == 'home') {
    const g = $('#linger');
    if (g) g.textContent = highSince
      ? `In a High Risk zone for ${Math.floor((now - highSince) / 1000)} s. Check-in prompt at ${LIM()} s.`
      : `A check-in prompt appears after ${LIM()} s in a High Risk zone.`;
  }

  if (['home', 'hub', 'admin', 'pmap'].includes(r)) drawTracker();
  else drawMap();

  if (r == 'link') {
    drawLink();
    if (now - lastLk > 3000) loadLink();
  }
}, 1000);

/* ---------- Events ---------- */
function shrink(f) {
  return new Promise(r => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'),
            k = Math.min(1, 360 / im.width);
      c.width = im.width * k;
      c.height = im.height * k;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      r(c.toDataURL('image/jpeg', .6));
    };
    im.onerror = () => r('');
    im.src = URL.createObjectURL(f);
  });
}

document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target.dataset.f, d = Object.fromEntries(new FormData(e.target));

  if (f == 'auth') {
    const m = e.submitter?.value || 'login', em = d.email.trim();

    if (m == 'reg') {
      if (!d.name.trim() || d.pass.length < 6)
        return toast('Enter your name and a password of at least 6 characters.');

      const rl = LABEL[d.role] ? d.role : 'citizen';
      if (rl != 'citizen') {
        try { await api('verify', { code: d.code, role: rl }); }
        catch { return toast('Invalid access code for that role, or the server is unreachable.'); }
      }

      st.user = { id: uid(), name: d.name.trim(), email: em, pass: d.pass, role: rl, code: rl == 'citizen' ? '' : d.code };
      st.duty = false;
      st.dutySince = null;
    } else if (!st.user || st.user.email != em || st.user.pass != d.pass) {
      return toast(st.user ? 'Email or password does not match.' : 'No account on this device yet. Create one first.');
    }

    // Lets others find you by name.
    if (role() == 'citizen') api('users', { id: st.user.id, name: st.user.name }).catch(() => {});

    st.in = true;
    save();
    location.hash = '#/' + ROLES[role()].home;
    render();
  }

  if (f == 'sos') {
    st.incident = { id: uid(), type: 'Emergency report', status: 0, sent: false, lat: pos.lat, lng: pos.lng, note: (d.note || '').trim() };
    save();
    sync();
    location.hash = '#/incident';
  }

  if (f == 'res') {
    if (!d.park) return toast('Choose a park first.');
    const s = slotState(d.fac, d.date, toMin(d.start || 'x:x'), toMin(d.end || 'x:x'), d.park);
    if (!s.ok) return toast(s.title + '. ' + s.msg);

    try {
      await api('reservations', { id: uid(), uid: st.user.id, by: st.user.name, pid: d.park, fac: d.fac, date: d.date, start: d.start, end: d.end, purpose: d.purpose });
    } catch (x) {
      await syncData().catch(() => {});
      drawAvail();
      return toast(x.message == '403' ? 'Your account is suspended. Contact your barangay office.' : x.message == '423' ? 'This park is temporarily closed today. Pick another day.' : x.message == '409' ? 'Someone just took that time. Pick another window.' : 'Could not send. Check your connection and try again.');
    }

    await syncData().catch(() => {});
    toast('Request sent. The park manager will review it.');
    location.hash = '#/requests';
  }

  if (f == 'svc') {
    if (!isFinite(+d.lat) || !isFinite(+d.lng)) return toast('Enter valid coordinates.');
    try { await api('services', { id: uid(), kind: d.kind, name: d.name.trim(), lat: +d.lat, lng: +d.lng }); }
    catch { return toast('Could not save. Check your connection and try again.'); }
    svSig = '';
    await syncData().catch(() => {});
    toast('Place added.');
    return;
  }

  if (f == 'rcancel') {
    const mgr = role() != 'citizen', note = (d.note || '').trim();
    if (mgr && !d.rsn) return toast('Choose a reason.');
    if (mgr && d.rsn == 'Other' && !note) return toast('Tell the citizen why you are cancelling.');
    try {
      await api('reservations/' + d.id,
        mgr ? { status: 'Cancelled', mid: st.user.id, reason: d.rsn, note }
            : { status: 'Cancelled', uid: st.user.id, note }, 'PATCH');
    } catch {
      closeOv();
      await syncData().catch(() => {});
      return toast('Could not cancel. It may already be cancelled or over.');
    }
    closeOv();
    await syncData().catch(() => {});
    toast('Reservation cancelled.');
    return;
  }

  if (f == 'park') {
    const nm = (d.name || '').trim(), p = pinLL || pos;
    if (!nm) return;
    if (!pinLL && !pos.live) return toast('Tap the map to drop a pin, or turn on GPS.');

    try {
      await api('parks', { id: uid(), mid: st.user.id, mname: st.user.name, name: nm, lat: p.lat, lng: p.lng, r: +d.r || 200 });
    } catch {
      return toast('Could not save. Check your connection and try again.');
    }

    e.target.reset();
    pinLL = null;
    mapSig = '';
    await syncMgr().catch(() => {});
    drawMap();
    toast('Park added. Hazards near it will show up in your list.');
  }

  if (f == 'chat') {
    const t = (d.text || '').trim();
    if (!t) return;
    const inp = e.target.elements.text, al = !!d.alert;
    inp.value = '';
    try {
      await api('chat', { id: uid(), uid: st.user.id, name: st.user.name, ch: curCh(), text: t, alert: al });
    } catch {
      inp.value = t;
      return toast('Could not send. Check your connection.');
    }
    if (e.target.elements.alert) e.target.elements.alert.checked = false;
    if (al) toast('Alert sent.');
    await syncChat().catch(() => {});
    inp.focus();
  }

  if (f == 'clock') {
    if (d.pw !== st.user.pass) {
      e.target.elements.pw.value = '';
      return toast('Wrong password. Your shift was not changed.');
    }

    const on = !st.duty, now = Date.now(), worked = st.dutySince ? now - st.dutySince : 0;
    try {
      await api('responders', { id: st.user.id, name: st.user.name, lat: pos.lat, lng: pos.lng, duty: on });
    } catch {
      return toast('Could not record this. Check your connection and try again.');
    }

    st.duty = on;
    st.dutySince = on ? now : null;
    save();
    closeOv();
    dutyHtml = '';
    hubSig = '';
    drawDuty();
    syncHub().catch(() => {});
    toast(on ? `Timed in at ${clock(now)}.` : `Timed out at ${clock(now)}. ${dur(worked)} on shift.`);
  }

  if (f == 'hz') {
    const photo = d.photo && d.photo.size ? await shrink(d.photo) : '',
          p = pinLL || pos;

    try {
      await api('hazards', { id: uid(), uid: st.user.id, by: st.user.name, cat: d.cat, desc: d.desc.trim(), lat: p.lat, lng: p.lng, photo });
    } catch {
      return toast('Could not send. Check your connection and try again.');
    }

    await syncData().catch(() => {});
    e.target.reset();
    pinLL = null;
    mapSig = '';
    drawMap();
    drawMine();
    toast('Submitted. It already raises the risk level there. A responder, park manager or admin will verify it.');
  }
});

let cqt;

document.addEventListener('input', e => {
  if (['fac', 'date', 'start', 'end'].includes(e.target.name)) drawAvail();

  if (e.target.id == 'ctq') {
    clearTimeout(cqt);
    const v = e.target.value;
    cqt = setTimeout(() => ctSearch(v), 250);
  }
});

document.addEventListener('change', e => {
  if (e.target.name == 'role') {
    const v = e.target.value;
    $('#rc').hidden = v == 'citizen';
    $('#rct').textContent = v == 'admin' ? 'Admin code' : v == 'manager' ? 'Park manager code' : 'Responder code';
  }

  if (e.target.name == 'park' && route() == 'reserve') pickPark(e.target.value);

  if (e.target.name == 'rvpark') { rvPark = e.target.value; render(); }

  if (e.target.name == 'lim') { st.lim = +e.target.value; save(); toast('Saved.'); return; }

  if (e.target.name == 'lang') {
    const frm = e.target.closest('form'), draft = frm ? Object.fromEntries(new FormData(frm)) : null;
    st.lang = e.target.value == 'fil' ? 'fil' : 'en';
    save();
    render();
    const f2 = draft && $('form[data-f=auth]');
    if (f2) {                       // keep what was already typed on the sign-in form
      Object.entries(draft).forEach(([k, v]) => { if (k != 'lang' && f2.elements[k]) f2.elements[k].value = v; });
      f2.elements.role?.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }

  if (e.target.name == 'rsn') {
    const n = document.querySelector('#ov [name=note]'), o = e.target.value == 'Other';
    n.required = o;
    $('#rnl').textContent = o ? 'Reason (required)' : 'Note to the citizen (optional)';
  }

  if (e.target.name == 'hour') {
    hourOv = e.target.value === '' ? null : +e.target.value;
    rkey = '';
    sig = '';
    drawTracker();
  }
});

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;

  const a = t.dataset.act, i = t.dataset.id,
        fail = () => toast('Could not update. Check your connection.');

  if (a == 'clock') { openClock(); return; }
  if (a == 'ovx')   { closeOv(); return; }

  if (a == 'alok') {
    st.alertSeen = +t.dataset.t;
    save();
    closeOv();
    checkAlerts();
    return;
  }

  // Switch the panel under the responder map. The map stays exactly where it is.
  if (a == 'htab') {
    hubTab = i;
    hubHtml = '';
    renderHub();
    return;
  }

  if (a == 'rsf') {
    const x = RSP.find(r => r.id == i);
    if (x && M) {
      follow = false;
      M.setView([x.lat, x.lng], 18);
      $('#map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (a == 'chtab') { chTab = i; render(); return; }
  if (a == 'chto')  { chTab = i; return; }   // the link itself opens the chat

  if (a == 'reseed') {
    st.simSeed = 1 + Math.floor(Math.random() * 1e6);
    rkey = ''; sig = ''; mapSig = '';
    save();
    toast('Simulated risk areas reshuffled.');
    return;
  }

  if (a == 'inc') {
    api('incidents/' + i, { status: +t.dataset.to, responder: { id: st.user.id, name: st.user.name } }, 'PATCH')
      .then(syncHub)
      .catch(x => toast(x.message == '409' ? 'Another responder already took this incident.' : 'Could not update. Check your connection.'));
    return;
  }

  if (a == 'focus') {
    const x = hubData.find(h => h.id == i);
    if (x && M) { follow = false; M.setView([x.lat, x.lng], 17); }
    return;
  }

  if (a == 'hzf') {
    const x = HZ.find(h => h.id == i);
    if (x && M) { follow = false; M.setView([x.lat, x.lng], 18); }
    return;
  }

  if (a == 'pfocus') {
    const x = PEOPLE.find(p => p.id == i);
    if (x && M) {
      follow = false;
      M.setView([x.lat, x.lng], 18);
      $('#map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (a == 'pf') { adminF = i; render(); return; }

  if (a == 'mgf') {
    const x = MGR.find(m => m.id == i);
    if (x && M) {
      follow = false;
      M.setView([x.lat, x.lng], 18);
      $('#map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (a == 'pkf') {
    const x = PARKS.find(p => p.id == i);
    if (x && M) {
      follow = false;
      M.setView([x.lat, x.lng], 17);
      $('#map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (a == 'pkrm') {
    api('parks/' + i + '?mid=' + st.user.id, {}, 'DELETE')
      .then(() => syncMgr())
      .catch(fail);
    return;
  }

  if (a == 'rcx') { openCancel(i); return; }

  if (a == 'afil') { const [k, v] = i.split(':'); aF[k] = v; render(); return; }

  if (a == 'usus') {
    api('users/' + i, { suspended: t.dataset.to == '1' }, 'PATCH')
      .then(() => { auSig = ''; return syncAdmin(); })
      .then(() => toast(t.dataset.to == '1' ? 'Account suspended.' : 'Account reactivated.'))
      .catch(fail);
    return;
  }

  if (a == 'ainc') {
    api('incidents/' + i, { status: 3 }, 'PATCH')
      .then(() => { aiSig = ''; return syncAdmin(); })
      .then(() => toast('Incident marked resolved.'))
      .catch(fail);
    return;
  }

  if (a == 'adel') {
    const [k, id] = i.split(':');
    if (!confirm(T('Delete this record permanently?'))) return;
    api((k == 'inc' ? 'incidents/' : 'hazards/') + id, {}, 'DELETE')
      .then(() => { aiSig = ''; hzSig = ''; return Promise.all([syncAdmin(), syncData()]); })
      .then(() => toast('Deleted.'))
      .catch(fail);
    return;
  }

  if (a == 'svdel') {
    api('services/' + i, {}, 'DELETE').then(syncData).then(() => toast('Place removed.')).catch(fail);
    return;
  }

  if (a == 'svloc') {
    if (!pos.live) return toast('Location is not available yet.');
    document.querySelector('[name=lat]').value = pos.lat.toFixed(6);
    document.querySelector('[name=lng]').value = pos.lng.toFixed(6);
    return;
  }

  if (a == 'pkcl') {
    const closing = t.dataset.to == '1';
    api('parks/' + i, { mid: st.user.id, closed: closing, reason: closing ? 'Closed by the park manager' : '' }, 'PATCH')
      .then(syncData)
      .then(() => toast(closing
        ? 'Park marked temporarily closed. Today’s remaining reservations there were cancelled.'
        : 'Park reopened.'))
      .catch(fail);
    return;
  }

  if (a == 'rs' || a == 'hzs') {
    const to = t.dataset.to;
    api((a == 'rs' ? 'reservations/' : 'hazards/') + i, { status: to, mid: st.user.id }, 'PATCH')
      .then(syncData)
      .then(() => toast(
        a == 'hzs' && to == 'Approved' ? 'Approved. The area’s risk level is updated.' :
        a == 'hzs' && to == 'Fixed'    ? 'Marked fixed. The area’s risk level recovers.' :
        to == 'Approved' ? 'Marked approved.' : 'Marked rejected.'
      ))
      .catch(fail);
    return;
  }

  if (a == 'slot') {
    document.querySelector('[name=start]').value = t.dataset.s;
    document.querySelector('[name=end]').value = t.dataset.e;
    drawAvail();
    return;
  }

  if (a == 'ctadd') {
    api('contacts', { id: uid(), from: { id: st.user.id, name: st.user.name }, to: { id: i, name: t.dataset.n } })
      .then(() => { ctSig = ''; return syncContacts().catch(() => {}); })
      .then(() => {
        drawContacts();
        const q = $('#ctq'), rs = $('#ctres');
        if (q) q.value = '';
        if (rs) rs.innerHTML = '';
        toast('Request sent. They must accept before they can receive alerts.');
      })
      .catch(x => toast(
        x.message == '409' ? 'You already added this person.' :
        x.message == '404' ? 'That person is no longer in the directory. Ask them to open TANGLAW again.' :
                             'Could not send. Check your connection.'));
    return;
  }

  if (a == 'cta') {
    api('contacts/' + i, { status: t.dataset.to }, 'PATCH')
      .then(() => { ctSig = ''; return syncContacts(); })
      .then(() => toast(t.dataset.to == 'accepted' ? 'You will receive their alerts.' : 'Request declined.'))
      .catch(fail);
    return;
  }

  if (a == 'ctrm') {
    api('contacts/' + i, {}, 'DELETE')
      .then(() => { ctSig = ''; return syncContacts(); })
      .catch(fail);
    return;
  }

  if (a == 'ok') {
    closeCheckin();
    quiet = Date.now() + LIM() * 1000;
    highSince = null;
    return;
  }

  if (['demo', 'force', 'crowdSim', 'respSim', 'share', 'simRisk'].includes(a)) {
    st[a] = t.checked;
    sig = '';
    rkey = '';
    mapSig = '';
    save();
    return;
  }

  if (a == 'close') { st.incident = null; location.hash = '#/home'; }
  if (a == 'logout') {
    if (role() == 'responder' && st.duty) return toast('Time out before you log out, so your shift is recorded.');
    st.in = false;
    location.hash = '';
  }
  if (a == 'reset') { localStorage.removeItem(KEY); location.hash = ''; location.reload(); return; }

  save();
  render();
});

/* ---------- Language: English / Filipino ----------
   Screens are written in English. When Filipino is chosen, text is translated as it is added to the page,
   using the dictionary in lang.js. Anything not in the dictionary (names, places, dates) stays as it is. */
const lang = () => st.lang == 'fil' ? 'fil' : 'en';
const norm = s => s.replace(/\s+/g, ' ').trim();

function trStr(raw) {
  const k = norm(raw);
  if (!k || !window.FIL) return raw;
  let v = FIL[k];
  if (v == null) for (const [re, f] of FILX) { const m = k.match(re); if (m) { v = f(...m.slice(1)); break; } }
  if (v == null) return raw;
  return raw.match(/^\s*/)[0] + v + raw.match(/\s*$/)[0];
}

const T = s => lang() == 'fil' ? trStr(s) : s;

function trText(n) {
  const p = n.parentNode;
  if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) return;
  const o = n.nodeValue, v = trStr(o);
  if (v == o) return;
  if (p.nodeName == 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', norm(o));   // keep the form value in English
  n.nodeValue = v;
}

function trAttrs(el) {
  for (const k of ['placeholder', 'title', 'aria-label']) {
    const o = el.getAttribute && el.getAttribute(k);
    if (o) { const v = trStr(o); if (v != o) el.setAttribute(k, v); }
  }
}

function trNode(root) {
  if (lang() != 'fil' || !root) return;
  if (root.nodeType == 3) return trText(root);
  if (root.nodeType != 1) return;
  trAttrs(root);
  root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(trAttrs);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) trText(n);
}

new MutationObserver(ms => {
  if (lang() != 'fil') return;
  for (const m of ms) {
    if (m.type == 'childList') m.addedNodes.forEach(trNode);
    else if (m.type == 'characterData') trText(m.target);
    else trAttrs(m.target);
  }
}).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });

addEventListener('hashchange', render);

fetch('/config.json')
  .then(r => r.json())
  .then(c => CFG = c)
  .catch(() => {})
  .finally(render);