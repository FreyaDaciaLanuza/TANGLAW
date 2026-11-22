// TANGLAW dev server: static files + shared API (JSON file storage). No dependencies.
const http = require('http'),
      fs = require('fs'),
      path = require('path');

// Minimal .env loader: only sets vars not already in the environment.
try {
  for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const E = process.env,
      PORT = E.PORT || 3000,
      DB = path.join(__dirname, 'data.json');

// One access code per staff role. Citizens need none. Change these in .env.
const CODES = {
  admin:     E.ADMIN_CODE     || 'ADMIN2026',
  manager:   E.MANAGER_CODE   || 'PARK2026',
  responder: E.RESPONDER_CODE || 'BPSO2026'
};

const roleOf = c => c ? ['admin', 'manager', 'responder'].find(r => CODES[r] === c) || null : null;

let db = { incidents: [], responders: {}, reservations: [], hazards: [], users: {}, contacts: [], parks: [], chat: [], timelogs: [], services: [], traffic: {} };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DB)) }; } catch {}

const save = () => fs.writeFile(DB, JSON.stringify(db), () => {});

// Memory only, never written to disk: live presence and expiring alert links (no location trails).
const pres = {}, alerts = {};

// Haversine distance in km.
const km = (a, b, c, d) => {
  const r = x => x * Math.PI / 180,
        h = Math.sin(r(c - a) / 2) ** 2 +
            Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

const send = (res, c, o) => {
  res.writeHead(c, { 'content-type': 'application/json' });
  res.end(JSON.stringify(o));
};

// Ids sent by the browser may only contain letters, digits, _ and -, so they are safe to store and to show in pages.
const IDK = new Set(['id', 'uid', 'mid', 'rid', 'pid', 'to']);
const clean = (o, k) =>
  Array.isArray(o) ? o.map(x => clean(x, k))
  : o && typeof o == 'object' ? Object.fromEntries(Object.entries(o).map(([k2, v]) => [k2, clean(v, k2)]))
  : typeof o == 'string' && IDK.has(k) ? o.replace(/[^\w-]/g, '')
  : o;

const body = req => new Promise(r => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 6e5) req.destroy(); });
  req.on('end', () => { try { r(clean(JSON.parse(s || '{}'))); } catch { r({}); } });
});

// Nearest available responder: on duty, location fresh (<2 min), not already assigned to an active incident.
function nearest(inc) {
  const now = Date.now(),
        busy = new Set(db.incidents
          .filter(i => i.status == 1 || i.status == 2)
          .map(i => i.responder && i.responder.id));

  let best = null, bd = 1e9;
  for (const [id, r] of Object.entries(db.responders)) {
    if (!r.duty || now - r.ts > 120000 || busy.has(id)) continue;
    const d = km(inc.lat, inc.lng, r.lat, r.lng);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

const FAC = ['Basketball court', 'Covered pavilion', 'Playground', 'Open lawn'],
      TM = /^([01]\d|2[0-3]):[0-5]\d$/,
      tmin = t => +t.slice(0, 2) * 60 + +t.slice(3);

const FILES = {
  'lang.js': 'application/javascript',
  'index.html': 'text/html',
  'app.js':     'text/javascript',
  'styles.css': 'text/css'
};

const S = (v, n) => String(v ?? '').slice(0, n);

// ----- Reservation cancelling -----
const MREASONS = ['Maintenance or repair', 'Bad weather', 'Safety concern', 'Double-booked', 'Event at the park', 'Other'],
      pad  = n => String(n).padStart(2, '0'),
      ymd  = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      hm   = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      live = r => r.status == 'Pending approval' || r.status == 'Approved',
      upcoming = r => { const d = new Date(), t = ymd(d); return r.date > t || (r.date == t && r.end > hm(d)); },
      INC_MS = 30 * 60 * 1000;     // an incident near a park this long, still unresolved, cancels that park's bookings

// Why a park cannot host anyone right now ('' = fine): closed by its manager, or an unresolved incident
// within the park radius + 250 m (same reach the manager map uses) that has lasted more than 30 minutes.
function parkHold(pk) {
  if (pk.closed) return 'Park temporarily closed';
  const n = Date.now();
  return db.incidents.some(i => i.status < 3 && n - i.created > INC_MS &&
                                km(pk.lat, pk.lng, i.lat, i.lng) * 1000 <= pk.r + 250)
    ? 'Incident near the park' : '';
}

// Cancel today's remaining reservations at any park that is on hold. Future dates are untouched.
function sweep() {
  const d = new Date(), t = ymd(d), h = hm(d), n = Date.now();
  let ch = false;
  for (const pk of db.parks) {
    const why = parkHold(pk);
    if (!why) continue;
    for (const r of db.reservations)
      if (r.pid == pk.id && live(r) && r.date == t && r.end > h) {
        r.status = 'Cancelled';
        r.cancelBy = 'auto';
        r.cancelReason = why;
        r.cancelNote = '';
        r.cancelled = n;
        ch = true;
      }
  }
  if (ch) save();
}
setInterval(sweep, 30000);

// ----- Foot traffic: distinct app users inside a park's area, per hour. Only counts are saved. -----
const SKINDS = ['Police station', 'Hospital', 'Barangay hall', 'Well-lit area'],
      seenV = {};
function countVisit(id, lat, lng) {
  const d = new Date(), t = ymd(d), h = d.getHours();
  for (const pk of db.parks) {
    if (km(pk.lat, pk.lng, lat, lng) * 1000 > pk.r) continue;
    const k = pk.id + '|' + t + '|' + h;
    if (!seenV[k]) {
      if (Object.keys(seenV).length > 4000) for (const x in seenV) delete seenV[x];
      seenV[k] = new Set();
    }
    if (seenV[k].has(id)) continue;
    seenV[k].add(id);
    const days = (db.traffic[pk.id] = db.traffic[pk.id] || {});
    days[t] = days[t] || {};
    days[t][h] = (days[t][h] || 0) + 1;
    for (const x of Object.keys(days).sort().slice(0, -45)) delete days[x];   // keep about six weeks
    save();
  }
}

http.createServer(async (req, res) => {
  const U = new URL(req.url, 'http://x'),
        p = U.pathname,
        role = roleOf(req.headers['x-code']),
        is = (...r) => r.includes(role);

  // Client config endpoint.
  if (p == '/config.json')
    return send(res, 200, {
      mapKey:    E.MAP_API_KEY    || '',
      provider:  E.MAP_PROVIDER   || 'maptiler',
      style:     E.MAP_STYLE      || ''
    });

  // ----- API routes -----
  if (p.startsWith('/api/')) {
    const a = p.slice(5).split('/'),
          m = req.method,
          q = k => U.searchParams.get(k) || '';

    // Verify access code for staff roles.
    if (a[0] == 'verify' && m == 'POST') {
      const b = await body(req),
            ok = !!CODES[b.role] && b.code === CODES[b.role];
      return send(res, ok ? 200 : 403, { ok });
    }

    // ----- Responders: on-duty location, time in/out log, and who else is on duty -----
    if (a[0] == 'responders') {
      if (!is('responder', 'admin')) return send(res, 403, {});

      if (m == 'GET') {
        const n = Date.now();
        return send(res, 200,
          Object.entries(db.responders)
            .filter(([, r]) => r.duty && n - r.ts < 120000)
            .map(([id, r]) => ({ id, name: r.name, lat: r.lat, lng: r.lng, ts: r.ts })));
      }

      if (m == 'POST') {
        if (!is('responder')) return send(res, 403, {});
        const b = await body(req);
        if (!b.id) return send(res, 400, {});

        const n = Date.now(), id = S(b.id, 20), prev = db.responders[id];
        db.responders[id] = {
          name: S(b.name, 60),
          lat:  +b.lat,
          lng:  +b.lng,
          duty: !!b.duty,
          ts:   n
        };

        // Time in = duty switched on, time out = switched off.
        let open = db.timelogs.find(l => l.rid == id && !l.out);
        // A shift left open while the device went quiet is closed at the last time we heard from it.
        if (open && prev && n - prev.ts > 18e5) { open.out = prev.ts; open = null; }
        if (b.duty && !open) db.timelogs.push({ id: S(n, 20), rid: id, name: S(b.name, 60), in: n, out: null });
        if (!b.duty && open) open.out = n;
        if (db.timelogs.length > 500) db.timelogs = db.timelogs.slice(-500);
        save();
        return send(res, 200, { ok: 1 });
      }
    }

    if (a[0] == 'timelogs' && m == 'GET') {
      if (!is('admin')) return send(res, 403, {});
      return send(res, 200, db.timelogs.slice(-100));
    }

    // ----- Live presence (memory only) + admin people list + anonymous area signals -----
    if (a[0] == 'presence' && m == 'POST') {
      const b = await body(req);
      if (!b.id || !isFinite(b.lat) || !isFinite(b.lng)) return send(res, 400, {});
      pres[S(b.id, 20)] = {
        name: S(b.name, 60),
        role: role || 'citizen',
        lat:  +b.lat,
        lng:  +b.lng,
        ts:   Date.now()
      };
      if (!role) countVisit(S(b.id, 20), +b.lat, +b.lng);
      return send(res, 200, { ok: 1 });
    }

    if (a[0] == 'people' && m == 'GET') {
      if (!is('admin')) return send(res, 403, {});
      const n = Date.now();
      return send(res, 200,
        Object.entries(pres)
          .filter(([, x]) => n - x.ts < 9e4)
          .map(([id, x]) => ({
            id,
            ...x,
            duty: x.role == 'responder'
              ? !!(db.responders[id] && db.responders[id].duty)
              : undefined
          }))
      );
    }

    if (a[0] == 'signals' && m == 'GET') {
      // Crowd = count of live devices per ~110 m cell; cells under 3 people are never reported.
      // Incidents are coarsened to the same grid, last 6 h only, no names.
      const n = Date.now(), C = .001, g = {};
      for (const [id, x] of Object.entries(pres)) {
        if (n - x.ts > 9e4) { delete pres[id]; continue; }
        const k = Math.floor(x.lat / C) + ',' + Math.floor(x.lng / C);
        g[k] = (g[k] || 0) + 1;
      }
      // On-duty responders with a fresh fix, snapped to the same ~110 m grid. No names or ids.
      const resp = Object.values(db.responders)
        .filter(r => r.duty && n - r.ts < 120000)
        .map(r => ({
          lat: (Math.floor(r.lat / C) + .5) * C,
          lng: (Math.floor(r.lng / C) + .5) * C
        }));

      return send(res, 200, {
        resp,
        crowd: Object.entries(g)
          .filter(([, c]) => c >= 3)
          .map(([k, c]) => {
            const [i, j] = k.split(',');
            return { lat: (+i + .5) * C, lng: (+j + .5) * C, n: c };
          }),
        incidents: db.incidents
          .filter(i => i.status < 3 && n - i.created < 216e5)   // resolved incidents no longer raise risk
          .map(i => ({
            lat: Math.round(i.lat / C) * C,
            lng: Math.round(i.lng / C) * C,
            t:   i.created
          }))
      });
    }

    // ----- User directory (names only) for finding emergency contacts -----
    if (a[0] == 'users') {
      if (m == 'POST') {
        const b = await body(req);
        if (!b.id || !S(b.name, 60).trim()) return send(res, 400, {});
        const uid = S(b.id, 20), nm = S(b.name, 60).trim();
        if (!db.users[uid] || db.users[uid].name != nm) {
          db.users[uid] = { ...(db.users[uid] || {}), name: nm };
          save();
        }
        return send(res, 200, { ok: 1, suspended: !!db.users[uid].suspended });
      }
      if (a[1] && m == 'PATCH') {
        if (!is('admin')) return send(res, 403, {});
        const b = await body(req);
        if (!db.users[a[1]]) return send(res, 404, {});
        if (b.suspended) db.users[a[1]].suspended = true;
        else delete db.users[a[1]].suspended;
        save();
        return send(res, 200, { ok: 1 });
      }
      if (m == 'GET' && is('admin') && q('all')) {
        const n = Date.now();
        return send(res, 200,
          Object.entries(db.users)
            .map(([id, x]) => ({ id, name: x.name, suspended: !!x.suspended, online: !!(pres[id] && n - pres[id].ts < 9e4) }))
            .sort((x, y) => x.name.localeCompare(y.name))
        );
      }
      if (m == 'GET') {
        const s = q('q').trim().toLowerCase(), me = q('me');
        if (s.length < 2) return send(res, 200, []);
        return send(res, 200,
          Object.entries(db.users)
            .filter(([id, x]) => id != me && x.name.toLowerCase().includes(s))
            .slice(0, 8)
            .map(([id, x]) => ({ id, name: x.name }))
        );
      }
    }

    // ----- Contacts: a request must be accepted by the other person before they can receive alerts -----
    if (a[0] == 'contacts') {
      if (!a[1] && m == 'GET') {
        const u = q('uid');
        return send(res, 200, db.contacts.filter(c => c.from.id == u || c.to.id == u));
      }

      if (!a[1] && m == 'POST') {
        const b = await body(req),
              f = b.from || {},
              t = b.to || {};
        if (!f.id || !t.id || f.id == t.id) return send(res, 400, {});
        if (!db.users[t.id]) return send(res, 404, {});
        const ex = db.contacts.find(c => c.from.id == f.id && c.to.id == t.id);
        if (ex && ex.status != 'declined') return send(res, 409, {});
        if (ex) {                       // declined earlier: ask again
          ex.status = 'pending';
          ex.created = Date.now();
          save();
          return send(res, 200, { ok: 1 });
        }
        db.contacts.push({
          id:       S(b.id || Date.now(), 20),
          from:     { id: S(f.id, 20), name: S(f.name, 60) },
          to:       { id: S(t.id, 20), name: S(t.name, 60) },
          status:   'pending',
          created:  Date.now()
        });
        save();
        return send(res, 200, { ok: 1 });
      }

      const c = db.contacts.find(x => x.id == a[1]);
      if (!c) return send(res, 404, {});

      if (m == 'PATCH') {
        const b = await body(req);
        if (!['accepted', 'declined'].includes(b.status)) return send(res, 400, {});
        c.status = b.status;
        save();
        return send(res, 200, { ok: 1 });
      }

      if (m == 'DELETE') {
        db.contacts = db.contacts.filter(x => x !== c);
        save();
        return send(res, 200, { ok: 1 });
      }
    }

    // ----- Close contacts on the map: only people who accepted each other, online and sharing -----
    if (a[0] == 'nearby' && m == 'GET') {
      const u = q('uid'), n = Date.now(),
            ids = new Set(db.contacts
              .filter(c => c.status == 'accepted' && (c.from.id == u || c.to.id == u))
              .map(c => c.from.id == u ? c.to.id : c.from.id));
      return send(res, 200,
        [...ids]
          .filter(id => pres[id] && n - pres[id].ts < 9e4)
          .map(id => ({ id, name: pres[id].name, lat: pres[id].lat, lng: pres[id].lng, ts: pres[id].ts })));
    }

    // ----- Park managers: who is online, which parks they manage, and a shared chat -----
    if (a[0] == 'managers' && m == 'GET') {
      if (!is('manager', 'admin')) return send(res, 403, {});
      const n = Date.now();
      return send(res, 200,
        Object.entries(pres)
          .filter(([, x]) => x.role == 'manager' && n - x.ts < 9e4)
          .map(([id, x]) => ({ id, name: x.name, lat: x.lat, lng: x.lng, ts: x.ts })));
    }

    if (a[0] == 'parks') {
      if (!a[1] && m == 'GET') return send(res, 200, db.parks);

      if (!a[1] && m == 'POST') {
        if (!is('manager')) return send(res, 403, {});
        const b = await body(req), nm = S(b.name, 60).trim();
        if (!b.id || !b.mid || !nm || !isFinite(b.lat) || !isFinite(b.lng)) return send(res, 400, {});
        if (!db.parks.some(x => x.id == b.id)) {
          db.parks.push({
            id:      S(b.id, 20),
            mid:     S(b.mid, 20),
            mname:   S(b.mname, 60),
            name:    nm,
            lat:     +b.lat,
            lng:     +b.lng,
            r:       Math.min(1000, Math.max(50, +b.r || 200)),
            created: Date.now()
          });
          save();
        }
        return send(res, 200, { ok: 1 });
      }

      if (a[1] && m == 'PATCH') {
        if (!is('manager', 'admin')) return send(res, 403, {});
        const x = db.parks.find(k => k.id == a[1]);
        if (!x) return send(res, 404, {});
        const b = await body(req);
        if (role == 'manager' && x.mid != b.mid) return send(res, 403, {});
        if (b.closed) { x.closed = Date.now(); x.closedReason = S(b.reason, 80); }
        else { delete x.closed; delete x.closedReason; }
        save();
        sweep();
        return send(res, 200, { ok: 1 });
      }

      if (a[1] && m == 'DELETE') {
        if (!is('manager')) return send(res, 403, {});
        const x = db.parks.find(k => k.id == a[1]);
        if (!x) return send(res, 404, {});
        if (x.mid != q('mid')) return send(res, 403, {});
        db.parks = db.parks.filter(k => k !== x);
        save();
        return send(res, 200, { ok: 1 });
      }
    }

    if (a[0] == 'chat') {
      const can = ch => ch == 'resp' ? is('responder', 'admin') : is('manager', 'admin');

      if (m == 'GET') {
        const ch = q('ch') == 'resp' ? 'resp' : 'mgr';
        if (!can(ch)) return send(res, 403, {});
        return send(res, 200, db.chat.filter(x => (x.ch || 'mgr') == ch).slice(-100));
      }

      if (m == 'POST') {
        const b = await body(req), ch = b.ch == 'resp' ? 'resp' : 'mgr', t = S(b.text, 500).trim();
        if (!can(ch)) return send(res, 403, {});
        if (!b.uid || !t) return send(res, 400, {});
        db.chat.push({
          id:    S(b.id || Date.now(), 20),
          ch,
          uid:   S(b.uid, 20),
          name:  S(b.name, 60),
          role,
          text:  t,
          alert: role == 'admin' && b.alert ? 1 : 0,   // only the admin can raise an alert
          t:     Date.now()
        });
        if (db.chat.length > 400) db.chat = db.chat.slice(-400);
        save();
        return send(res, 200, { ok: 1 });
      }
    }

    // ----- Expiring live-location alerts (memory only) -----
    if (a[0] == 'alerts') {
      const n = Date.now();
      for (const k in alerts) if (alerts[k].exp <= n) delete alerts[k];

      if (!a[1] && m == 'GET') {
        const to = q('to');
        return send(res, 200,
          Object.values(alerts)
            .filter(x => x.to.includes(to))
            .map(x => ({ id: x.id, name: x.name, exp: x.exp, ts: x.ts }))
        );
      }

      if (!a[1] && m == 'POST') {
        const b = await body(req);
        if (!b.id || !isFinite(b.lat) || !isFinite(b.lng) || !Array.isArray(b.to))
          return send(res, 400, {});
        alerts[S(b.id, 30)] = {
          id:   S(b.id, 30),
          name: S(b.name, 60),
          to:   b.to.slice(0, 10).map(String),
          lat:  +b.lat,
          lng:  +b.lng,
          ts:   n,
          exp:  Math.min(+b.exp || 0, n + 36e5)
        };
        return send(res, 200, { ok: 1 });
      }

      const x = alerts[a[1]];
      if (!x) return send(res, 410, {});

      if (!a[2] && m == 'GET')
        return send(res, 200, { name: x.name, lat: x.lat, lng: x.lng, ts: x.ts, exp: x.exp });

      if (a[2] == 'loc' && m == 'PATCH') {
        const b = await body(req);
        if (isFinite(b.lat) && isFinite(b.lng)) {
          x.lat = +b.lat;
          x.lng = +b.lng;
          x.ts  = n;
        }
        return send(res, 200, { ok: 1 });
      }
    }

    // ----- Safety places (police, hospitals, barangay halls, well-lit areas): everyone reads, admin edits -----
    if (a[0] == 'services') {
      if (!a[1] && m == 'GET') return send(res, 200, db.services);
      if (!is('admin')) return send(res, 403, {});
      if (!a[1] && m == 'POST') {
        const b = await body(req);
        if (!SKINDS.includes(b.kind) || !isFinite(b.lat) || !isFinite(b.lng) || !S(b.name, 60).trim())
          return send(res, 400, {});
        db.services.push({ id: S(b.id || Date.now().toString(36), 20), kind: b.kind, name: S(b.name, 60).trim(), lat: +b.lat, lng: +b.lng });
        save();
        return send(res, 200, { ok: 1 });
      }
      if (a[1] && m == 'DELETE') {
        db.services = db.services.filter(x => x.id != a[1]);
        save();
        return send(res, 200, { ok: 1 });
      }
    }

    // ----- Foot traffic: hourly visitor counts per park (managers see their own parks, admin sees all) -----
    if (a[0] == 'traffic' && m == 'GET') {
      if (!is('manager', 'admin')) return send(res, 403, {});
      const out = {};
      for (const pk of db.parks)
        if (role == 'admin' || pk.mid == q('mid')) out[pk.id] = db.traffic[pk.id] || {};
      return send(res, 200, out);
    }

    // ----- Incidents: citizens create; responders manage; admin can also resolve or delete -----
    if (a[0] == 'incidents') {
      if (!a[1] && m == 'GET') {
        if (!is('responder', 'admin')) return send(res, 403, {});
        return send(res, 200,
          db.incidents
            .filter(i => i.status < 3 || (is('admin') && q('all')))
            .map(i => ({ ...i, nearest: i.status ? null : nearest(i) }))
        );
      }

      if (!a[1] && m == 'POST') {
        const b = await body(req);
        if (!b.id || !isFinite(b.lat) || !isFinite(b.lng)) return send(res, 400, {});
        if (!db.incidents.some(i => i.id == b.id)) {
          db.incidents.push({
            id:       S(b.id, 20),
            type:     S(b.type || 'Emergency report', 60),
            note:     S(b.note, 200),
            by:       S(b.by, 60),
            lat:      +b.lat,
            lng:      +b.lng,
            status:   0,
            responder: null,
            created:  Date.now()
          });
          save();
        }
        return send(res, 200, { ok: 1 });
      }

      const i = db.incidents.find(x => x.id == a[1]);
      if (!i) return send(res, 404, {});

      if (m == 'GET')
        return send(res, 200, { status: i.status, responder: i.responder });

      if (m == 'DELETE') {
        if (!is('admin')) return send(res, 403, {});
        db.incidents = db.incidents.filter(x => x.id != i.id);
        save();
        return send(res, 200, { ok: 1 });
      }

      if (m == 'PATCH' && is('admin')) {
        const b = await body(req);
        if (+b.status == 3 && i.status < 3) { i.status = 3; save(); }
        return send(res, 200, { status: i.status });
      }

      if (m == 'PATCH') {
        if (!is('responder')) return send(res, 403, {});
        const b = await body(req),
              s = +b.status;
        if (!(s >= 1 && s <= 3) || !b.responder || !b.responder.id)
          return send(res, 400, {});
        if (i.responder && i.responder.id !== b.responder.id)
          return send(res, 409, {});
        if (s > i.status) {
          i.status = s;
          i.responder = { id: b.responder.id, name: S(b.responder.name, 60) };
          save();
        }
        return send(res, 200, { status: i.status });
      }
    }

    // ----- Reservations: citizens request; park manager decides -----
    if (a[0] == 'reservations') {
      if (!a[1] && m == 'GET') {
        sweep();
        return send(res, 200,
          db.reservations.map(r =>
            is('manager', 'admin') ? r : {
              id: r.id, uid: r.uid, pid: r.pid, pname: r.pname, fac: r.fac, date: r.date, start: r.start, end: r.end, status: r.status,
              // Citizens' own reasons stay private to the manager; manager and automatic reasons are shown to the booker.
              cancelBy: r.cancelBy,
              cancelReason: r.cancelBy == 'citizen' ? undefined : r.cancelReason,
              cancelNote:   r.cancelBy == 'citizen' ? undefined : r.cancelNote
            }
          )
        );
      }

      if (!a[1] && m == 'POST') {
        const b = await body(req);
        if (db.users[S(b.uid, 20)]?.suspended) return send(res, 403, { error: 'suspended' });
        if (!FAC.includes(b.fac) ||
            !/^\d{4}-\d\d-\d\d$/.test(b.date) ||
            !TM.test(b.start) || !TM.test(b.end) ||
            b.start < '06:00' || b.end > '22:00' ||
            tmin(b.end) - tmin(b.start) < 30)
          return send(res, 400, { error: 'invalid' });

        const pk = db.parks.find(x => x.id == b.pid);
        if (!pk) return send(res, 400, { error: 'park' });

        if (b.date == ymd(new Date()) && parkHold(pk)) return send(res, 423, { error: 'closed' });

        if (db.reservations.some(r =>
            r.pid == pk.id &&
            r.fac == b.fac &&
            r.date == b.date &&
            r.status != 'Rejected' &&
            r.status != 'Cancelled' &&
            tmin(b.start) < tmin(r.end) &&
            tmin(b.end) > tmin(r.start)
        ))
          return send(res, 409, { error: 'overlap' });

        db.reservations.push({
          id:       S(b.id || Date.now(), 20),
          uid:      S(b.uid, 20),
          by:       S(b.by, 60),
          pid:      pk.id,
          pname:    pk.name,
          fac:      b.fac,
          date:     b.date,
          start:    b.start,
          end:      b.end,
          purpose:  S(b.purpose, 80),
          status:   'Pending approval',
          created:  Date.now()
        });
        save();
        return send(res, 200, { ok: 1 });
      }

      const r = db.reservations.find(x => x.id == a[1]);
      if (!r) return send(res, 404, {});

      if (m == 'PATCH') {
        const b = await body(req),
              pk = r.pid && db.parks.find(k => k.id == r.pid);

        // Cancelling: the citizen who booked (pending or approved), or the park's manager (approved only).
        if (b.status == 'Cancelled') {
          if (!live(r) || !upcoming(r)) return send(res, 409, {});
          const note = S(b.note, 200).trim();

          if (is('manager', 'admin')) {
            if (role == 'manager' && pk && pk.mid != b.mid) return send(res, 403, {});
            if (r.status != 'Approved') return send(res, 409, {});
            if (!MREASONS.includes(b.reason) || (b.reason == 'Other' && !note)) return send(res, 400, {});
            r.cancelBy = role == 'admin' ? 'admin' : 'manager';
            r.cancelReason = b.reason == 'Other' ? note : b.reason;
            r.cancelNote = b.reason == 'Other' ? '' : note;
          } else if (!role && b.uid && b.uid == r.uid) {
            r.cancelBy = 'citizen';
            r.cancelReason = note;         // optional
            r.cancelNote = '';
          } else return send(res, 403, {});

          r.status = 'Cancelled';
          r.cancelled = Date.now();
          save();
          return send(res, 200, { ok: 1 });
        }

        if (!is('manager', 'admin')) return send(res, 403, {});
        if (!['Approved', 'Rejected'].includes(b.status)) return send(res, 400, {});
        if (r.status == 'Cancelled') return send(res, 409, {});
        // Only the manager of the park decides (older requests with no park can be handled by any manager). Admin can decide any.
        if (role == 'manager' && pk && pk.mid != b.mid) return send(res, 403, {});
        r.status = b.status;
        save();
        return send(res, 200, { ok: 1 });
      }
    }

    // ----- Hazards: citizens report; responders review -----
    if (a[0] == 'hazards') {
      if (a[2] == 'photo' && m == 'GET') {
        const h = db.hazards.find(x => x.id == a[1]);
        if (!h || !h.photo) return send(res, 404, {});
        res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'max-age=86400' });
        return res.end(Buffer.from(h.photo.split(',')[1], 'base64'));
      }

      if (!a[1] && m == 'GET')
        return send(res, 200,
          db.hazards.map(h => ({
            id: h.id, uid: h.uid, cat: h.cat, desc: h.desc,
            lat: h.lat, lng: h.lng, status: h.status,
            created: h.created, photo: !!h.photo,
            by: is('responder', 'manager', 'admin') ? h.by : undefined
          }))
        );

      if (!a[1] && m == 'POST') {
        const b = await body(req);
        if (db.users[S(b.uid, 20)]?.suspended) return send(res, 403, { error: 'suspended' });
        if (!b.id || !isFinite(b.lat) || !isFinite(b.lng) || !b.desc)
          return send(res, 400, {});
        const ph = typeof b.photo == 'string' &&
                   /^data:image\/jpeg;base64,/.test(b.photo) &&
                   b.photo.length < 250000 ? b.photo : '';
        if (!db.hazards.some(h => h.id == b.id)) {
          db.hazards.push({
            id:       S(b.id, 20),
            uid:      S(b.uid, 20),
            by:       S(b.by, 60),
            cat:      S(b.cat || 'Other', 40),
            desc:     S(b.desc, 300),
            lat:      +b.lat,
            lng:      +b.lng,
            photo:    ph,
            status:   'Pending',
            created:  Date.now()
          });
          save();
        }
        return send(res, 200, { ok: 1 });
      }

      const h = db.hazards.find(x => x.id == a[1]);
      if (!h) return send(res, 404, {});

      if (m == 'PATCH') {
        if (!is('responder', 'manager', 'admin')) return send(res, 403, {});
        const b = await body(req);
        const ok = (h.status == 'Pending' && ['Approved', 'Rejected'].includes(b.status)) ||
                   (h.status == 'Approved' && b.status == 'Fixed');
        if (!ok) return send(res, 409, {});
        h.status = b.status;
        save();
        return send(res, 200, { ok: 1 });
      }

      if (m == 'DELETE') {
        if (!is('admin')) return send(res, 403, {});
        db.hazards = db.hazards.filter(x => x.id != h.id);
        save();
        return send(res, 200, { ok: 1 });
      }
    }

    return send(res, 404, {});
  }

  // ----- Static files -----
  const f = p == '/' ? 'index.html' : p.slice(1);   // whitelist: never serve .env or data.json
  if (!FILES[f]) { res.writeHead(404); return res.end('Not found'); }

  fs.readFile(path.join(__dirname, f), (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {
      'content-type': FILES[f] + '; charset=utf-8',
      'cache-control': 'no-store'
    });
    res.end(d);
  });

}).listen(PORT, () =>
  console.log('TANGLAW on http://localhost:' + PORT +
    ' | map key: ' + (E.MAP_API_KEY ? (E.MAP_PROVIDER || 'maptiler') + ' (set)' : 'none, using free tiles'))
);