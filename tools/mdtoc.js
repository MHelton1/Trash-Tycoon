#!/usr/bin/env node
/* © 2026 Roundsman. All rights reserved. */
/* Adds or refreshes a clickable "Contents" list at the top of a manual, and a "Back to contents" link before each
   main section. Safe to run again after editing: it replaces what it added before.
   Usage: node tools/mdtoc.js docs/MAINTENANCE.md ...   (no files: README.md and every guide in docs/guides/; docs/ itself is the website) */
'use strict';
const fs = require('fs');
const path = require('path');
const START = '<!-- contents: made by tools/mdtoc.js, run it again after changing headings -->', END = '<!-- /contents -->';
const BACK = '<sub>[Back to contents](#contents)</sub>';

/* GitHub's heading anchors: lower case, punctuation dropped, spaces to dashes, repeats get -1, -2 */
function slugger(){
  const seen = new Map();
  return text => {
    let s = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').trim().toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '').replace(/ /g, '-');
    const n = seen.get(s) || 0; seen.set(s, n + 1);
    return n ? s + '-' + n : s;
  };
}
const label = t => t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();

function toc(src, opts = {}){
  // take out what an earlier run added
  let s = src.replace(new RegExp('\\n?' + START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + END + '\\n?', 'g'), '\n');
  s = s.split('\n').filter(l => l.trim() !== BACK).join('\n').replace(/\n{3,}/g, '\n\n');
  const lines = s.split('\n'), heads = []; let fence = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (fence) return;
    const m = l.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/); if (m) heads.push({ i, level: m[1].length, text: m[2] });
  });
  const h2 = heads.filter(h => h.level === 2);
  if (h2.length + heads.filter(h => h.level === 3).length < 2) return src;   // a page with one heading needs no list
  const slug = slugger(); slug('contents');
  heads.forEach(h => { h.slug = slug(h.text); });
  // Sections under a second top-level title (HOSTING.md's "# Using the app", MAINTENANCE.md's "# Notes for whoever
  // edits the code") are folded away under that title so the list stays short.
  const h1s = heads.filter(h => h.level === 1), notesFrom = h1s.length > 1 ? h1s[1].i : Infinity;
  const isNote = h => h.i > notesFrom;
  const parentOf = h => { let p = null; heads.forEach(x => { if (x.level === 2 && x.i < h.i) p = x; }); return p; };
  const main = heads.filter(h => (h.level === 2 && !isNote(h)) || (h.level === 3 && parentOf(h) && !isNote(parentOf(h))));
  const item = h => (h.level === 3 ? '  ' : '') + '- [' + label(h.text) + '](#' + h.slug + ')';
  const items = main.map(item);
  const notes = h2.filter(isNote);
  if (notes.length) items.push('', '<details><summary>' + label(h1s[1].text) + ' (' + notes.length + ')</summary>', '', ...notes.map(item), '', '</details>');
  const block = [START, '## Contents', '', ...items, '', END];
  // back links before each main section, after the first
  const out = []; let seen2 = 0;
  lines.forEach((l, i) => {
    const h = heads.find(x => x.i === i);
    if (h && h.level === 2){ if (seen2++ > 0){
      while (out.length && out[out.length - 1].trim() === '') out.pop();
      out.push('', BACK, '');
    } }
    out.push(l);
  });
  // the contents go after the title and its first paragraph, or at the top
  const h1 = heads.find(h => h.level === 1);
  let at = 0;
  if (h1){
    const j = out.indexOf(lines[h1.i]);
    at = j + 1;
    while (at < out.length && out[at].trim() === '') at++;
    while (at < out.length && out[at].trim() !== '' && !/^#/.test(out[at])) at++;
  }
  out.splice(at, 0, '', ...block, '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

module.exports = { toc, slugger };
if (require.main === module){
  const dir = path.join(__dirname, '..'), docs = path.join(dir, 'docs', 'guides');
  const md = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /\.md$/i.test(f)).map(f => path.join(d, f)) : [];
  const files = process.argv.slice(2).length ? process.argv.slice(2) : md(dir).filter(f => /README\.md$/i.test(f)).concat(md(docs));
  files.forEach(f => {
    const a = fs.readFileSync(f, 'utf8'), b = toc(a);
    if (a !== b){
      fs.writeFileSync(f, b);
      console.log('Contents updated: ' + path.basename(f));
    } else console.log('No change: ' + path.basename(f));
  });
}
