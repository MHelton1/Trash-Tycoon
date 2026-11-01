/* Optional rewards and the Supporter Pack, for the Android app only. The web version has neither.
   No ad ever plays unless the player taps a reward button. The Supporter Pack gives every reward
   without an ad. It is a one-time Google Play purchase tied to the player's Google account, so it
   comes back after a reinstall or on a new phone. */
(function () {
'use strict';
const CONFIG = {
  // Google's public test IDs, which show sample ads and earn nothing.
  // Replace both with the IDs from your AdMob account before a store release, and set testing to false.
  // (The AdMob app ID goes in apps/mobile/android/app/src/main/res/values/strings.xml.)
  rewardedAdId: 'ca-app-pub-3940256099942544/5224354917',
  testing: true,
  product: 'supporter_pack',
  roundsmanUrl: 'https://roundsman.app'
};
const cap = window.Capacitor;
const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform() && cap.registerPlugin);
const AdMob = native ? cap.registerPlugin('AdMob') : null, Shop = native ? cap.registerPlugin('NativePurchases') : null;
const KEY = 'idle-roundsman-supporter';
let supporter = false, adsOn = false, adsStarted = false, ready = false, loading = false, busy = false;
let shopOn = false, price = '', privacyNeeded = false;
try { supporter = localStorage.getItem(KEY) === '1'; } catch (e) { /* storage blocked */ }
const subs = []; const changed = () => subs.forEach(f => { try { f(); } catch (e) { console.error(e); } });
function setSupporter(v) {
  if (supporter === v) return; supporter = v;
  try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
  changed(); if (!v) startAds();
}
const owned = p => p && p.productIdentifier === CONFIG.product && (p.purchaseState === undefined || String(p.purchaseState) === '1');

/* ---------- ads ---------- */
async function startAds() {
  if (!AdMob || adsStarted || supporter) return; adsStarted = true;
  try {
    let c = await AdMob.requestConsentInfo();
    if (c.isConsentFormAvailable && c.status === 'REQUIRED') c = await AdMob.showConsentForm();
    privacyNeeded = c.privacyOptionsRequirementStatus === 'REQUIRED';
    if (c.canRequestAds) { await AdMob.initialize({ initializeForTesting: CONFIG.testing }); adsOn = true; preload(); }
  } catch (e) { console.warn('Ads are off:', e); }
  changed();
}
function preload() {
  if (!adsOn || ready || loading) return; loading = true;
  AdMob.prepareRewardVideoAd({ adId: CONFIG.rewardedAdId, isTesting: CONFIG.testing })
    .then(() => { ready = true; })
    .catch(() => { setTimeout(preload, 60000); })
    .finally(() => { loading = false; changed(); });
}
/* Resolves true when the player earned the reward. */
async function reward() {
  if (supporter) return true;
  if (!ready || busy) return false;
  busy = true; ready = false; changed();
  let got = false; const hs = [];
  try {
    await new Promise(async done => {
      const finish = () => setTimeout(done, 400); // the reward callback can land just after the close
      hs.push(await AdMob.addListener('onRewardedVideoAdReward', () => { got = true; }));
      hs.push(await AdMob.addListener('onRewardedVideoAdDismissed', finish));
      hs.push(await AdMob.addListener('onRewardedVideoAdFailedToShow', finish));
      AdMob.showRewardVideoAd().then(() => { got = true; }).catch(finish);
    });
  } finally { hs.forEach(h => { try { h.remove(); } catch (e) { /* gone */ } }); busy = false; preload(); changed(); }
  return got;
}

/* ---------- Supporter Pack ---------- */
async function startShop() {
  if (!Shop) return;
  try {
    const b = await Shop.isBillingSupported(); if (!b || !b.isBillingSupported) return;
    shopOn = true;
    const r = await Shop.getProducts({ productIdentifiers: [CONFIG.product], productType: 'inapp' });
    if (r && r.products && r.products[0]) price = r.products[0].priceString || '';
    await restore();
  } catch (e) { console.warn('Shop is off:', e); }
  changed();
}
/* Asks Google Play what this account owns. With no answer (no signal) the last known state stays. */
async function restore() {
  const r = await Shop.getPurchases({ productType: 'inapp' });
  const mine = (r && r.purchases || []).filter(owned);
  mine.forEach(p => { if (p.isAcknowledged === false && p.purchaseToken) Shop.acknowledgePurchase({ purchaseToken: p.purchaseToken }).catch(() => {}); });
  setSupporter(mine.length > 0); return mine.length > 0;
}
async function buy() {
  const t = await Shop.purchaseProduct({ productIdentifier: CONFIG.product, productType: 'inapp' });
  if (owned(t)) { setSupporter(true); return 'owned'; }
  return 'pending'; // e.g. paying cash at a store: Google finishes it later and restore() picks it up
}

function openRoundsman() {
  if (native) window.location.href = CONFIG.roundsmanUrl; // the app hands outside links to the browser
  else window.open(CONFIG.roundsmanUrl, '_blank', 'noopener');
}

window.Money = {
  native,
  get supporter() { return supporter; },
  get shopOn() { return shopOn; },
  get price() { return price; },
  get privacyNeeded() { return privacyNeeded; },
  /* Reward buttons show only in the app, once ads can load or the player owns the Supporter Pack. */
  get offered() { return native && (supporter || adsOn); },
  get canReward() { return supporter || (ready && !busy); },
  reward, buy, restore,
  privacyOptions: () => AdMob ? AdMob.showPrivacyOptionsForm() : Promise.resolve(),
  onChange: f => subs.push(f),
  openRoundsman, roundsmanUrl: CONFIG.roundsmanUrl
};
if (native) window.addEventListener('DOMContentLoaded', () => { startShop(); startAds(); });
})();
