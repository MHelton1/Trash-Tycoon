/* Pacing bot: plays the game greedily and prints when it reaches each milestone.
   Use: node tools/sim.js [hours] [taps-per-second]   (MOVE=1 moves on to each region as soon as it opens)  */
'use strict';
const TT = require('../web/engine.js');
const hours = +process.argv[2] || 6, tps = process.argv[3] !== undefined ? +process.argv[3] : 2;
let s = TT.fresh(); s.seed = 42;
const seen = new Set(), mark = (t, what) => { if (!seen.has(what)) { seen.add(what); console.log(clock(t).padStart(8), what); } };
const clock = t => { const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60); return (h ? h + 'h' : '') + String(m).padStart(h ? 2 : 1, '0') + 'm'; };

function think() {
  const e = TT.economy(s), mk = TT.market(s), P = TT.price, A = TT.act;
  if (s.offer) A.acceptOffer(s);
  s.down.forEach((d, i) => { if (P.rush(s, d) < s.cash * 0.05) A.rush(s, i); });
  const cands = [];
  const parked = TT.truckCount(s) - 1 - s.drivers;
  if (parked > 0) cands.push(['driver', P.driver(s), () => A.hireDriver(s)]);
  ['res', 'com', 'ro'].forEach(k => {
    if (k !== 'res' && !s.unlocks[k === 'com' ? 'commercial' : 'rolloff']) return;
    const want = Math.min(mk[k], s.cust[k] + mk[k] * 0.05);
    if (e.cap[k] < want) {
      const opts = TT.TRUCK_ORDER.filter(t => TT.TRUCKS[t].svc === k && (!TT.TRUCKS[t].unlock || s.unlocks[TT.TRUCKS[t].unlock]));
      let best = null; opts.forEach(t => { const v = TT.TRUCKS[t].cap / P.truck(s, t); if (!best || v > best[1]) best = [t, v]; });
      if (TT.truckCount(s) >= TT.slots(s)) cands.push(['yard', P.yard(s), () => A.buyYard(s)]);
      else if (best) cands.push(['truck ' + best[0], P.truck(s, best[0]) + (parked >= 0 ? P.driver(s) : 0), () => { A.buyTruck(s, best[0]); if (TT.truckCount(s) - 1 > s.drivers) A.hireDriver(s); }]);
    }
  });
  const fill = (s.cust.res + s.cust.com + s.cust.ro) / (mk.res + mk.com + mk.ro);
  ['res','com','ro'].forEach(k => { s.paused[k] = e.missed[k] > 0; });
  if (fill > 0.6) cands.push(['town', P.town(s), () => A.expand(s)]);
  if (s.marketing < 25 && fill < 0.6) cands.push(['mkt', P.marketing(s), () => A.marketing(s)]);
  Object.keys(TT.SOFTWARE).forEach(k => { if (TT.lvl(s.software, k) < TT.SOFTWARE[k].max) cands.push(['sw ' + k, P.software(s, k) * (k === 'offline' ? 3 : 1), () => A.software(s, k)]); });
  Object.keys(TT.UNLOCKS).forEach(k => { const U = TT.UNLOCKS[k]; if (!s.unlocks[k] && (!U.needs || s.unlocks[U.needs])) cands.push(['unlock ' + k, U.cost, () => A.unlock(s, k)]); });
  if (s.mechanics < TT.truckCount(s) / 6) cands.push(['mech', P.mechanic(s) * 2, () => A.hireMechanic(s)]);
  cands.sort((a, b) => a[1] - b[1]);
  for (const c of cands.slice(0, 3)) if (c[1] <= s.cash) { c[2](); if (process.env.V && t0 < +process.env.V * 60) console.log(clock(t0).padStart(8), '   buy', c[0], TT.fmtMoney(c[1])); return true; }
  return false;
}

let t0 = 0;
for (let t = 0; t < hours * 3600; t++) { t0 = t;
  if (t < 1200 && (tps >= 1 || t % Math.round(1 / tps) === 0)) for (let i = 0; i < Math.max(1, tps); i++) TT.act.tap(s);
  if (t < 600 && t % 2 === 0) TT.act.flyer(s);
  TT.tick(s, 1);
  for (let k = 0; k < 4 && think(); k++);
  if (process.env.MOVE) { const r = (s.region || 0) + 1; if (TT.REGIONS[r] && s.earned >= TT.REGIONS[r].need && !TT.act.move(s, r)) console.log(clock(t).padStart(8), 'moved to', TT.REGIONS[r].name, 'with', TT.fmtMoney(s.cash)); }
  TT.checkAch(s).forEach(a => mark(t, '★ ' + a.name + ' — ' + a.desc));
  Object.keys(s.unlocks).forEach(k => mark(t, 'unlock ' + k));
  if (t % 1800 === 0) { const e = TT.economy(s); console.log(clock(t).padStart(8), `  [cash ${TT.fmtMoney(s.cash)} net ${TT.fmtMoney(e.net)}/s cust ${TT.fmt(e.totalCust)} missed ${TT.fmt(e.totalMissed)} rep ${s.rep.toFixed(0)} region ${s.region} trucks ${TT.truckCount(s)} towns ${s.towns} stars ${TT.starsFor(s)}]`); }
}
console.log('achievements', Object.keys(s.legacy.achievements).length, '/', TT.ACH.length);
if (process.env.DUMP) require('fs').writeFileSync(process.env.DUMP, TT.save(s));
