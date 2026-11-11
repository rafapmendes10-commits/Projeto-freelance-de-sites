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

import { codificar, decodificar, dadosDaPrevia, linkDaPrevia, documentoCompleto, briefingDoSite, temaDoLead, linkLovable } from '../assets/js/modelo-site.js';

test('prévia: link codifica e decodifica os dados com acentos', () => {
  const lead = { nome: 'Clínica Sorriso & Cia', categoria: 'Dentista', nicho: 'Dentistas e clínicas odontológicas', telefone: '(19) 99876-5432', whatsapp: '5519998765432', cidade: 'Campinas', uf: 'SP', bairro: 'Cambuí', lat: -22.89, lon: -47.05 };
  const link = linkDaPrevia(lead, 'https://exemplo.github.io/repo/app.html', { nome: 'Studio Web', whatsapp: '5519911112222' });
  assert.match(link, /^https:\/\/exemplo\.github\.io\/repo\/previa\.html#d=[\w-]+$/);
  const d = decodificar(link.split('#d=')[1]);
  assert.equal(d.n, 'Clínica Sorriso & Cia');
  assert.equal(d.ni, 'dentista');
  assert.equal(d.an, 'Studio Web');
  assert.deepEqual(decodificar(codificar({ a: 'ção' })), { a: 'ção' });
});

test('site pronto: HTML completo, seguro e com conteúdo do nicho', () => {
  const d = dadosDaPrevia({ nome: 'Odonto <Vida>', categoria: 'Dentista', nicho: 'dentista', telefone: '(19) 3232-1010', cidade: 'Campinas', uf: 'SP', horario: 'Mo-Fr 08:00-18:00' });
  const html = documentoCompleto(d);
  assert.match(html, /^<!doctype html>/);
  assert.ok(html.includes('Odonto &lt;Vida&gt;'));
  assert.ok(!html.includes('<Vida>'));
  assert.ok(html.includes('Seu sorriso merece o melhor cuidado'));
  assert.ok(html.includes('Seg a Sex 08:00-18:00'));
  assert.ok(!html.includes('Prévia gratuita'));
  assert.equal(temaDoLead({ c: 'Academia' }).cta, 'Agendar aula experimental');
  assert.match(briefingDoSite(d, { observacoes: 'destacar implantes' }), /destacar implantes/);
  assert.match(linkLovable(d), /^https:\/\/lovable\.dev\/#prompt=/);
});
