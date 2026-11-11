#!/usr/bin/env node
// Verifica se uma prévia personalizada cumpre os requisitos do CLAUDE.md.
// Uso: node scripts/verificar-previa.mjs previas/<slug>/index.html

import { readFile, stat } from 'node:fs/promises';

const arquivo = process.argv[2];
if (!arquivo) {
  console.log('Uso: node scripts/verificar-previa.mjs previas/<slug>/index.html');
  process.exit(1);
}

const html = await readFile(arquivo, 'utf8');
const tamanhoKb = (await stat(arquivo)).size / 1024;

const regras = [
  ['Começa com <!doctype html>', /^\s*<!doctype html>/i.test(html)],
  ['Idioma pt-BR', /<html[^>]+lang="pt-BR"/i.test(html)],
  ['Meta viewport', /<meta[^>]+name="viewport"/i.test(html)],
  ['Não indexável (noindex)', /<meta[^>]+name="robots"[^>]+noindex/i.test(html)],
  ['Título com "Prévia do site"', /<title>[^<]*Prévia do site[^<]*<\/title>/i.test(html)],
  ['Meta description', /<meta[^>]+name="description"[^>]+content="[^"]{40,}"/i.test(html)],
  ['Faixa "Prévia gratuita"', /Prévia gratuita/i.test(html)],
  ['Botão "Quero este site"', /Quero este site/i.test(html)],
  ['Link de WhatsApp', /https:\/\/wa\.me\/\d{10,13}/.test(html)],
  ['Sem scripts externos', !/<script[^>]+src=/i.test(html)],
  ['Folhas de estilo externas só do Google Fonts', [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/gi)].every((m) => /fonts\.googleapis\.com/.test(m[0]))],
  ['Sem imagens externas', ![...html.matchAll(/<img[^>]+src="(https?:[^"]+)"/gi)].length],
  ['Sem "lorem ipsum"', !/lorem ipsum/i.test(html)],
  [`Tamanho até 250 KB (atual: ${tamanhoKb.toFixed(0)} KB)`, tamanhoKb <= 250],
];

let falhas = 0;
for (const [nome, ok] of regras) {
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome}`);
  if (!ok) falhas++;
}
console.log(falhas ? `\n${falhas} problema(s) encontrados.` : '\nPrévia aprovada.');
process.exit(falhas ? 1 : 0);
