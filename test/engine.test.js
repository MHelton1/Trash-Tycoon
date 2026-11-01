/* Engine checks. Use: node test/engine.test.js */
'use strict';
const assert = require('assert'), TT = require('../web/engine.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('a new game has one pickup, no cash and Maple Hollow', () => {
  const s = TT.fresh(); assert.equal(s.trucks.pickup, 1); assert.equal(s.cash, 0); assert.equal(TT.market(s).res, 400);
});
t('riding along pays and customers sign up on their own', () => {
  const s = TT.fresh(); TT.act.tap(s); assert(s.cash >= 1);
  for (let i = 0; i < 120; i++) TT.tick(s, 1, true); assert(s.cust.res > 10); assert(s.cash > 1);
});
t('a pickup serves 40 homes; more customers than that are missed and hurt reputation', () => {
  const s = TT.fresh(); s.cust.res = 200; const e = TT.economy(s); assert.equal(e.served.res, 40); assert.equal(e.missed.res, 160);
  const r0 = s.rep; for (let i = 0; i < 60; i++) TT.tick(s, 1, true); assert(s.rep < r0);
});
t('a second truck sits parked until a driver is hired', () => {
  const s = TT.fresh(); s.cash = 1e5; assert.equal(TT.act.buyTruck(s, 'rear'), '');
  assert.equal(TT.working(s).rear + TT.working(s).pickup, 1);
  TT.act.hireDriver(s); assert.equal(TT.working(s).rear, 1); assert.equal(TT.working(s).pickup, 1);
});
t('locked trucks and a full yard refuse to sell', () => {
  const s = TT.fresh(); s.cash = 1e9; assert.match(TT.act.buyTruck(s, 'front'), /Commercial/);
  TT.act.buyTruck(s, 'pickup'); TT.act.buyTruck(s, 'pickup'); TT.act.buyTruck(s, 'pickup'); assert.match(TT.act.buyTruck(s, 'pickup'), /yard/);
  TT.act.buyYard(s); assert.equal(TT.act.buyTruck(s, 'pickup'), '');
});
t('unlocks need their prerequisite', () => {
  const s = TT.fresh(); s.cash = 1e9; assert.match(TT.act.unlock(s, 'landfill'), /Transfer/); TT.act.unlock(s, 'transfer'); assert.equal(TT.act.unlock(s, 'landfill'), '');
  assert.equal(TT.economy(s).dump, 0);
});
t('towns keep going past the named map', () => {
  const a = TT.townDef(6), b = TT.townDef(7); assert(b.homes > a.homes && b.cost > a.cost); assert.match(a.name, /County/);
});
t('paused sign-ups stop growth', () => {
  const s = TT.fresh(); TT.act.pause(s, 'res'); for (let i = 0; i < 60; i++) TT.tick(s, 1, true); assert.equal(s.cust.res, 0);
});
t('contracts need room on the trucks', () => {
  const s = TT.fresh(); s.offer = { svc: 'res', title: 'x', qty: 100, bonus: 500, left: 90 };
  assert.match(TT.act.acceptOffer(s), /room/); s.trucks.rear = 1; s.drivers = 1;
  assert.equal(TT.act.acceptOffer(s), ''); assert.equal(s.cust.res, 100); assert.equal(s.cash, 500);
});
t('achievements are found and kept after selling', () => {
  const s = TT.fresh(); s.earned = 2e6; s.cust.res = 60; const got = TT.checkAch(s).map(a => a.id);
  assert(got.includes('cust0') && got.includes('earn3'));
  const n2 = TT.act.sell(s); assert(n2.legacy.stars >= 1); assert(n2.legacy.achievements.cust0); assert.equal(n2.trucks.pickup, 1); assert.equal(n2.cash, 0);
});
t('selling needs $1M earned', () => { const s = TT.fresh(); assert.equal(typeof TT.act.sell(s), 'string'); });
t('time away is capped and pays', () => {
  const s = TT.fresh(); s.cust.res = 40; s.lastSeen = Date.now() - 10 * 3600e3; const r = TT.catchUp(s);
  assert(r.capped); assert.equal(r.seconds, 4 * 3600); assert(r.cash > 0);
});
t('saves round-trip through a code', () => {
  const s = TT.fresh(); s.cash = 1234; s.software.planner = 2; s.name = 'Test & Co';
  const b = TT.importCode(TT.exportCode(s)); assert.equal(b.cash, 1234); assert.equal(b.software.planner, 2); assert.equal(b.name, 'Test & Co');
  assert.throws(() => TT.load('{"v":9}'));
});
t('numbers read well', () => {
  assert.equal(TT.fmt(999), '999'); assert.equal(TT.fmt(1500), '1.50K'); assert.equal(TT.fmtMoney(2.5e9), '$2.50B'); assert.equal(TT.fmtMoney(-12), '-$12');
});
t('a long greedy game runs without NaN', () => {
  const s = TT.fresh(); s.seed = 7; s.cash = 1e25;
  Object.keys(TT.UNLOCKS).forEach(k => TT.act.unlock(s, k)); for (let i = 0; i < 12; i++) TT.act.expand(s);
  for (let i = 0; i < 20; i++) TT.act.buyYard(s); for (let i = 0; i < 150; i++) { TT.act.buyTruck(s, 'side'); TT.act.hireDriver(s); }
  for (let i = 0; i < 3600; i++) TT.tick(s, 1); const e = TT.economy(s);
  assert(isFinite(s.cash) && isFinite(e.net) && isFinite(s.rep)); assert(s.towns === 13);
});
t('a boost doubles income, runs out, and caps at two hours', () => {
  const s = TT.fresh(); s.cust.res = 40; const base = TT.economy(s).income;
  assert.equal(TT.act.boost(s), ''); assert.equal(s.boost, 1800); assert(Math.abs(TT.economy(s).income - 2 * base) < 1e-9);
  for (let i = 0; i < 3; i++) TT.act.boost(s); assert.equal(s.boost, 7200); assert.match(TT.act.boost(s), /banked/);
  TT.tick(s, 7200); assert.equal(s.boost, 0); assert(Math.abs(TT.economy(s).income - base) < 1e-9);
});
t('away earnings double once', () => {
  const s = TT.fresh(); s.cust.res = 40; s.lastSeen = Date.now() - 3600e3; const r = TT.catchUp(s), c = s.cash;
  assert.equal(TT.act.doubleAway(s, r), ''); assert(Math.abs(s.cash - (c + r.cash)) < 1e-6); assert.notEqual(TT.act.doubleAway(s, r), '');
});
t('a banked boost survives selling the company', () => { const s = TT.fresh(); s.earned = 2e6; TT.act.boost(s); assert.equal(TT.act.sell(s).boost, 1800); });
t('moving region starts over with a tenth of the cash and keeps earnings', () => {
  const s = TT.fresh(); s.cash = 1e6; s.earned = 2e7; s.trucks.rear = 3; s.software.planner = 2; s.towns = 3;
  assert.match(TT.act.move(s, 2), /Earn/);
  assert.equal(TT.act.move(s, 1), ''); assert.equal(s.region, 1); assert.equal(s.cash, 1e5); assert.equal(s.earned, 2e7);
  assert.equal(s.trucks.rear, 0); assert.equal(s.towns, 1); assert.equal(s.software.planner, 2); assert.equal(s.rep, 50);
  assert.equal(TT.town(s, 0).name, 'Loon Lake'); assert(TT.market(s).res > 400);
});
t('a bad reputation in a hard region gets you run out, until you sell', () => {
  const s = TT.fresh(); s.earned = 6e8; s.cash = 1e5; TT.act.move(s, 2); s.rep = 5;
  for (let i = 0; i < 130 && s.region === 2; i++) { s.rep = 5; TT.tick(s, 1); }
  assert.equal(s.region, 1); assert(s.banned.plains); assert.match(TT.act.move(s, 2), /ran you out/);
  assert(TT.checkAch(s).some(a => a.id === 'banned'));
  const n2 = TT.act.sell(s); assert.equal(n2.region, 0); assert(!n2.banned.plains);
});
t('the home region never bans, and time away never bans', () => {
  const s = TT.fresh(); s.rep = 1; for (let i = 0; i < 300; i++) { s.rep = 1; TT.tick(s, 1); } assert.equal(s.region, 0);
  const h = TT.fresh(); h.earned = 2e7; TT.act.move(h, 1); h.rep = 1; h.lastSeen = Date.now() - 3600e3; TT.catchUp(h); assert.equal(h.region, 1);
});
t('reputation climbs slower and falls faster in later regions', () => {
  const a = TT.fresh(), b = TT.fresh(); b.earned = 1e13; TT.act.move(b, 5);
  a.rep = b.rep = 50; TT.tick(a, 1); TT.tick(b, 1); assert(a.rep - 50 > b.rep - 50);
});
console.log(n + ' checks passed');
