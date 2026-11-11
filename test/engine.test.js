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
t('a new region starts with its set amount; the old one is kept as it was', () => {
  const s = TT.fresh(); s.cash = 1e6; s.earned = 2e7; s.trucks.rear = 3; s.software.planner = 2; s.towns = 3;
  assert.match(TT.act.move(s, 2), /Earn/);
  assert.equal(TT.act.move(s, 1), ''); assert.equal(s.region, 1); assert.equal(s.cash, TT.REGIONS[1].fund); assert.equal(s.earned, 2e7);
  assert.equal(s.trucks.rear, 0); assert.equal(s.towns, 1); assert.equal(s.software.planner, 2); assert.equal(s.rep, 50);
  assert.equal(TT.town(s, 0).name, 'Loon Lake'); assert(TT.market(s).res > 400);
  s.cash = 777;
  assert.equal(TT.act.move(s, 0), ''); assert.equal(s.region, 0); assert.equal(s.trucks.rear, 3); assert.equal(s.towns, 3); assert(s.cash >= 1e6, 'money does not move between regions');
  assert.equal(TT.act.move(s, 1), ''); assert.equal(s.cash, 777); assert.equal(TT.town(s, 0).name, 'Loon Lake');
});
t('regions you are not in keep running at a quarter speed; a manager speeds them up', () => {
  const mk = mgr => { const s = TT.fresh(); s.earned = 2e7; s.cust.res = 40; s.manager = mgr; TT.act.move(s, 1); return s; };
  const a = mk(0), b = mk(5), c0 = a.regions[0].cash;
  for (let i = 0; i < 100; i++) { TT.tick(a, 1, true); TT.tick(b, 1, true); }
  const gotA = a.regions[0].cash - c0, gotB = b.regions[0].cash - c0, full = TT.fresh(); full.cust.res = 40; const f0 = full.cash; for (let i = 0; i < 100; i++) TT.tick(full, 1, true);
  const gotF = full.cash - f0;
  assert(gotA > 0 && Math.abs(gotA / gotF - 0.25) < 0.06, 'quarter speed ' + gotA / gotF); assert(Math.abs(gotB / gotF - 1) < 0.06, 'manager level 5 runs it at full speed ' + gotB / gotF);
  assert.equal(TT.awaySpeed({ manager: 2 }), 0.55);
});
t('run out of a hard region: shut for 30 minutes, half the customers lost, trucks kept', () => {
  const s = TT.fresh(); s.earned = 6e8; TT.act.move(s, 2); s.trucks.rear = 4; s.drivers = 4; s.cust.res = 1000; s.rep = 5;
  for (let i = 0; i < 130 && s.region === 2; i++) { s.rep = 5; TT.tick(s, 1); }
  assert.equal(s.region, 0, 'back to the branch you have'); assert(!s.banned.plains); assert.match(TT.act.move(s, 2), /shut to you for 30 more minutes/);
  const p = s.regions[2]; assert.equal(p.trucks.rear, 4); assert(p.cust.res <= 500); assert.equal(p.rep, TT.REGIONS[2].startRep);
  assert(TT.checkAch(s).some(a => a.id === 'banned'));
  for (let i = 0; i < 31; i++) TT.tick(s, 60, true);
  assert.equal(TT.act.move(s, 2), ''); assert.equal(s.trucks.rear, 4);
});
t('run out of Capital Metro: that branch is gone until you rebrand, and it starts lower each time', () => {
  const s = TT.fresh(); s.name = 'Curbside Hauling'; s.earned = 2e13; TT.act.move(s, 5); s.trucks.rear = 9; s.rep = 5;
  for (let i = 0; i < 130 && s.region === 5; i++) { s.rep = 5; TT.tick(s, 1); }
  assert.equal(s.region, 0, 'back to a branch you already have'); assert(s.banned.metro); assert(!s.regions[5]); assert.match(TT.act.move(s, 5), /Rebrand/);
  assert.equal(TT.price.rename(s), 0, 'the first change from the starting name is free');
  assert.equal(TT.act.rename(s, 'Blue Line Waste'), ''); assert(!s.banned.metro); assert.equal(s.metroRep, TT.REGIONS[5].startRep - 10);
  assert.equal(TT.act.move(s, 5), ''); assert.equal(s.trucks.rear, 0); assert.equal(s.rep, 20); assert.equal(s.cash, TT.REGIONS[5].fund);
  assert(TT.price.rename(s) >= 25000, 'after that, renaming costs'); s.cash = 0; assert.match(TT.act.rename(s, 'Again'), /costs/);
});
t('old saves: a run-out that lasted until a sale is lifted, except Capital Metro', () => {
  const s = TT.fresh(); s.banned = { plains: 1, metro: 1 }; const l = TT.load(TT.save(s)); assert(!l.banned.plains); assert(l.banned.metro); assert.deepEqual(l.regions, {});
});
t('selling the company clears every region and ban', () => {
  const s = TT.fresh(); s.earned = 2e13; TT.act.move(s, 1); s.banned.metro = 1; const n = TT.act.sell(s); assert.equal(n.region, 0); assert.deepEqual(n.regions, {}); assert(!n.banned.metro);
});
t('route supervisors: open at 15 drivers, more stops and fewer breakdowns for the drivers they cover', () => {
  const s = TT.fresh(); s.cash = 1e9; s.drivers = 10; assert.match(TT.act.hireSupervisor(s), /15 drivers/);
  s.drivers = 30; s.trucks.rear = 30; s.yards = 3; const c0 = TT.capacity(s).res, b0 = TT.mults(s).brk;
  assert.equal(TT.act.hireSupervisor(s), ''); assert.equal(TT.superCover(s), 0.5);
  assert(Math.abs(TT.capacity(s).res / c0 - 1.05) < 1e-9); assert(TT.mults(s).brk < b0); assert(TT.wagesPerSec(s) > 0);
});
t('yard levels park more trucks and add perks; every yard upgrades together', () => {
  const s = TT.fresh(); s.cash = 1e12; assert.match(TT.act.upgradeYards(s), /Open a yard/);
  TT.act.buyYard(s); TT.act.buyYard(s); assert.equal(TT.slots(s), 24);
  const p1 = TT.price.yardTier(s); assert.equal(TT.act.upgradeYards(s), ''); assert.equal(TT.slots(s), 34); assert(TT.mults(s).repair < 1);
  assert(TT.price.yardTier(s) > p1); TT.act.upgradeYards(s); TT.act.upgradeYards(s); assert.equal(TT.slots(s), 94);
  assert(TT.mults(s).fuel < 1 && TT.mults(s).dump < 1); assert.match(TT.act.upgradeYards(s), /as big/);
});
t('the home region never bans, and time away never bans', () => {
  const s = TT.fresh(); s.rep = 1; for (let i = 0; i < 300; i++) { s.rep = 1; TT.tick(s, 1); } assert.equal(s.region, 0);
  const h = TT.fresh(); h.earned = 2e7; TT.act.move(h, 1); h.rep = 1; h.lastSeen = Date.now() - 3600e3; TT.catchUp(h); assert.equal(h.region, 1);
});
t('reputation climbs slower and falls faster in later regions', () => {
  const a = TT.fresh(), b = TT.fresh(); b.earned = 1e13; TT.act.move(b, 5);
  a.rep = b.rep = 50; TT.tick(a, 1); TT.tick(b, 1); assert(a.rep - 50 > b.rep - 50);
});
t('drivers stay cheap next to the trucks they drive', () => {
  const s = TT.fresh(); s.drivers = 150; s.trucks.side = 150;
  assert(TT.price.driver(s) < TT.price.truck(s, 'side') / 1000);
});
t('training: pros and veterans add stops to the biggest trucks', () => {
  const s = TT.fresh(); s.cash = 1e12; s.unlocks.arms = true; s.yards = 2;
  for (let i = 0; i < 12; i++) { TT.act.buyTruck(s, 'rear'); TT.act.hireDriver(s); }
  TT.act.buyTruck(s, 'side'); TT.act.hireDriver(s);
  const before = TT.capacity(s).res;
  assert.equal(TT.act.train(s, 'vet'), 'Needs 50 drivers on the payroll first.');
  assert.equal(TT.act.train(s, 'pro'), ''); assert.equal(s.pros, 1);
  assert(Math.abs(TT.capacity(s).res - before - 0.3 * 1100) < 1e-6, 'the pro should drive the side loader');
  s.drivers = 60; assert.equal(TT.act.train(s, 'vet'), ''); assert.equal(s.pros, 0); assert.equal(s.vets, 1);
  assert(TT.wagesPerSec(s) > 0);
});
t('old saves with higher software levels are capped', () => {
  const s = TT.fresh(); s.software.pricing = 18; assert.equal(TT.load(TT.save(s)).software.pricing, 15);
});
console.log(n + ' checks passed');
