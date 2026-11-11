/* node scripts/prepare.js web   copies the game from ../../web into www, which Capacitor packs into the app */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, '..', '..', 'web'), dst = path.join(root, 'www');
if (process.argv[2] !== 'web') { console.error('Use: node scripts/prepare.js web'); process.exit(1); }
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
/* Inside the app the game itself never goes online: no font download and no service worker
   (the app store delivers updates, and a cached worker would keep serving the old version).
   Only the optional reward ads and Google Play purchases use the network, through their plugins. */
fs.rmSync(path.join(dst, 'sw.js'), { force: true });
const f = path.join(dst, 'index.html'); let s = fs.readFileSync(f, 'utf8');
s = s.replace(/<link rel="preconnect"[^>]*>\n?/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, '').replace(/<script>\nif \('serviceWorker'[\s\S]*?<\/script>\n?/, '');
if (/googleapis|serviceWorker/.test(s)) { console.error('index.html still reaches online'); process.exit(1); }
/* The Capacitor bridge, so money.js can reach the ad and purchase plugins without a bundler. */
fs.copyFileSync(require.resolve('@capacitor/core/dist/capacitor.js'), path.join(dst, 'capacitor.js'));
s = s.replace('<script src="money.js">', '<script src="capacitor.js"></script>\n<script src="money.js">');
if (s.indexOf('capacitor.js') < 0) { console.error('could not add capacitor.js to index.html'); process.exit(1); }
fs.writeFileSync(f, s); console.log('Copied the game into www');
