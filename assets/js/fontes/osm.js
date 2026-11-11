// Fonte de dados gratuita: OpenStreetMap (Nominatim para geocodificação e Overpass para os estabelecimentos).
// Não exige chave de API nem cartão de crédito. Funciona no navegador e no Node 18+.

import { NICHOS, encontrarNicho, categoriaDasEtiquetas, regexBuscaLivre } from '../nichos.js';
import {
  regexSemAcento, interpretarTelefones, normalizarUrl, urlInstagram, urlFacebook,
  pontuarLead, linkGoogleMaps, esperar,
} from '../util.js';

export const SERVIDORES_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const CHAVES_NEGOCIO = '^(amenity|shop|office|healthcare|craft|leisure|tourism)$';

function cabecalhos(opcoes) {
  const h = { Accept: 'application/json' };
  // No Node, a política do Nominatim pede um User-Agent identificável. No navegador ele é definido automaticamente.
  if (opcoes.userAgent) h['User-Agent'] = opcoes.userAgent;
  return h;
}

/**
 * Geocodifica uma cidade, bairro ou endereço.
 * Retorna { nome, lat, lon, tipoOsm, idOsm, idArea, caixa } ou lança erro.
 */
export async function geocodificar(local, opcoes = {}) {
  const f = opcoes.fetch || globalThis.fetch;
  const params = new URLSearchParams({
    q: local,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
    'accept-language': 'pt-BR',
  });
  if (opcoes.pais) params.set('countrycodes', opcoes.pais);
  const resp = await f(`${NOMINATIM}?${params}`, { headers: cabecalhos(opcoes), signal: opcoes.signal });
  if (!resp.ok) throw new Error(`Falha ao localizar "${local}" (HTTP ${resp.status}).`);
  const dados = await resp.json();
  if (!dados.length) throw new Error(`Não encontrei o local "${local}". Tente informar cidade e estado, por exemplo "Campinas, SP".`);
  const r = dados[0];
  const id = Number(r.osm_id);
  let idArea = null;
  if (r.osm_type === 'relation') idArea = 3600000000 + id;
  else if (r.osm_type === 'way' && /boundary|place/.test(r.category || r.class || '')) idArea = 2400000000 + id;
  const end = r.address || {};
  return {
    nome: r.display_name,
    nomeCurto: r.name || local,
    cidade: end.city || end.town || end.village || end.municipality || r.name || '',
    uf: siglaEstado(end.state || ''),
    lat: Number(r.lat),
    lon: Number(r.lon),
    tipoOsm: r.osm_type,
    idOsm: id,
    idArea,
    caixa: (r.boundingbox || []).map(Number),
  };
}

const ESTADOS = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF',
  'espirito santo': 'ES', goias: 'GO', maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

function siglaEstado(nome) {
  const n = String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return ESTADOS[n] || (nome.length === 2 ? nome.toUpperCase() : nome);
}

/** Monta a consulta Overpass QL para um nicho (do catálogo ou texto livre) dentro de uma área ou raio. */
export function montarConsulta({ nicho, termoLivre, local, raioKm, limite = 500, ampliarPorNome = true }) {
  let alvo;
  let preambulo = '';
  if (local.idArea && !raioKm) {
    preambulo = `area(id:${local.idArea})->.a;\n`;
    alvo = '(area.a)';
  } else {
    const raio = Math.round((raioKm || 3) * 1000);
    alvo = `(around:${raio},${local.lat},${local.lon})`;
  }

  const linhas = [];
  if (nicho) {
    for (const filtro of nicho.filtros) linhas.push(`  nwr${filtro}["name"]${alvo};`);
    const termos = ampliarPorNome ? nicho.termos.map((t) => t.trim()).filter((t) => t.length >= 5) : [];
    if (termos.length) {
      const regex = termos.map(regexSemAcento).join('|');
      linhas.push(`  nwr["name"~"${regex}",i][~"${CHAVES_NEGOCIO}"~"."]${alvo};`);
    }
  } else if (termoLivre) {
    const regex = regexBuscaLivre(termoLivre).map(regexSemAcento).join('.*');
    linhas.push(`  nwr["name"~"${regex}",i][~"${CHAVES_NEGOCIO}"~"."]${alvo};`);
    linhas.push(`  nwr["cuisine"~"${regex}",i]["name"]${alvo};`);
    linhas.push(`  nwr["description"~"${regex}",i]["name"][~"${CHAVES_NEGOCIO}"~"."]${alvo};`);
  }

  return `[out:json][timeout:120];\n${preambulo}(\n${linhas.join('\n')}\n);\nout tags center ${Math.max(1, Math.min(5000, limite))};`;
}

/** Executa a consulta no Overpass, alternando entre servidores públicos em caso de lentidão ou bloqueio. */
export async function executarOverpass(consulta, opcoes = {}) {
  const f = opcoes.fetch || globalThis.fetch;
  const servidores = opcoes.servidores || SERVIDORES_OVERPASS;
  let ultimoErro;
  for (let tentativa = 0; tentativa < servidores.length; tentativa++) {
    const url = servidores[tentativa];
    try {
      opcoes.onProgresso?.(tentativa === 0 ? 'Consultando o mapa...' : `Servidor ocupado, tentando alternativa ${tentativa + 1}...`);
      const resp = await f(url, {
        method: 'POST',
        headers: { ...cabecalhos(opcoes), 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: `data=${encodeURIComponent(consulta)}`,
        signal: opcoes.signal,
      });
      if (resp.status === 429 || resp.status >= 500) {
        ultimoErro = new Error(`Servidor de mapas ocupado (HTTP ${resp.status}).`);
        await esperar(800);
        continue;
      }
      if (!resp.ok) throw new Error(`Consulta recusada (HTTP ${resp.status}).`);
      const dados = await resp.json();
      if (dados.remark && /runtime error|timed out/i.test(dados.remark) && !dados.elements?.length) {
        ultimoErro = new Error('A área é grande demais para esta consulta. Reduza o raio ou escolha um bairro.');
        continue;
      }
      return dados.elements || [];
    } catch (erro) {
      if (erro.name === 'AbortError') throw erro;
      ultimoErro = erro;
    }
  }
  throw ultimoErro || new Error('Não foi possível consultar o mapa agora.');
}

const SIM = (v) => v && v !== 'no';
const COZINHAS = {
  pizza: 'pizza', burger: 'hambúrguer', japanese: 'culinária japonesa', sushi: 'sushi', italian: 'culinária italiana',
  brazilian: 'culinária brasileira', regional: 'culinária regional', barbecue: 'churrasco', steak_house: 'churrascaria',
  chinese: 'culinária chinesa', arab: 'culinária árabe', mexican: 'culinária mexicana', coffee_shop: 'cafés especiais',
  ice_cream: 'sorvetes', acai: 'açaí', vegetarian: 'vegetariana', vegan: 'vegana', seafood: 'frutos do mar',
  sandwich: 'lanches', chicken: 'frango', cake: 'bolos', bakery: 'padaria', juice: 'sucos', breakfast: 'café da manhã',
};

/** Traduz etiquetas do OSM em características concretas do estabelecimento (usadas no diagnóstico e no prompt). */
export function caracteristicasDasEtiquetas(t = {}) {
  const c = [];
  if (t.cuisine) c.push(`Especialidade: ${t.cuisine.split(';').map((x) => COZINHAS[x.trim()] || x.trim().replace(/_/g, ' ')).join(', ')}`);
  for (const k of ['healthcare:speciality', 'speciality', 'beauty', 'sport']) if (t[k]) c.push(`Especialidade: ${t[k].replace(/;/g, ', ').replace(/_/g, ' ')}`);
  if (SIM(t.delivery)) c.push('Faz entregas (delivery)');
  if (SIM(t.takeaway)) c.push('Pedidos para viagem');
  if (SIM(t.outdoor_seating)) c.push('Mesas ao ar livre');
  if (SIM(t.reservation)) c.push('Aceita reservas');
  if (t.wheelchair === 'yes') c.push('Acessível para cadeirantes');
  if (t.wheelchair === 'limited') c.push('Acessibilidade parcial');
  if (SIM(t.air_conditioning)) c.push('Ambiente climatizado');
  if (t.internet_access && t.internet_access !== 'no') c.push('Wi-Fi para clientes');
  if (t.parking || SIM(t['parking:customers'])) c.push('Estacionamento');
  if (SIM(t.drive_through)) c.push('Drive-thru');
  if (SIM(t['diet:vegan']) || SIM(t['diet:vegetarian'])) c.push('Opções vegetarianas ou veganas');
  if (SIM(t['diet:gluten_free'])) c.push('Opções sem glúten');
  if (SIM(t['payment:pix'])) c.push('Aceita Pix');
  if (SIM(t['payment:credit_cards']) || SIM(t['payment:debit_cards'])) c.push('Aceita cartões');
  if (SIM(t.self_service)) c.push('Autoatendimento');
  if (t.opening_hours === '24/7') c.push('Funciona 24 horas');
  else if (/Su\b|Sa-Su|Mo-Su/.test(t.opening_hours || '') && !/Su off/.test(t.opening_hours || '')) c.push('Abre aos domingos');
  else if (/Sa\b|Mo-Sa/.test(t.opening_hours || '') && !/Sa off/.test(t.opening_hours || '')) c.push('Abre aos sábados');
  if (t.start_date && /^\d{4}/.test(t.start_date)) c.push(`Em atividade desde ${t.start_date.slice(0, 4)}`);
  if (t.brand && t.brand !== t.name) c.push(`Marca: ${t.brand}`);
  if (t.operator && t.operator !== t.name) c.push(`Operado por: ${t.operator}`);
  if (t.level && t.level !== '0') c.push(`Fica no ${t.level}º andar`);
  if (t['building:levels']) c.push(`Prédio de ${t['building:levels']} andares`);
  return [...new Set(c)];
}

/** Converte um elemento OSM em um lead padronizado. */
export function normalizarElementoOsm(el, contexto = {}) {
  const t = el.tags || {};
  const nome = t.name || t.brand || t['name:pt'];
  if (!nome) return null;

  const telefones = interpretarTelefones(
    t['contact:whatsapp'], t.whatsapp, t.phone, t['contact:phone'], t.mobile, t['contact:mobile'], t['phone:mobile'],
  );
  const zap = interpretarTelefones(t['contact:whatsapp'], t.whatsapp).find((x) => x.whatsapp);
  const celular = zap || telefones.find((x) => x.whatsapp);

  const rua = t['addr:street'] || '';
  const numero = t['addr:housenumber'] || '';
  const bairro = t['addr:suburb'] || t['addr:neighbourhood'] || t['addr:district'] || t['addr:quarter'] || '';
  const cidade = t['addr:city'] || contexto.cidade || '';
  const uf = t['addr:state'] ? siglaEstado(t['addr:state']) : contexto.uf || '';
  const cep = t['addr:postcode'] || '';
  const partesEnd = [rua && numero ? `${rua}, ${numero}` : rua, bairro, cidade && uf ? `${cidade}/${uf}` : cidade, cep];
  const endereco = rua ? partesEnd.filter(Boolean).join(', ') : (t['addr:full'] || '');

  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;
  const tipo = { node: 'n', way: 'w', relation: 'r' }[el.type] || el.type;

  const lead = {
    id: `osm:${tipo}${el.id}`,
    fonte: 'OpenStreetMap',
    nome: String(nome).trim(),
    categoria: categoriaDasEtiquetas(t),
    nicho: contexto.nicho || '',
    telefone: telefones[0]?.formatado || '',
    telefones: telefones.map((x) => x.formatado),
    whatsapp: celular?.whatsapp || '',
    email: (t.email || t['contact:email'] || '').split(/[;\s,]+/)[0] || '',
    site: normalizarUrl(t.website || t['contact:website'] || t.url || ''),
    instagram: urlInstagram(t['contact:instagram'] || t.instagram || ''),
    facebook: urlFacebook(t['contact:facebook'] || t.facebook || ''),
    endereco,
    bairro,
    cidade,
    uf,
    cep,
    horario: t.opening_hours || '',
    caracteristicas: caracteristicasDasEtiquetas(t),
    descricao: t.description || t['description:pt'] || '',
    avaliacao: null,
    numAvaliacoes: null,
    lat,
    lon,
    linkOsm: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    coletadoEm: new Date().toISOString(),
  };
  lead.linkMaps = linkGoogleMaps(lead);
  lead.pontuacao = pontuarLead(lead);
  return lead;
}

/** Remove duplicados (mesmo id, ou mesmo nome com mesmo telefone/endereço). */
export function deduplicar(leads) {
  const porId = new Map();
  const assinaturas = new Set();
  for (const l of leads) {
    if (!l || porId.has(l.id)) continue;
    const assinatura = `${l.nome.toLowerCase()}|${l.telefone || l.endereco || `${l.lat?.toFixed?.(3)},${l.lon?.toFixed?.(3)}`}`;
    if (assinaturas.has(assinatura)) continue;
    assinaturas.add(assinatura);
    porId.set(l.id, l);
  }
  return [...porId.values()];
}

/**
 * Busca completa: geocodifica o local, consulta o Overpass e devolve leads padronizados.
 * @param {{ nicho: string, local: string, raioKm?: number, limite?: number, pais?: string }} parametros
 */
export async function buscarLeadsOsm(parametros, opcoes = {}) {
  const { nicho: textoNicho, local: textoLocal, raioKm, limite = 500, pais = 'br', ampliarPorNome = true } = parametros;
  opcoes.onProgresso?.(`Localizando ${textoLocal}...`);
  const local = await geocodificar(textoLocal, { ...opcoes, pais });
  const nicho = encontrarNicho(textoNicho);
  const consulta = montarConsulta({ nicho, termoLivre: nicho ? '' : textoNicho, local, raioKm, limite, ampliarPorNome });
  const elementos = await executarOverpass(consulta, opcoes);
  opcoes.onProgresso?.(`Organizando ${elementos.length} resultados...`);
  const contexto = { cidade: local.cidade, uf: local.uf, nicho: nicho?.rotulo || textoNicho };
  const leads = deduplicar(elementos.map((el) => normalizarElementoOsm(el, contexto)));
  return { leads, local, nicho, consulta };
}

export { NICHOS };
