/* Gera assets/js/icons.js apenas com os ícones Lucide usados na página. */
const fs = require('fs');
const path = require('path');
const { icons } = require('lucide');

const root = path.join(__dirname, '..');
const sources = ['index.html', 'assets/js/main.js'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const names = [...new Set([...sources.matchAll(/data-lucide="([a-z0-9-]+)"/g)].map((m) => m[1]))].sort();
const pascal = (s) => s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

const used = {};
for (const name of names) {
  const node = icons[pascal(name)];
  if (!node) throw new Error(`Ícone Lucide não encontrado: ${name}`);
  used[name] = Array.isArray(node[2]) ? node[2] : node;
}

const out = `/* Ícones Lucide (ISC License) — gerado por scripts/build-icons.js */
(() => {
  const ICONS = ${JSON.stringify(used)};
  const ATTRS = { xmlns: 'http://www.w3.org/2000/svg', width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const NS = 'http://www.w3.org/2000/svg';
  const build = (tag, attrs) => { const el = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); return el; };
  const createIcons = () => {
    document.querySelectorAll('[data-lucide]').forEach((ph) => {
      const name = ph.getAttribute('data-lucide');
      const node = ICONS[name];
      if (!node) return;
      const svg = build('svg', ATTRS);
      node.forEach(([tag, attrs]) => svg.appendChild(build(tag, attrs)));
      svg.setAttribute('class', ['lucide', 'lucide-' + name, ph.getAttribute('class') || ''].join(' ').trim());
      svg.setAttribute('aria-hidden', 'true');
      ph.replaceWith(svg);
    });
  };
  window.lucide = { createIcons };
})();
`;
fs.writeFileSync(path.join(root, 'assets/js/icons.js'), out);
console.log(`icons.js: ${names.length} ícones`);
