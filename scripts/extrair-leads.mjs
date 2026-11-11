#!/usr/bin/env node
// Robô de extração de leads (Node 18+). Usa o mesmo motor do painel web.
//
// Exemplos:
//   node scripts/extrair-leads.mjs --nicho "dentista" --local "Campinas, SP"
//   node scripts/extrair-leads.mjs --nicho "academia" --local "Sorocaba, SP" --raio 10 --enriquecer
//   node scripts/extrair-leads.mjs --config automacao/buscas.json --enriquecer
//   GOOGLE_PLACES_API_KEY=... node scripts/extrair-leads.mjs --fonte google --nicho "pizzaria" --local "Curitiba, PR"

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarLeadsOsm, deduplicar } from '../assets/js/fontes/osm.js';
import { buscarLeadsGoogleRest } from '../assets/js/fontes/google.js';
import { gerarCsv } from '../assets/js/exportar.js';
import { linkDaPrevia } from '../assets/js/modelo-site.js';
import { slug, interpretarTelefones, pontuarLead, urlInstagram, esperar } from '../assets/js/util.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USER_AGENT = 'RadarLeads/1.0 (extrator de leads de codigo aberto)';

/** Endereço público do site, usado para montar o link da prévia de cada empresa. */
function baseDasPrevias() {
  if (process.env.PREVIA_BASE_URL) return process.env.PREVIA_BASE_URL.replace(/\/?$/, '/');
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    const [dono, nome] = repo.split('/');
    return `https://${dono.toLowerCase()}.github.io/${nome}/`;
  }
  return '';
}

function lerArgumentos(argv) {
  const args = { enriquecer: false, fonte: 'osm', limite: 1000, saida: 'dados' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const proximo = () => argv[++i];
    if (a === '--nicho') args.nicho = proximo();
    else if (a === '--local') args.local = proximo();
    else if (a === '--raio') args.raioKm = Number(proximo()) || 0;
    else if (a === '--limite') args.limite = Number(proximo()) || 1000;
    else if (a === '--fonte') args.fonte = proximo();
    else if (a === '--saida') args.saida = proximo();
    else if (a === '--config') args.config = proximo();
    else if (a === '--enriquecer') args.enriquecer = true;
    else if (a === '--ajuda' || a === '-h') args.ajuda = true;
  }
  return args;
}

const AJUDA = `
Uso: node scripts/extrair-leads.mjs [opções]

  --nicho "texto"     Nicho ou palavra-chave (ex.: dentista, pizzaria)
  --local "texto"     Cidade, bairro ou endereço. Várias cidades: "Campinas, SP; Valinhos, SP"
  --raio N            Raio em km ao redor do local (padrão: cidade inteira)
  --limite N          Máximo de resultados por local (padrão: 1000)
  --fonte osm|google  Fonte de dados (google exige GOOGLE_PLACES_API_KEY)
  --enriquecer        Visita o site de cada empresa para achar e-mail, Instagram e WhatsApp
  --config arquivo    JSON com uma lista de buscas [{ "nicho": "...", "local": "..." }]
  --saida pasta       Pasta de saída (padrão: dados)
`;

// ------------------------------------------------------------ enriquecimento pelo site

const IGNORAR_EMAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$|example\.|sentry|wixpress|godaddy|@sentry|domain\.com|email\.com$|seuemail|seu@/i;

async function baixarPagina(url, ms = 10000) {
  const controle = new AbortController();
  const t = setTimeout(() => controle.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }, redirect: 'follow', signal: controle.signal });
    if (!r.ok || !/text\/html|application\/xhtml/i.test(r.headers.get('content-type') || 'text/html')) return '';
    const texto = await r.text();
    return texto.slice(0, 1_500_000);
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

export function extrairContatosDoHtml(html) {
  const emails = [...new Set((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((e) => e.toLowerCase()))]
    .filter((e) => !IGNORAR_EMAIL.test(e));
  const insta = (html.match(/https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/i) || [])[1];
  const face = (html.match(/https?:\/\/(?:www\.|pt-br\.)?facebook\.com\/([A-Za-z0-9_.-]+)/i) || [])[1];
  const zapBruto = (html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|whatsapp:\/\/send\?phone=)(\+?\d{10,13})/i) || [])[1];
  const zap = zapBruto ? interpretarTelefones(zapBruto)[0] : null;
  return {
    email: emails[0] || '',
    instagram: insta && !['p', 'reel', 'explore', 'accounts'].includes(insta.toLowerCase()) ? urlInstagram(insta) : '',
    facebook: face && !['sharer', 'sharer.php', 'tr', 'plugins', 'dialog'].includes(face.toLowerCase()) ? `https://www.facebook.com/${face}` : '',
    whatsapp: zap?.whatsapp || '',
  };
}

async function enriquecer(leads, concorrencia = 6) {
  const alvos = leads.filter((l) => l.site);
  let feitos = 0;
  const fila = [...alvos];
  async function trabalhador() {
    while (fila.length) {
      const l = fila.shift();
      const html = await baixarPagina(l.site);
      if (html) {
        const c = extrairContatosDoHtml(html);
        if (!l.email && c.email) l.email = c.email;
        if (!l.instagram && c.instagram) l.instagram = c.instagram;
        if (!l.facebook && c.facebook) l.facebook = c.facebook;
        if (!l.whatsapp && c.whatsapp) l.whatsapp = c.whatsapp;
        l.pontuacao = pontuarLead(l);
      }
      feitos++;
      if (feitos % 10 === 0 || feitos === alvos.length) process.stdout.write(`\r  Enriquecendo sites: ${feitos}/${alvos.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concorrencia, alvos.length) }, trabalhador));
  if (alvos.length) process.stdout.write('\n');
}

// ------------------------------------------------------------ execução

async function executarBusca(busca, opcoesGerais) {
  const fonte = busca.fonte || opcoesGerais.fonte;
  const locais = String(busca.local).split(';').map((s) => s.trim()).filter(Boolean);
  let leads = [];
  for (const local of locais) {
    console.log(`> ${busca.nicho} em ${local}${busca.raioKm ? ` (raio de ${busca.raioKm} km)` : ''} [${fonte}]`);
    if (fonte === 'google') {
      const chave = process.env.GOOGLE_PLACES_API_KEY;
      if (!chave) throw new Error('Defina a variável GOOGLE_PLACES_API_KEY para usar a fonte google.');
      leads = leads.concat(await buscarLeadsGoogleRest({ nicho: busca.nicho, local, chave }));
    } else {
      const r = await buscarLeadsOsm(
        { nicho: busca.nicho, local, raioKm: busca.raioKm, limite: busca.limite || opcoesGerais.limite },
        { userAgent: USER_AGENT, onProgresso: (t) => console.log(`  ${t}`) },
      );
      leads = leads.concat(r.leads);
    }
    await esperar(2000); // respeita os servidores públicos
  }
  leads = deduplicar(leads);
  if (busca.enriquecer ?? opcoesGerais.enriquecer) await enriquecer(leads);
  leads.sort((a, b) => b.pontuacao - a.pontuacao);
  const base = baseDasPrevias();
  if (base) {
    const agencia = { nome: process.env.AGENCIA_NOME || '', whatsapp: (process.env.AGENCIA_WHATSAPP || '').replace(/\D/g, '') };
    for (const l of leads) l.linkPrevia = linkDaPrevia(l, base, agencia);
  }
  return leads;
}

function resumo(leads) {
  const n = (fn) => leads.filter(fn).length;
  return `${leads.length} leads | telefone: ${n((l) => l.telefone)} | WhatsApp: ${n((l) => l.whatsapp)} | e-mail: ${n((l) => l.email)} | site: ${n((l) => l.site)} | sem site: ${n((l) => !l.site)}`;
}

async function principal() {
  const args = lerArgumentos(process.argv.slice(2));
  if (args.ajuda || (!args.config && (!args.nicho || !args.local))) {
    console.log(AJUDA);
    process.exit(args.ajuda ? 0 : 1);
  }
  let buscas;
  if (args.config) {
    buscas = JSON.parse(await readFile(path.resolve(RAIZ, args.config), 'utf8'));
    if (!Array.isArray(buscas)) buscas = buscas.buscas || [];
  } else {
    buscas = [{ nicho: args.nicho, local: args.local, raioKm: args.raioKm }];
  }

  const data = new Date().toISOString().slice(0, 10);
  const pasta = path.resolve(RAIZ, args.saida, data);
  await mkdir(pasta, { recursive: true });
  const relatorio = [];
  let falhas = 0;

  for (const busca of buscas) {
    try {
      const leads = await executarBusca(busca, args);
      const base = `leads-${slug(busca.nicho)}-${slug(busca.local)}`;
      await writeFile(path.join(pasta, `${base}.csv`), gerarCsv(leads));
      await writeFile(path.join(pasta, `${base}.json`), JSON.stringify(leads, null, 2));
      console.log(`  ${resumo(leads)}`);
      console.log(`  Arquivos: ${path.relative(RAIZ, path.join(pasta, base))}.csv / .json`);
      relatorio.push({ ...busca, arquivo: `${base}.csv`, total: leads.length, ok: true });
    } catch (erro) {
      falhas++;
      console.error(`  ERRO: ${erro.message}`);
      relatorio.push({ ...busca, ok: false, erro: erro.message });
    }
  }

  const linhas = [
    `# Leads extraídos em ${data}`, '',
    '| Nicho | Local | Leads | Arquivo |', '| --- | --- | --- | --- |',
    ...relatorio.map((r) => `| ${r.nicho} | ${r.local} | ${r.ok ? r.total : `erro: ${r.erro}`} | ${r.arquivo || ''} |`),
    '', 'Importe os CSVs no painel em Configurações, Importar CSV.',
  ];
  await writeFile(path.join(pasta, 'RESUMO.md'), `${linhas.join('\n')}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `${linhas.join('\n')}\n`, { flag: 'a' });
  if (falhas === buscas.length) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
