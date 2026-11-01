/* Draws every icon and logo file from store/logo.svg. Use: node tools/icons.js
   Needs Playwright with Chromium (the wordmark also loads its fonts from Google Fonts). */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), at = (...p) => path.join(root, ...p);
const svg = fs.readFileSync(at('store', 'logo.svg'), 'utf8').replace(/width="512" height="512"/, 'width="100%" height="100%"');
/* For masked icons (Android adaptive icons, maskable web icons) the art must sit inside the middle 66%,
   so the drawing is shrunk on the same background. */
const shrink = k => svg.replace(/<g transform="translate\(256 262\) scale\(\.9\)/, `<g transform="translate(256 262) scale(${(0.9 * k).toFixed(3)})`);

(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  async function icon(file, size, art, round) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;overflow:hidden;${round ? 'border-radius:22%;' : ''}">${art}</div></body>`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.screenshot({ path: file, omitBackground: true });
    console.log('wrote', path.relative(root, file));
  }
  await icon(at('store', 'icon-512.png'), 512, svg);
  await icon(at('web', 'icons', 'icon-512.png'), 512, svg);
  await icon(at('web', 'icons', 'icon-192.png'), 192, svg);
  await icon(at('web', 'icons', 'icon-180.png'), 180, svg);
  await icon(at('web', 'icons', 'icon-maskable-512.png'), 512, shrink(0.78));
  await icon(at('docs', 'icon-192.png'), 192, svg);
  await icon(at('apps', 'mobile', 'assets', 'icon-only.png'), 1024, shrink(0.78));
  // Android adaptive icon: the art on a clear layer (Android insets it into the safe zone), and the navy background on its own layer
  await icon(at('apps', 'mobile', 'assets', 'icon-foreground.png'), 1024, shrink(1.05).replace(/<rect width="512" height="512" fill="url\(#bgb\)"\/>/, ''));
  await icon(at('apps', 'mobile', 'assets', 'icon-background.png'), 1024, svg.replace(/(<rect width="512" height="512" fill="url\(#bgb\)"\/>)[\s\S]*<\/svg>/, '$1</svg>'));

  // the logo with the name beside it, on dark and on light, for websites, posts and the Roundsman site
  const font = '<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:wght@700&family=Libre+Franklin:wght@600&display=block" rel="stylesheet">';
  for (const [name, bg, ink, sub] of [['logo-wordmark-dark.png', '#14284B', '#F5F1E3', '#C9D3E6'], ['logo-wordmark-light.png', '#F5F1E3', '#14284B', '#4A5870']]) {
    await p.setViewportSize({ width: 1200, height: 400 });
    await p.setContent(`<html><head>${font}</head><body style="margin:0;background:${bg};width:1200px;height:400px;display:flex;align-items:center;gap:48px;padding:0 70px;box-sizing:border-box">
      <div style="width:260px;height:260px;flex:none;border-radius:22%;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25)">${svg}</div>
      <div><div style="font:700 104px/1 'Libre Caslon Text',Georgia,serif;color:${ink};letter-spacing:-1px">Idle<br>Roundsman</div>
      <div style="font:600 30px/1.2 'Libre Franklin',system-ui,sans-serif;color:${sub};margin-top:18px">Build the biggest hauler in the state</div></div></body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: at('store', name) }); console.log('wrote store/' + name);
  }
  await b.close();
})();
