// Funções utilitárias puras (funcionam no navegador e no Node).

/** Remove acentos e baixa a caixa, para comparações tolerantes. */
export function normalizarTexto(txt = '') {
  return String(txt)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Cria um identificador amigável para nomes de arquivo. */
export function slug(txt = '') {
  return normalizarTexto(txt)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'leads';
}

/** Escapa caracteres especiais de expressão regular (usado nas consultas Overpass). */
export function escaparRegex(txt = '') {
  return String(txt).replace(/[.*+?^${}()|[\]\\"]/g, '\\$&');
}

const CLASSES_ACENTO = {
  a: 'aáàâãäAÁÀÂÃÄ', e: 'eéèêëEÉÈÊË', i: 'iíìîïIÍÌÎÏ', o: 'oóòôõöOÓÒÔÕÖ', u: 'uúùûüUÚÙÛÜ', c: 'cçCÇ', n: 'nñNÑ',
};

/** Gera uma expressão regular que ignora acentos (ex.: "acai" casa com "Açaí"). */
export function regexSemAcento(txt = '') {
  return [...normalizarTexto(txt)].map((ch) => (CLASSES_ACENTO[ch] ? `[${CLASSES_ACENTO[ch]}]` : /[a-z0-9 ]/.test(ch) ? ch : '')).join('');
}

/** Escapa HTML para inserir texto com segurança na interface. */
export function escaparHtml(txt = '') {
  return String(txt ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Interpreta um telefone brasileiro em formato livre.
 * Retorna { bruto, digitos, ddd, numero, formatado, celular, whatsapp } ou null.
 * "whatsapp" traz o número no formato internacional (55 + DDD + número),
 * preenchido apenas quando o número é celular (11 dígitos começando com 9 após o DDD).
 */
export function interpretarTelefone(bruto) {
  if (!bruto) return null;
  const original = String(bruto).trim();
  let d = original.replace(/\D/g, '');
  if (!d) return null;

  const internacionalEstrangeiro = original.startsWith('+') && !original.replace(/\s/g, '').startsWith('+55');
  if (internacionalEstrangeiro) {
    return { bruto: original, digitos: d, ddd: '', numero: d, formatado: original, celular: false, whatsapp: d.length >= 10 ? d : '' };
  }

  // Números especiais (0800, 0300, 4004, 3003...)
  if (/^0[38]00/.test(d)) {
    return { bruto: original, digitos: d, ddd: '', numero: d, formatado: d.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3'), celular: false, whatsapp: '' };
  }
  if (/^(400[0-9]|300[0-9])\d{4}$/.test(d)) {
    return { bruto: original, digitos: d, ddd: '', numero: d, formatado: d.replace(/^(\d{4})(\d{4})$/, '$1-$2'), celular: false, whatsapp: '' };
  }

  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  // Prefixo de operadora: 0 + código de 2 dígitos + DDD + número (ex.: 0 21 11 98765-4321)
  if (d.startsWith('0') && (d.length === 13 || d.length === 14)) d = d.slice(3);
  if (d.startsWith('0') && (d.length === 11 || d.length === 12)) d = d.slice(1);

  if (d.length === 10 || d.length === 11) {
    const ddd = d.slice(0, 2);
    const numero = d.slice(2);
    const celular = numero.length === 9 && numero.startsWith('9');
    const formatado = numero.length === 9
      ? `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`
      : `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    return { bruto: original, digitos: d, ddd, numero, formatado, celular, whatsapp: celular ? `55${d}` : '' };
  }

  if (d.length === 8 || d.length === 9) {
    const celular = d.length === 9 && d.startsWith('9');
    const formatado = d.length === 9 ? `${d.slice(0, 5)}-${d.slice(5)}` : `${d.slice(0, 4)}-${d.slice(4)}`;
    return { bruto: original, digitos: d, ddd: '', numero: d, formatado, celular, whatsapp: '' };
  }

  return { bruto: original, digitos: d, ddd: '', numero: d, formatado: original, celular: false, whatsapp: '' };
}

/** Separa uma string com vários telefones ("; ", ",", "/") em uma lista interpretada e sem duplicados. */
export function interpretarTelefones(...valores) {
  const vistos = new Set();
  const lista = [];
  for (const valor of valores) {
    if (!valor) continue;
    for (const parte of String(valor).split(/[;,/|]| ou /)) {
      const tel = interpretarTelefone(parte);
      if (tel && !vistos.has(tel.digitos)) {
        vistos.add(tel.digitos);
        lista.push(tel);
      }
    }
  }
  return lista;
}

/** Garante que uma URL tenha protocolo. */
export function normalizarUrl(url) {
  if (!url) return '';
  let u = String(url).trim().split(/[;\s]+/)[0];
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `https://${u.replace(/^\/+/, '')}`;
  return u;
}

/** Converte um identificador de Instagram (@perfil, URL ou nome) em URL. */
export function urlInstagram(valor) {
  if (!valor) return '';
  const v = String(valor).trim();
  if (/instagram\.com/i.test(v)) return normalizarUrl(v);
  const usuario = v.replace(/^@/, '').replace(/[^\w.]/g, '');
  return usuario ? `https://www.instagram.com/${usuario}/` : '';
}

export function urlFacebook(valor) {
  if (!valor) return '';
  const v = String(valor).trim();
  if (/facebook\.com|fb\.com/i.test(v)) return normalizarUrl(v);
  return `https://www.facebook.com/${v.replace(/^@/, '')}`;
}

/**
 * Pontuação de qualidade do lead (0 a 100), com base na quantidade de canais de contato.
 */
export function pontuarLead(lead) {
  let p = 0;
  if (lead.telefone) p += 25;
  if (lead.whatsapp) p += 20;
  if (lead.email) p += 15;
  if (lead.site) p += 10;
  if (lead.instagram || lead.facebook) p += 10;
  if (lead.endereco) p += 10;
  if (lead.horario) p += 5;
  if (lead.avaliacao) p += 5;
  return Math.min(100, p);
}

/** Link do Google Maps para o estabelecimento (busca por nome + coordenada). */
export function linkGoogleMaps(lead) {
  const consulta = [lead.nome, lead.endereco || lead.cidade].filter(Boolean).join(', ');
  if (consulta) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  if (lead.lat && lead.lon) return `https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lon}`;
  return '';
}

/** Substitui variáveis {nome}, {cidade} etc. num modelo de mensagem. */
export function preencherModelo(modelo, lead, extras = {}) {
  const primeiroNome = (lead.nome || '').split(/\s+/)[0] || '';
  const vars = {
    nome: lead.nome || '',
    empresa: lead.nome || '',
    primeiro_nome: primeiroNome,
    cidade: lead.cidade || extras.cidade || '',
    bairro: lead.bairro || '',
    categoria: lead.categoria || '',
    nicho: extras.nicho || lead.nicho || lead.categoria || '',
    site: lead.site || '',
    ...extras,
  };
  return String(modelo || '').replace(/\{(\w+)\}/g, (m, chave) => (chave in vars ? vars[chave] : m));
}

export function linkWhatsApp(numero, mensagem = '') {
  if (!numero) return '';
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
  return `https://wa.me/${numero}${texto}`;
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function formatarData(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
