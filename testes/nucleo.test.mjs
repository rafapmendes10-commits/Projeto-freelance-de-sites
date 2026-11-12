import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretarTelefone, interpretarTelefones, preencherModelo, normalizarUrl, urlInstagram } from '../assets/js/util.js';
import { encontrarNicho } from '../assets/js/nichos.js';
import { normalizarElementoOsm, montarConsulta, deduplicar } from '../assets/js/fontes/osm.js';
import { gerarCsv } from '../assets/js/exportar.js';
import { extrairContatosDoHtml } from '../scripts/extrair-leads.mjs';

test('telefones brasileiros: celular, fixo, DDI e formatos variados', () => {
  assert.deepEqual(
    (({ formatado, celular, whatsapp }) => ({ formatado, celular, whatsapp }))(interpretarTelefone('+55 19 98765-4321')),
    { formatado: '(19) 98765-4321', celular: true, whatsapp: '5519987654321' },
  );
  assert.equal(interpretarTelefone('(19) 3232-1010').celular, false);
  assert.equal(interpretarTelefone('(19) 3232-1010').formatado, '(19) 3232-1010');
  assert.equal(interpretarTelefone('019 99999-0000').whatsapp, '5519999990000');
  assert.equal(interpretarTelefone('0800 123 4567').whatsapp, '');
  assert.equal(interpretarTelefones('+55 11 91234-5678; +55 11 3333-4444').length, 2);
  assert.equal(interpretarTelefone(''), null);
});

test('nichos: sinônimos, plural e acentos', () => {
  assert.equal(encontrarNicho('dentista').id, 'dentista');
  assert.equal(encontrarNicho('Salões de beleza').id, 'salao');
  assert.equal(encontrarNicho('clínica de estética').id, 'estetica');
  assert.equal(encontrarNicho('contador').id, 'contabilidade');
  assert.equal(encontrarNicho('escola de surf'), null);
});

test('consulta Overpass por área e por raio', () => {
  const q1 = montarConsulta({ nicho: encontrarNicho('dentista'), local: { idArea: 3600298227 } });
  assert.match(q1, /area\(id:3600298227\)->\.a;/);
  assert.match(q1, /nwr\["amenity"="dentist"\]\["name"\]\(area\.a\);/);
  const q2 = montarConsulta({ termoLivre: 'açaí', local: { lat: -22.9, lon: -47.06 }, raioKm: 2 });
  assert.match(q2, /around:2000,-22.9,-47.06/);
});

test('normalização de elemento OSM em lead', () => {
  const lead = normalizarElementoOsm({
    type: 'node', id: 42, lat: -22.9, lon: -47.06,
    tags: {
      name: 'Clínica Sorriso', amenity: 'dentist', phone: '+55 19 99876-5432', website: 'clinicasorriso.com.br',
      'addr:street': 'Rua Barão de Jaguara', 'addr:housenumber': '100', 'addr:suburb': 'Centro', 'contact:instagram': '@clinicasorriso',
    },
  }, { cidade: 'Campinas', uf: 'SP' });
  assert.equal(lead.id, 'osm:n42');
  assert.equal(lead.categoria, 'Dentista');
  assert.equal(lead.whatsapp, '5519998765432');
  assert.equal(lead.site, 'https://clinicasorriso.com.br');
  assert.equal(lead.instagram, 'https://www.instagram.com/clinicasorriso/');
  assert.equal(lead.endereco, 'Rua Barão de Jaguara, 100, Centro, Campinas/SP');
  assert.ok(lead.pontuacao > 50);
  assert.equal(normalizarElementoOsm({ type: 'node', id: 1, tags: { amenity: 'dentist' } }), null);
  assert.equal(deduplicar([lead, { ...lead }]).length, 1);
});

test('CSV com BOM, ponto e vírgula e proteção contra fórmulas', () => {
  const csv = gerarCsv([{ nome: '=HYPERLINK("x")', telefone: '(19) 3232-1010', telefones: [], endereco: 'Rua A; 10' }]);
  assert.ok(csv.startsWith('﻿Nome;Categoria;'));
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  assert.match(csv, /"Rua A; 10"/);
});

test('modelos de mensagem e URLs', () => {
  assert.equal(preencherModelo('Olá {nome}, de {cidade}! {x}', { nome: 'Pet Feliz', cidade: 'Jundiaí' }), 'Olá Pet Feliz, de Jundiaí! {x}');
  assert.equal(normalizarUrl('www.site.com.br'), 'https://www.site.com.br');
  assert.equal(urlInstagram('https://instagram.com/abc'), 'https://instagram.com/abc');
});

test('enriquecimento: extrai e-mail, Instagram e WhatsApp do HTML', () => {
  const c = extrairContatosDoHtml(`<a href="mailto:contato@empresa.com.br">x</a><img src="logo@2x.png">
    <a href="https://www.instagram.com/empresa.oficial/">ig</a><a href="https://wa.me/5519987654321">zap</a>`);
  assert.equal(c.email, 'contato@empresa.com.br');
  assert.equal(c.instagram, 'https://www.instagram.com/empresa.oficial/');
  assert.equal(c.whatsapp, '5519987654321');
});

import { enriquecerOportunidades, promptDaPrevia, promptEmLote, promptSiteFinal, mensagemOnboarding, caminhoPrevia, demandasDoNicho } from '../assets/js/oportunidade.js';
import { auditarSite } from '../scripts/extrair-leads.mjs';
import { caracteristicasDasEtiquetas } from '../assets/js/fontes/osm.js';

const base = { categoria: 'Dentista', nicho: 'Dentistas e clínicas odontológicas', cidade: 'Campinas', uf: 'SP', bairro: 'Cambuí' };
const leadsExemplo = () => [
  { ...base, id: 'a', nome: 'Clínica Sorriso Pleno', whatsapp: '5519998765432', telefone: '(19) 99876-5432', lat: -22.8935, lon: -47.0512, caracteristicas: ['Abre aos sábados', 'Aceita Pix'], pontuacao: 60 },
  { ...base, id: 'b', nome: 'Odonto Vida', site: 'https://odontovida.com.br', lat: -22.894, lon: -47.052, pontuacao: 40 },
  { ...base, id: 'c', nome: 'Dental Prime', site: 'https://dentalprime.com.br', lat: -22.896, lon: -47.05, pontuacao: 40 },
  { ...base, id: 'd', nome: 'Longe Odonto', lat: -22.99, lon: -47.2, pontuacao: 20 },
];

test('diagnóstico: concorrência no raio e pontuação de oportunidade', () => {
  const [a, b, , d] = enriquecerOportunidades(leadsExemplo());
  assert.equal(a.concorrencia.total, 2);
  assert.equal(a.concorrencia.comSite, 2);
  assert.ok(a.oportunidade >= 80, `oportunidade ${a.oportunidade}`);
  assert.ok(a.motivos.some((m) => /2 de 2 concorrentes/.test(m)));
  assert.ok(b.oportunidade < a.oportunidade);
  assert.equal(d.concorrencia.total, 0);
  assert.equal(caminhoPrevia(a), 'previas/clinica-sorriso-pleno-cambui/');
});

test('prompt individual traz dados, contexto, demandas, pesquisa e entrega', () => {
  const [a] = enriquecerOportunidades(leadsExemplo());
  const p = promptDaPrevia(a, { baseSite: 'https://x.github.io/repo/', agenciaNome: 'Studio Web', agenciaWhatsapp: '5519911112222' });
  for (const trecho of ['# Prévia personalizada: Clínica Sorriso Pleno', 'previas/clinica-sorriso-pleno-cambui/index.html',
    'https://x.github.io/repo/previas/clinica-sorriso-pleno-cambui/', 'Odonto Vida', 'Abre aos sábados', 'CFO', '"Clínica Sorriso Pleno" instagram',
    'Prévia gratuita criada por Studio Web', 'https://wa.me/5519911112222', 'verificar-previa.mjs']) {
    assert.ok(p.includes(trecho), `faltou: ${trecho}`);
  }
  assert.match(promptEmLote([a, a]), /Lote de 2 prévias/);
  const final = promptSiteFinal({ ...a, notas: 'destacar implantes', valor: '1.500' });
  for (const trecho of ['# Site final: Clínica Sorriso Pleno', 'modelos/site-base', 'sites/clinica-sorriso-pleno-cambui', 'node scripts/gerar-imagens.mjs', 'node scripts/verificar-site.mjs', 'destacar implantes', 'R$ 1.500', 'nunca invente']) {
    assert.ok(final.includes(trecho), `site final sem: ${trecho}`);
  }
  assert.ok(!final.includes('\\`'), 'crases escapadas no texto');
  const boas = mensagemOnboarding(a, { agenciaNome: 'Studio Web' });
  assert.match(boas, /Aqui é Studio Web/);
  assert.match(boas, /CPF\/CNPJ do titular/);
  assert.ok(demandasDoNicho({ categoria: 'Advocacia' }).cuidados.includes('OAB'));
});

test('características do OSM e auditoria do site atual', () => {
  assert.deepEqual(caracteristicasDasEtiquetas({ delivery: 'yes', 'payment:pix': 'yes' }), ['Faz entregas (delivery)', 'Aceita Pix']);
  const a = auditarSite('<html><footer>© 2018 Empresa</footer></html>', 'http://empresa.com.br');
  assert.ok(a.problemas.includes('sem HTTPS (navegador mostra "não seguro")'));
  assert.ok(a.problemas.includes('não é adaptado para celular'));
  assert.ok(a.problemas.some((x) => x.includes('2018')));
  assert.equal(auditarSite('<meta name="viewport" content="x"><a href="https://wa.me/55">z</a> © 2026', 'https://ok.com').problemas.length, 0);
});
