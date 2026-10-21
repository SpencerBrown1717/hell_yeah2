import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prdDir = resolve(root, 'docs/prds');
const files = readdirSync(prdDir).filter(f => f.endsWith('.md')).sort();
assert.equal(files.length, 4);
const stats = files.map(name => {
  const text = readFileSync(resolve(prdDir, name), 'utf8');
  const pages = text.split('<!-- PAGE -->');
  const declared = Number(text.match(/^document_pages: (\d+)/m)?.[1]);
  assert.equal(pages.length, declared, `${name}: page count`);
  assert.ok(pages.length >= 10, `${name}: at least ten pages`);
  for (let i = 0; i < pages.length; i++) {
    assert.match(pages[i], new RegExp(`^## Page ${String(i + 1).padStart(2, '0')} `, 'm'), `${name}: page heading ${i + 1}`);
    assert.ok(pages[i].split(/\s+/).length >= 200, `${name}: substantive page ${i + 1}`);
  }
  assert.match(text, /Mastra/); assert.match(text, /#FF4301/);
  assert.match(text, /Hellyeah/); assert.match(text, /fixture/);
  assert.ok(!text.includes('<!-- FIGURE'), `${name}: no missing figure placeholder`);
  for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (!/^(https?:|#)/.test(link)) assert.ok(existsSync(resolve(prdDir, link)), `Broken local link ${link}`);
  }
  return { file: name, page_sections: pages.length, words: text.split(/\s+/).length };
});
assert.ok(stats[0].words > Math.max(...stats.slice(1).map(s => s.words)), 'OS must be largest');
const tokens = JSON.parse(readFileSync(resolve(root, 'design/brand-tokens.json'), 'utf8'));
const colors = Object.fromEntries(tokens.colors.map(c => [c.name, c.hex]));
assert.equal(colors['Hellyeah Orange'], '#FF4301'); assert.equal(colors['Hellyeah Navy'], '#0D0C2B');
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a,b) { const [hi,lo] = [luminance(a),luminance(b)].sort((x,y) => y-x); return (hi+.05)/(lo+.05); }
const pairs = [ ['Black on Orange','#0D0D0D','#FF4301'], ['White on Navy','#FFFFFF','#0D0C2B'], ['Black on Gray','#0D0D0D','#F4F4F4'], ['Black on White','#0D0D0D','#FFFFFF'] ];
const contrastResults = pairs.map(([name,a,b]) => { const ratio = contrast(a,b); assert.ok(ratio >= 4.5, name); return { name, ratio: Number(ratio.toFixed(2)) }; });
console.log(JSON.stringify({ specs: stats, total_page_sections: stats.reduce((s,x) => s+x.page_sections,0), contrast: contrastResults }, null, 2));
