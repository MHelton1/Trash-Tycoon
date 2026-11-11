/* Idle Roundsman engine: the whole simulation, with no screen code, so it runs the same in the app, in tests and in the pacing bot.
   Time is in seconds. Money is in dollars. Everything that grows uses a price multiplier per item already owned. */
(function (root) {
'use strict';

const SERVICES = {
  res: { name: 'Residential', unit: 'homes', each: 'home', rate: 0.25, dump: 0.02, market: 'homes' },
  com: { name: 'Commercial', unit: 'businesses', each: 'business', rate: 3, dump: 0.25, market: 'biz', unlock: 'commercial' },
  ro:  { name: 'Roll-off', unit: 'job sites', each: 'job site', rate: 25, dump: 2.5, market: 'sites', unlock: 'rolloff' }
};

const TRUCKS = {
  pickup: { name: 'Pickup with trailer', svc: 'res', cap: 40, cost: 60, mult: 1.3, fuel: 0.05, about: 'Where everyone starts. Cans in the bed, bags on the trailer.' },
  rear:   { name: 'Rear loader', svc: 'res', cap: 400, cost: 900, mult: 1.13, fuel: 0.4, about: 'Two on the back, one driving. The workhorse of residential.' },
  side:   { name: 'Automated side loader', svc: 'res', cap: 1100, cost: 60000, mult: 1.1, fuel: 0.7, unlock: 'arms', about: 'One driver, an arm and a joystick. Carts must be at the curb.' },
  front:  { name: 'Front loader', svc: 'com', cap: 60, cost: 4000, mult: 1.13, fuel: 0.6, unlock: 'commercial', about: 'Forks over the cab for restaurant and store dumpsters.' },
  roll:   { name: 'Roll-off truck', svc: 'ro', cap: 8, cost: 15000, mult: 1.13, fuel: 0.7, unlock: 'rolloff', about: 'Drops and pulls 30-yard boxes at construction sites.' }
};
const TRUCK_ORDER = ['pickup', 'rear', 'side', 'front', 'roll'];

const TOWNS = [
  { id: 'maple', name: 'Maple Hollow', homes: 400, biz: 20, sites: 2, cost: 0 },
  { id: 'cedar', name: 'Cedar Falls', homes: 1500, biz: 80, sites: 8, cost: 5000 },
  { id: 'river', name: 'Riverton', homes: 5000, biz: 300, sites: 30, cost: 150000 },
  { id: 'granite', name: 'Granite City', homes: 18000, biz: 1100, sites: 110, cost: 2.2e6 },
  { id: 'ashby', name: 'Port Ashby', homes: 60000, biz: 3800, sites: 380, cost: 3.5e7 },
  { id: 'metro', name: 'Metro Bay', homes: 220000, biz: 14000, sites: 1400, cost: 6e8 }
];
const COUNTY_NAMES = ['Three Forks', 'Iron Range', 'Northwoods', 'Twin Rivers', 'Bluegrass', 'Red Rock', 'Pine Barrens', 'Silver Coast', 'Stone Ridge', 'Fox Hollow', 'Elk Run', 'Copper Hills'];

/* Regions (Nov 11): each region is its own branch of the company, with its own cash, trucks, yards, towns and
   customers. Money does not move between them. A region opens once this run has earned its `need`, and starts with
   a set amount (`fund`). After that you can switch back and forth for free; the regions you are not looking at keep
   running at a quarter speed, faster with a regional manager.
   Later regions pay more and have bigger towns, but people trust slowly and turn on you fast. Let your reputation sit
   in the gutter and you get run out: the region is shut for 30 minutes and loses half its customers (trucks and yards
   stay, reputation starts over). Capital Metro is harsher: run out of there and that branch is gone, until you
   rebrand the company (change its name), and it starts over at a lower reputation each time. */
const REGIONS = [
  { id: 'valley', fund: 0, name: 'Maple Valley', about: 'Home. Small towns that give a new hauler a fair shot.', towns: ['Maple Hollow', 'Cedar Falls', 'Riverton', 'Granite City', 'Port Ashby', 'Metro Bay'], scale: 1, rate: 1, up: 1, down: 1, startRep: 60, ban: false, need: 0 },
  { id: 'lakes', fund: 1e5, name: 'Lake Country', about: 'Lake towns and summer cabins. Friendly, but they remember a missed pickup.', towns: ['Loon Lake', 'Birchport', 'Two Harbors', 'Clearwater', 'Pike Bay', 'Lakeview City'], scale: 1.6, rate: 1.5, up: 0.8, down: 1.4, startRep: 50, ban: true, need: 1e7 },
  { id: 'plains', fund: 5e6, name: 'High Plains', about: 'Farm towns far apart. Long routes and proud people who are slow to trust.', towns: ['Dry Creek', 'Wheaton', 'Big Sky', 'Prairie Gate', 'Holt Junction', 'Plainsville'], scale: 2.4, rate: 2.2, up: 0.65, down: 1.8, startRep: 45, ban: true, need: 5e8 },
  { id: 'coast', fund: 1e8, name: 'Gulf Coast', about: 'Beach towns full of tourists. Big money, and a storm of complaints when you slip.', towns: ['Pelican Key', 'Sandy Shores', 'Bayport', 'Palm Point', 'Harbor Isle', 'Coral City'], scale: 3.5, rate: 3.2, up: 0.5, down: 2.3, startRep: 40, ban: true, need: 1e10 },
  { id: 'desert', fund: 3e9, name: 'Red Desert', about: 'Fast-growing desert towns. Heat, dust and city councils with short tempers.', towns: ['Dust Flats', 'Mesa Verde', 'Sun Valley', 'Red Butte', 'Cactus Springs', 'Phoenix Ridge'], scale: 5, rate: 4.5, up: 0.4, down: 2.8, startRep: 35, ban: true, need: 3e11 },
  { id: 'metro', fund: 1e11, name: 'Capital Metro', about: 'The big city. Every council member has your number on speed dial.', towns: ['Old Town', 'Midtown', 'Harbor District', 'Uptown', 'Westside', 'Capital City'], scale: 7, rate: 6.5, up: 0.3, down: 3.4, startRep: 30, ban: true, need: 1e13 }
];
const BAN = { rep: 15, secs: 120, lockSecs: 1800, lose: 0.5, rebrandRep: 10 }; // below 15 reputation for 2 minutes of play gets you run out
/* the regions you are not looking at: 15% speed, +17% per regional manager level (full speed at level 5) */
const MANAGER = { base: 0.15, step: 0.17, max: 5, cost: 50000, share: 0.05, mult: 5 };   // first level: 5% of what the region needs to open (at least $50K), then 5x a level; 15% speed up to 100% at level 5
/* what each region keeps for itself; everything else (name, software, trophies, Legacy, this run's earnings) is shared */
const REGION_KEYS = ['cash', 'towns', 'cust', 'paused', 'trucks', 'drivers', 'pros', 'vets', 'supers', 'mechanics', 'yards', 'yardLvl', 'marketing', 'unlocks', 'down', 'price', 'priceDir', 'offer', 'nextOffer', 'rep', 'banClock', 'manager'];
const lastRegion = () => REGIONS.length - 1;
const region = s => REGIONS[s.region || 0];

/* Towns in a region: its six named towns, then counties that keep getting bigger and dearer. */
function townDef(i, r) {
  const R = REGIONS[r || 0], sc = R.scale;
  if (i < TOWNS.length) { const t = TOWNS[i]; return { id: t.id, name: R.towns[i], homes: Math.round(t.homes * sc), biz: Math.round(t.biz * sc), sites: Math.round(t.sites * sc), cost: t.cost * sc }; }
  const k = i - TOWNS.length + 1, base = TOWNS[TOWNS.length - 1];
  const nm = COUNTY_NAMES[(k - 1) % COUNTY_NAMES.length] + (k > COUNTY_NAMES.length ? ' ' + (Math.floor((k - 1) / COUNTY_NAMES.length) + 1) : '');
  return { id: 'r' + k, name: nm + ' County', homes: Math.round(base.homes * sc * Math.pow(3, k)), biz: Math.round(base.biz * sc * Math.pow(3, k)), sites: Math.round(base.sites * sc * Math.pow(3, k)), cost: base.cost * sc * Math.pow(14, k) };
}
const town = (s, i) => townDef(i, s.region || 0);

/* Software modules: the Roundsman suite, bought level by level. */
/* Every module tops out at a similar late-game price, so none is finished in minutes while another takes all day. */
const SOFTWARE = {
  planner:  { name: 'Route planner', about: 'Tighter routes. +12% stops per truck.', cost: 600, mult: 2.6, max: 15 },
  pricing:  { name: 'Price alignment', about: 'Move old accounts to standard prices. +13% revenue.', cost: 1500, mult: 2.5, max: 15 },
  portal:   { name: 'Customer portal', about: 'Sign-ups online. +25% customer growth.', cost: 900, mult: 3, max: 12 },
  reports:  { name: 'Truck reports', about: 'Pre-trip inspections. -10% breakdowns.', cost: 3000, mult: 2.8, max: 12 },
  dispatch: { name: 'Roadcall dispatch', about: 'Mechanics find the truck faster. -10% repair time.', cost: 4000, mult: 2.8, max: 12 },
  payroll:  { name: 'Hours and payroll', about: 'Clean timesheets and fair schedules. -6% wages and -6% hiring costs.', cost: 5000, mult: 2.8, max: 12 },
  offline:  { name: 'Offline route book', about: 'Routes keep running when you are away. +1 hour away time.', cost: 8000, mult: 3.6, max: 8 }
};

/* One-time unlocks that open new ways to grow. */
const UNLOCKS = {
  commercial: { name: 'Commercial license', about: 'Haul dumpsters for stores and restaurants. Opens front loaders.', cost: 3000 },
  rolloff:    { name: 'Roll-off permit', about: 'Construction boxes pay big per job. Opens roll-off trucks.', cost: 25000, needs: 'commercial' },
  arms:       { name: 'Automated arms', about: 'Side loaders: one driver, triple the stops.', cost: 40000 },
  recycling:  { name: 'Recycling program', about: 'Every home served also sells sorted material. Prices move daily.', cost: 25000 },
  mrf:        { name: 'Sorting plant', about: 'Your own sorting line. Recycling pays 2.5x.', cost: 900000, needs: 'recycling' },
  transfer:   { name: 'Transfer station', about: 'Consolidate loads. Dump fees cut in half.', cost: 120000 },
  landfill:   { name: 'Your own landfill', about: 'No dump fees, and other haulers pay you to tip.', cost: 1.2e7, needs: 'transfer' },
  cng:        { name: 'Natural gas fleet', about: 'CNG fueling at the yard. Fuel costs -45%.', cost: 350000 },
  compost:    { name: 'Yard waste and compost', about: 'Green carts on every route. +15% residential revenue.', cost: 2.5e6, needs: 'recycling' }
};

/* Legacy perks: bought with stars earned by selling the company. They survive every sale. */
const LEGACY = {
  pay:     { name: 'Good name', about: '+25% revenue, every run.', cost: 1, mult: 2, max: 20 },
  grow:    { name: 'Old friends', about: '+30% customer growth.', cost: 1, mult: 2, max: 10 },
  start:   { name: 'Head start', about: 'Start each run with $5,000 per level.', cost: 2, mult: 2, max: 10 },
  away:    { name: 'Long memory', about: '+2 hours of away time.', cost: 2, mult: 2.5, max: 6 },
  tap:     { name: 'Still rides along', about: 'Riding along pays 3x.', cost: 1, mult: 3, max: 6 }
};

const BASE = {
  mechWage: 0.9,            // per mechanic per second
  driverCost: 40, driverMult: 1.05,
  mechCost: 2500, mechMult: 1.35,
  yardCost: 2000, yardMult: 2, yardSlots: 10, drivewaySlots: 4,
  mktCost: 300, mktMult: 1.9,
  growth: 0.006,            // share of the open market signed per second at reputation 50
  breakdown: 1 / 900,       // per working truck per second
  repair: 150,              // seconds a truck is down with no mechanic
  awayHours: 4,
  boostSecs: 1800, boostMax: 7200  // optional 2x income: 30 minutes a reward, at most 2 hours banked
};

/* Driver grades. Everyone starts as a rookie; training moves one driver up a grade.
   Better drivers take the biggest trucks first and get more stops out of them. */
const GRADES = {
  rookie: { name: 'Rookie', boost: 0, wage: 0.5 },
  pro:    { name: 'Pro', boost: 0.3, wage: 2, cost: 15000, mult: 1.06, from: 'rookie', needs: 10, about: '+30% stops on the truck they drive.' },
  vet:    { name: 'Veteran', boost: 0.7, wage: 6, cost: 1.5e6, mult: 1.06, from: 'pro', needs: 50, about: '+70% stops on the truck they drive, and half as many breakdowns.' }
};
/* Route supervisors (Nov 11): open at 15 drivers. Each one looks after 15 drivers; the drivers they cover get 10% more
   stops out of their trucks and break down a quarter less. */
const SUPER = { needs: 15, covers: 15, boost: 0.1, brk: 0.25, wage: 4, cost: 20000, mult: 1.45 };
/* Yard levels (Nov 11): every yard is upgraded together. Bigger yards park more trucks, and each level adds a perk. */
const YARD_TIERS = [
  { name: 'Gravel lot', slots: 10, about: 'Room for 10 trucks a yard.' },
  { name: 'Shop yard', slots: 15, cost: 2.5e5, repair: 0.85, about: '15 trucks a yard, and a shop: repairs 15% faster.' },
  { name: 'Depot', slots: 25, cost: 6e6, fuel: 0.9, about: '25 trucks a yard, and a fuel island: fuel 10% cheaper.' },
  { name: 'Regional hub', slots: 45, cost: 2e8, dump: 0.85, about: '45 trucks a yard, and a tipping floor: dump fees 15% lower.' }
];
const yardTier = s => YARD_TIERS[Math.min(YARD_TIERS.length - 1, s.yardLvl || 0)];
const yardPerk = (s, k) => YARD_TIERS.slice(1, (s.yardLvl || 0) + 1).reduce((m, t) => m * (t[k] || 1), 1);
const TAU = { day: 30 }; // one in-game day is 30 seconds

function fresh(legacy) {
  legacy = legacy || { stars: 0, earnedStars: 0, perks: {}, sales: 0, best: 0, achievements: {} };
  const s = {
    v: 1, cash: 0, earned: 0, t: 0, day: 1, rep: 60,
    towns: 1, cust: { res: 0, com: 0, ro: 0 }, paused: { res: false, com: false, ro: false },
    trucks: { pickup: 1, rear: 0, side: 0, front: 0, roll: 0 },
    drivers: 0, pros: 0, vets: 0, supers: 0, mechanics: 0, yards: 0, yardLvl: 0, marketing: 0, manager: 0,
    software: {}, unlocks: {},
    down: [],                 // [{ type, left, total, where }]
    price: 1, priceDir: 0,    // recycling price index
    offer: null, nextOffer: 120,
    log: [],
    stats: { taps: 0, flyers: 0, roadcalls: 0, rushed: 0, contracts: 0, bestNet: 0, perfectDays: 0, missedDays: 0, away: 0, maxPrice: 1 },
    legacy, seed: (Math.random() * 2 ** 31) | 0,
    boost: 0,                 // seconds of 2x income left
    region: 0, banned: {}, banClock: 0, regions: {}, locks: {}, metroRep: 0, // see REGIONS
    lastSeen: Date.now()
  };
  s.cash = 5000 * lvl(legacy.perks, 'start');
  return s;
}

const lvl = (o, k) => (o && o[k]) || 0;
const costAt = (base, mult, n) => Math.ceil(base * Math.pow(mult, n));

function rand(s) { // small seeded generator so the pacing bot and tests repeat
  s.seed = (s.seed * 1103515245 + 12345) & 0x7fffffff; return s.seed / 0x7fffffff;
}

/* ---------- derived numbers ---------- */
function market(s) {
  const m = { res: 0, com: 0, ro: 0 };
  for (let i = 0; i < s.towns; i++) { const t = town(s, i); m.res += t.homes; m.com += t.biz; m.ro += t.sites; }
  return m;
}
function slots(s) { return BASE.drivewaySlots + s.yards * yardTier(s).slots; }
function truckCount(s) { return TRUCK_ORDER.reduce((n, k) => n + s.trucks[k], 0); }
function needDrivers(s) { return Math.max(0, truckCount(s) - 1); } // you drive one truck yourself
function achCount(s) { return Object.keys(s.legacy.achievements).length; }

/* share of the drivers a supervisor looks after (0 to 1) */
function superCover(s) { return s.drivers > 0 ? Math.min(1, (s.supers || 0) * SUPER.covers / s.drivers) : 0; }
function mults(s) {
  const sw = s.software, L = s.legacy.perks;
  return {
    cap: (1 + 0.12 * lvl(sw, 'planner')) * (1 + SUPER.boost * superCover(s)),
    rev: (1 + 0.13 * lvl(sw, 'pricing')) * (1 + 0.02 * achCount(s)) * (1 + 0.25 * lvl(L, 'pay')) * (1 + 0.1 * s.legacy.stars) * (s.boost > 0 ? 2 : 1) * region(s).rate,
    growth: (1 + 0.25 * lvl(sw, 'portal')) * (1 + 0.3 * lvl(L, 'grow')) * (1 + 0.35 * s.marketing),
    brk: Math.pow(0.9, lvl(sw, 'reports')) / (1 + 0.25 * s.mechanics) * (1 - SUPER.brk * superCover(s)),
    repair: Math.pow(0.9, lvl(sw, 'dispatch')) * yardPerk(s, 'repair'),
    wage: Math.pow(0.94, lvl(sw, 'payroll')),
    fuel: (s.unlocks.cng ? 0.55 : 1) * yardPerk(s, 'fuel'),
    dump: (s.unlocks.landfill ? 0 : s.unlocks.transfer ? 0.5 : 1) * yardPerk(s, 'dump'),
    awayH: BASE.awayHours + lvl(sw, 'offline') + 2 * lvl(L, 'away')
  };
}

/* Which trucks are on the road: not broken down, inside a yard slot, and with someone to drive them.
   Bigger trucks get drivers and slots first. */
function working(s) {
  const downBy = {}; s.down.forEach(d => { downBy[d.type] = (downBy[d.type] || 0) + 1; });
  let seats = s.drivers + 1, room = slots(s);
  const out = {}, order = ['side', 'roll', 'front', 'rear', 'pickup'];
  order.forEach(k => {
    const avail = Math.max(0, s.trucks[k] - (downBy[k] || 0));
    const n = Math.min(avail, seats, room); out[k] = n; seats -= n; room -= n;
  });
  return out;
}

/* Who drives what: veterans take the biggest running trucks, then pros, then rookies.
   Returns, for each truck type, how many veterans and pros are on it. */
function crew(s, w) {
  w = w || working(s); let v = s.vets || 0, p = s.pros || 0; const out = {};
  ['side', 'roll', 'front', 'rear', 'pickup'].forEach(k => {
    const nv = Math.min(w[k], v); v -= nv; const np = Math.min(w[k] - nv, p); p -= np; out[k] = { vet: nv, pro: np };
  });
  return out;
}
function capacity(s, w) {
  w = w || working(s); const m = mults(s), c = { res: 0, com: 0, ro: 0 }, cr = crew(s, w);
  TRUCK_ORDER.forEach(k => { c[TRUCKS[k].svc] += (w[k] + cr[k].vet * GRADES.vet.boost + cr[k].pro * GRADES.pro.boost) * TRUCKS[k].cap * m.cap; });
  return c;
}
function wagesPerSec(s) {
  const pros = s.pros || 0, vets = s.vets || 0;
  return ((s.drivers - pros - vets) * GRADES.rookie.wage + pros * GRADES.pro.wage + vets * GRADES.vet.wage + (s.supers || 0) * SUPER.wage + s.mechanics * BASE.mechWage) * mults(s).wage;
}

/* Money per second, split into its parts, for the current state. */
function economy(s) {
  const w = working(s), cap = capacity(s, w), m = mults(s);
  const served = {}, missed = {}; let gross = 0, dump = 0;
  Object.keys(SERVICES).forEach(k => {
    served[k] = Math.min(s.cust[k], cap[k]); missed[k] = Math.max(0, s.cust[k] - cap[k]);
    let r = served[k] * SERVICES[k].rate * m.rev;
    if (k === 'res' && s.unlocks.compost) r *= 1.15;
    gross += r; dump += served[k] * SERVICES[k].dump;
  });
  let recycle = 0;
  if (s.unlocks.recycling) recycle = served.res * 0.035 * s.price * (s.unlocks.mrf ? 2.5 : 1) * m.rev;
  let tipping = 0;
  if (s.unlocks.landfill) tipping = (served.res * SERVICES.res.dump + served.com * SERVICES.com.dump + served.ro * SERVICES.ro.dump) * 1.5 + 40 * s.towns;
  dump *= m.dump;
  const fuel = TRUCK_ORDER.reduce((n, k) => n + w[k] * TRUCKS[k].fuel, 0) * m.fuel;
  const wages = wagesPerSec(s);
  const income = gross + recycle + tipping, costs = dump + fuel + wages;
  const totalCust = s.cust.res + s.cust.com + s.cust.ro, totalMissed = missed.res + missed.com + missed.ro;
  return { w, cap, served, missed, gross, recycle, tipping, dump, fuel, wages, income, costs, net: income - costs, totalCust, totalMissed };
}

function tapValue(s) {
  const e = economy(s);
  return (1 + Math.max(0, e.net) * 0.1) * (1 + 2 * lvl(s.legacy.perks, 'tap'));
}

/* ---------- prices of things ---------- */
const price = {
  truck: (s, k) => costAt(TRUCKS[k].cost, TRUCKS[k].mult, k === 'pickup' ? s.trucks.pickup - 1 : s.trucks[k]),
  driver: s => Math.ceil(costAt(BASE.driverCost, BASE.driverMult, s.drivers) * mults(s).wage),
  train: (s, g) => Math.ceil(costAt(GRADES[g].cost, GRADES[g].mult, g === 'pro' ? (s.pros || 0) + (s.vets || 0) : (s.vets || 0)) * mults(s).wage),
  mechanic: s => costAt(BASE.mechCost, BASE.mechMult, s.mechanics),
  supervisor: s => Math.ceil(costAt(SUPER.cost, SUPER.mult, s.supers || 0) * mults(s).wage),
  yardTier: s => { const t = YARD_TIERS[(s.yardLvl || 0) + 1]; return t ? Math.ceil(t.cost * Math.max(1, s.yards) * region(s).scale) : Infinity; },
  manager: s => Math.ceil(costAt(Math.max(MANAGER.cost, region(s).need * MANAGER.share), MANAGER.mult, s.manager || 0)),
  rename: s => isDefaultName(s.name) ? 0 : Math.max(25000, Math.ceil(s.earned * 0.02)),
  yard: s => costAt(BASE.yardCost, BASE.yardMult, s.yards),
  marketing: s => costAt(BASE.mktCost, BASE.mktMult, s.marketing),
  software: (s, k) => costAt(SOFTWARE[k].cost, SOFTWARE[k].mult, lvl(s.software, k)),
  unlock: (s, k) => UNLOCKS[k].cost,
  town: s => town(s, s.towns).cost,
  legacy: (s, k) => costAt(LEGACY[k].cost, LEGACY[k].mult, lvl(s.legacy.perks, k)),
  rush: (s, d) => Math.ceil(50 + d.left * (TRUCKS[d.type].cost / 400))
};

/* ---------- actions (each returns '' on success or the reason it can't) ---------- */
function spend(s, n) { if (s.cash < n) return 'Not enough cash yet.'; s.cash -= n; return ''; }
function note(s, txt, kind) { s.log.unshift({ t: s.t, day: Math.floor(s.day), txt, kind: kind || '' }); if (s.log.length > 40) s.log.length = 40; }

const act = {
  tap(s) { const v = tapValue(s); s.cash += v; s.earned += v; s.stats.taps++; return v; },
  flyer(s) {
    const mk = market(s); s.stats.flyers++;
    if (s.cust.res < mk.res && rand(s) < 0.35) { s.cust.res++; return 1; } return 0;
  },
  buyTruck(s, k) {
    const T = TRUCKS[k]; if (!T) return 'No such truck.';
    if (T.unlock && !s.unlocks[T.unlock]) return 'Needs ' + UNLOCKS[T.unlock].name + '.';
    if (truckCount(s) >= slots(s)) return 'No room in the yard. Buy a yard first.';
    const e = spend(s, price.truck(s, k)); if (e) return e;
    s.trucks[k]++; note(s, 'Bought a ' + T.name.toLowerCase() + '.'); return '';
  },
  hireDriver(s) { const e = spend(s, price.driver(s)); if (e) return e; s.drivers++; return ''; },
  train(s, g) {
    const G = GRADES[g]; if (!G || !G.from) return 'No such grade.';
    if (s.drivers < G.needs) return 'Needs ' + G.needs + ' drivers on the payroll first.';
    if (gradeCount(s, G.from) < 1) return 'Nobody to train: hire or train a ' + GRADES[G.from].name.toLowerCase() + ' first.';
    const e = spend(s, price.train(s, g)); if (e) return e;
    if (g === 'pro') s.pros = (s.pros || 0) + 1; else { s.pros--; s.vets = (s.vets || 0) + 1; }
    return '';
  },
  hireMechanic(s) { const e = spend(s, price.mechanic(s)); if (e) return e; s.mechanics++; note(s, 'Hired mechanic number ' + s.mechanics + '.'); return ''; },
  buyYard(s) { const e = spend(s, price.yard(s)); if (e) return e; s.yards++; note(s, 'Opened yard ' + s.yards + '. Room for ' + slots(s) + ' trucks.', 'good'); return ''; },
  marketing(s) { const e = spend(s, price.marketing(s)); if (e) return e; s.marketing++; return ''; },
  software(s, k) {
    const S = SOFTWARE[k]; if (!S) return 'No such module.'; if (lvl(s.software, k) >= S.max) return 'Fully upgraded.';
    const e = spend(s, price.software(s, k)); if (e) return e; s.software[k] = lvl(s.software, k) + 1; return '';
  },
  unlock(s, k) {
    const U = UNLOCKS[k]; if (!U) return 'No such thing.'; if (s.unlocks[k]) return 'Already done.';
    if (U.needs && !s.unlocks[U.needs]) return 'Needs ' + UNLOCKS[U.needs].name + ' first.';
    const e = spend(s, U.cost); if (e) return e; s.unlocks[k] = true; note(s, U.name + ': done.', 'good'); return '';
  },
  expand(s) {
    const e = spend(s, price.town(s)); if (e) return e; s.towns++; note(s, 'Now serving ' + town(s, s.towns - 1).name + '.', 'good'); return '';
  },
  rush(s, i) {
    const d = s.down[i]; if (!d) return 'Already fixed.'; const e = spend(s, price.rush(s, d)); if (e) return e;
    s.down.splice(i, 1); s.stats.rushed++; s.stats.roadcalls++; note(s, 'Rushed the fix on a ' + TRUCKS[d.type].name.toLowerCase() + '.'); return '';
  },
  acceptOffer(s) {
    const o = s.offer; if (!o) return 'That offer is gone.';
    const e = economy(s), spare = e.cap[o.svc] - s.cust[o.svc];
    if (spare < o.qty) return 'You need room for ' + fmt(o.qty) + ' more ' + SERVICES[o.svc].unit + ' on your trucks.';
    const mk = market(s), add = Math.min(o.qty, mk[o.svc] - s.cust[o.svc]);
    s.cust[o.svc] += Math.max(0, add); s.cash += o.bonus; s.earned += o.bonus; s.rep = Math.min(100, s.rep + 2);
    s.stats.contracts++; note(s, 'Signed: ' + o.title + '. +' + fmtMoney(o.bonus) + '.', 'good'); s.offer = null; return '';
  },
  declineOffer(s) { s.offer = null; return ''; },
  /* Rewards the player chose to earn (an ad they asked to watch, or the Supporter Pack). */
  boost(s) {
    if (s.boost > BASE.boostMax - BASE.boostSecs) return 'You already have ' + Math.round(s.boost / 60) + ' minutes of double income banked.';
    s.boost = (s.boost || 0) + BASE.boostSecs; s.stats.boosts = (s.stats.boosts || 0) + 1; return '';
  },
  doubleAway(s, r) {
    if (!r || r.doubled || !(r.cash > 0)) return 'Nothing to double.';
    r.doubled = true; s.cash += r.cash; s.earned += r.cash; return '';
  },
  pause(s, k) { s.paused[k] = !s.paused[k]; return ''; },
  /* Switch to another region (Nov 11). A region you have not run yet starts with its set amount; one you have run
     is just as you left it (it kept running at its manager's speed). Money does not move. */
  move(s, r) {
    r = +r; const R = REGIONS[r]; if (!R) return 'No such region.';
    if (r === (s.region || 0)) return 'You are already here.';
    if (s.banned[R.id]) return R.name + ' ran you out. Rebrand the company (change its name) to try again.';
    const left = lockLeft(s, R.id); if (left > 0) return R.name + ' is shut to you for ' + Math.ceil(left / 60) + ' more minutes.';
    const known = !!(s.regions && s.regions[r]);
    if (!known && s.earned < R.need) return 'Earn ' + fmtMoney(R.need) + ' this run first.';
    switchTo(s, r, true);
    note(s, known ? 'Back in ' + R.name + '.' : 'Opened a branch in ' + R.name + ' with ' + fmtMoney(s.cash) + '. One pickup in ' + R.towns[0] + '.', 'good'); return '';
  },
  /* Rename the company. Free while it still has the starting name; after that it costs. Rebranding is also the only
     way back into Capital Metro after being run out (starting lower each time). */
  rename(s, name) {
    name = String(name || '').trim().slice(0, 32); if (!name) return 'Pick a name.';
    if (name === s.name) return '';
    const fee = price.rename(s); if (fee && s.cash < fee) return 'Rebranding costs ' + fmtMoney(fee) + ' (paid from ' + region(s).name + ').';
    s.cash -= fee; s.name = name; s.stats.renames = (s.stats.renames || 0) + 1;
    const M = REGIONS[lastRegion()];
    if (s.banned[M.id]) { delete s.banned[M.id]; s.metroRep = Math.max(5, (s.metroRep || M.startRep) - BAN.rebrandRep); note(s, 'Rebranded as ' + name + '. ' + M.name + ' will give you another try, starting at reputation ' + s.metroRep + '.', 'good'); }
    return '';
  },
  hireSupervisor(s) {
    if (s.drivers < SUPER.needs) return 'Supervisors start at ' + SUPER.needs + ' drivers.';
    const e = spend(s, price.supervisor(s)); if (e) return e; s.supers = (s.supers || 0) + 1; note(s, 'Hired route supervisor number ' + s.supers + '.'); return '';
  },
  upgradeYards(s) {
    const t = YARD_TIERS[(s.yardLvl || 0) + 1]; if (!t) return 'Your yards are as big as they get.'; if (s.yards < 1) return 'Open a yard first.';
    const e = spend(s, price.yardTier(s)); if (e) return e; s.yardLvl = (s.yardLvl || 0) + 1; note(s, 'Every yard is now a ' + t.name.toLowerCase() + '. Room for ' + slots(s) + ' trucks.', 'good'); return '';
  },
  hireManager(s) {
    if ((s.manager || 0) >= MANAGER.max) return 'This region\'s manager is as good as they get.';
    const e = spend(s, price.manager(s)); if (e) return e; s.manager = (s.manager || 0) + 1; note(s, region(s).name + ' manager: level ' + s.manager + '. It runs at ' + Math.round(100 * awaySpeed(s)) + '% while you are elsewhere.'); return '';
  },
  /* Sell the company: stars from what this run earned, then a fresh start with everything Legacy keeps. */
  sell(s) {
    const st = starsFor(s); if (st < 1) return 'Buyers want a company that has earned at least $1M.';
    const L = s.legacy; L.stars += st; L.earnedStars += st; L.sales++; L.best = Math.max(L.best || 0, s.earned);
    const n = fresh(L); n.stats.away = 0; n.boost = s.boost || 0; note(n, 'Sold the old company for ' + st + ' Legacy star' + (st > 1 ? 's' : '') + '. Back to one pickup.', 'good');
    return n;
  },
  legacy(s, k) {
    const P = LEGACY[k]; if (!P) return 'No such perk.'; if (lvl(s.legacy.perks, k) >= P.max) return 'Maxed.';
    const c = price.legacy(s, k); if (s.legacy.stars < c) return 'Not enough stars.';
    s.legacy.stars -= c; s.legacy.perks[k] = lvl(s.legacy.perks, k) + 1; if (k === 'start') s.cash += 5000; return '';
  }
};

function gradeCount(s, g) { const p = s.pros || 0, v = s.vets || 0; return g === 'vet' ? v : g === 'pro' ? p : s.drivers - p - v; }
function starsFor(s) { return s.earned < 1e6 ? 0 : Math.floor(Math.pow(s.earned / 1e6, 0.4)); }

/* ---------- contract offers ---------- */
const OFFERS = [
  { svc: 'res', title: '{t} HOA wants one hauler', size: 0.08, bonus: 120 },
  { svc: 'res', title: '{t} switches from a hauler that went bust', size: 0.15, bonus: 90 },
  { svc: 'res', title: 'Senior living campus in {t}', size: 0.04, bonus: 200 },
  { svc: 'com', title: '{t} strip mall, all tenants', size: 0.1, bonus: 300 },
  { svc: 'com', title: 'Restaurant row in {t}', size: 0.06, bonus: 400 },
  { svc: 'ro', title: 'New subdivision going up in {t}', size: 0.12, bonus: 900 },
  { svc: 'ro', title: '{t} hospital renovation', size: 0.06, bonus: 1500 }
];
function makeOffer(s) {
  const mk = market(s), opts = OFFERS.filter(o => (!SERVICES[o.svc].unlock || s.unlocks[SERVICES[o.svc].unlock]) && mk[o.svc] - s.cust[o.svc] > 5);
  if (!opts.length) return null;
  const o = opts[Math.floor(rand(s) * opts.length)], open = mk[o.svc] - s.cust[o.svc];
  const qty = Math.max(3, Math.min(open, Math.round(mk[o.svc] * o.size * (0.7 + rand(s) * 0.6))));
  const where = town(s, Math.floor(rand(s) * s.towns)).name;
  const bonus = Math.round(qty * SERVICES[o.svc].rate * o.bonus * mults(s).rev);
  return { svc: o.svc, title: o.title.replace('{t}', where), qty, bonus, left: 90 };
}

/* ---------- the clock ---------- */
/* Advance the world by dt seconds. quiet=true is used for time away: no breakdowns or offers, just routes. */
function tick(s, dt, quiet) {
  if (s.regions && Object.keys(s.regions).length) tickAway(s, dt);
  const m = mults(s), mk = market(s);
  if (s.boost > 0) s.boost = Math.max(0, s.boost - dt);
  // breakdowns and repairs
  if (!quiet) {
    const w = working(s), cr = crew(s, w);
    TRUCK_ORDER.forEach(k => {
      for (let i = 0; i < w[k]; i++) if (rand(s) < BASE.breakdown * m.brk * (i < cr[k].vet ? 0.5 : 1) * dt) {
        const total = BASE.repair * m.repair / (1 + 0.5 * s.mechanics);
        s.nid = (s.nid || 0) + 1;
        s.down.push({ id: 'd' + s.nid, type: k, left: total, total, where: STREETS[Math.floor(rand(s) * STREETS.length)] });
        note(s, 'Roadcall: ' + TRUCKS[k].name.toLowerCase() + ' down on ' + s.down[s.down.length - 1].where + '.', 'bad');
      }
    });
  }
  for (let i = s.down.length - 1; i >= 0; i--) { s.down[i].left -= dt; if (s.down[i].left <= 0) { s.down.splice(i, 1); s.stats.roadcalls++; } }

  const e = economy(s);
  // customers: signed from the open market, faster with a good name; lost when service is poor
  const repF = Math.pow(s.rep / 50, 1.5), RG = region(s);
  Object.keys(SERVICES).forEach(k => {
    if (SERVICES[k].unlock && !s.unlocks[SERVICES[k].unlock]) return;
    const open = mk[k] - s.cust[k];
    if (open > 0 && !(s.paused && s.paused[k])) s.cust[k] += Math.min(open, Math.max(open * BASE.growth * m.growth * repF * dt, (k === 'res' ? 0.6 : 0.05) * m.growth * repF * dt));
    if (s.rep < 35) s.cust[k] *= Math.pow(1 - 0.002 * RG.down * (35 - s.rep) / 35, dt);
    s.cust[k] = Math.max(0, Math.min(mk[k], s.cust[k]));
  });
  // reputation drifts toward how well you serve
  const ratio = e.totalCust > 0 ? e.totalMissed / e.totalCust : 0;
  const target = ratio > 0 ? Math.max(5, 75 - 160 * RG.down * ratio) : 75 + Math.min(25, s.mechanics * 2 + lvl(s.software, 'portal') * 2 + s.marketing);
  s.rep += (target - s.rep) * Math.min(1, 0.02 * (target > s.rep ? RG.up : RG.down) * dt);
  // in the tougher regions, a reputation in the gutter for too long gets you run out (only while you are playing)
  if (RG.ban && !quiet) {
    s.banClock = s.rep < BAN.rep ? (s.banClock || 0) + dt : 0;
    if (s.banClock >= BAN.secs) { runOut(s); return; }
  }
  // money
  const got = e.net * dt;
  s.cash += got; if (e.income > 0) s.earned += e.income * dt;
  if (s.cash < 0) s.cash = 0;
  s.stats.bestNet = Math.max(s.stats.bestNet, e.net);
  // recycling prices wander
  if (s.unlocks.recycling) {
    s.priceDir += (rand(s) - 0.5) * 0.02 * dt - (s.price - 1) * 0.004 * dt; s.priceDir = Math.max(-0.02, Math.min(0.02, s.priceDir));
    s.price = Math.max(0.35, Math.min(1.9, s.price + s.priceDir * dt)); s.stats.maxPrice = Math.max(s.stats.maxPrice, s.price);
  }
  // days
  const before = Math.floor(s.day); s.day += dt / TAU.day; s.t += dt;
  if (Math.floor(s.day) > before && e.totalCust >= 100) { if (e.totalMissed < 0.5) s.stats.perfectDays++; else s.stats.missedDays++; }
  // offers
  if (!quiet) {
    if (s.offer) { s.offer.left -= dt; if (s.offer.left <= 0) s.offer = null; }
    else if ((s.nextOffer -= dt) <= 0) { s.offer = makeOffer(s); s.nextOffer = 150 + rand(s) * 150; }
  }
}

/* Regions (Nov 11) */
const isDefaultName = n => !n || n === 'Curbside Hauling';
const awaySpeed = snap => Math.min(1, MANAGER.base + MANAGER.step * (snap.manager || 0));
const lockLeft = (s, id) => s.locks && s.locks[id] ? Math.max(0, s.locks[id] - s.t) : 0;
const copy = o => JSON.parse(JSON.stringify(o));
function snapshot(s) { const o = {}; REGION_KEYS.forEach(k => { o[k] = copy(s[k] === undefined ? null : s[k]); }); return o; }
function startRegion(s, r) {
  const L = s.legacy, R = REGIONS[r], n = fresh(L), o = {};
  REGION_KEYS.forEach(k => { o[k] = copy(n[k]); });
  o.cash = R.fund + 5000 * lvl(L.perks, 'start');
  o.rep = r === lastRegion() && s.metroRep ? s.metroRep : R.startRep;
  return o;
}
/* make region r the one on screen; keep=false drops the region being left (it was lost) */
function switchTo(s, r, keep) {
  s.regions = s.regions || {};
  if (keep) s.regions[s.region || 0] = snapshot(s);
  const o = s.regions[r] || startRegion(s, r); delete s.regions[r];
  REGION_KEYS.forEach(k => { s[k] = o[k]; }); s.region = r; s.banClock = 0;
  s.stats.moves = (s.stats.moves || 0) + 1;
  s.legacy.regions = s.legacy.regions || {}; s.legacy.regions[REGIONS[r].id] = 1;
}
function runOut(s) {
  const fromI = s.region, from = REGIONS[fromI], lost = fromI === lastRegion(); s.legacy.bans = (s.legacy.bans || 0) + 1;
  // go to the best branch you already have; a new one only when none is open
  const ok = i => i !== fromI && !s.banned[REGIONS[i].id] && lockLeft(s, REGIONS[i].id) <= 0;
  let to = -1; for (let i = REGIONS.length - 1; i >= 0; i--) if (s.regions && s.regions[i] && ok(i)) { to = i; break; }
  if (to < 0) { to = fromI - 1; while (to > 0 && !ok(to)) to--; if (to < 0) to = 0; }
  if (lost) {
    s.banned[from.id] = 1; switchTo(s, to, false);
    note(s, 'Run out of ' + from.name + '. The council pulled every permit and that branch is gone. Rebrand the company to try again.', 'bad');
  } else {
    Object.keys(s.cust).forEach(c => { s.cust[c] = Math.floor(s.cust[c] * (1 - BAN.lose)); });
    s.rep = from.startRep; s.offer = null; s.locks = s.locks || {}; s.locks[from.id] = s.t + BAN.lockSecs;
    switchTo(s, to, true);
    note(s, 'Run out of ' + from.name + ' for 30 minutes. Half its customers left; the trucks and yards are waiting. Now in ' + REGIONS[to].name + '.', 'bad');
  }
}
/* the regions not on screen: run them at their manager's speed (quiet, like time away) */
function tickAway(s, dt) {
  Object.keys(s.locks || {}).forEach(id => { if (s.locks[id] <= s.t) delete s.locks[id]; });
  Object.keys(s.regions || {}).forEach(i => {
    const o = s.regions[i], R = REGIONS[+i]; if (!R || lockLeft(s, R.id) > 0) return;
    const tmp = Object.assign({}, s, o, { region: +i, regions: {}, stats: Object.assign({}, s.stats), log: [] }), e0 = s.earned;
    tick(tmp, dt * awaySpeed(o), true);
    REGION_KEYS.forEach(k => { o[k] = tmp[k]; });
    s.earned += tmp.earned - e0;
  });
}

/* Time away: run the routes in one-minute steps, capped by the away-time limit. Returns what happened. */
function catchUp(s, now) {
  now = now || Date.now();
  const gone = Math.max(0, (now - (s.lastSeen || now)) / 1000), cap = mults(s).awayH * 3600, dt = Math.min(gone, cap);
  s.lastSeen = now; if (dt < 30) return null;
  const c0 = s.cash, cust0 = s.cust.res + s.cust.com + s.cust.ro; let left = dt;
  while (left > 0) { const step = Math.min(60, left); tick(s, step, true); left -= step; }
  s.stats.away += dt;
  return { seconds: dt, gone, capped: gone > cap, cash: s.cash - c0, cust: s.cust.res + s.cust.com + s.cust.ro - cust0 };
}

const STREETS = ['Elm St', 'Oak Ave', 'Birch Ln', 'Main St', 'Mill Rd', 'Church St', 'Pine Ct', 'Lake Dr', 'Ridge Rd', 'Maple Way', 'Hill St', 'Park Blvd', 'Depot Rd', 'River Rd', 'Cherry Ln', 'County Rd 9'];

/* ---------- numbers ---------- */
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n, d) {
  if (!isFinite(n)) return '∞'; const neg = n < 0; n = Math.abs(n);
  if (n < 1000) return (neg ? '-' : '') + (d && n < 100 && n % 1 ? n.toFixed(d) : Math.floor(n).toLocaleString('en-US'));
  let i = 0; while (n >= 1000 && i < SUF.length - 1) { n /= 1000; i++; }
  return (neg ? '-' : '') + (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + SUF[i];
}
const fmtMoney = (n, d) => (n < 0 ? '-$' : '$') + fmt(Math.abs(n), d);

/* ---------- achievements ---------- */
const ACH = [];
function tiers(id, name, desc, vals, get, icon) { vals.forEach((v, i) => ACH.push({ id: id + i, group: id, name: name(v, i), desc: desc(v), goal: v, get, icon })); }
const totalCust = s => s.cust.res + s.cust.com + s.cust.ro;
tiers('cust', (v, i) => ['First route', 'Regulars', 'A real route', 'Two trucks worth', 'Talk of the town', 'Household name', 'Regional hauler', 'Big league', 'Six figures of carts', 'Half a million cans', 'A million at the curb'][i], v => 'Serve ' + fmt(v) + ' customers at once.', [10, 50, 150, 500, 1500, 5000, 15000, 50000, 100000, 500000, 1e6], totalCust, 'house');
tiers('earn', (v, i) => ['Gas money', 'Payday', 'Small business', 'Millionaire hauler', 'Eight figures', 'Nine figures', 'Billion dollar trash', 'Ten billion', 'Trillionaire of trash'][i], v => 'Earn ' + fmtMoney(v) + ' in one run.', [1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e12], s => s.earned, 'cash');
tiers('fleet', (v, i) => ['Two trucks', 'Small fleet', 'Double digits', 'Full yard', 'Convoy', 'Armada', 'The biggest fleet in the state'][i], v => 'Own ' + v + ' trucks.', [2, 5, 10, 25, 50, 100, 250], truckCount, 'truck');
tiers('crew', (v, i) => ['First hire', 'A real crew', 'Shift bidding', 'Union hall', 'Workforce'][i], v => 'Employ ' + v + ' drivers.', [1, 10, 30, 100, 300], s => s.drivers, 'people');
tiers('pro', (v, i) => ['Promoted from within', 'Pro crew', 'All-pro'][i], v => 'Have ' + v + ' pro drivers.', [1, 25, 100], s => (s.pros || 0) + (s.vets || 0), 'people');
tiers('vet', (v, i) => ['Old hand', 'Seasoned crew', 'Hall of fame'][i], v => 'Have ' + v + ' veteran drivers.', [1, 25, 100], s => s.vets || 0, 'people');
tiers('town', (v, i) => ['Next town over', 'Three towns', 'County-wide', 'City contract', 'Port city', 'The metro', 'Beyond the map', 'Regional power', 'Coast to coast'][i], v => 'Serve ' + v + ' towns.', [2, 3, 4, 5, 6, 7, 8, 10, 15], s => s.towns, 'map');
tiers('net', (v, i) => ['In the black', 'Hundred a second', 'Thousand a second', 'Money printer', 'Firehose'][i], v => 'Make ' + fmtMoney(v) + ' a second, after costs.', [10, 100, 1000, 1e5, 1e7], s => s.stats.bestNet, 'chart');
tiers('tap', (v, i) => ['Still hops on the back', 'Callused hands', 'Never left the truck'][i], v => 'Ride along ' + fmt(v) + ' times.', [100, 1000, 10000], s => s.stats.taps, 'hand');
tiers('road', (v, i) => ['First roadcall', 'Shop regular', 'Seen it all'][i], v => 'Get ' + v + ' trucks back on the road.', [1, 25, 250], s => s.stats.roadcalls, 'wrench');
tiers('mech', (v, i) => ['Grease monkey', 'Real shop', 'Fleet maintenance'][i], v => 'Employ ' + v + ' mechanics.', [1, 5, 15], s => s.mechanics, 'wrench');
tiers('deal', (v, i) => ['First contract', 'Deal maker', 'Closer'][i], v => 'Sign ' + v + ' contracts.', [1, 10, 50], s => s.stats.contracts, 'pen');
tiers('yard', (v, i) => ['Off the driveway', 'Three yards', 'Yards everywhere'][i], v => 'Open ' + v + ' yards.', [1, 3, 10], s => s.yards, 'yard');
tiers('perfect', (v, i) => ['Nobody missed', 'Clean week', 'Reliable', 'Never miss'][i], v => 'Have ' + v + ' days with no missed pickups (100+ customers).', [1, 7, 30, 200], s => s.stats.perfectDays, 'check');
tiers('sale', (v, i) => ['Sold it', 'Serial founder', 'Dynasty'][i], v => 'Sell the company ' + v + ' time' + (v > 1 ? 's' : '') + '.', [1, 3, 10], s => s.legacy.sales, 'star');
[['commercial', 'Open for business'], ['rolloff', 'Box drop'], ['arms', 'Look, no hands'], ['recycling', 'Blue carts'], ['mrf', 'Sort it out'], ['transfer', 'Middle man'], ['landfill', 'King of the hill'], ['cng', 'Clean air'], ['compost', 'Green carts']].forEach(([k, n]) =>
  ACH.push({ id: 'u_' + k, group: 'unlock', name: n, desc: 'Get ' + UNLOCKS[k].name + '.', goal: 1, get: s => s.unlocks[k] ? 1 : 0, icon: 'key' }));
ACH.push({ id: 'move1', group: 'region', name: 'Hit the road', desc: 'Move the company to a new region.', goal: 1, get: s => s.stats.moves || 0, icon: 'map' });
ACH.push({ id: 'region3', group: 'region', name: 'Out west', desc: 'Run a company in the High Plains.', goal: 1, get: s => s.legacy.regions && s.legacy.regions.plains ? 1 : 0, icon: 'map' });
ACH.push({ id: 'region4', group: 'region', name: 'Beach routes', desc: 'Run a company on the Gulf Coast.', goal: 1, get: s => s.legacy.regions && s.legacy.regions.coast ? 1 : 0, icon: 'map' });
ACH.push({ id: 'region5', group: 'region', name: 'Dust and heat', desc: 'Run a company in the Red Desert.', goal: 1, get: s => s.legacy.regions && s.legacy.regions.desert ? 1 : 0, icon: 'map' });
ACH.push({ id: 'region6', group: 'region', name: 'City hall', desc: 'Run a company in Capital Metro.', goal: 1, get: s => s.legacy.regions && s.legacy.regions.metro ? 1 : 0, icon: 'map' });
ACH.push({ id: 'banned', group: 'banned', name: 'Run out of town', desc: 'Get banned from a region. It happens.', goal: 1, get: s => s.legacy.bans || 0, icon: 'moon' });
ACH.push({ id: 'rep100', group: 'misc', name: 'Five stars', desc: 'Reach a reputation of 95.', goal: 95, get: s => s.rep, icon: 'star' });
ACH.push({ id: 'trader', group: 'misc', name: 'Commodity trader', desc: 'See recycling prices above 1.5x.', goal: 1.5, get: s => s.stats.maxPrice, icon: 'chart' });
ACH.push({ id: 'away', group: 'misc', name: 'Night shift', desc: 'Let the routes run while you are away for an hour in total.', goal: 3600, get: s => s.stats.away, icon: 'moon' });
ACH.push({ id: 'maxsw', group: 'misc', name: 'Power user', desc: 'Max out any Roundsman module.', goal: 1, get: s => Object.keys(SOFTWARE).some(k => lvl(s.software, k) >= SOFTWARE[k].max) ? 1 : 0, icon: 'key' });
ACH.push({ id: 'allsw', group: 'misc', name: 'Whole suite', desc: 'Own every Roundsman module.', goal: 1, get: s => Object.keys(SOFTWARE).every(k => lvl(s.software, k) > 0) ? 1 : 0, icon: 'key' });
ACH.push({ id: 'pickups', group: 'misc', name: 'Pickup army', desc: 'Own 10 pickups at once.', goal: 10, get: s => s.trucks.pickup, icon: 'truck' });

/* Checks every achievement and returns the new ones. Achievements are kept for good, across sales. */
function checkAch(s) {
  const got = s.legacy.achievements, out = [];
  ACH.forEach(a => { if (!got[a.id] && a.get(s) >= a.goal) { got[a.id] = Date.now(); out.push(a); } });
  return out;
}
/* The next few goals worth chasing: the closest unearned tier of each group. */
function nextGoals(s, n) {
  const seen = {}, list = [];
  ACH.forEach(a => {
    if (s.legacy.achievements[a.id] || seen[a.group]) return; seen[a.group] = 1;
    if (a.group === 'sale' && s.earned < 3e5) return;
    if (a.group === 'banned' || (a.group === 'region' && s.earned < 3e5)) return;
    list.push({ a, p: Math.min(1, Math.max(0, a.get(s) / a.goal)) });
  });
  return list.sort((x, y) => y.p - x.p).slice(0, n || 3);
}

/* ---------- saves ---------- */
function save(s) { s.lastSeen = Date.now(); return JSON.stringify(s); }
function load(str) {
  const j = typeof str === 'string' ? JSON.parse(str) : str; if (!j || j.v !== 1) throw new Error('Not an Idle Roundsman save.');
  const s = fresh(j.legacy); Object.keys(j).forEach(k => { s[k] = j[k]; });
  ['cust', 'trucks', 'stats', 'paused'].forEach(k => { s[k] = Object.assign({}, fresh()[k], j[k] || {}); });
  s.legacy = Object.assign({ stars: 0, earnedStars: 0, perks: {}, sales: 0, best: 0, achievements: {} }, j.legacy || {});
  Object.keys(SOFTWARE).forEach(k => { if (lvl(s.software, k) > SOFTWARE[k].max) s.software[k] = SOFTWARE[k].max; }); // older saves had other caps
  /* before Nov 11 a run-out lasted until the company was sold; now only Capital Metro keeps you out */
  s.regions = s.regions || {}; s.locks = s.locks || {}; s.banned = s.banned || {};
  Object.keys(s.banned).forEach(id => { if (id !== REGIONS[lastRegion()].id) delete s.banned[id]; });
  return s;
}
const exportCode = s => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(save(s)))) : Buffer.from(save(s)).toString('base64'));
const importCode = c => load(typeof atob === 'function' ? decodeURIComponent(escape(atob(c.trim()))) : Buffer.from(c.trim(), 'base64').toString());

const VERSION = '1.1.0', PRIVACY_URL = 'https://mhelton1.github.io/Trash-Tycoon/privacy-policy.html';
const api = { VERSION, PRIVACY_URL, SERVICES, TRUCKS, TRUCK_ORDER, TOWNS, townDef, town, REGIONS, BAN, region, MANAGER, SUPER, YARD_TIERS, yardTier, superCover, awaySpeed, lockLeft, isDefaultName, REGION_KEYS, SOFTWARE, UNLOCKS, LEGACY, BASE, GRADES, TAU, ACH, STREETS, crew, gradeCount, wagesPerSec,
  fresh, tick, catchUp, economy, working, capacity, market, slots, truckCount, needDrivers, mults, tapValue, price, act, starsFor,
  checkAch, nextGoals, makeOffer, fmt, fmtMoney, save, load, exportCode, importCode, lvl };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TT = api;
})(typeof window !== 'undefined' ? window : globalThis);
