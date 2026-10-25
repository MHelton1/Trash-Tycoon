/* Packs the game into one self-contained HTML page (for sharing as a single link or file).
   Use: node tools/bundle.js out.html [--fragment]   --fragment leaves out the doctype/head/body wrapper. */
'use strict';
const fs = require('fs'), path = require('path');
const W = path.join(__dirname, '..', 'web'), rd = f => fs.readFileSync(path.join(W, f), 'utf8');
const out = process.argv[2], frag = process.argv.includes('--fragment');
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(W, 'icons/icon-192.png')).toString('base64');
let css = rd('style.css');
if (frag) css = css.replace('.top{position:sticky;top:0;', '.top{position:sticky;top:env(safe-area-inset-top,0px);').replace('padding-block:calc(var(--sa-t) + 10px) 10px', 'padding-block:10px')
  + '\nbody::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--sign)}\n';
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700&family=Libre+Caslon+Text:wght@400;700&display=swap" rel="stylesheet">';
const bodyHtml = rd('index.html').split('<body>')[1].split('<script src="engine.js">')[0].trim();
const js = `<script>\n${rd('engine.js')}\n</script>\n<script>\n${rd('ui.js')}\n</script>`;
const head = `<title>Trash Tycoon</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<meta name="theme-color" content="#14284B">\n<link rel="icon" type="image/png" href="${icon}">\n${fonts}\n<style>\n${css}</style>`;
const html = frag ? `${head}\n${bodyHtml}\n${js}\n` : `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${bodyHtml}\n${js}\n</body>\n</html>\n`;
fs.writeFileSync(out, html); console.log('wrote', out, Math.round(html.length / 1024) + ' KB');
