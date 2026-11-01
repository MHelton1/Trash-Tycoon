/* Idle Roundsman screens. Each tab is built once; small "binds" refresh the numbers four times a second,
   and "sections" rebuild only when their shape changes, so a button is never swapped out under a finger. */
(function () {
'use strict';
const T = window.TT, $ = s => document.querySelector(s);
const KEY = 'trash-tycoon-save-v1'; // kept from the game's first name so existing saves carry over
const money = T.fmtMoney, num = T.fmt, M = window.Money;
const clock = sec => { sec = Math.ceil(sec); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), x = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
let S, shownRegion = 0, tab = 'route', binds = {}, sections = {}, bid = 0, lastFrame = Date.now(), newTrophies = 0;

/* ---------- icons ---------- */
const P = {
  route: '<path d="M4 18h16M6 18V9l6-4 6 4v9M10 18v-5h4v5"/>',
  fleet: '<path d="M2 16V7h11v9M13 10h5l3 3v3h-8M6 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1"/>',
  grow: '<path d="M3 20l6-6 4 4 8-9M15 9h6v6"/>',
  office: '<path d="M4 5h16v11H4zM9 20h6M12 16v4"/>',
  trophies: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 20h8"/>',
  company: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',
  house: '<path d="M4 11l8-6 8 6v9H4zM10 20v-5h4v5"/>', cash: '<path d="M3 7h18v10H3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/>',
  truck: '<path d="M2 16V7h11v9M13 10h5l3 3v3h-8M6 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1"/>',
  people: '<path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 4 6"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  hand: '<path d="M7 11V5a2 2 0 0 1 4 0v5M11 9V4a2 2 0 0 1 4 0v6M15 8a2 2 0 0 1 4 0v6a7 7 0 0 1-14 0v-3a2 2 0 0 1 4 0"/>',
  wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 1-2-2z"/>', pen: '<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>',
  yard: '<path d="M3 20V9l9-5 9 5v11M7 20v-7h10v7M7 16h10"/>', check: '<path d="M4 12l5 5L20 6"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',
  key: '<path d="M8 15a4 4 0 1 1 3-6.7L21 8v4h-3v3h-3l-1.5-1.3A4 4 0 0 1 8 15z"/>', moon: '<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
  recycle: '<path d="M7 19H4l3-5M17 19h3l-3-5M9 5l3-2 3 5M7 14l-3-5M17 14l3-5"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'
};
const ic = (k, cls) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ' class="' + cls + '"' : ''}>${P[k] || P.star}</svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- bind helpers ---------- */
function B(fn) { const k = 'b' + (++bid); binds[k] = fn; return `data-b="${k}"`; }
function SEC(sig, render) { const k = 's' + (++bid); sections[k] = { sig, render, last: null }; return `<div data-s="${k}"></div>`; }
function apply(el, r) {
  if (r === null || r === undefined) return;
  if (typeof r !== 'object') { r = String(r); if (el.textContent !== r) el.textContent = r; return; }
  if (r.t !== undefined && el.textContent !== String(r.t)) el.textContent = r.t;
  if (r.h !== undefined && el.innerHTML !== r.h) el.innerHTML = r.h;
  if (r.dis !== undefined && el.disabled !== !!r.dis) el.disabled = !!r.dis;
  if (r.w !== undefined) { const w = Math.max(0, Math.min(100, r.w)).toFixed(1) + '%'; if (el.style.width !== w) el.style.width = w; }
  if (r.cls !== undefined && el.className !== r.cls) el.className = r.cls;
  if (r.show !== undefined) { const d = r.show ? '' : 'none'; if (el.style.display !== d) el.style.display = d; }
  if (r.press !== undefined) el.setAttribute('aria-pressed', r.press ? 'true' : 'false');
}
function refresh() {
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    Object.keys(sections).forEach(k => {
      const el = document.querySelector(`[data-s="${k}"]`); if (!el) { delete sections[k]; return; }
      const sc = sections[k], sig = sc.sig(); if (sig !== sc.last) { sc.last = sig; el.innerHTML = sc.render(); changed = true; }
    });
    if (!changed) break;
  }
  Object.keys(binds).forEach(k => {
    const el = document.querySelector(`[data-b="${k}"]`); if (!el) { delete binds[k]; return; }
    try { apply(el, binds[k]()); } catch (e) { console.error(e); }
  });
}

/* A buy button: label, price function, action and its argument, and an optional "can't" reason. */
function buyBtn(label, cost, a, x, why) {
  return `<button class="btn" data-a="${a}"${x !== undefined ? ` data-x="${x}"` : ''} ${B(() => {
    const c = cost(), w = why ? why() : '';
    if (c === null) return { h: 'Done', dis: true, cls: 'btn done' };
    return { h: esc(w || label) + (w ? '' : `<small>${money(c)}</small>`), dis: !!w || S.cash < c, cls: 'btn' };
  })}></button>`;
}

/* ---------- header and tabs ---------- */
function header() {
  $('#top').innerHTML = `<div class="row"><div class="co" ${B(() => S.name || 'Your hauling company')}></div><div class="day" ${B(() => 'Day ' + Math.floor(S.day))}></div></div>
    <div class="cash" ${B(() => money(S.cash))}></div>
    <div class="sub"><span ${B(() => { const e = T.economy(S); return { h: `<b class="${e.net < 0 ? 'neg' : ''}">${money(e.net, 1)}</b>/s`, }; })}></span>
    <span ${B(() => ({ h: `<b>${num(T.economy(S).totalCust)}</b> customer${Math.floor(T.economy(S).totalCust) === 1 ? '' : 's'}` }))}></span>
    <span ${B(() => ({ h: `Reputation <b>${Math.round(S.rep)}</b>` }))}></span>
    <span ${B(() => ({ show: S.boost > 0, h: `<b>2×</b> for ${clock(S.boost)}` }))}></span></div>`;
}
const TABS = [['route', 'Route'], ['fleet', 'Fleet'], ['grow', 'Grow'], ['office', 'Office'], ['trophies', 'Trophies'], ['company', 'Company']];
function tabsBar() {
  $('#tabs').innerHTML = '<div class="in" role="tablist">' + TABS.map(([k, n]) => `<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${ic(k)}<span>${n}</span><i class="dot" id="dot-${k}"></i></button>`).join('') + '</div>';
}
function show(k) {
  tab = k; shownRegion = S.region || 0; binds = {}; sections = {}; header();
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === k ? 'true' : 'false'));
  if (k === 'trophies') newTrophies = 0;
  $('#main').innerHTML = VIEWS[k](); window.scrollTo(0, 0); refresh(); try { localStorage.setItem(KEY + '-tab', k); } catch (e) { /* private mode */ }
}

/* ---------- the street scene ---------- */
const COLORS = { pickup: '#8F6F1F', rear: 'var(--body)', side: '#1F6F8C', front: '#7A3E8C', roll: '#A8401A' };
function truckSvg(k) {
  const c = COLORS[k];
  if (k === 'pickup') return `<rect x="0" y="10" width="28" height="12" rx="2" fill="${c}"/><rect x="28" y="4" width="14" height="18" rx="3" fill="var(--cab)"/><rect x="32" y="7" width="7" height="6" rx="1" fill="var(--sky)"/><rect x="-26" y="12" width="22" height="9" rx="1" fill="var(--house)"/><circle cx="8" cy="23" r="4" fill="#222"/><circle cx="34" cy="23" r="4" fill="#222"/><circle cx="-15" cy="23" r="3.5" fill="#222"/>`;
  const h = k === 'roll' ? 12 : 18;
  return `<rect x="0" y="${22 - h}" width="44" height="${h}" rx="3" fill="${c}"/><rect x="44" y="2" width="16" height="20" rx="3" fill="var(--cab)"/><rect x="48" y="5" width="9" height="7" rx="1" fill="var(--sky)"/>${k === 'front' ? '<rect x="58" y="0" width="3" height="10" fill="#555"/>' : ''}${k === 'side' ? '<rect x="18" y="0" width="4" height="8" fill="#555"/>' : ''}<circle cx="10" cy="23" r="4.5" fill="#222"/><circle cx="34" cy="23" r="4.5" fill="#222"/><circle cx="52" cy="23" r="4.5" fill="#222"/>`;
}
/* Each region has its own street. Everything sits above the road line (y 86). */
function backdrop(id) {
  let h = '';
  const house = (x, hh, door) => `<rect x="${x}" y="${70 - hh}" width="34" height="${hh}" fill="var(--house)" opacity=".85"/><path d="M${x - 3} ${70 - hh}l20-14 20 14z" fill="var(--house)"/><rect x="${x + 13}" y="58" width="8" height="12" fill="var(--sky)" opacity=".6"/>${door || ''}`;
  const can = (x, i) => `<rect x="${x}" y="76" width="7" height="10" rx="1" fill="${i % 3 === 0 ? 'var(--svc)' : 'var(--good)'}"/>`;
  if (id === 'lakes') {
    h += `<rect y="44" width="360" height="26" fill="#5E8FB8" opacity=".55"/><g class="sail"><path d="M0 52l10-14v14z" fill="#F5F1E3"/><path d="M-4 52h18l-3 4h-12z" fill="#7A4E2D"/></g>`;
    for (let i = 0; i < 7; i++) { const x = 6 + i * 52; h += i % 2 ? `<path d="M${x + 8} 70l12-30 12 30z" fill="#2F5D45"/><path d="M${x + 12} 56l8-22 8 22z" fill="#3E7356"/>` : house(x, 22 + (i * 5 % 8)); h += can(x + 38, i); }
  } else if (id === 'plains') {
    h += `<rect x="40" y="38" width="44" height="32" fill="#A8401A" opacity=".9"/><path d="M36 38l26-16 26 16z" fill="#7A2E12"/><rect x="56" y="52" width="12" height="18" fill="#F5F1E3" opacity=".8"/>
      <rect x="92" y="22" width="16" height="48" rx="8" fill="#B8B2A0"/><path d="M92 30h16" stroke="#8E8878"/>
      <rect x="230" y="30" width="3" height="40" fill="#6B6455"/><g class="blades" style="transform-origin:231.5px 30px"><path d="M231.5 30l0-16M231.5 30l14 8M231.5 30l-14 8" stroke="#6B6455" stroke-width="3" stroke-linecap="round"/></g>
      <path d="M140 66h80M140 60h80" stroke="#8F6F1F" stroke-width="1.5"/>`;
    for (let x = 140; x <= 220; x += 16) h += `<rect x="${x}" y="56" width="2" height="14" fill="#8F6F1F"/>`;
    h += house(270, 24) + can(310, 0) + can(130, 1) + can(30, 2);
  } else if (id === 'coast') {
    h += `<circle cx="300" cy="22" r="12" fill="#F2C14E" opacity=".9"/><rect y="46" width="360" height="24" fill="#3C8FB0" opacity=".6"/><path class="waves" d="M-40 52q10-4 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0" fill="none" stroke="#F5F1E3" stroke-width="1.5" opacity=".7"/>`;
    const pastel = ['#E8A4A0', '#F2D49B', '#9FD3C7', '#B9C7E8'];
    for (let i = 0; i < 6; i++) { const x = 8 + i * 60; h += `<rect x="${x}" y="40" width="32" height="20" fill="${pastel[i % 4]}"/><path d="M${x - 3} 40l19-11 19 11z" fill="#C97B5A"/><rect x="${x + 3}" y="60" width="3" height="10" fill="#7A6A55"/><rect x="${x + 26}" y="60" width="3" height="10" fill="#7A6A55"/>
      <rect x="${x + 44}" y="40" width="3" height="30" fill="#8C6A3F"/><path d="M${x + 45} 40q-12 -2 -16 6M${x + 45} 40q12 -2 16 6M${x + 45} 40q-6 -10 -14 -10M${x + 45} 40q6 -10 14 -10" stroke="#3E7A4A" stroke-width="3" fill="none" stroke-linecap="round"/>` + can(x + 36, i); }
  } else if (id === 'desert') {
    h += `<circle cx="320" cy="20" r="11" fill="#F2A541" opacity=".9"/><path d="M120 70v-30h40l10-8h60l8 8h30v30z" fill="#B5653A" opacity=".55"/>`;
    for (let i = 0; i < 6; i++) { const x = 6 + i * 60; h += `<rect x="${x}" y="48" width="38" height="22" fill="#D9A06B"/><rect x="${x + 4}" y="44" width="30" height="5" fill="#C48A57"/><rect x="${x + 6}" y="54" width="7" height="7" fill="#7A4E2D" opacity=".7"/><rect x="${x + 22}" y="56" width="9" height="14" fill="#7A4E2D" opacity=".8"/>`;
      h += `<path d="M${x + 49} 70v-22M${x + 49} 58h-5v-6M${x + 49} 54h5v-5" stroke="#4F7A43" stroke-width="4" stroke-linecap="round" fill="none"/>` + can(x + 40, i); }
  } else if (id === 'metro') {
    const tall = [62, 40, 78, 52, 88, 46, 70, 58, 82, 44];
    tall.forEach((t, i) => { const x = i * 36; h += `<rect x="${x}" y="${70 - t}" width="32" height="${t}" fill="var(--house)" opacity="${.65 + (i % 3) * .1}"/>`;
      for (let wy = 74 - t; wy < 64; wy += 9) for (let wx = x + 5; wx < x + 28; wx += 8) h += `<rect class="win${(wx + wy) % 5 === 0 ? ' blink' : ''}" x="${wx}" y="${wy}" width="4" height="5" fill="#F2D49B" opacity="${(wx * 7 + wy) % 4 === 0 ? .9 : .3}"/>`;
      h += can(x + 26, i); });
  } else {
    for (let i = 0; i < 7; i++) { const x = 8 + i * 52; h += house(x, 26 + (i * 7 % 12)) + can(x + 38, i); }
  }
  return h;
}
function scene() {
  const gold = M.supporter, R = T.region(S), w = T.working(S), list = []; ['side', 'rear', 'front', 'roll', 'pickup'].forEach(k => { for (let i = 0; i < w[k] && list.length < 5; i++) list.push(k); });
  const dur = Math.max(7, 16 - list.length * 1.5);
  const trucks = list.map((k, i) => `<g class="truck" style="--dur:${dur}s;animation-delay:-${(i * dur / Math.max(1, list.length)).toFixed(2)}s"><g transform="translate(0 ${i % 2 ? 98 : 84})">${truckSvg(k)}</g></g>`).join('');
  return `<div class="scene t-${R.id}" aria-hidden="true"${gold ? ' style="--cab:#C9A13B"' : ''}><svg viewBox="0 0 360 132" preserveAspectRatio="xMidYMid slice"><rect y="70" width="360" height="16" fill="var(--grass)"/>${backdrop(R.id)}<rect y="86" width="360" height="46" fill="var(--road)"/><path d="M0 110h360" stroke="var(--panel)" stroke-width="2" stroke-dasharray="14 12" opacity=".7"/>${trucks}</svg><i class="tint"></i><span class="lbl">${esc(T.town(S, S.towns - 1).name)}${S.towns > 1 ? ' and ' + (S.towns - 1) + ' more' : ''} · ${esc(R.name)}</span></div>`;
}

/* ---------- tips for a new player ---------- */
function tip() {
  const e = T.economy(S), R = T.region(S);
  if (R.ban && S.rep < T.BAN.rep) return 'The county boards are fed up. Get your reputation above ' + T.BAN.rep + ' in the next ' + Math.max(1, Math.ceil(T.BAN.secs - (S.banClock || 0))) + 's or ' + R.name + ' runs you out.';
  if (R.ban && S.rep < T.BAN.rep + 10) return 'People in ' + R.name + ' are losing patience. If your reputation drops below ' + T.BAN.rep + ' for too long, you get run out of the region.';
  if (S.legacy.sales === 0 && T.truckCount(S) === 1 && S.cash < T.price.truck(S, 'pickup')) return 'Tap Ride along to earn your first dollars, and hand out flyers to sign up homes. Your pickup serves ' + Math.round(T.TRUCKS.pickup.cap * T.mults(S).cap) + ' homes.';
  if (T.truckCount(S) - 1 > S.drivers) return 'A truck is parked with nobody to drive it. Hire a driver on the Fleet tab.';
  if (e.totalMissed >= 1) return num(e.totalMissed) + (Math.floor(e.totalMissed) === 1 ? ' customer is' : ' customers are') + ' being missed. Add trucks on the Fleet tab, or pause sign-ups below, before your reputation drops.';
  if (T.truckCount(S) >= T.slots(S)) return 'Your yard is full. Open a new yard on the Fleet tab to park more trucks.';
  if (!S.unlocks.commercial && S.cash > 3000) return 'The Office tab has a commercial license: dumpsters pay far more per stop than homes.';
  return '';
}

/* ---------- views ---------- */
const svcRow = k => {
  const SV = T.SERVICES[k], locked = SV.unlock && !S.unlocks[SV.unlock];
  if (locked) return '';
  return `<div class="card"><div class="item"><div class="ic">${ic(k === 'res' ? 'house' : k === 'com' ? 'yard' : 'truck')}</div><div class="grow"><h3>${SV.name}</h3>
    <div class="meta num" ${B(() => { const e = T.economy(S), mk = T.market(S); return { h: `${num(S.cust[k])} of ${num(mk[k])} ${SV.unit} signed · trucks reach ${num(e.cap[k])}` + (e.missed[k] >= 1 ? ` · <span class="pill bad">${num(e.missed[k])} missed</span>` : '') }; })}></div>
    <div class="bar" ${B(() => { const e = T.economy(S); return { cls: e.missed[k] >= 1 ? 'bar bad' : 'bar good' }; })}><i ${B(() => { const e = T.economy(S); return { w: e.cap[k] ? 100 * Math.min(S.cust[k], e.cap[k]) / Math.max(e.cap[k], S.cust[k]) : 0 }; })}></i></div></div>
    <button class="switch" data-a="pause" data-x="${k}" ${B(() => ({ press: S.paused[k], t: S.paused[k] ? 'Sign-ups paused' : 'Taking sign-ups' }))}></button></div></div>`;
};

const VIEWS = {
  route() {
    return SEC(() => JSON.stringify(T.working(S)) + S.towns + M.supporter + S.region, scene) +
      `<div class="actions"><button class="tap" data-a="tap" id="tapbtn">Ride along<small ${B(() => '+' + money(T.tapValue(S), 2) + ' a tap')}></small></button>
       <button class="tap alt" data-a="flyer">Hand out flyers<small>sign up neighbors</small></button></div>` +
      SEC(() => M.offered, () => !M.offered ? '' : `<div class="card"><div class="item"><div class="ic">${ic('bolt')}</div><div class="grow"><h3>Double income</h3>
        <div class="about" ${B(() => S.boost > 0 ? '2× income for ' + clock(S.boost) + ' more. Bank up to 2 hours.' : 'Twice the money from every route for 30 minutes.')}></div></div>
        <button class="btn" data-a="boostAsk" ${B(() => { const full = S.boost > T.BASE.boostMax - T.BASE.boostSecs; if (full) return { h: 'Full<small>2 h banked</small>', dis: true };
          if (M.supporter) return { h: 'Add 30 min<small>Supporter</small>', dis: false }; return M.canReward ? { h: 'Watch ad<small>+30 min</small>', dis: false } : { h: 'Ad loading', dis: true }; })}></button></div></div>`) +
      `<div class="card warn" ${B(() => { const t = tip(); return { show: !!t, t }; })}></div>` +
      SEC(() => S.offer ? 'o' + S.offer.title : '', () => !S.offer ? '' : `<div class="card offer"><div class="small muted">Contract offer</div><h3>${esc(S.offer.title)}</h3>
        <div class="meta">${num(S.offer.qty)} ${T.SERVICES[S.offer.svc].unit} at once, plus a ${money(S.offer.bonus)} signing bonus.</div>
        <div class="meta muted" ${B(() => S.offer ? 'Needs room on your trucks for all of them. Offer ends in ' + Math.ceil(S.offer.left) + 's.' : '')}></div>
        <div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-a="acceptOffer" ${B(() => { if (!S.offer) return {}; const e = T.economy(S), room = e.cap[S.offer.svc] - S.cust[S.offer.svc]; return room >= S.offer.qty ? { t: 'Sign it', dis: false } : { t: 'Need ' + num(S.offer.qty - room) + ' more room', dis: true }; })}></button><button class="btn ghost" data-a="declineOffer">Pass</button></div></div>`) +
      SEC(() => S.down.map(d => d.id).join(), () => !S.down.length ? '' : `<div class="card"><h3 style="margin-bottom:6px">Roadcalls</h3>` + S.down.map(d => `<div class="item" style="margin-top:8px"><div class="ic" style="color:var(--bad)">${ic('wrench')}</div><div class="grow"><b>${esc(T.TRUCKS[d.type].name)}</b> on ${esc(d.where)}<div class="bar bad"><i ${B(() => { const x = S.down.find(z => z.id === d.id); return { w: x ? 100 * (1 - x.left / x.total) : 100 }; })}></i></div><div class="about" ${B(() => { const x = S.down.find(z => z.id === d.id); return x ? (S.mechanics ? 'Your mechanics are on it: ' : 'Waiting on the dealer: ') + Math.ceil(x.left) + 's' : 'Back on the road'; })}></div></div>
        <button class="btn" data-a="rushId" data-x="${d.id}" ${B(() => { const x = S.down.find(z => z.id === d.id); return x ? { h: 'Rush it<small>' + money(T.price.rush(S, x)) + '</small>', dis: S.cash < T.price.rush(S, x) } : { dis: true }; })}></button></div>`).join('') + '</div>') +
      `<h2>Next goals</h2>` + SEC(() => T.nextGoals(S, 3).map(g => g.a.id).join(), () => T.nextGoals(S, 3).map(g => `<div class="card"><div class="item"><div class="ic">${ic(g.a.icon)}</div><div class="grow"><h3>${esc(g.a.name)}</h3><div class="about">${esc(g.a.desc)}</div><div class="bar"><i ${B(() => ({ w: 100 * Math.min(1, g.a.get(S) / g.a.goal) }))}></i></div></div></div></div>`).join('')) +
      `<h2>Your routes</h2>` + SEC(() => Object.keys(S.unlocks).join(), () => ['res', 'com', 'ro'].map(svcRow).join('')) +
      `<h2>Today</h2><div class="card">${SEC(() => S.log.length + '|' + (S.log[0] ? S.log[0].t : ''), () => S.log.length ? '<ul class="log">' + S.log.slice(0, 12).map(l => `<li><span class="d">Day ${l.day}</span><span class="${l.kind}">${esc(l.txt)}</span></li>`).join('') + '</ul>' : '<div class="muted small">Nothing yet. Go ride along.</div>')}</div>`;
  },

  fleet() {
    const visible = T.TRUCK_ORDER.filter(k => !T.TRUCKS[k].unlock || S.unlocks[T.TRUCKS[k].unlock]);
    const locked = T.TRUCK_ORDER.filter(k => visible.indexOf(k) < 0);
    return `<div class="grid2"><div class="card stat"><div class="v num" ${B(() => T.truckCount(S) + ' / ' + T.slots(S))}></div><div class="l">trucks in your yards</div></div>
      <div class="card stat"><div class="v num" ${B(() => (S.drivers + 1) + ' / ' + T.truckCount(S))}></div><div class="l">drivers (you drive one)</div></div></div>
      <h2>Trucks</h2>` + visible.map(k => { const D = T.TRUCKS[k]; return `<div class="card"><div class="item"><div class="ic">${ic('truck')}</div><div class="grow"><h3>${esc(D.name)} <span class="pill num" ${B(() => '× ' + S.trucks[k])}></span></h3>
        <div class="about">${esc(D.about)}</div><div class="meta num" ${B(() => { const w = T.working(S)[k], m = T.mults(S); return { h: `Each reaches ${num(D.cap * m.cap)} ${T.SERVICES[D.svc].unit}. ` + (S.trucks[k] > w ? `<span class="pill bad">${S.trucks[k] - w} not running</span>` : (S.trucks[k] ? `${w} running` : '')) }; })}></div></div>
        ${buyBtn('Buy', () => T.price.truck(S, k), 'buyTruck', k, () => T.truckCount(S) >= T.slots(S) ? 'Yard full' : '')}</div></div>`; }).join('') +
      (locked.length ? `<div class="muted small" style="margin:-2px 2px 10px">More trucks open with: ${locked.map(k => esc(T.UNLOCKS[T.TRUCKS[k].unlock].name)).join(', ')} (Office tab).</div>` : '') +
      `<h2>People and places</h2>
      <div class="card"><div class="item"><div class="ic">${ic('people')}</div><div class="grow"><h3>Drivers <span class="pill num" ${B(() => '× ' + S.drivers)}></span></h3><div class="about" ${B(() => 'Each costs ' + money(T.BASE.wage * T.mults(S).wage, 2) + '/s in wages. ' + (T.needDrivers(S) > S.drivers ? (T.needDrivers(S) - S.drivers) + ' truck(s) need a driver.' : T.needDrivers(S) < S.drivers ? 'You have ' + (S.drivers - T.needDrivers(S)) + ' spare.' : 'Every truck has a driver.'))}></div></div>${buyBtn('Hire', () => T.price.driver(S), 'hireDriver')}</div></div>
      <div class="card"><div class="item"><div class="ic">${ic('wrench')}</div><div class="grow"><h3>Mechanics <span class="pill num" ${B(() => '× ' + S.mechanics)}></span></h3><div class="about">Fewer breakdowns and much faster repairs. ${money(T.BASE.mechWage, 2)}/s each.</div></div>${buyBtn('Hire', () => T.price.mechanic(S), 'hireMechanic')}</div></div>
      <div class="card"><div class="item"><div class="ic">${ic('yard')}</div><div class="grow"><h3>Yards <span class="pill num" ${B(() => '× ' + S.yards)}></span></h3><div class="about">${S.yards ? '' : 'Your driveway holds ' + T.BASE.drivewaySlots + ' trucks. '}Each yard parks ${T.BASE.yardSlots} more.</div></div>${buyBtn('Open', () => T.price.yard(S), 'buyYard')}</div></div>`;
  },

  grow() {
    return `<h2>Towns</h2>` + SEC(() => S.towns + '|' + S.region, () => {
      let h = ''; for (let i = 0; i < S.towns; i++) { const t = T.town(S, i); h += `<div class="card"><div class="item"><div class="ic">${ic('map')}</div><div class="grow"><h3>${esc(t.name)} <span class="pill good">serving</span></h3><div class="about num">${num(t.homes)} homes · ${num(t.biz)} businesses · ${num(t.sites)} job sites</div></div></div></div>`; }
      const n = T.town(S, S.towns);
      h += `<div class="card offer"><div class="item"><div class="ic">${ic('map')}</div><div class="grow"><h3>${esc(n.name)}</h3><div class="about num">${num(n.homes)} homes · ${num(n.biz)} businesses · ${num(n.sites)} job sites. Win the franchise to start signing them up.</div></div>${buyBtn('Bid', () => T.price.town(S), 'expand')}</div></div>`;
      return h;
    }) + `<h2>Regions</h2><p class="muted small" style="margin-top:-4px">Move the company to start over in a new region with a tenth of your cash. Later regions pay more, but trust comes slower, goes faster, and they can run you out for good. Selling the company clears every ban.</p>` +
      SEC(() => [S.region, Object.keys(S.banned || {}).join(), T.REGIONS.filter(r => S.earned >= r.need).length].join('|'), () => T.REGIONS.map((R, i) => {
        const here = i === S.region, banned = S.banned && S.banned[R.id], open = S.earned >= R.need;
        const diff = ['Easy', 'Fair', 'Tough', 'Hard', 'Harsh', 'Brutal'][i];
        const pill = here ? '<span class="pill good">you are here</span>' : banned ? '<span class="pill bad">ran you out</span>' : '';
        const btn = here ? '' : banned ? '<button class="btn" disabled>Banned</button>' : open ? `<button class="btn" data-a="moveAsk" data-x="${i}">Move<small>keep ${money(S.cash * T.BAN.keep)}</small></button>` : `<button class="btn" disabled>Locked<small>earn ${money(R.need)}</small></button>`;
        return `<div class="card${here ? ' offer' : ''}"><div class="item"><div class="ic">${ic('map')}</div><div class="grow"><h3>${esc(R.name)} ${pill}</h3><div class="about">${esc(R.about)}</div><div class="meta small muted">${i ? diff + ' · pays ' + R.rate + '× · towns ' + R.scale + '× bigger · can ban you' : 'Easy · never bans you'}</div></div>${btn}</div></div>`;
      }).join('')) + `<h2>Marketing</h2><div class="card"><div class="item"><div class="ic">${ic('pen')}</div><div class="grow"><h3>Door hangers and ads <span class="pill" ${B(() => 'level ' + S.marketing)}></span></h3><div class="about">+35% sign-up speed each level.</div></div>${buyBtn('Run', () => T.price.marketing(S), 'marketing')}</div></div>
      <h2>Your market</h2>` + SEC(() => Object.keys(S.unlocks).join(), () => ['res', 'com', 'ro'].map(svcRow).join('')) +
      `<div class="card"><h3>Money per second</h3>` + [['Collection', e => e.gross], ['Recycling sales', e => e.recycle, () => S.unlocks.recycling], ['Tipping fees from others', e => e.tipping, () => S.unlocks.landfill], ['Dump fees', e => -e.dump], ['Fuel', e => -e.fuel], ['Wages', e => -e.wages]].map(([l, f, on]) => `<div class="split" ${on ? B(() => ({ show: !!on() })) : ''}><span>${l}</span><b class="num" ${B(() => money(f(T.economy(S)), 2))}></b></div>`).join('') +
      `<div class="split"><span>Recycling price</span><b class="num" ${B(() => S.unlocks.recycling ? S.price.toFixed(2) + '×' : 'no program yet')}></b></div></div>`;
  },

  office() {
    return `<h2>Roundsman software</h2><p class="muted small" style="margin-top:-4px">The route book your crew already trusts. Each module is bought level by level.</p>` +
      Object.keys(T.SOFTWARE).map(k => { const M = T.SOFTWARE[k]; return `<div class="card"><div class="item"><div class="ic">${ic('office')}</div><div class="grow"><h3>${esc(M.name)} <span class="pill num" ${B(() => T.lvl(S.software, k) + ' / ' + M.max)}></span></h3><div class="about">${esc(M.about)}</div></div>${buyBtn('Upgrade', () => T.lvl(S.software, k) >= M.max ? null : T.price.software(S, k), 'software', k)}</div></div>`; }).join('') +
      `<h2>Big moves</h2>` + Object.keys(T.UNLOCKS).map(k => { const U = T.UNLOCKS[k]; return `<div class="card"><div class="item"><div class="ic">${ic(k === 'recycling' || k === 'mrf' || k === 'compost' ? 'recycle' : k === 'cng' ? 'bolt' : 'key')}</div><div class="grow"><h3>${esc(U.name)}</h3><div class="about">${esc(U.about)}</div></div>${buyBtn('Buy', () => S.unlocks[k] ? null : U.cost, 'unlock', k, () => U.needs && !S.unlocks[U.needs] ? 'Needs ' + T.UNLOCKS[U.needs].name.toLowerCase() : '')}</div></div>`; }).join('');
  },

  trophies() {
    return `<div class="card stat"><div class="v num" ${B(() => Object.keys(S.legacy.achievements).length + ' of ' + T.ACH.length)}></div><div class="l">trophies. Each one adds 2% to all revenue, for good.</div></div>` +
      SEC(() => Object.keys(S.legacy.achievements).length, () => '<div class="trophies">' + T.ACH.slice().sort((a, b) => (S.legacy.achievements[b.id] ? 1 : 0) - (S.legacy.achievements[a.id] ? 1 : 0)).map(a => { const got = S.legacy.achievements[a.id]; return `<div class="trophy${got ? ' got' : ''}"><div class="ic">${ic(a.icon)}</div><div><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p></div></div>`; }).join('') + '</div>');
  },

  company() {
    const L = S.legacy;
    return `<h2>${esc(S.name || 'Your company')}</h2>
      <div class="grid2"><div class="card stat"><div class="v num" ${B(() => money(S.earned))}></div><div class="l">earned this run</div></div>
      <div class="card stat"><div class="v num" ${B(() => L.stars + ' ★')}></div><div class="l" ${B(() => 'Legacy stars. Each adds 10% revenue (now +' + (L.stars * 10) + '%).')}></div></div></div>
      <div class="card"><h3>Sell the company</h3><p class="about">A buyer takes the trucks, towns and money. You keep your trophies and Legacy, and start again with one pickup, faster every time.</p>
        <div class="meta" ${B(() => { const st = T.starsFor(S); return { h: st ? `Buyers would give you <b>${st} Legacy star${st > 1 ? 's' : ''}</b>.` : `Buyers start calling once you have earned ${money(1e6)} in a run.` }; })}></div>
        <div style="margin-top:8px"><button class="btn" data-a="sellAsk" ${B(() => ({ dis: T.starsFor(S) < 1 }))}>Sell the company</button></div></div>
      <h2>Legacy perks</h2>` + Object.keys(T.LEGACY).map(k => { const D = T.LEGACY[k]; return `<div class="card"><div class="item"><div class="ic">${ic('star')}</div><div class="grow"><h3>${esc(D.name)} <span class="pill num" ${B(() => T.lvl(L.perks, k) + ' / ' + D.max)}></span></h3><div class="about">${esc(D.about)}</div></div>
        <button class="btn" data-a="legacy" data-x="${k}" ${B(() => { if (T.lvl(L.perks, k) >= D.max) return { h: 'Done', dis: true, cls: 'btn done' }; const c = T.price.legacy(S, k); return { h: 'Buy<small>' + c + ' ★</small>', dis: L.stars < c, cls: 'btn' }; })}></button></div></div>`; }).join('') +
      `<h2>Support the game</h2>` + SEC(() => [M.supporter, M.shopOn, M.price].join(), () => !(M.shopOn || M.supporter) ? '' : M.supporter
        ? `<div class="card"><div class="item"><div class="ic" style="color:var(--gold)">${ic('star')}</div><div class="grow"><h3>Supporter Pack <span class="pill good">owned</span></h3><div class="about">Thank you. Every reward is instant with no ads, your trucks wear gold, and you are helping fund Roundsman.</div></div></div></div>`
        : `<div class="card"><div class="item"><div class="ic" style="color:var(--gold)">${ic('star')}</div><div class="grow"><h3>Supporter Pack</h3><div class="about">One purchase, yours for good on your Google account: every reward with no ads, gold trucks on your street, and you help fund the Roundsman route software.</div></div>
          <button class="btn" data-a="buySupporter">Buy${M.price ? '<small>' + esc(M.price) + '</small>' : ''}</button></div>
          <div class="split" style="margin-top:8px"><span class="small muted">Bought it before, or on another phone?</span><button class="btn ghost" data-a="restoreSupporter">Restore</button></div></div>`) +
      `<div class="card"><div class="item"><div class="ic">${ic('route')}</div><div class="grow"><h3>Built on Roundsman</h3><div class="about">Roundsman is real route software for residential waste haulers. Run a hauling company? Take a look.</div></div><button class="btn ghost" data-a="roundsman">Visit</button></div></div>
      <h2>Settings</h2><div class="card"><div class="split"><span>Company name</span><button class="btn ghost" data-a="rename">Rename</button></div>
        <div class="split"><span>Theme</span><span class="seg">${['auto', 'light', 'dark'].map(t => `<button data-a="theme" data-x="${t}" ${B(() => ({ press: (S.theme || 'auto') === t }))}>${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</span></div>
        <div class="split"><span>Save code (move to another phone)</span><span><button class="btn ghost" data-a="exportSave">Copy</button> <button class="btn ghost" data-a="importSave">Load</button></span></div>
        <div class="split"><span>Away time</span><b ${B(() => 'up to ' + T.mults(S).awayH + ' hours')}></b></div>
        <div class="split"><span>Start over completely</span><button class="btn ghost" data-a="wipeAsk">Erase</button></div>
        <div class="split"><span>Privacy</span><button class="btn ghost" data-a="privacy">Read</button></div>
        ${SEC(() => M.privacyNeeded, () => M.privacyNeeded ? '<div class="split"><span>Ad privacy choices</span><button class="btn ghost" data-a="adPrivacy">Change</button></div>' : '')}</div>
      <p class="muted small">Idle Roundsman ${T.VERSION}, built on the Roundsman world. Saves on this device every few seconds.</p>`;
  }
};

/* ---------- modals and toasts ---------- */
function modal(html, onClick) {
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`;
  m.addEventListener('click', ev => { const b = ev.target.closest('[data-m]'); if (ev.target === m) m.remove(); if (!b) return; if (onClick(b.dataset.m, m) !== false) m.remove(); });
  document.body.appendChild(m); const f = m.querySelector('input,textarea,button'); if (f) f.focus(); return m;
}
function toast(a) {
  const w = $('#toasts'), t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<div class="ic">${ic(a.icon)}</div><div><b>Trophy</b>${esc(a.name)}<div class="small muted">${esc(a.desc)}</div></div>`;
  w.appendChild(t); setTimeout(() => t.remove(), 3800); while (w.children.length > 2) w.firstChild.remove();
}
function note(txt) {
  const w = $('#toasts'), t = document.createElement('div'); t.className = 'toast'; t.style.borderColor = 'var(--line)'; t.innerHTML = `<div>${esc(txt)}</div>`;
  w.appendChild(t); setTimeout(() => t.remove(), 2200);
}
function floatText(x, y, txt) { const f = document.createElement('div'); f.className = 'float'; f.style.left = (x - 20) + 'px'; f.style.top = (y - 20) + 'px'; f.textContent = txt; document.body.appendChild(f); setTimeout(() => f.remove(), 900); }
function welcome(r) {
  if (!r || r.seconds < 120) return;
  const h = Math.floor(r.seconds / 3600), m = Math.round(r.seconds % 3600 / 60);
  modal(`<h2>Welcome back</h2><p>Your crews ran routes for ${h ? h + ' h ' : ''}${m} min while you were away.</p><div class="split"><span>Cash made</span><b>${money(r.cash)}</b></div><div class="split"><span>New customers</span><b>${num(r.cust)}</b></div>${r.capped ? `<p class="small muted">Routes stop after ${T.mults(S).awayH} hours away. The Offline route book in the Office adds more.</p>` : ''}<div class="btns">${M.offered && r.cash > 0 ? `<button class="btn ghost" data-m="double">${M.supporter ? 'Double it' : 'Watch ad to double it'}</button>` : ''}<button class="btn" data-m="ok">Back to work</button></div>`, k => {
    if (k !== 'double') return;
    if (!M.canReward) { note('No ad is ready yet. Try again in a moment.'); return false; }
    M.reward().then(ok => { if (ok && !T.act.doubleAway(S, r)) { persist(); note('Doubled: +' + money(r.cash) + '.'); } else if (!ok) note('The ad did not finish, so nothing was added.'); });
  });
}

/* ---------- actions ---------- */
function setTheme(t) { if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }
const special = {
  tap(b, ev) { const v = T.act.tap(S); const r = b.getBoundingClientRect(); floatText(ev.clientX || r.left + r.width / 2, ev.clientY || r.top, '+' + money(v, 2)); if (navigator.vibrate) try { navigator.vibrate(4); } catch (e) { /* no haptics */ } },
  flyer(b, ev) { const r = b.getBoundingClientRect(), got = T.act.flyer(S); floatText(ev.clientX || r.left + r.width / 2, ev.clientY || r.top, got ? '+1 home' : 'no answer'); },
  rushId(b) { const i = S.down.findIndex(d => d.id === b.dataset.x); return T.act.rush(S, i); },
  sellAsk() { const st = T.starsFor(S); modal(`<h2>Sell ${esc(S.name || 'the company')}?</h2><p>You get <b>${st} Legacy star${st > 1 ? 's' : ''}</b> and start over with one pickup in Maple Hollow. Trophies and Legacy perks stay.</p><div class="btns"><button class="btn ghost" data-m="no">Keep running it</button><button class="btn" data-m="yes">Sell</button></div>`, k => { if (k === 'yes') { const name = S.name, theme = S.theme; S = T.act.sell(S); S.name = name; S.theme = theme; persist(); show('route'); } }); },
  legacy(b) { return T.act.legacy(S, b.dataset.x); },
  moveAsk(b) {
    const i = +b.dataset.x, R = T.REGIONS[i];
    modal(`<h2>Move to ${esc(R.name)}?</h2><p>You leave your trucks, towns and customers behind and start over in ${esc(R.towns[0])} with one pickup and <b>${money(S.cash * T.BAN.keep)}</b> (a tenth of your cash).</p><p>You keep your office software, trophies, Legacy and this run's earnings. ${R.ban ? 'Reputation here starts at ' + R.startRep + ', climbs slower and drops faster. Fall below ' + T.BAN.rep + ' for too long and they run you out until you sell the company.' : ''}</p><div class="btns"><button class="btn ghost" data-m="no">Stay</button><button class="btn" data-m="yes">Move</button></div>`, k => { if (k === 'yes') { const e = T.act.move(S, i); if (e) note(e); persist(); show('route'); } });
    return '';
  },
  boostAsk() {
    if (S.boost > T.BASE.boostMax - T.BASE.boostSecs) return T.act.boost(S);
    M.reward().then(ok => { if (!ok) { note('The ad did not finish, so no boost this time.'); return; } const e = T.act.boost(S); note(e || 'Double income for 30 more minutes.'); persist(); refresh(); });
    return '';
  },
  buySupporter() { M.buy().then(r => { note(r === 'owned' ? 'Thank you! The Supporter Pack is yours.' : 'Google Play is finishing your purchase. It will appear here when it is done.'); refresh(); }).catch(() => {}); return ''; },
  restoreSupporter() { M.restore().then(own => note(own ? 'Supporter Pack restored.' : 'No Supporter Pack found on this Google account.')).catch(() => note('Could not reach Google Play. Try again with a signal.')); return ''; },
  roundsman() { M.openRoundsman(); return ''; },
  adPrivacy() { M.privacyOptions().catch(() => {}); return ''; },
  rename() { askName(); },
  theme(b) { S.theme = b.dataset.x; setTheme(S.theme); persist(); },
  exportSave() { const c = T.exportCode(S); modal(`<h2>Save code</h2><p class="small muted">Copy this and load it on another phone.</p><textarea readonly>${esc(c)}</textarea><div class="btns"><button class="btn" data-m="copy">Copy</button><button class="btn ghost" data-m="ok">Close</button></div>`, (k, m) => { if (k === 'copy') { const ta = m.querySelector('textarea'); ta.select(); try { navigator.clipboard.writeText(c); } catch (e) { document.execCommand('copy'); } note('Copied.'); } }); },
  importSave() { modal(`<h2>Load a save code</h2><p class="small muted">This replaces the game on this phone.</p><textarea></textarea><div class="btns"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="load">Load</button></div>`, (k, m) => { if (k !== 'load') return; try { S = T.importCode(m.querySelector('textarea').value); setTheme(S.theme || 'auto'); persist(); show('route'); note('Save loaded.'); } catch (e) { note('That code did not work.'); return false; } }); },
  privacy() { modal(`<h2>Privacy</h2>${M.native ? `<p>Idle Roundsman has no accounts and never asks for your name, email or location. Your company is saved only on this phone.</p><p>Ads play only when you tap a reward button. Those ads come from Google AdMob, which uses your phone's advertising ID and basic device information to show and count ads. Players in Europe and the UK are asked first. Purchases go through Google Play, and we never see your payment details.</p><p>` : `<p>Idle Roundsman does not collect, store or share any personal information. There are no accounts, ads, analytics or trackers.</p><p>Your company is saved only on this device. `} A save code is created only when you press Copy, and goes only where you paste it. Uninstalling the game or pressing Erase deletes everything.</p><p class="small muted">Full policy: <a href="${T.PRIVACY_URL}" target="_blank" rel="noopener">${esc(T.PRIVACY_URL.replace('https://', ''))}</a></p><div class="btns"><button class="btn" data-m="ok">Close</button></div>`, () => {}); },
  wipeAsk() { modal(`<h2>Erase everything?</h2><p>This deletes the company, your trophies and Legacy on this phone. It cannot be undone.</p><div class="btns"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" style="background:var(--bad);border-color:var(--bad)" data-m="yes">Erase</button></div>`, k => { if (k === 'yes') { S = T.fresh(); persist(); show('route'); askName(); } }); }
};
function onClick(ev) {
  const t = ev.target.closest('[data-tab]'); if (t) { show(t.dataset.tab); return; }
  const b = ev.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, x = b.dataset.x;
  let err = '';
  if (special[a]) err = special[a](b, ev) || ''; else if (T.act[a]) err = T.act[a](S, x) || '';
  if (typeof err === 'string' && err) note(err);
  if (a !== 'tap' && a !== 'flyer') persist();
  // the tab shape can change after a purchase (a new truck type, a new town)
  if (['unlock', 'expand', 'buyYard'].indexOf(a) >= 0 && tab !== 'route') show(tab); else refresh();
}
function askName() {
  modal(`<h2>${S.name ? 'Rename your company' : 'Start your trash company'}</h2>${S.name ? '' : '<p>You have one pickup, a trailer and 400 homes in Maple Hollow who need their cans emptied. Grow it into whatever you like.</p>'}<label class="small muted" for="nm">Company name</label><input type="text" id="nm" maxlength="32" value="${esc(S.name || 'Curbside Hauling')}"><div class="btns"><button class="btn" data-m="ok">${S.name ? 'Save' : 'Start hauling'}</button></div>`, (k, m) => { const v = m.querySelector('#nm').value.trim(); S.name = v || 'Curbside Hauling'; persist(); header(); refresh(); });
}

/* ---------- save and clock ---------- */
function persist() { try { localStorage.setItem(KEY, T.save(S)); } catch (e) { /* storage blocked: the game still runs */ } }
function frame() {
  const now = Date.now(), gap = (now - lastFrame) / 1000; lastFrame = now;
  if (gap > 30) { S.lastSeen = now - gap * 1000; welcome(T.catchUp(S, now)); }
  else if (gap > 0) T.tick(S, gap);
  if ((S.region || 0) !== shownRegion) { // run out of a region while playing
    const from = T.REGIONS[shownRegion]; shownRegion = S.region || 0;
    if (S.banned && S.banned[from.id]) modal(`<h2>Run out of ${esc(from.name)}</h2><p>Too many missed pickups and angry calls. The county boards pulled your permits, and you cannot work in ${esc(from.name)} again until you sell the company.</p><p>You are starting over in ${esc(T.region(S).name)} with a tenth of your cash. Keep enough trucks running next time.</p><div class="btns"><button class="btn" data-m="ok">Start over</button></div>`, () => {});
    persist(); show(tab);
  }
  const got = T.checkAch(S); got.forEach(toast); newTrophies += got.length;
  const dot = $('#dot-trophies'); if (dot) dot.classList.toggle('on', newTrophies > 0 && tab !== 'trophies');
  const fd = $('#dot-route'); if (fd) fd.classList.toggle('on', tab !== 'route' && (!!S.offer || S.down.length > 0));
  refresh();
}

function start() {
  let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  try { S = raw ? T.load(raw) : T.fresh(); } catch (e) { S = T.fresh(); }
  setTheme(S.theme || 'auto');
  let r = null; if (raw) r = T.catchUp(S);
  try { const t = localStorage.getItem(KEY + '-tab'); if (t && VIEWS[t]) tab = t; } catch (e) { /* private mode */ }
  tabsBar(); show(tab);
  document.addEventListener('click', onClick);
  M.onChange(refresh);
  setInterval(frame, 250); setInterval(persist, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  window.addEventListener('pagehide', persist);
  if (!S.name) askName(); else welcome(r);
}
window.addEventListener('DOMContentLoaded', start);
})();
