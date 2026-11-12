#!/usr/bin/env node
// Gera a imagem de compartilhamento (og.png 1200x630), o ícone (icone-180.png) e o favicon.svg de um site final.
// Uso: node scripts/gerar-imagens.mjs sites/<slug>
// Requer o Playwright (já disponível no ambiente do Claude Code).

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const pasta = process.argv[2];
if (!pasta) { console.log('Uso: node scripts/gerar-imagens.mjs sites/<slug>'); process.exit(1); }
const site = JSON.parse(await readFile(path.join(pasta, 'src/_data/site.json'), 'utf8'));
const destino = path.join(pasta, 'src/assets/img');
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iniciais = String(site.nome).split(/\s+/).filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'S';
const { primaria, secundaria } = site.cores;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primaria}"/><stop offset="1" stop-color="${secundaria}"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="42" font-family="Arial, sans-serif" font-size="${iniciais.length > 1 ? 26 : 32}" font-weight="700" fill="#fff" text-anchor="middle">${esc(iniciais)}</text></svg>\n`;
await writeFile(path.join(destino, 'favicon.svg'), favicon);

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('Playwright não encontrado.'); process.exit(1); }
const navegador = await chromium.launch();
const pagina = await navegador.newPage();

await pagina.setViewportSize({ width: 1200, height: 630 });
await pagina.setContent(`<html><body style="margin:0;width:1200px;height:630px;font-family:Arial,Helvetica,sans-serif;background:linear-gradient(135deg,${primaria},${secundaria});color:#fff;display:flex;flex-direction:column;justify-content:center;padding:80px;box-sizing:border-box">
  <div style="font-size:30px;opacity:.9;font-weight:700;letter-spacing:.04em;text-transform:uppercase">${esc(site.segmento)} · ${esc(site.endereco.bairro)}, ${esc(site.endereco.cidade)}</div>
  <div style="font-size:76px;font-weight:800;line-height:1.05;margin:24px 0;letter-spacing:-.02em">${esc(site.nome)}</div>
  <div style="font-size:36px;opacity:.95;max-width:980px;line-height:1.25">${esc(site.slogan)}</div>
</body></html>`);
await pagina.screenshot({ path: path.join(destino, 'og.png') });

await pagina.setViewportSize({ width: 180, height: 180 });
await pagina.setContent(`<html><body style="margin:0">${favicon.replace('<svg ', '<svg width="180" height="180" ')}</body></html>`);
await pagina.screenshot({ path: path.join(destino, 'icone-180.png'), omitBackground: true });

await navegador.close();
console.log(`Imagens geradas em ${destino}: og.png, icone-180.png, favicon.svg`);
