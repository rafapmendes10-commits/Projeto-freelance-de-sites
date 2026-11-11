// Persistência local (localStorage). Os dados ficam apenas no navegador do usuário.

const PREFIXO = 'radarleads:';

function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(PREFIXO + chave);
    return v ? JSON.parse(v) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export const ETAPAS = [
  { id: 'novo', rotulo: 'Novo' },
  { id: 'contatado', rotulo: 'Contatado' },
  { id: 'negociando', rotulo: 'Em negociação' },
  { id: 'pago', rotulo: 'Pagamento recebido' },
  { id: 'ganho', rotulo: 'Site entregue' },
  { id: 'perdido', rotulo: 'Perdido' },
];

export const MODELO_PADRAO =
  'Olá, tudo bem? Encontrei a {nome} aqui em {cidade} e gostei muito do trabalho de vocês. ' +
  'Sou especialista em criação de sites e presença digital para {nicho}. ' +
  'Posso mostrar em 2 minutos uma ideia de como atrair mais clientes pelo Google?';

const MODELO_PREVIA = {
  id: 'previa',
  nome: 'Prévia gratuita do site',
  texto: 'Olá, tudo bem? Sou {minha_marca} e criei, sem compromisso, uma prévia de como poderia ficar o site da {nome}:\n\n{link_previa}\n\n' +
    'Ela já tem botão de WhatsApp, mapa e os dados de vocês. Se gostar, coloco no ar com domínio próprio. Posso te explicar em 2 minutos?',
};

const CONFIG_PADRAO = {
  chaveGoogle: '',
  fontePadrao: 'osm',
  agenciaNome: '',
  agenciaWhatsapp: '',
  siteBase: '',
  versaoModelos: 2,
  modelos: [
    MODELO_PREVIA,
    { id: 'apresentacao', nome: 'Apresentação (sites)', texto: MODELO_PADRAO },
    {
      id: 'sem-site',
      nome: 'Empresa sem site',
      texto: 'Olá! Procurei a {nome} no Google e notei que vocês ainda não têm um site próprio. ' +
        'Hoje a maioria dos clientes de {cidade} pesquisa antes de comprar. Posso te enviar um modelo gratuito de como ficaria o site de vocês?',
    },
    {
      id: 'retorno',
      nome: 'Follow-up',
      texto: 'Oi! Passando para saber se você conseguiu ver minha mensagem anterior sobre a {nome}. Fico à disposição.',
    },
  ],
  modeloAtivo: 'previa',
  intervaloDisparoSeg: 40,
};

export const config = {
  obter() {
    const salvo = ler('config', {});
    const c = { ...CONFIG_PADRAO, ...salvo };
    if (salvo.modelos && !(salvo.versaoModelos >= 2)) {
      // Atualização: inclui o modelo com a prévia gratuita para quem já usava a versão anterior
      if (!c.modelos.some((m) => m.id === 'previa')) c.modelos = [MODELO_PREVIA, ...c.modelos];
      c.versaoModelos = 2;
      c.modeloAtivo = 'previa';
      gravar('config', c);
    }
    return c;
  },
  salvar(parcial) {
    const atual = this.obter();
    gravar('config', { ...atual, ...parcial });
    return this.obter();
  },
};

export const crm = {
  todos() {
    return ler('crm', {});
  },
  lista() {
    return Object.values(this.todos()).sort((a, b) => (b.atualizadoEm || '').localeCompare(a.atualizadoEm || ''));
  },
  obter(id) {
    return this.todos()[id];
  },
  tem(id) {
    return Boolean(this.todos()[id]);
  },
  salvarVarios(leads, etapa = 'novo') {
    const todos = this.todos();
    let novos = 0;
    const agora = new Date().toISOString();
    for (const l of leads) {
      if (todos[l.id]) continue;
      todos[l.id] = { ...l, etapa, notas: '', salvoEm: agora, atualizadoEm: agora, historico: [] };
      novos++;
    }
    gravar('crm', todos);
    return novos;
  },
  atualizar(id, parcial) {
    const todos = this.todos();
    if (!todos[id]) return null;
    const agora = new Date().toISOString();
    const anterior = todos[id];
    const historico = anterior.historico || [];
    if (parcial.etapa && parcial.etapa !== anterior.etapa) historico.push({ em: agora, de: anterior.etapa, para: parcial.etapa });
    todos[id] = { ...anterior, ...parcial, historico, atualizadoEm: agora };
    gravar('crm', todos);
    return todos[id];
  },
  remover(ids) {
    const todos = this.todos();
    for (const id of [].concat(ids)) delete todos[id];
    gravar('crm', todos);
  },
  substituir(objeto) {
    gravar('crm', objeto || {});
  },
};

export const historico = {
  lista() {
    return ler('historico', []);
  },
  adicionar(item) {
    const lista = this.lista().filter((h) => !(h.nicho === item.nicho && h.local === item.local && h.raioKm === item.raioKm && h.fonte === item.fonte));
    lista.unshift({ ...item, em: new Date().toISOString() });
    gravar('historico', lista.slice(0, 50));
  },
  limpar() {
    gravar('historico', []);
  },
};

export const fila = {
  obter() {
    return ler('fila', []);
  },
  definir(itens) {
    gravar('fila', itens);
  },
};

/** Últimos resultados de busca (para não perder ao recarregar a página). */
export const sessao = {
  obter() {
    try {
      return JSON.parse(sessionStorage.getItem(`${PREFIXO}resultados`) || 'null');
    } catch {
      return null;
    }
  },
  salvar(dados) {
    try {
      sessionStorage.setItem(`${PREFIXO}resultados`, JSON.stringify(dados));
    } catch { /* cota excedida: ignora */ }
  },
};

export function backupCompleto() {
  return { versao: 1, exportadoEm: new Date().toISOString(), crm: crm.todos(), historico: historico.lista(), config: { ...config.obter(), chaveGoogle: '' } };
}

export function restaurarBackup(dados) {
  if (!dados || typeof dados !== 'object' || !dados.crm) throw new Error('Arquivo de backup inválido.');
  const atual = crm.todos();
  crm.substituir({ ...atual, ...dados.crm });
  if (Array.isArray(dados.historico)) gravar('historico', dados.historico);
  if (dados.config) {
    const { chaveGoogle, ...resto } = dados.config;
    config.salvar(resto);
  }
}

export function apagarTudo() {
  for (const k of ['crm', 'historico', 'config', 'fila']) {
    try { localStorage.removeItem(PREFIXO + k); } catch { /* ignora */ }
  }
}
