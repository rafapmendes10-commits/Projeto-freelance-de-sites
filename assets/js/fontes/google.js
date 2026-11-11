// Fonte opcional: Google Places API (New).
// Exige uma chave própria do Google Cloud. O Google oferece uma cota mensal gratuita;
// acima dela há cobrança. Os dados ficam sujeitos aos Termos de Serviço da Google Maps Platform.

import { interpretarTelefones, normalizarUrl, pontuarLead } from '../util.js';

const CAMPOS_REST = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.addressComponents', 'places.location',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber', 'places.websiteUri', 'places.rating',
  'places.userRatingCount', 'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.businessStatus',
  'places.regularOpeningHours', 'nextPageToken',
];

function componente(componentes = [], tipo, curto = false) {
  const c = componentes.find((x) => (x.types || []).includes(tipo));
  if (!c) return '';
  return curto ? (c.shortText || c.short_name || c.shortName || '') : (c.longText || c.long_name || c.longName || '');
}

/** Converte um lugar (formato REST ou formato da biblioteca JavaScript) em lead padronizado. */
export function normalizarLugarGoogle(p, contexto = {}) {
  const nome = p.displayName?.text || p.displayName || '';
  if (!nome) return null;
  const tels = interpretarTelefones(p.nationalPhoneNumber, p.internationalPhoneNumber);
  const comps = p.addressComponents || [];
  const lat = typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.latitude ?? p.location?.lat ?? null;
  const lon = typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.longitude ?? p.location?.lng ?? null;
  const horario = p.regularOpeningHours?.weekdayDescriptions || p.regularOpeningHours?.weekdayText || [];
  const lead = {
    id: `google:${p.id}`,
    fonte: 'Google',
    nome,
    categoria: p.primaryTypeDisplayName?.text || p.primaryTypeDisplayName || contexto.nicho || '',
    nicho: contexto.nicho || '',
    telefone: tels[0]?.formatado || '',
    telefones: tels.map((x) => x.formatado),
    whatsapp: tels.find((x) => x.whatsapp)?.whatsapp || '',
    email: '',
    site: normalizarUrl(p.websiteUri || p.websiteURI || ''),
    instagram: '',
    facebook: '',
    endereco: p.formattedAddress || '',
    bairro: componente(comps, 'sublocality_level_1') || componente(comps, 'sublocality'),
    cidade: componente(comps, 'administrative_area_level_2') || componente(comps, 'locality') || contexto.cidade || '',
    uf: componente(comps, 'administrative_area_level_1', true) || contexto.uf || '',
    cep: componente(comps, 'postal_code'),
    horario: horario.join('; '),
    avaliacao: p.rating ?? null,
    numAvaliacoes: p.userRatingCount ?? null,
    status: p.businessStatus || '',
    lat,
    lon,
    linkMaps: p.googleMapsUri || p.googleMapsURI || '',
    linkOsm: '',
    coletadoEm: new Date().toISOString(),
  };
  lead.pontuacao = pontuarLead(lead);
  return lead;
}

/** Busca via REST (ideal para o Node e para o GitHub Actions). Pagina até 60 resultados. */
export async function buscarLeadsGoogleRest({ nicho, local, chave, maxPaginas = 3 }, opcoes = {}) {
  const f = opcoes.fetch || globalThis.fetch;
  const leads = [];
  let pageToken;
  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    const corpo = { textQuery: `${nicho} em ${local}`, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20 };
    if (pageToken) corpo.pageToken = pageToken;
    const resp = await f('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': chave, 'X-Goog-FieldMask': CAMPOS_REST.join(',') },
      body: JSON.stringify(corpo),
    });
    if (!resp.ok) throw new Error(`Google Places respondeu HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
    const dados = await resp.json();
    for (const p of dados.places || []) {
      const l = normalizarLugarGoogle(p, { nicho });
      if (l) leads.push(l);
    }
    pageToken = dados.nextPageToken;
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return leads;
}

// ---------- Navegador: Maps JavaScript API ----------

let carregamento;

function carregarMapsJs(chave) {
  if (globalThis.google?.maps?.importLibrary) return Promise.resolve();
  if (carregamento) return carregamento;
  carregamento = new Promise((resolve, reject) => {
    const nomeCallback = `__radarLeadsGoogle${Date.now()}`;
    globalThis[nomeCallback] = () => resolve();
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(chave)}&v=weekly&loading=async&language=pt-BR&region=BR&callback=${nomeCallback}`;
    s.async = true;
    s.onerror = () => { carregamento = null; reject(new Error('Não foi possível carregar a API do Google. Verifique a chave e a conexão.')); };
    document.head.appendChild(s);
  });
  return carregamento;
}

/** Busca no navegador com a biblioteca Places (Place.searchByText). Retorna até 20 lugares por consulta. */
export async function buscarLeadsGoogleNavegador({ nicho, local, chave }) {
  await carregarMapsJs(chave);
  const { Place } = await google.maps.importLibrary('places');
  const { places } = await Place.searchByText({
    textQuery: `${nicho} em ${local}`,
    fields: [
      'id', 'displayName', 'formattedAddress', 'addressComponents', 'location', 'nationalPhoneNumber',
      'internationalPhoneNumber', 'websiteURI', 'rating', 'userRatingCount', 'googleMapsURI',
      'primaryTypeDisplayName', 'businessStatus', 'regularOpeningHours',
    ],
    language: 'pt-BR',
    region: 'br',
    maxResultCount: 20,
  });
  return (places || []).map((p) => normalizarLugarGoogle(p, { nicho })).filter(Boolean);
}
