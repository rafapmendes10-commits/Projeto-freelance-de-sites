#!/usr/bin/env node
// Verifica um site final já compilado (npm run build) antes da entrega ao cliente.
// Uso: node scripts/verificar-site.mjs sites/<slug>

import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const pasta = process.argv[2];
if (!pasta) { console.log('Uso: node scripts/verificar-site.mjs sites/<slug>'); process.exit(1); }
const saida = path.join(pasta, '_site');
const existe = async (p) => access(path.join(saida, p)).then(() => true, () => false);
const ler = async (p) => readFile(path.join(saida, p), 'utf8').catch(() => '');
const site = JSON.parse(await readFile(path.join(pasta, 'src/_data/site.json'), 'utf8'));
const home = await ler('index.html');

const resultados = [];
const ok = (nome, cond, aviso = false) => resultados.push([cond ? 'OK   ' : aviso ? 'AVISO' : 'FALHA', nome]);

ok('Site compilado (_site/index.html)', Boolean(home));
for (const p of ['404.html', 'privacidade/index.html', 'obrigado/index.html', 'sitemap.xml', 'robots.txt', 'site.webmanifest', '_headers', 'assets/img/og.png', 'assets/img/icone-180.png', 'assets/img/favicon.svg']) ok(`Arquivo ${p}`, await existe(p));
const titulo = (home.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
const descricao = (home.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
ok(`Título com 30 a 65 caracteres (${titulo.length})`, titulo.length >= 30 && titulo.length <= 65, true);
ok(`Descrição com 120 a 165 caracteres (${descricao.length})`, descricao.length >= 120 && descricao.length <= 165, true);
ok('Indexável (sem noindex na página inicial)', !/name="robots" content="noindex/.test(home));
ok('Canonical', /<link rel="canonical"/.test(home));
ok('Open Graph com imagem', /property="og:image" content="https?:\/\/[^"]+og\.png"/.test(home));
let jsonLd = null;
try { jsonLd = JSON.parse((home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]); } catch { /* inválido */ }
ok('Dados estruturados JSON-LD válidos', Boolean(jsonLd?.name && jsonLd?.address));
ok('Sem faixa de prévia', !/Prévia gratuita|Quero este site/i.test(home));
ok('Botão de WhatsApp válido', /https:\/\/wa\.me\/55\d{10,11}/.test(home));
ok('Link para a política de privacidade', /href="\/privacidade\/"/.test(home));
ok('Banner de cookies presente', /id="cookies"/.test(home));
ok('Imagens com texto alternativo', ![...home.matchAll(/<img(?![^>]*\balt=)[^>]*>/g)].length);
ok('Sem "lorem ipsum"', !/lorem ipsum/i.test(home));
ok('Endereço definitivo configurado (url em site.json)', !/dominiodocliente/.test(site.url), true);
ok('WhatsApp real configurado', !/^55000/.test(site.whatsapp));
ok('Chave do formulário configurada', Boolean(site.integracoes?.formulario?.chave), true);
ok('Google Analytics ou Tag Manager configurado', Boolean(site.integracoes?.ga4 || site.integracoes?.gtm), true);
ok('Razão social e documento no rodapé', Boolean(site.empresa?.razaoSocial && site.empresa?.documento), true);

for (const [estado, nome] of resultados) console.log(`${estado} ${nome}`);
const falhas = resultados.filter(([e]) => e === 'FALHA').length;
const avisos = resultados.filter(([e]) => e === 'AVISO').length;
console.log(`\n${falhas} falha(s), ${avisos} aviso(s). ${falhas ? 'Corrija antes de entregar.' : avisos ? 'Avisos dependem de dados do cliente: resolva antes da entrega final.' : 'Site pronto para entrega.'}`);
process.exit(falhas ? 1 : 0);
