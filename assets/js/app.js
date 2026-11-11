// Radar Leads: aplicação do painel (100% no navegador, sem servidor).

import { NICHOS, encontrarNicho } from './nichos.js';
import { buscarLeadsOsm, deduplicar } from './fontes/osm.js';
import { buscarLeadsGoogleNavegador } from './fontes/google.js';
import { baixarCsv, baixarExcel, baixarJson, COLUNAS } from './exportar.js';
import { enriquecerOportunidades, promptDaPrevia, promptEmLote, promptSiteFinal, caminhoPrevia, slugPrevia } from './oportunidade.js';
import { crm, config, historico, fila, sessao, ETAPAS, backupCompleto, restaurarBackup, apagarTudo } from './armazenamento.js';
import {
  escaparHtml as h, slug, preencherModelo, linkWhatsApp, formatarData, interpretarTelefones,
  pontuarLead, linkGoogleMaps, normalizarUrl, normalizarTexto,
} from './util.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const ico = (nome) => `<svg aria-hidden="true"><use href="#i-${nome}"/></svg>`;
const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');

const estado = {
  resultados: [],
  filtrados: [],
  selecionados: new Set(),
  pagina: 1,
  porPagina: 50,
  filtros: new Set(),
  texto: '',
  ordem: 'oportunidade',
  modo: 'tabela',
  contexto: null,
  controlador: null,
  modoCrm: 'funil',
  cronometro: null,
  liberadoEm: 0,
};

const POPULARES = ['dentista', 'pizzaria', 'academia', 'salao', 'barbearia', 'oficina', 'advogado', 'contabilidade', 'imobiliaria', 'petshop', 'estetica', 'restaurante'];

const FILTROS = [
  { id: 'telefone', rotulo: 'Com telefone', teste: (l) => Boolean(l.telefone) },
  { id: 'whatsapp', rotulo: 'Com WhatsApp', teste: (l) => Boolean(l.whatsapp) },
  { id: 'email', rotulo: 'Com e-mail', teste: (l) => Boolean(l.email) },
  { id: 'site', rotulo: 'Com site', teste: (l) => Boolean(l.site), exclui: 'semsite' },
  { id: 'semsite', rotulo: 'Sem site', teste: (l) => !l.site, exclui: 'site' },
  { id: 'redes', rotulo: 'Com redes sociais', teste: (l) => Boolean(l.instagram || l.facebook) },
  { id: 'naosalvos', rotulo: 'Ainda não salvos', teste: (l) => !crm.tem(l.id) },
];

const CORES_ETAPA = { novo: '#64748b', contatado: '#2563eb', negociando: '#d97706', pago: '#7c3aed', ganho: '#0d9f6e', perdido: '#dc2626' };

// ---------------------------------------------------------------- utilidades de interface

function aviso(mensagem, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `aviso-flutuante ${tipo === 'erro' ? 'erro' : ''}`;
  el.innerHTML = `${ico(tipo === 'erro' ? 'x' : 'check')}<span>${h(mensagem)}</span>`;
  // Com a janela do lead aberta, o aviso precisa ficar dentro dela para aparecer por cima
  const dialogo = document.querySelector('dialog[open]');
  let destino = $('#avisos');
  if (dialogo) {
    destino = dialogo.querySelector('.avisos') || dialogo.appendChild(Object.assign(document.createElement('div'), { className: 'avisos' }));
  }
  destino.appendChild(el);
  setTimeout(() => el.remove(), tipo === 'erro' ? 6000 : 3200);
}

function abrirExterno(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener');
}

function modeloAtivo() {
  const c = config.obter();
  return c.modelos.find((m) => m.id === c.modeloAtivo) || c.modelos[0] || { texto: '' };
}

/** Pasta pública do site (onde ficam app.html e previas/). */
function baseDoSite() {
  const c = config.obter();
  if (c.siteBase) return c.siteBase.endsWith('/') ? c.siteBase : `${c.siteBase}/`;
  return new URL('./', location.href.split('#')[0].split('?')[0]).href;
}

/** Link da prévia personalizada já registrada para o lead (ou vazio). */
function previaDe(lead) {
  return crm.obter(lead.id)?.linkPrevia || lead.linkPrevia || '';
}

function configPrompt() {
  const c = config.obter();
  return { baseSite: baseDoSite(), agenciaNome: c.agenciaNome, agenciaWhatsapp: c.agenciaWhatsapp };
}

const verificadas = new Map();

/** Confere se a prévia já foi publicada em previas/<slug>/ e, se sim, registra o link no CRM. */
async function verificarPrevia(lead, { forcar = false } = {}) {
  const url = new URL(caminhoPrevia(lead), baseDoSite()).href;
  if (!forcar && verificadas.has(url)) return verificadas.get(url);
  let ok = false;
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    ok = r.ok;
  } catch { ok = false; }
  verificadas.set(url, ok);
  if (ok && crm.tem(lead.id) && crm.obter(lead.id).linkPrevia !== url) crm.atualizar(lead.id, { linkPrevia: url });
  return ok;
}

/** Copia o prompt individual e garante que o lead esteja no CRM (para guardar o link da prévia depois). */
function copiarPromptDaPrevia(lead) {
  if (!crm.tem(lead.id)) { crm.salvarVarios([lead]); atualizarContadores(); }
  const prompt = promptDaPrevia(crm.obter(lead.id) || lead, configPrompt());
  copiarTexto(prompt, `Prompt da ${lead.nome} copiado. Cole na conversa com o Claude.`);
  crm.atualizar(lead.id, { promptGeradoEm: new Date().toISOString() });
  return prompt;
}

function extrasMensagem(lead) {
  const c = config.obter();
  return {
    nicho: (lead.nicho || lead.categoria || '').toLowerCase(),
    link_previa: previaDe(lead) || '{link_previa}',
    minha_marca: c.agenciaNome || 'especialista em criação de sites',
  };
}

function mensagemPara(lead) {
  return preencherModelo(modeloAtivo().texto, lead, extrasMensagem(lead));
}

function comPrevia(leads) {
  return leads.map((l) => ({ ...l, linkPrevia: previaDe(l) }));
}

function baixarArquivo(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function copiarTexto(texto, mensagem) {
  try {
    await navigator.clipboard.writeText(texto);
    aviso(mensagem);
  } catch {
    window.prompt('Copie o texto abaixo:', texto);
  }
}

function abrirWhatsApp(lead) {
  if (!lead.whatsapp) {
    aviso('Este lead não tem um celular identificado.', 'erro');
    return;
  }
  abrirExterno(linkWhatsApp(lead.whatsapp, mensagemPara(lead)));
}

function atualizarContadores() {
  $('#contador-crm').textContent = fmt(Object.keys(crm.todos()).length);
  $('#contador-fila').textContent = fmt(fila.obter().filter((i) => i.estado === 'pendente').length);
}

// ---------------------------------------------------------------- roteamento

const ROTAS = ['buscar', 'leads', 'disparo', 'historico', 'config'];

function navegar() {
  const rota = ROTAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'buscar';
  for (const v of $$('.vista')) v.hidden = v.dataset.vista !== rota;
  for (const a of $$('.menu a')) a.classList.toggle('ativo', a.dataset.rota === rota);
  fecharMenu();
  if (rota === 'leads') renderizarCrm();
  if (rota === 'disparo') renderizarDisparo();
  if (rota === 'historico') renderizarHistorico();
  if (rota === 'config') renderizarConfig();
  window.scrollTo({ top: 0 });
}

function fecharMenu() {
  $('#lateral').classList.remove('aberta');
  $('#veu').hidden = true;
}

// ---------------------------------------------------------------- busca

function prepararFormulario() {
  $('#lista-nichos').innerHTML = NICHOS.map((n) => `<option value="${h(n.rotulo)}">${h(n.grupo)}</option>`).join('');
  $('#chips-nichos').innerHTML = POPULARES.map((id) => {
    const n = NICHOS.find((x) => x.id === id);
    return n ? `<button type="button" class="chip" data-nicho="${h(n.rotulo)}">${h(n.rotulo.split(' e ')[0])}</button>` : '';
  }).join('');
  $('#chips-nichos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-nicho]');
    if (!b) return;
    $('#f-nicho').value = b.dataset.nicho;
    $('#f-local').focus();
  });
  const c = config.obter();
  $('#f-fonte').value = c.fontePadrao || 'osm';
  $('#form-busca').addEventListener('submit', (e) => {
    e.preventDefault();
    executarBusca();
  });
  $('#cancelar-busca').addEventListener('click', () => estado.controlador?.abort());
}

function mostrarProgresso(titulo, texto = '') {
  $('#progresso').hidden = false;
  $('#progresso-titulo').textContent = titulo;
  $('#progresso-texto').textContent = texto;
}

async function executarBusca(parametros) {
  const p = parametros || {
    nicho: $('#f-nicho').value.trim(),
    local: $('#f-local').value.trim(),
    raioKm: Number($('#f-raio').value) || 0,
    fonte: $('#f-fonte').value,
    limite: Number($('#f-limite').value) || 500,
  };
  if (!p.nicho || !p.local) {
    aviso('Informe o nicho e o local da busca.', 'erro');
    return;
  }
  const c = config.obter();
  if (p.fonte === 'google' && !c.chaveGoogle) {
    aviso('Cadastre sua chave do Google em Configurações ou use o OpenStreetMap, que é gratuito.', 'erro');
    location.hash = '#config';
    return;
  }
  config.salvar({ fontePadrao: p.fonte });

  estado.controlador?.abort();
  const controlador = new AbortController();
  estado.controlador = controlador;
  const locais = p.local.split(';').map((s) => s.trim()).filter(Boolean);
  const botao = $('#botao-buscar');
  botao.disabled = true;
  let todos = [];
  const erros = [];
  try {
    for (const [i, local] of locais.entries()) {
      const rotuloLocal = locais.length > 1 ? `${local} (${i + 1} de ${locais.length})` : local;
      mostrarProgresso(`Buscando ${p.nicho} em ${rotuloLocal}`, 'Isso costuma levar de 5 a 40 segundos.');
      try {
        if (p.fonte === 'google') {
          mostrarProgresso(`Buscando ${p.nicho} em ${rotuloLocal}`, 'Consultando o Google Places...');
          todos = todos.concat(await buscarLeadsGoogleNavegador({ nicho: p.nicho, local, chave: c.chaveGoogle }));
        } else {
          const r = await buscarLeadsOsm(
            { nicho: p.nicho, local, raioKm: p.raioKm, limite: p.limite },
            { signal: controlador.signal, onProgresso: (t) => mostrarProgresso(`Buscando ${p.nicho} em ${rotuloLocal}`, t) },
          );
          todos = todos.concat(r.leads);
        }
      } catch (erro) {
        if (erro.name === 'AbortError') throw erro;
        erros.push(`${local}: ${erro.message}`);
      }
    }
    todos = deduplicar(todos);
    const nicho = encontrarNicho(p.nicho);
    estado.contexto = { ...p, nichoRotulo: nicho?.rotulo || p.nicho, em: new Date().toISOString() };
    definirResultados(todos);
    historico.adicionar({ ...p, total: todos.length });
    if (erros.length) aviso(erros.join(' | '), 'erro');
    if (!todos.length && !erros.length) aviso('Nenhum resultado. Tente um nicho mais amplo, outra grafia ou aumente o raio.', 'erro');
    else if (todos.length) aviso(`${fmt(todos.length)} leads encontrados.`);
  } catch (erro) {
    if (erro.name === 'AbortError') aviso('Busca cancelada.');
    else aviso(erro.message || 'Erro inesperado na busca.', 'erro');
  } finally {
    botao.disabled = false;
    $('#progresso').hidden = true;
    if (estado.controlador === controlador) estado.controlador = null;
  }
}

function definirResultados(leads, { salvarSessao = true } = {}) {
  enriquecerOportunidades(leads);
  estado.resultados = leads;
  estado.selecionados.clear();
  estado.pagina = 1;
  if (salvarSessao) sessao.salvar({ leads, contexto: estado.contexto });
  $('#estado-inicial').hidden = leads.length > 0;
  $('#resultados').hidden = leads.length === 0;
  aplicarFiltros();
}

function aplicarFiltros() {
  const termo = normalizarTexto(estado.texto);
  const ativos = FILTROS.filter((f) => estado.filtros.has(f.id));
  let lista = estado.resultados.filter((l) => ativos.every((f) => f.teste(l)));
  if (termo) {
    lista = lista.filter((l) => normalizarTexto(`${l.nome} ${l.categoria} ${l.bairro} ${l.endereco} ${l.cidade}`).includes(termo));
  }
  const ordem = estado.ordem;
  const porTexto = (campo) => (a, b) => (a[campo] || 'zzz').localeCompare(b[campo] || 'zzz', 'pt-BR');
  const ordenadores = {
    oportunidade: (a, b) => (b.oportunidade || 0) - (a.oportunidade || 0) || b.pontuacao - a.pontuacao,
    pontuacao: (a, b) => b.pontuacao - a.pontuacao || a.nome.localeCompare(b.nome, 'pt-BR'),
    nome: porTexto('nome'),
    categoria: porTexto('categoria'),
    bairro: porTexto('bairro'),
    avaliacao: (a, b) => (b.avaliacao || 0) - (a.avaliacao || 0) || (b.numAvaliacoes || 0) - (a.numAvaliacoes || 0),
  };
  lista.sort(ordenadores[ordem] || ordenadores.oportunidade);
  estado.filtrados = lista;
  const paginas = Math.max(1, Math.ceil(lista.length / estado.porPagina));
  if (estado.pagina > paginas) estado.pagina = paginas;
  renderizarIndicadores();
  renderizarFiltros();
  renderizarTabela();
  renderizarResumoSelecao();
  if (estado.modo === 'mapa') renderizarMapa();
}

function renderizarIndicadores() {
  const r = estado.resultados;
  const total = r.length || 1;
  const conta = (fn) => r.filter(fn).length;
  const itens = [
    { nome: 'Leads encontrados', valor: r.length },
    { nome: 'Com telefone', valor: conta((l) => l.telefone), filtro: 'telefone' },
    { nome: 'Com WhatsApp', valor: conta((l) => l.whatsapp), filtro: 'whatsapp' },
    { nome: 'Com e-mail', valor: conta((l) => l.email), filtro: 'email' },
    { nome: 'Com site', valor: conta((l) => l.site), filtro: 'site' },
    { nome: 'Sem site (oportunidade)', valor: conta((l) => !l.site), filtro: 'semsite', destaque: true },
  ];
  $('#indicadores').innerHTML = itens.map((i) => `
    <div class="indicador ${i.destaque ? 'destaque' : ''}" ${i.filtro ? `role="button" tabindex="0" data-filtro="${i.filtro}" title="Filtrar"` : ''}>
      <div class="nome">${h(i.nome)}</div>
      <div class="valor">${fmt(i.valor)}</div>
      ${i.filtro ? `<div class="pct">${Math.round((i.valor / total) * 100)}% do total</div>` : `<div class="pct">${h(estado.contexto?.nichoRotulo || '')}</div>`}
    </div>`).join('');
}

function renderizarFiltros() {
  $('#filtros-rapidos').innerHTML = FILTROS.map((f) => {
    const n = estado.resultados.filter(f.teste).length;
    return `<button type="button" class="chip" data-filtro="${f.id}" aria-pressed="${estado.filtros.has(f.id)}">${h(f.rotulo)} <span class="n">${fmt(n)}</span></button>`;
  }).join('');
}

function alternarFiltro(id) {
  const f = FILTROS.find((x) => x.id === id);
  if (!f) return;
  if (estado.filtros.has(id)) estado.filtros.delete(id);
  else {
    estado.filtros.add(id);
    if (f.exclui) estado.filtros.delete(f.exclui);
  }
  estado.pagina = 1;
  aplicarFiltros();
}

function iconesOnline(l) {
  const item = (url, icone, titulo) => (url
    ? `<a href="${h(url)}" target="_blank" rel="noopener" title="${h(titulo)}">${ico(icone)}</a>`
    : `<span title="Sem ${h(titulo.toLowerCase())}">${ico(icone)}</span>`);
  return `<div class="icones-online">
    ${item(l.site, 'globo', 'Site')}
    ${item(l.email ? `mailto:${l.email}` : '', 'email', 'E-mail')}
    ${item(l.instagram, 'insta', 'Instagram')}
    ${item(l.facebook, 'face', 'Facebook')}
  </div>`;
}

function selosLead(l) {
  const selos = [`<span class="selo">${h(l.categoria)}</span>`];
  if (!l.site) selos.push('<span class="selo selo-alerta">Sem site</span>');
  if (l.avaliacao) selos.push(`<span class="selo selo-acento">${ico('estrela')}${String(l.avaliacao).replace('.', ',')} (${fmt(l.numAvaliacoes)})</span>`);
  if (crm.tem(l.id)) selos.push('<span class="selo selo-marca">No CRM</span>');
  return selos.join('');
}

function celulaContato(l) {
  if (!l.telefone && !l.whatsapp) return '<span class="sem-dado">Sem telefone</span>';
  const tels = (l.telefones?.length ? l.telefones : [l.telefone]).slice(0, 2);
  return `<div class="contato">
    ${tels.map((t) => `<a href="tel:+55${t.replace(/\D/g, '')}">${h(t)}</a>`).join('')}
    ${l.whatsapp ? `<span class="zap">${ico('zap')}WhatsApp</span>` : ''}
  </div>`;
}

function renderizarTabela() {
  const inicio = (estado.pagina - 1) * estado.porPagina;
  const pagina = estado.filtrados.slice(inicio, inicio + estado.porPagina);
  const tbody = $('#tabela-resultados tbody');
  $('#tabela-resultados').classList.add('tabela-responsiva');
  if (!pagina.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="sem-dado" style="text-align:center;padding:32px">Nenhum lead com esses filtros.</td></tr>';
  } else {
    tbody.innerHTML = pagina.map((l) => {
      const sel = estado.selecionados.has(l.id);
      const salvo = crm.tem(l.id);
      return `<tr data-id="${h(l.id)}" class="${sel ? 'selecionada' : ''}">
        <td class="c-sel"><input type="checkbox" data-acao="selecionar" ${sel ? 'checked' : ''} aria-label="Selecionar ${h(l.nome)}"></td>
        <td class="c-empresa"><button type="button" class="empresa-nome" data-acao="detalhe">${h(l.nome)}</button><div class="empresa-meta">${selosLead(l)}</div></td>
        <td class="c-contato">${celulaContato(l)}</td>
        <td class="c-online">${iconesOnline(l)}</td>
        <td class="c-local"><div class="local">${h(l.endereco || [l.bairro, l.cidade].filter(Boolean).join(', ') || 'Endereço não informado')}</div></td>
        <td class="c-qual"><div class="qualidade" title="${h((l.motivos || []).join('\n'))}"><div class="trilho"><span style="width:${l.oportunidade || 0}%"></span></div><b>${l.oportunidade || 0}</b></div>
          <div class="motivo">${h(motivoCurto(l))}</div></td>
        <td class="c-acoes col-acoes"><div class="acoes-linha">
          <button type="button" class="btn btn-zap" data-acao="zap" title="Enviar prévia pelo WhatsApp" ${l.whatsapp ? '' : 'disabled'}>${ico('zap')}</button>
          <button type="button" class="btn ${previaDe(l) ? 'salvo' : ''}" data-acao="prompt" title="${previaDe(l) ? 'Prévia personalizada pronta' : 'Copiar prompt da prévia personalizada'}">${ico('varinha')}</button>
          <a class="btn" href="${h(l.linkMaps)}" target="_blank" rel="noopener" title="Ver no Google Maps">${ico('pino')}</a>
          <button type="button" class="btn ${salvo ? 'salvo' : ''}" data-acao="salvar" title="${salvo ? 'Já está no CRM' : 'Salvar no CRM'}">${ico(salvo ? 'check' : 'mais')}</button>
        </div></td>
      </tr>`;
    }).join('');
  }
  const total = estado.filtrados.length;
  const paginas = Math.max(1, Math.ceil(total / estado.porPagina));
  $('#paginacao').innerHTML = `
    <span>Mostrando ${fmt(total ? inicio + 1 : 0)} a ${fmt(Math.min(inicio + estado.porPagina, total))} de ${fmt(total)}</span>
    <div class="linha">
      <button class="btn btn-p" type="button" data-pagina="${estado.pagina - 1}" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
      <span>Página ${estado.pagina} de ${paginas}</span>
      <button class="btn btn-p" type="button" data-pagina="${estado.pagina + 1}" ${estado.pagina >= paginas ? 'disabled' : ''}>Próxima</button>
    </div>`;
  const visiveis = pagina.map((l) => l.id);
  const todos = $('#selecionar-todos');
  todos.checked = visiveis.length > 0 && visiveis.every((id) => estado.selecionados.has(id));
  todos.indeterminate = !todos.checked && visiveis.some((id) => estado.selecionados.has(id));
}

function alvoDasAcoes() {
  if (estado.selecionados.size) return estado.resultados.filter((l) => estado.selecionados.has(l.id));
  return estado.filtrados;
}

function renderizarResumoSelecao() {
  const n = estado.selecionados.size;
  const alvo = alvoDasAcoes().length;
  $('#resumo-selecao').innerHTML = n
    ? `<strong>${fmt(n)}</strong> selecionado(s). <button type="button" class="btn btn-fantasma btn-p" id="limpar-selecao">Limpar seleção</button>`
    : `As ações abaixo valem para os <strong>${fmt(alvo)}</strong> leads filtrados. Marque linhas para escolher manualmente.`;
}

function nomeArquivo() {
  const c = estado.contexto;
  const data = new Date().toISOString().slice(0, 10);
  return c ? `leads-${slug(c.nichoRotulo)}-${slug(c.local)}-${data}` : `leads-${data}`;
}

function salvarNoCrm(leads) {
  if (!leads.length) return aviso('Nenhum lead para salvar.', 'erro');
  const novos = crm.salvarVarios(leads);
  aviso(novos ? `${fmt(novos)} lead(s) salvos no CRM.` : 'Esses leads já estavam no CRM.');
  atualizarContadores();
  renderizarTabela();
  renderizarFiltros();
}

function adicionarNaFila(leads) {
  const atual = fila.obter();
  const ids = new Set(atual.map((i) => i.id));
  const comZap = leads.filter((l) => l.whatsapp);
  const novos = comZap.filter((l) => !ids.has(l.id)).map((l) => ({
    id: l.id, nome: l.nome, whatsapp: l.whatsapp, telefone: l.telefone, telefones: l.telefones, cidade: l.cidade, uf: l.uf,
    bairro: l.bairro, endereco: l.endereco, horario: l.horario, email: l.email, instagram: l.instagram, lat: l.lat, lon: l.lon,
    categoria: l.categoria, nicho: l.nicho, site: l.site, estado: 'pendente',
  }));
  fila.definir(atual.concat(novos));
  atualizarContadores();
  const semZap = leads.length - comZap.length;
  if (!novos.length) {
    aviso(comZap.length ? 'Esses leads já estão na fila.' : 'Nenhum dos leads tem celular com WhatsApp identificado.', 'erro');
    return;
  }
  aviso(`${fmt(novos.length)} contato(s) na fila de disparo${semZap ? `; ${fmt(semZap)} sem celular foram ignorados` : ''}.`);
  location.hash = '#disparo';
}

async function copiarTelefones(leads) {
  const linhas = leads.filter((l) => l.telefone).map((l) => `${l.nome}\t${l.telefone}${l.whatsapp ? `\thttps://wa.me/${l.whatsapp}` : ''}`);
  if (!linhas.length) return aviso('Nenhum telefone para copiar.', 'erro');
  try {
    await navigator.clipboard.writeText(linhas.join('\n'));
    aviso(`${fmt(linhas.length)} telefone(s) copiados. Cole no Excel ou no Google Planilhas.`);
  } catch {
    aviso('Não foi possível acessar a área de transferência.', 'erro');
  }
}

function prepararResultados() {
  $('#indicadores').addEventListener('click', (e) => {
    const el = e.target.closest('[data-filtro]');
    if (el) alternarFiltro(el.dataset.filtro);
  });
  $('#indicadores').addEventListener('keydown', (e) => {
    const el = e.target.closest('[data-filtro]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); alternarFiltro(el.dataset.filtro); }
  });
  $('#filtros-rapidos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filtro]');
    if (b) alternarFiltro(b.dataset.filtro);
  });
  let espera;
  $('#filtro-texto').addEventListener('input', (e) => {
    clearTimeout(espera);
    espera = setTimeout(() => { estado.texto = e.target.value; estado.pagina = 1; aplicarFiltros(); }, 180);
  });
  $('#ordenacao').addEventListener('change', (e) => { estado.ordem = e.target.value; aplicarFiltros(); });

  $$('[data-modo]').forEach((b) => b.addEventListener('click', () => {
    estado.modo = b.dataset.modo;
    $$('[data-modo]').forEach((x) => x.classList.toggle('ativo', x === b));
    $('#bloco-tabela').hidden = estado.modo !== 'tabela';
    $('#bloco-mapa').hidden = estado.modo !== 'mapa';
    if (estado.modo === 'mapa') renderizarMapa();
  }));

  $('#tabela-resultados tbody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const lead = estado.resultados.find((l) => l.id === tr.dataset.id);
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (!lead || !acao) return;
    if (acao === 'selecionar') {
      if (e.target.checked) estado.selecionados.add(lead.id);
      else estado.selecionados.delete(lead.id);
      tr.classList.toggle('selecionada', e.target.checked);
      renderizarResumoSelecao();
      renderizarTabela();
    } else if (acao === 'detalhe') abrirDetalhe(lead);
    else if (acao === 'zap') abrirWhatsApp(lead);
    else if (acao === 'prompt') { if (previaDe(lead)) abrirDetalhe(lead); else { copiarPromptDaPrevia(lead); renderizarTabela(); } }
    else if (acao === 'salvar') salvarNoCrm([lead]);
  });

  $('#selecionar-todos').addEventListener('change', (e) => {
    const inicio = (estado.pagina - 1) * estado.porPagina;
    for (const l of estado.filtrados.slice(inicio, inicio + estado.porPagina)) {
      if (e.target.checked) estado.selecionados.add(l.id);
      else estado.selecionados.delete(l.id);
    }
    renderizarTabela();
    renderizarResumoSelecao();
  });

  $('#paginacao').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pagina]');
    if (!b || b.disabled) return;
    estado.pagina = Number(b.dataset.pagina);
    renderizarTabela();
    $('#bloco-tabela').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('#resumo-selecao').addEventListener('click', (e) => {
    if (e.target.id === 'limpar-selecao') { estado.selecionados.clear(); renderizarTabela(); renderizarResumoSelecao(); }
  });

  $('#acao-salvar').addEventListener('click', () => salvarNoCrm(alvoDasAcoes()));
  $('#acao-fila').addEventListener('click', () => adicionarNaFila(alvoDasAcoes()));
  $('#acao-copiar').addEventListener('click', () => copiarTelefones(alvoDasAcoes()));
  $('#acao-prompts').addEventListener('click', () => gerarPromptsEmLote(alvoDasAcoes()));
  $('#acao-csv').addEventListener('click', () => { const a = comPrevia(alvoDasAcoes()); if (a.length) { baixarCsv(a, nomeArquivo()); aviso(`${fmt(a.length)} leads exportados em CSV.`); } });
  $('#acao-excel').addEventListener('click', () => { const a = comPrevia(alvoDasAcoes()); if (a.length) { baixarExcel(a, nomeArquivo()); aviso(`${fmt(a.length)} leads exportados para Excel.`); } });
}

// ---------------------------------------------------------------- mapa

let mapa;
let camada;

function renderizarMapa() {
  const L = window.L;
  if (!L) return;
  if (!mapa) {
    mapa = L.map('mapa', { scrollWheelZoom: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    camada = L.layerGroup().addTo(mapa);
    mapa.setView([-14.2, -51.9], 4);
  }
  setTimeout(() => mapa.invalidateSize(), 50);
  camada.clearLayers();
  const pontos = [];
  for (const l of estado.filtrados) {
    if (l.lat == null || l.lon == null) continue;
    const cor = l.whatsapp ? '#1fa855' : l.telefone ? '#2563eb' : '#94a3b8';
    const m = L.circleMarker([l.lat, l.lon], { radius: 7, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 0.95 });
    m.bindPopup(`<strong>${h(l.nome)}</strong><br>${h(l.categoria)}<br>${h(l.telefone || 'Sem telefone')}<br>${h(l.endereco || '')}
      <div style="margin-top:6px;display:flex;gap:10px">${l.whatsapp ? `<a href="${h(linkWhatsApp(l.whatsapp, mensagemPara(l)))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      <a href="${h(l.linkMaps)}" target="_blank" rel="noopener">Google Maps</a>${l.site ? `<a href="${h(l.site)}" target="_blank" rel="noopener">Site</a>` : ''}</div>`);
    m.addTo(camada);
    pontos.push([l.lat, l.lon]);
  }
  if (pontos.length) mapa.fitBounds(pontos, { padding: [30, 30], maxZoom: 16 });
}

// ---------------------------------------------------------------- detalhe do lead

function abrirDetalhe(leadBase) {
  const salvo = crm.obter(leadBase.id);
  const l = salvo ? { ...leadBase, ...salvo } : leadBase;
  const linhas = [
    ['Categoria', h(l.categoria)],
    ['Telefones', (l.telefones?.length ? l.telefones : [l.telefone]).filter(Boolean).map(h).join('<br>') || '<span class="sem-dado">Não informado</span>'],
    ['WhatsApp', l.whatsapp ? `<a href="${h(linkWhatsApp(l.whatsapp))}" target="_blank" rel="noopener">${h(formatarZap(l.whatsapp))}</a>` : '<span class="sem-dado">Não identificado</span>'],
    ['E-mail', l.email ? `<a href="mailto:${h(l.email)}">${h(l.email)}</a>` : '<span class="sem-dado">Não informado</span>'],
    ['Site', l.site ? `<a href="${h(l.site)}" target="_blank" rel="noopener">${h(l.site)}</a>` : '<span class="selo selo-alerta">Sem site: oportunidade</span>'],
    ['Instagram', l.instagram ? `<a href="${h(l.instagram)}" target="_blank" rel="noopener">${h(l.instagram)}</a>` : '<span class="sem-dado">Não informado</span>'],
    ['Facebook', l.facebook ? `<a href="${h(l.facebook)}" target="_blank" rel="noopener">${h(l.facebook)}</a>` : '<span class="sem-dado">Não informado</span>'],
    ['Endereço', h(l.endereco || [l.bairro, l.cidade, l.uf].filter(Boolean).join(', ')) || '<span class="sem-dado">Não informado</span>'],
    ['Horário', h(l.horario) || '<span class="sem-dado">Não informado</span>'],
    ['Avaliação', l.avaliacao ? `${String(l.avaliacao).replace('.', ',')} de 5 (${fmt(l.numAvaliacoes)} avaliações)` : '<span class="sem-dado">Disponível com a fonte Google</span>'],
    ['Cadastro', `${l.pontuacao} de 100 em completude`],
    ['Fonte', `${h(l.fonte)}${l.linkOsm ? `, <a href="${h(l.linkOsm)}" target="_blank" rel="noopener">corrigir dados no OSM</a>` : ''}`],
  ];
  const conteudo = $('#modal-lead-conteudo');
  conteudo.innerHTML = `
    <div class="modal-topo">
      <div><h2>${h(l.nome)}</h2><div class="empresa-meta">${selosLead(l)}</div></div>
      <button class="btn btn-icone btn-fantasma" type="button" data-fechar aria-label="Fechar">${ico('x')}</button>
    </div>
    <div class="acoes">
      <button class="btn btn-zap" type="button" data-m="zap" ${l.whatsapp ? '' : 'disabled'}>${ico('zap')}WhatsApp</button>
      ${l.telefone ? `<a class="btn" href="tel:+55${h(l.telefone.replace(/\D/g, ''))}">${ico('telefone')}Ligar</a>` : ''}
      <a class="btn" href="${h(l.linkMaps)}" target="_blank" rel="noopener">${ico('pino')}Maps</a>
      ${salvo ? `<button class="btn btn-perigo" type="button" data-m="remover">${ico('lixo')}Remover do CRM</button>` : `<button class="btn" type="button" data-m="salvar">${ico('mais')}Salvar no CRM</button>`}
    </div>
    ${blocoDiagnostico(l)}
    ${blocoPrevia(l, salvo)}
    ${blocoVenda(salvo)}
    <details class="detalhes-dados"><summary>Dados cadastrais</summary><dl class="dados">${linhas.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></details>
    ${salvo ? `
      <div class="campo"><label for="m-etapa">Etapa no funil</label>
        <select class="entrada" id="m-etapa">${ETAPAS.map((e) => `<option value="${e.id}" ${e.id === salvo.etapa ? 'selected' : ''}>${e.rotulo}</option>`).join('')}</select></div>
      <div class="campo"><label for="m-notas">Anotações (vão para o prompt do site final)</label>
        <textarea class="entrada" id="m-notas" placeholder="Ex.: falei com a Ana, quer destacar implantes e aparelho ortodôntico.">${h(salvo.notas || '')}</textarea></div>
      ${salvo.historico?.length ? `<div><span class="rotulo">Movimentações</span><ul class="linha-tempo">${salvo.historico.slice(-6).reverse().map((x) => `<li>${formatarData(x.em)}: ${h(rotuloEtapa(x.de))} para ${h(rotuloEtapa(x.para))}</li>`).join('')}</ul></div>` : ''}
      <div class="linha"><button class="btn btn-primario" type="button" data-m="gravar">Salvar alterações</button></div>` : ''}
  `;
  const dialogo = $('#modal-lead');
  const notasAtuais = () => $('#m-notas')?.value ?? salvo?.notas ?? '';
  conteudo.onclick = (e) => {
    if (e.target.closest('[data-fechar]')) return dialogo.close();
    const m = e.target.closest('[data-m]')?.dataset.m;
    if (m === 'zap') abrirWhatsApp(l);
    if (m === 'salvar') { crm.salvarVarios([leadBase]); atualizarContadores(); abrirDetalhe(leadBase); renderizarTabela(); aviso('Lead salvo no CRM.'); }
    if (m === 'remover') { crm.remover(l.id); atualizarContadores(); dialogo.close(); renderizarTabela(); renderizarCrmSeVisivel(); aviso('Lead removido do CRM.'); }
    if (m === 'gravar') {
      crm.atualizar(l.id, { etapa: $('#m-etapa').value, notas: $('#m-notas').value });
      dialogo.close();
      renderizarCrmSeVisivel();
      aviso('Alterações salvas.');
    }
    if (m === 'copiar-prompt') { copiarPromptDaPrevia(l); renderizarTabela(); abrirDetalhe(leadBase); }
    if (m === 'baixar-prompt') {
      if (!crm.tem(l.id)) { crm.salvarVarios([l]); atualizarContadores(); }
      baixarArquivo(promptDaPrevia(crm.obter(l.id), configPrompt()), `prompt-previa-${slugPrevia(l)}.md`, 'text/markdown;charset=utf-8');
    }
    if (m === 'verificar') {
      verificarPrevia(l, { forcar: true }).then((ok) => {
        aviso(ok ? 'Prévia encontrada e registrada.' : 'A prévia ainda não foi publicada nesse endereço. A publicação leva 1 a 2 minutos após o envio.', ok ? 'ok' : 'erro');
        if (ok) { renderizarTabela(); renderizarCrmSeVisivel(); abrirDetalhe(leadBase); }
      });
    }
    if (m === 'salvar-link') {
      const link = $('#m-link-previa').value.trim();
      if (link && !/^https?:\/\//.test(link)) return aviso('O link deve começar com https://', 'erro');
      if (!crm.tem(l.id)) crm.salvarVarios([l]);
      crm.atualizar(l.id, { linkPrevia: link });
      atualizarContadores(); renderizarTabela(); renderizarCrmSeVisivel(); abrirDetalhe(leadBase);
      aviso(link ? 'Link da prévia salvo. Ele já entra na mensagem de WhatsApp.' : 'Link removido.');
    }
    if (m === 'copiar-link') copiarTexto(previaDe(l), 'Link da prévia copiado.');
    if (m === 'pago') {
      const valor = $('#m-valor')?.value.trim() || '';
      const atualizado = crm.atualizar(l.id, { etapa: 'pago', pagoEm: new Date().toISOString(), valor, notas: notasAtuais() });
      copiarTexto(promptSiteFinal(atualizado, configPrompt()), 'Pagamento registrado. O prompt do site final foi copiado: cole na conversa com o Claude.');
      renderizarCrmSeVisivel();
      abrirDetalhe(atualizado);
    }
    if (m === 'prompt-final') copiarTexto(promptSiteFinal({ ...l, notas: notasAtuais() }, configPrompt()), 'Prompt do site final copiado. Cole na conversa com o Claude.');
    if (m === 'entregue') {
      const atualizado = crm.atualizar(l.id, { etapa: 'ganho', entregueEm: new Date().toISOString(), notas: notasAtuais() });
      aviso('Site marcado como entregue.');
      renderizarCrmSeVisivel();
      abrirDetalhe(atualizado);
    }
  };
  if (!dialogo.open) dialogo.showModal();
  if (salvo && !salvo.linkPrevia && salvo.promptGeradoEm) {
    verificarPrevia(l).then((ok) => { if (ok && dialogo.open) abrirDetalhe(leadBase); });
  }
}

function motivoCurto(l) {
  const m = (l.motivos || [])[0] || '';
  return m.split(':')[0];
}

function blocoDiagnostico(l) {
  const c = l.concorrencia;
  return `<div class="bloco-diagnostico">
    <div class="linha entre"><strong>Diagnóstico de oportunidade</strong><span class="selo selo-marca">${l.oportunidade ?? 0} de 100</span></div>
    <ul>${(l.motivos || []).map((m) => `<li>${h(m)}</li>`).join('')}</ul>
    ${c ? `<p class="ajuda">Concorrência num raio de ${String(c.raioKm).replace('.', ',')} km: ${fmt(c.total)} do mesmo segmento, ${fmt(c.comSite)} com site${c.exemplosComSite?.length ? ` (${h(c.exemplosComSite.join(', '))})` : ''}.</p>` : ''}
    ${l.caracteristicas?.length ? `<div class="chips">${l.caracteristicas.map((x) => `<span class="selo">${h(x)}</span>`).join('')}</div>` : ''}
  </div>`;
}

function blocoPrevia(l, salvo) {
  const link = previaDe(l);
  const caminho = new URL(caminhoPrevia(l), baseDoSite()).href;
  return `<div class="bloco-venda ${link ? 'pronta' : ''}">
    <div class="linha entre"><strong>Prévia personalizada</strong>
      ${link ? '<span class="selo selo-marca">Pronta para enviar</span>' : salvo?.promptGeradoEm ? `<span class="selo selo-acento">Prompt gerado em ${formatarData(salvo.promptGeradoEm)}</span>` : '<span class="selo">Ainda não criada</span>'}</div>
    ${link ? `<div class="acoes">
        <a class="btn btn-primario" href="${h(link)}" target="_blank" rel="noopener">${ico('externo')}Ver prévia</a>
        <button class="btn" type="button" data-m="copiar-link">${ico('copiar')}Copiar link</button>
        <button class="btn btn-zap" type="button" data-m="zap" ${l.whatsapp ? '' : 'disabled'}>${ico('zap')}Enviar ao cliente</button>
      </div>` : `<p class="ajuda">1. Copie o prompt e cole na conversa com o Claude. 2. Ele pesquisa o comércio, cria a prévia exclusiva e publica em <em>${h(caminho)}</em>. 3. Clique em "Verificar publicação" e o link entra sozinho na mensagem de WhatsApp.</p>
      <div class="acoes">
        <button class="btn btn-primario" type="button" data-m="copiar-prompt">${ico('varinha')}Copiar prompt para o Claude</button>
        <button class="btn" type="button" data-m="baixar-prompt">${ico('baixar')}Baixar prompt</button>
        <button class="btn" type="button" data-m="verificar">${ico('relogio')}Verificar publicação</button>
      </div>`}
    <div class="linha">
      <input class="entrada" id="m-link-previa" placeholder="Ou cole aqui o link de uma prévia feita em outra ferramenta" value="${h(link)}">
      <button class="btn" type="button" data-m="salvar-link">Salvar link</button>
    </div>
  </div>`;
}

function blocoVenda(salvo) {
  if (!salvo) return '';
  const pago = salvo.etapa === 'pago' || salvo.etapa === 'ganho';
  if (!pago) {
    return `<div class="bloco-venda">
      <strong>Venda</strong>
      <p class="ajuda">Quando o cliente pagar o sinal, registre aqui. O prompt do site final é copiado na hora para você colar na conversa com o Claude.</p>
      <div class="linha">
        <input class="entrada" id="m-valor" inputmode="decimal" placeholder="Valor combinado, ex.: 1.200" value="${h(salvo.valor || '')}">
        <button class="btn btn-primario" type="button" data-m="pago">${ico('check')}Pagamento prévio realizado</button>
      </div>
    </div>`;
  }
  return `<div class="bloco-venda pago">
    <div class="linha entre"><strong>${salvo.etapa === 'ganho' ? 'Site entregue' : 'Pagamento recebido: produzir o site final'}</strong>
      <span class="selo selo-roxo">Pago em ${formatarData(salvo.pagoEm)}${salvo.valor ? ` · R$ ${h(salvo.valor)}` : ''}</span></div>
    <div class="acoes">
      <button class="btn btn-primario" type="button" data-m="prompt-final">${ico('copiar')}Copiar prompt do site final</button>
      <a class="btn" href="https://lovable.dev/#prompt=${encodeURIComponent(promptSiteFinal(salvo, configPrompt()).slice(0, 45000))}" target="_blank" rel="noopener">${ico('varinha')}Abrir no Lovable</a>
      ${salvo.etapa === 'pago' ? `<button class="btn" type="button" data-m="entregue">${ico('check')}Marcar como entregue</button>` : ''}
    </div>
    <p class="ajuda">O prompt parte da prévia aprovada e inclui suas anotações. Cole na conversa com o Claude para gerar o site definitivo, ou use o Lovable (a construção começa quando você clicar em enviar).</p>
  </div>`;
}

async function gerarPromptsEmLote(leads) {
  let alvo = leads.filter((l) => l.whatsapp || l.telefone);
  if (!alvo.length) return aviso('Nenhum lead com telefone para abordar.', 'erro');
  alvo = [...alvo].sort((a, b) => (b.oportunidade || 0) - (a.oportunidade || 0));
  const limite = 10;
  if (alvo.length > limite && !confirm(`Gerar prompts para os ${limite} leads de maior oportunidade (de ${alvo.length})? Prévias sob medida rendem mais em lotes pequenos.`)) return;
  alvo = alvo.slice(0, limite);
  crm.salvarVarios(alvo);
  const agora = new Date().toISOString();
  for (const l of alvo) crm.atualizar(l.id, { promptGeradoEm: agora });
  const prompt = promptEmLote(alvo.map((l) => crm.obter(l.id)), configPrompt());
  baixarArquivo(prompt, `prompts-previas-${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown;charset=utf-8');
  await copiarTexto(prompt, `${alvo.length} prompts copiados e baixados. Cole na conversa com o Claude.`);
  atualizarContadores();
  renderizarTabela();
}

function formatarZap(n) {
  const m = String(n).match(/^55(\d{2})(\d{5})(\d{4})$/);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${n}`;
}

function rotuloEtapa(id) {
  return ETAPAS.find((e) => e.id === id)?.rotulo || id || '';
}

// ---------------------------------------------------------------- CRM

function renderizarCrmSeVisivel() {
  if (!$('#vista-leads').hidden) renderizarCrm();
}

function leadsCrmFiltrados() {
  const termo = normalizarTexto($('#crm-filtro').value);
  const etapa = $('#crm-etapa').value;
  return crm.lista().filter((l) => (!etapa || l.etapa === etapa)
    && (!termo || normalizarTexto(`${l.nome} ${l.categoria} ${l.bairro} ${l.cidade} ${l.notas}`).includes(termo)));
}

function renderizarCrm() {
  const todos = crm.lista();
  const lista = leadsCrmFiltrados();
  $('#crm-vazio').hidden = todos.length > 0;
  $('#kpis-crm').hidden = !todos.length;
  $('.barra-filtros', $('#vista-leads')).hidden = !todos.length;
  $('#crm-funil').hidden = !todos.length || estado.modoCrm !== 'funil';
  $('#crm-lista').hidden = !todos.length || estado.modoCrm !== 'lista';

  $('#kpis-crm').innerHTML = ETAPAS.map((e) => {
    const n = todos.filter((l) => l.etapa === e.id).length;
    return `<div class="indicador"><div class="nome"><span class="ponto-etapa" style="background:${CORES_ETAPA[e.id]}"></span>${e.rotulo}</div><div class="valor">${fmt(n)}</div>
      <div class="pct">${todos.length ? Math.round((n / todos.length) * 100) : 0}% do funil</div></div>`;
  }).join('');

  if (estado.modoCrm === 'funil') {
    $('#crm-funil').innerHTML = ETAPAS.map((e) => {
      const itens = lista.filter((l) => l.etapa === e.id);
      return `<div class="coluna" data-etapa="${e.id}">
        <div class="coluna-topo"><span><span class="ponto-etapa" style="background:${CORES_ETAPA[e.id]}"></span>${e.rotulo}</span><span class="n">${fmt(itens.length)}</span></div>
        ${itens.slice(0, 200).map((l) => `
          <article class="cartao-lead" draggable="true" data-id="${h(l.id)}">
            <div class="titulo">${h(l.nome)}</div>
            <div class="meta">${h(l.categoria)}${l.bairro || l.cidade ? `, ${h(l.bairro || l.cidade)}` : ''}</div>
            ${l.notas ? `<div class="nota">${h(l.notas.slice(0, 120))}</div>` : ''}
            <div class="rodape">
              <span class="ajuda">${h(l.telefone || 'Sem telefone')}</span>
              <span class="acoes-linha">
                <button class="btn btn-zap" type="button" data-c="zap" title="WhatsApp" ${l.whatsapp ? '' : 'disabled'}>${ico('zap')}</button>
                <button class="btn ${l.linkPrevia ? 'salvo' : ''}" type="button" data-c="previa" title="${l.linkPrevia ? 'Ver prévia personalizada' : 'Copiar prompt da prévia'}">${ico('varinha')}</button>
                <button class="btn" type="button" data-c="detalhe" title="${l.etapa === 'pago' ? 'Produzir site' : 'Abrir e registrar pagamento'}">${ico(l.etapa === 'pago' ? 'baixar' : 'externo')}</button>
              </span>
            </div>
          </article>`).join('')}
        ${itens.length > 200 ? `<p class="ajuda">Mais ${fmt(itens.length - 200)} na visão em lista.</p>` : ''}
      </div>`;
    }).join('');
  } else {
    $('#tabela-crm tbody').innerHTML = lista.map((l) => `
      <tr data-id="${h(l.id)}">
        <td><button type="button" class="empresa-nome" data-c="detalhe">${h(l.nome)}</button><div class="empresa-meta"><span class="selo">${h(l.categoria)}</span>${l.site ? '' : '<span class="selo selo-alerta">Sem site</span>'}</div></td>
        <td>${celulaContato(l)}</td>
        <td><select class="entrada entrada-p" data-c="etapa" aria-label="Etapa">${ETAPAS.map((e) => `<option value="${e.id}" ${e.id === l.etapa ? 'selected' : ''}>${e.rotulo}</option>`).join('')}</select></td>
        <td class="ajuda">${formatarData(l.atualizadoEm)}</td>
        <td class="col-acoes"><div class="acoes-linha">
          <button class="btn btn-zap" type="button" data-c="zap" ${l.whatsapp ? '' : 'disabled'} title="WhatsApp">${ico('zap')}</button>
          <button class="btn btn-perigo" type="button" data-c="remover" title="Remover">${ico('lixo')}</button>
        </div></td>
      </tr>`).join('') || '<tr><td colspan="5" class="sem-dado" style="text-align:center;padding:28px">Nada encontrado.</td></tr>';
  }
}

function prepararCrm() {
  $('#crm-etapa').insertAdjacentHTML('beforeend', ETAPAS.map((e) => `<option value="${e.id}">${e.rotulo}</option>`).join(''));
  $('#crm-filtro').addEventListener('input', renderizarCrm);
  $('#crm-etapa').addEventListener('change', renderizarCrm);
  $$('[data-modo-crm]').forEach((b) => b.addEventListener('click', () => {
    estado.modoCrm = b.dataset.modoCrm;
    $$('[data-modo-crm]').forEach((x) => x.classList.toggle('ativo', x === b));
    renderizarCrm();
  }));
  const nomeCrm = () => `meus-leads-${new Date().toISOString().slice(0, 10)}`;
  $('#crm-csv').addEventListener('click', () => { const l = comPrevia(leadsCrmFiltrados()); if (l.length) baixarCsv(l, nomeCrm()); });
  $('#crm-excel').addEventListener('click', () => { const l = comPrevia(leadsCrmFiltrados()); if (l.length) baixarExcel(l, nomeCrm()); });
  $('#crm-fila').addEventListener('click', () => adicionarNaFila(leadsCrmFiltrados()));
  $('#crm-prompts').addEventListener('click', () => gerarPromptsEmLote(leadsCrmFiltrados().filter((l) => !l.linkPrevia)));
  $('#crm-verificar').addEventListener('click', async () => {
    const pendentes = crm.lista().filter((l) => !l.linkPrevia && l.promptGeradoEm);
    if (!pendentes.length) return aviso('Nenhuma prévia aguardando publicação.');
    aviso(`Verificando ${pendentes.length} prévia(s)...`);
    let achadas = 0;
    for (const l of pendentes) if (await verificarPrevia(l, { forcar: true })) achadas++;
    renderizarCrm();
    aviso(achadas ? `${achadas} prévia(s) publicadas e registradas. Os links já entram nas mensagens.` : 'Nenhuma prévia nova publicada ainda.', achadas ? 'ok' : 'erro');
  });

  const vista = $('#vista-leads');
  vista.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-c]');
    const id = e.target.closest('[data-id]')?.dataset.id;
    if (!alvo || !id || alvo.dataset.c === 'etapa') return;
    const l = crm.obter(id);
    if (!l) return;
    if (alvo.dataset.c === 'zap') abrirWhatsApp(l);
    if (alvo.dataset.c === 'detalhe') abrirDetalhe(l);
    if (alvo.dataset.c === 'previa') { if (l.linkPrevia) abrirExterno(l.linkPrevia); else { copiarPromptDaPrevia(l); renderizarCrm(); } }
    if (alvo.dataset.c === 'remover' && confirm(`Remover ${l.nome} do CRM?`)) { crm.remover(id); atualizarContadores(); renderizarCrm(); }
  });
  vista.addEventListener('change', (e) => {
    if (e.target.dataset.c !== 'etapa') return;
    const id = e.target.closest('[data-id]')?.dataset.id;
    crm.atualizar(id, { etapa: e.target.value });
    renderizarCrm();
  });

  // Arrastar e soltar entre etapas
  const funil = $('#crm-funil');
  funil.addEventListener('dragstart', (e) => {
    const c = e.target.closest('.cartao-lead');
    if (c) e.dataTransfer.setData('text/plain', c.dataset.id);
  });
  funil.addEventListener('dragover', (e) => {
    const col = e.target.closest('.coluna');
    if (!col) return;
    e.preventDefault();
    $$('.coluna', funil).forEach((x) => x.classList.toggle('arrastando-sobre', x === col));
  });
  funil.addEventListener('dragleave', (e) => { if (!funil.contains(e.relatedTarget)) $$('.coluna', funil).forEach((x) => x.classList.remove('arrastando-sobre')); });
  funil.addEventListener('drop', (e) => {
    const col = e.target.closest('.coluna');
    if (!col) return;
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) crm.atualizar(id, { etapa: col.dataset.etapa });
    renderizarCrm();
  });
}

// ---------------------------------------------------------------- disparo

const VARIAVEIS = ['link_previa', 'nome', 'minha_marca', 'cidade', 'bairro', 'categoria', 'nicho'];

function renderizarDisparo() {
  const c = config.obter();
  const ativo = modeloAtivo();
  $('#d-modelo').innerHTML = c.modelos.map((m) => `<option value="${h(m.id)}" ${m.id === ativo.id ? 'selected' : ''}>${h(m.nome)}</option>`).join('');
  $('#d-nome-modelo').value = ativo.nome || '';
  $('#d-texto').value = ativo.texto || '';
  $('#d-variaveis').innerHTML = VARIAVEIS.map((v) => `<button type="button" class="chip" data-var="${v}">{${v}}</button>`).join('');
  const intervalo = c.intervaloDisparoSeg ?? 40;
  $('#d-intervalo').innerHTML = `Intervalo mínimo entre envios:
    <select class="entrada entrada-p" id="d-intervalo-sel">${[0, 15, 30, 40, 60, 90].map((s) => `<option value="${s}" ${s === intervalo ? 'selected' : ''}>${s ? `${s} segundos` : 'sem intervalo'}</option>`).join('')}</select>`;
  renderizarFila();
}

function renderizarFila() {
  const itens = fila.obter();
  const enviados = itens.filter((i) => i.estado === 'enviado').length;
  const pulados = itens.filter((i) => i.estado === 'pulado').length;
  const pendentes = itens.filter((i) => i.estado === 'pendente');
  const proximo = pendentes[0];
  const feitos = enviados + pulados;
  $('#d-barra').style.width = itens.length ? `${(feitos / itens.length) * 100}%` : '0';
  $('#d-status').textContent = itens.length
    ? `${fmt(enviados)} enviados, ${fmt(pulados)} pulados, ${fmt(pendentes.length)} pendentes de ${fmt(itens.length)}.`
    : 'A fila está vazia. Na busca ou no CRM, use "Enviar para disparo".';
  $('#d-fila').innerHTML = itens.map((i) => `
    <li class="${proximo && i.id === proximo.id ? 'atual' : ''}">
      <div><div class="nome">${h(i.nome)}</div><div class="tel">${h(i.telefone || i.whatsapp)}${previaDe(i) ? ' · prévia pronta' : ' · <span class="sem-previa">sem prévia</span>'}</div></div>
      <span class="selo ${i.estado === 'enviado' ? 'selo-marca' : i.estado === 'pulado' ? '' : 'selo-acento'}">${i.estado === 'enviado' ? 'Enviado' : i.estado === 'pulado' ? 'Pulado' : 'Pendente'}</span>
    </li>`).join('');
  const exemplo = proximo || { id: 'exemplo', nome: 'Clínica Exemplo', cidade: 'Campinas', uf: 'SP', bairro: 'Centro', categoria: 'Dentista', nicho: 'dentista', telefone: '(19) 99999-0000', whatsapp: '5519999990000' };
  $('#d-previa').textContent = preencherModelo($('#d-texto').value, exemplo, extrasMensagem(exemplo));
  const c = config.obter();
  $('#d-marca').hidden = Boolean(c.agenciaNome && c.agenciaWhatsapp);
  atualizarBotaoDisparo();
  atualizarContadores();
}

function atualizarBotaoDisparo() {
  const restante = Math.ceil((estado.liberadoEm - Date.now()) / 1000);
  const temPendente = fila.obter().some((i) => i.estado === 'pendente');
  const b = $('#d-proximo');
  b.disabled = !temPendente || restante > 0;
  b.innerHTML = restante > 0 ? `${ico('relogio')}Aguarde ${restante}s` : `${ico('zap')}Abrir próximo no WhatsApp`;
  $('#d-pular').disabled = !temPendente;
  clearTimeout(estado.cronometro);
  if (restante > 0) estado.cronometro = setTimeout(atualizarBotaoDisparo, 500);
}

function marcarItem(novoEstado) {
  const itens = fila.obter();
  const i = itens.find((x) => x.estado === 'pendente');
  if (!i) return null;
  i.estado = novoEstado;
  i.em = new Date().toISOString();
  fila.definir(itens);
  return i;
}

function salvarModeloAtual() {
  const c = config.obter();
  const ativo = modeloAtivo();
  const modelos = c.modelos.map((m) => (m.id === ativo.id ? { ...m, nome: $('#d-nome-modelo').value || m.nome, texto: $('#d-texto').value } : m));
  config.salvar({ modelos });
}

function prepararDisparo() {
  let espera;
  $('#d-texto').addEventListener('input', () => { renderizarFila(); clearTimeout(espera); espera = setTimeout(salvarModeloAtual, 300); });
  $('#d-nome-modelo').addEventListener('change', () => { salvarModeloAtual(); renderizarDisparo(); });
  $('#d-modelo').addEventListener('change', (e) => { salvarModeloAtual(); config.salvar({ modeloAtivo: e.target.value }); renderizarDisparo(); });
  $('#d-novo-modelo').addEventListener('click', () => {
    salvarModeloAtual();
    const c = config.obter();
    const id = `m${Date.now()}`;
    config.salvar({ modelos: [...c.modelos, { id, nome: 'Novo modelo', texto: 'Olá, {nome}! ' }], modeloAtivo: id });
    renderizarDisparo();
    $('#d-nome-modelo').select();
  });
  $('#d-remover-modelo').addEventListener('click', () => {
    const c = config.obter();
    if (c.modelos.length <= 1) return aviso('Mantenha pelo menos um modelo.', 'erro');
    const ativo = modeloAtivo();
    if (!confirm(`Excluir o modelo "${ativo.nome}"?`)) return;
    const modelos = c.modelos.filter((m) => m.id !== ativo.id);
    config.salvar({ modelos, modeloAtivo: modelos[0].id });
    renderizarDisparo();
  });
  $('#d-variaveis').addEventListener('click', (e) => {
    const b = e.target.closest('[data-var]');
    if (!b) return;
    const ta = $('#d-texto');
    const pos = ta.selectionStart ?? ta.value.length;
    ta.value = `${ta.value.slice(0, pos)}{${b.dataset.var}}${ta.value.slice(ta.selectionEnd ?? pos)}`;
    ta.focus();
    ta.selectionStart = ta.selectionEnd = pos + b.dataset.var.length + 2;
    salvarModeloAtual();
    renderizarFila();
  });
  $('#d-intervalo').addEventListener('change', (e) => {
    if (e.target.id === 'd-intervalo-sel') config.salvar({ intervaloDisparoSeg: Number(e.target.value) });
  });
  $('#d-proximo').addEventListener('click', () => {
    salvarModeloAtual();
    const proximo = fila.obter().find((x) => x.estado === 'pendente');
    if (!proximo) return;
    if ($('#d-texto').value.includes('{link_previa}') && !previaDe(proximo)) {
      aviso(`A ${proximo.nome} ainda não tem prévia personalizada. Gere o prompt no CRM, use outro modelo ou clique em Pular.`, 'erro');
      return;
    }
    const texto = preencherModelo($('#d-texto').value, proximo, extrasMensagem(proximo));
    abrirExterno(linkWhatsApp(proximo.whatsapp, texto));
    marcarItem('enviado');
    if ($('#d-marcar-crm').checked) {
      const lead = crm.obter(proximo.id) || estado.resultados.find((l) => l.id === proximo.id);
      if (lead && !crm.tem(proximo.id)) crm.salvarVarios([lead], 'contatado');
      else if (lead && crm.obter(proximo.id).etapa === 'novo') crm.atualizar(proximo.id, { etapa: 'contatado' });
    }
    estado.liberadoEm = Date.now() + (config.obter().intervaloDisparoSeg || 0) * 1000;
    renderizarFila();
  });
  $('#d-pular').addEventListener('click', () => { marcarItem('pulado'); renderizarFila(); });
  $('#d-limpar').addEventListener('click', () => {
    if (!fila.obter().length || confirm('Limpar toda a fila de disparo?')) { fila.definir([]); renderizarFila(); }
  });
}

// ---------------------------------------------------------------- histórico

function renderizarHistorico() {
  const lista = historico.lista();
  $('#tabela-historico tbody').innerHTML = lista.map((x, i) => `
    <tr>
      <td><strong>${h(x.nicho)}</strong></td>
      <td>${h(x.local)}</td>
      <td>${x.raioKm ? `${x.raioKm} km` : 'Cidade inteira'}</td>
      <td>${x.fonte === 'google' ? 'Google' : 'OpenStreetMap'}</td>
      <td>${fmt(x.total)}</td>
      <td class="ajuda">${formatarData(x.em)}</td>
      <td class="col-acoes"><button class="btn btn-p" type="button" data-repetir="${i}">${ico('busca')}Repetir</button></td>
    </tr>`).join('') || '<tr><td colspan="7" class="sem-dado" style="text-align:center;padding:28px">Nenhuma busca realizada ainda.</td></tr>';
}

function prepararHistorico() {
  $('#tabela-historico').addEventListener('click', (e) => {
    const b = e.target.closest('[data-repetir]');
    if (!b) return;
    const x = historico.lista()[Number(b.dataset.repetir)];
    if (!x) return;
    $('#f-nicho').value = x.nicho;
    $('#f-local').value = x.local;
    $('#f-raio').value = String(x.raioKm || 0);
    $('#f-fonte').value = x.fonte || 'osm';
    $('#f-limite').value = String(x.limite || 500);
    location.hash = '#buscar';
    executarBusca();
  });
  $('#h-limpar').addEventListener('click', () => { if (confirm('Limpar o histórico de buscas?')) { historico.limpar(); renderizarHistorico(); } });
}

// ---------------------------------------------------------------- configurações

function renderizarConfig() {
  const c = config.obter();
  $('#c-chave').value = c.chaveGoogle || '';
  $('#c-agencia-nome').value = c.agenciaNome || '';
  $('#c-agencia-zap').value = c.agenciaWhatsapp ? formatarZap(c.agenciaWhatsapp) : '';
  $('#c-site-base').value = c.siteBase || '';
}

function interpretarCsv(texto) {
  const t = texto.replace(/^﻿/, '');
  const primeira = t.split(/\r?\n/, 1)[0];
  const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
  const linhas = [];
  let campo = '';
  let linha = [];
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') aspas = false; else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => c.trim()));
}

function importarCsv(texto) {
  const [cab, ...linhas] = interpretarCsv(texto);
  if (!cab) throw new Error('Arquivo vazio.');
  const mapa = {};
  const porRotulo = Object.fromEntries(COLUNAS.map(([k, r]) => [normalizarTexto(r), k]));
  const sinonimos = { empresa: 'nome', telefone: 'telefone', phone: 'telefone', website: 'site', email: 'email', 'e-mail': 'email', endereco: 'endereco', cidade: 'cidade' };
  cab.forEach((c, i) => { const n = normalizarTexto(c); mapa[i] = porRotulo[n] || sinonimos[n] || COLUNAS.find(([k]) => k.toLowerCase() === n)?.[0]; });
  const leads = linhas.map((cols) => {
    const o = {};
    cols.forEach((v, i) => { if (mapa[i]) o[mapa[i]] = v.replace(/^'/, '').trim(); });
    if (!o.nome) return null;
    const tels = interpretarTelefones(o.telefone, o.whatsapp);
    const lead = {
      id: `csv:${slug(o.nome)}-${(tels[0]?.digitos || slug(o.endereco || '')).slice(-11)}`,
      fonte: o.fonte || 'Importação CSV',
      nome: o.nome,
      categoria: o.categoria || 'Importado',
      nicho: o.categoria || '',
      telefone: tels[0]?.formatado || '',
      telefones: tels.map((x) => x.formatado),
      whatsapp: tels.find((x) => x.whatsapp)?.whatsapp || (o.whatsapp || '').replace(/\D/g, ''),
      email: o.email || '',
      site: normalizarUrl(o.site || ''),
      instagram: o.instagram || '',
      facebook: o.facebook || '',
      endereco: o.endereco || '',
      bairro: o.bairro || '',
      cidade: o.cidade || '',
      uf: o.uf || '',
      cep: o.cep || '',
      horario: o.horario || '',
      avaliacao: o.avaliacao ? Number(String(o.avaliacao).replace(',', '.')) : null,
      numAvaliacoes: o.numAvaliacoes ? Number(o.numAvaliacoes) : null,
      lat: o.lat ? Number(o.lat) : null,
      lon: o.lon ? Number(o.lon) : null,
      linkOsm: o.linkOsm || '',
      coletadoEm: o.coletadoEm || new Date().toISOString(),
    };
    lead.linkMaps = o.linkMaps || linkGoogleMaps(lead);
    lead.pontuacao = pontuarLead(lead);
    return lead;
  }).filter(Boolean);
  return leads;
}

function prepararConfig() {
  $('#c-salvar-marca').addEventListener('click', () => {
    const bruto = $('#c-agencia-zap').value.trim();
    const tel = interpretarTelefones(bruto)[0];
    const zap = tel?.whatsapp || (tel?.digitos?.length >= 12 ? tel.digitos : '');
    if (bruto && !zap) return aviso('Informe um celular com DDD, por exemplo (19) 99999-0000.', 'erro');
    const base = $('#c-site-base').value.trim();
    if (base && !/^https?:\/\//.test(base)) return aviso('O endereço do site deve começar com https://', 'erro');
    config.salvar({ agenciaNome: $('#c-agencia-nome').value.trim(), agenciaWhatsapp: zap, siteBase: base });
    renderizarConfig();
    aviso('Marca salva. As próximas prévias já mostram seu nome e WhatsApp.');
  });
  $('#c-salvar-chave').addEventListener('click', () => {
    config.salvar({ chaveGoogle: $('#c-chave').value.trim() });
    aviso('Chave salva neste navegador.');
  });
  $('#c-remover-chave').addEventListener('click', () => {
    config.salvar({ chaveGoogle: '', fontePadrao: 'osm' });
    $('#c-chave').value = '';
    aviso('Chave removida.');
  });
  $('#c-backup').addEventListener('click', () => baixarJson(backupCompleto(), `radar-leads-backup-${new Date().toISOString().slice(0, 10)}.json`));
  $('#c-restaurar').addEventListener('change', async (e) => {
    const arq = e.target.files[0];
    if (!arq) return;
    try {
      restaurarBackup(JSON.parse(await arq.text()));
      atualizarContadores();
      aviso('Backup restaurado.');
    } catch (erro) {
      aviso(erro.message || 'Arquivo inválido.', 'erro');
    }
    e.target.value = '';
  });
  $('#c-importar-csv').addEventListener('change', async (e) => {
    const arq = e.target.files[0];
    if (!arq) return;
    try {
      const leads = importarCsv(await arq.text());
      const novos = crm.salvarVarios(leads);
      atualizarContadores();
      aviso(`${fmt(leads.length)} linhas lidas, ${fmt(novos)} novos leads no CRM.`);
    } catch (erro) {
      aviso(erro.message || 'Não foi possível ler o CSV.', 'erro');
    }
    e.target.value = '';
  });
  $('#c-apagar').addEventListener('click', () => {
    if (!confirm('Apagar todos os dados deste navegador? Essa ação não pode ser desfeita.')) return;
    apagarTudo();
    atualizarContadores();
    renderizarConfig();
    aviso('Dados apagados.');
  });
}

// ---------------------------------------------------------------- tema e inicialização

function prepararTema() {
  $('#alternar-tema').addEventListener('click', () => {
    const atual = document.documentElement.dataset.theme
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const novo = atual === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem('radarleads:tema', novo); } catch { /* ignora */ }
  });
  $('#abrir-menu').addEventListener('click', () => { $('#lateral').classList.add('aberta'); $('#veu').hidden = false; });
  $('#veu').addEventListener('click', fecharMenu);
}

function lerParametrosUrl() {
  const p = new URLSearchParams(location.search);
  if (p.get('nicho')) $('#f-nicho').value = p.get('nicho');
  if (p.get('local')) $('#f-local').value = p.get('local');
  return p.get('nicho') && p.get('local');
}

function iniciar() {
  prepararFormulario();
  prepararResultados();
  prepararCrm();
  prepararDisparo();
  prepararHistorico();
  prepararConfig();
  prepararTema();
  window.addEventListener('hashchange', navegar);
  navegar();
  atualizarContadores();

  const anterior = sessao.obter();
  if (anterior?.leads?.length) {
    estado.contexto = anterior.contexto;
    if (anterior.contexto) {
      $('#f-nicho').value = anterior.contexto.nicho || '';
      $('#f-local').value = anterior.contexto.local || '';
    }
    definirResultados(anterior.leads, { salvarSessao: false });
  }
  if (lerParametrosUrl()) executarBusca();
}

iniciar();
