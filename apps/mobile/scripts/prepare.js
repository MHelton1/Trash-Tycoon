/* node scripts/prepare.js web   copies the game from ../../web into www, which Capacitor packs into the app */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, '..', '..', 'web'), dst = path.join(root, 'www');
if (process.argv[2] !== 'web') { console.error('Use: node scripts/prepare.js web'); process.exit(1); }
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
/* Inside the app the game never goes online: no font download and no service worker
   (the app store delivers updates, and a cached worker would keep serving the old version). */
fs.rmSync(path.join(dst, 'sw.js'), { force: true });
const f = path.join(dst, 'index.html'); let s = fs.readFileSync(f, 'utf8');
s = s.replace(/<link rel="preconnect"[^>]*>\n?/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, '').replace(/<script>\nif \('serviceWorker'[\s\S]*?<\/script>\n?/, '');
if (/googleapis|serviceWorker/.test(s)) { console.error('index.html still reaches online'); process.exit(1); }
fs.writeFileSync(f, s); console.log('Copied the game into www');
