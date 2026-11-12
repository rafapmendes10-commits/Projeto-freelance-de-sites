// Diagnóstico de oportunidade e prompt individual para a prévia personalizada de cada comércio.
// Funciona no navegador e no Node.

import { encontrarNicho } from './nichos.js';
import { slug } from './util.js';

// ------------------------------------------------------------------ demandas por nicho

const DEMANDAS_GRUPO = {
  'Saúde': {
    buscas: ['{nicho} perto de mim', '{nicho} em {bairro}', '{nicho} que atende convênio', '{nicho} {cidade} preço consulta'],
    essenciais: ['Especialidades e tratamentos explicados em linguagem simples', 'Agendamento pelo WhatsApp em destaque', 'Convênios aceitos ou atendimento particular', 'Apresentação dos profissionais (com registro no conselho)', 'Localização, estacionamento e acessibilidade', 'Perguntas frequentes sobre primeira consulta'],
    argumentos: ['Segurança e confiança: o paciente pesquisa antes de marcar', 'Facilidade de agendar sem ligar', 'Proximidade: atendimento no próprio bairro'],
    cuidados: 'Respeitar as normas de publicidade do conselho profissional (CFM, CFO, CREFITO e afins): sem promessa de resultado, sem preço como chamariz e sem sensacionalismo.',
  },
  'Pet': {
    buscas: ['{nicho} perto de mim', 'banho e tosa {bairro}', '{nicho} {cidade} 24 horas', 'veterinário emergência {cidade}'],
    essenciais: ['Serviços com duração e cuidados', 'Agendamento de banho e tosa pelo WhatsApp', 'Leva e traz, se houver', 'Galeria para fotos dos pets atendidos', 'Horários e emergências'],
    argumentos: ['O tutor quer segurança e carinho com o animal', 'Comodidade de agendar e buscar', 'Confiança construída com fotos reais'],
    cuidados: 'Não prometer curas; serviços veterinários seguem as normas do CFMV.',
  },
  'Beleza': {
    buscas: ['{nicho} perto de mim', '{nicho} em {bairro}', '{nicho} {cidade} agendamento', 'melhor {nicho} de {cidade}'],
    essenciais: ['Serviços e procedimentos com descrição atrativa', 'Agendamento rápido pelo WhatsApp', 'Galeria de trabalhos (espaço para fotos reais)', 'Equipe e especialidades', 'Integração com o Instagram'],
    argumentos: ['Desejo e autoestima: o visual vende', 'Prova social com fotos de trabalhos reais', 'Agendar em segundos, sem ligar'],
    cuidados: 'Procedimentos estéticos de saúde seguem normas dos conselhos; evitar promessas de resultado.',
  },
  'Alimentação': {
    buscas: ['{nicho} perto de mim', '{nicho} delivery {bairro}', 'onde comer em {bairro}', '{nicho} aberto agora {cidade}'],
    essenciais: ['Cardápio com destaques e faixa de preço', 'Pedido pelo WhatsApp ou link de delivery', 'Horários de funcionamento em destaque', 'Fotos do ambiente e dos pratos (espaços para fotos reais)', 'Como chegar e estacionamento'],
    argumentos: ['Fome é decisão rápida: cardápio e pedido em um toque', 'Horário claro evita perder o cliente', 'Pedido direto, sem comissão de aplicativo'],
    cuidados: 'Não inventar pratos ou preços; usar exemplos claramente marcados para o dono confirmar.',
  },
  'Automotivo': {
    buscas: ['{nicho} perto de mim', '{nicho} em {bairro}', '{nicho} de confiança {cidade}', 'orçamento {nicho} {cidade}'],
    essenciais: ['Serviços oferecidos e marcas atendidas', 'Orçamento pelo WhatsApp (envie fotos do problema)', 'Garantia e transparência', 'Horários e localização', 'Formas de pagamento'],
    argumentos: ['Confiança é o principal critério de escolha', 'Orçamento rápido sem sair de casa', 'Transparência no serviço'],
    cuidados: 'Não prometer prazos ou preços fixos.',
  },
  'Serviços': {
    buscas: ['{nicho} em {cidade}', '{nicho} perto de mim', '{nicho} {bairro}', 'melhor {nicho} {cidade}'],
    essenciais: ['Áreas de atuação explicadas com clareza', 'Primeiro contato pelo WhatsApp', 'Apresentação do profissional ou equipe', 'Atendimento a empresas e pessoas físicas', 'Perguntas frequentes'],
    argumentos: ['Autoridade e credibilidade antes do primeiro contato', 'Clareza sobre como o serviço resolve o problema', 'Facilidade de contato'],
    cuidados: 'Advocacia segue o Provimento 205/2021 da OAB: publicidade apenas informativa, sem captação de clientela, sem preços e sem promessa de resultado.',
  },
  'Varejo': {
    buscas: ['{nicho} em {bairro}', '{nicho} perto de mim', 'loja de {nicho} {cidade}', '{nicho} {cidade} entrega'],
    essenciais: ['Categorias de produtos em destaque', 'Pedido ou consulta de disponibilidade pelo WhatsApp', 'Formas de pagamento e entrega', 'Horários e como chegar', 'Integração com o Instagram'],
    argumentos: ['O cliente quer saber se tem o produto antes de sair de casa', 'Atendimento personalizado que grandes lojas não dão', 'Entrega local'],
    cuidados: 'Não inventar produtos, marcas ou preços.',
  },
  'Educação': {
    buscas: ['{nicho} em {bairro}', '{nicho} perto de mim', '{nicho} {cidade} matrícula', 'melhor {nicho} de {cidade}'],
    essenciais: ['Cursos, turmas e faixas etárias', 'Metodologia e diferenciais', 'Agendar visita ou aula experimental', 'Estrutura e localização', 'Perguntas frequentes sobre matrícula'],
    argumentos: ['Pais e alunos comparam antes de decidir', 'Aula experimental reduz a barreira', 'Confiança na equipe'],
    cuidados: 'Não divulgar índices de aprovação ou resultados sem comprovação.',
  },
  'Hospedagem': {
    buscas: ['{nicho} em {cidade}', '{nicho} perto de {bairro}', '{nicho} {cidade} reserva', '{nicho} barato {cidade}'],
    essenciais: ['Acomodações e comodidades', 'Reserva direta pelo WhatsApp', 'Localização e atrações próximas', 'Políticas de check-in e check-out', 'Galeria de fotos'],
    argumentos: ['Reserva direta sem taxa de plataforma', 'Proximidade de pontos de interesse', 'Atendimento humano'],
    cuidados: 'Não inventar comodidades ou preços.',
  },
};

const DEMANDAS_NICHO = {
  dentista: { essenciais: ['Tratamentos (clínica geral, ortodontia, implantes, clareamento, urgência)', 'Agendamento de avaliação pelo WhatsApp', 'Convênios aceitos', 'Responsável técnico com CRO', 'Atendimento de urgência, se houver'], cuidados: 'Normas do CFO: sem preços promocionais, sem promessa de resultado; fotos de antes e depois apenas com autorização e conforme as regras vigentes.' },
  academia: { essenciais: ['Modalidades e grade de horários', 'Planos (sem inventar valores)', 'Aula experimental gratuita em destaque', 'Estrutura e equipamentos', 'Horário estendido'] },
  restaurante: { essenciais: ['Cardápio por categorias', 'Reservas e pedidos pelo WhatsApp', 'Pratos da casa em destaque', 'Ambiente e ocasiões (almoço executivo, família, eventos)'] },
  pizzaria: { essenciais: ['Cardápio de sabores em destaque', 'Pedido pelo WhatsApp com tempo médio de entrega', 'Promoções da semana (espaço editável)', 'Área de entrega'] },
  advogado: { essenciais: ['Áreas de atuação', 'Como funciona o primeiro atendimento', 'Apresentação do advogado com OAB', 'Conteúdo informativo (artigos curtos)'] },
  contabilidade: { essenciais: ['Abertura de empresa e MEI', 'Planos de contabilidade mensal (sem valores inventados)', 'Segmentos atendidos', 'Atendimento digital'] },
  imobiliaria: { essenciais: ['Imóveis em destaque (exemplos para substituir)', 'Busca por bairro e tipo', 'Avaliação de imóvel', 'Corretores com CRECI'] },
  estetica: { essenciais: ['Procedimentos faciais e corporais', 'Avaliação gratuita', 'Profissional responsável', 'Galeria e integração com Instagram'] },
  barbearia: { essenciais: ['Serviços e combos', 'Agendamento pelo WhatsApp', 'Equipe de barbeiros', 'Ambiente e diferenciais (bar, jogos, música)'] },
  oficina: { essenciais: ['Serviços de mecânica, elétrica e revisão', 'Orçamento por foto no WhatsApp', 'Marcas atendidas', 'Garantia do serviço'] },
  petshop: { essenciais: ['Banho e tosa com agendamento', 'Leva e traz', 'Produtos e rações', 'Galeria dos pets'] },
};

/** "Salões de beleza" vira "salão de beleza", como as pessoas digitam no Google. */
function singularizar(frase) {
  const curtas = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'pet']);
  return frase.split(' ').map((p) => {
    if (curtas.has(p) || p.length <= 3) return p.replace(/^(das|dos)$/, (m) => m.slice(0, 2));
    if (/ões$|ães$/.test(p)) return p.replace(/(ões|ães)$/, 'ão');
    if (/eses$/.test(p)) return p.replace(/eses$/, 'ês');
    if (/éis$/.test(p)) return p.replace(/éis$/, 'el');
    if (/ns$/.test(p)) return p.replace(/ns$/, 'm');
    if (/[^s]s$/.test(p)) return p.slice(0, -1);
    return p;
  }).join(' ');
}

export function demandasDoNicho(lead) {
  const nicho = encontrarNicho(lead.nicho || '') || encontrarNicho(lead.categoria || '');
  const base = DEMANDAS_GRUPO[nicho?.grupo] || DEMANDAS_GRUPO['Serviços'];
  const especifico = (nicho && DEMANDAS_NICHO[nicho.id]) || {};
  const termo = singularizar((nicho?.rotulo.split(' e ')[0] || lead.categoria || 'empresa').toLowerCase());
  const preencher = (t) => t.replace(/\{nicho\}/g, termo).replace(/\{bairro\}/g, lead.bairro || lead.cidade || 'seu bairro').replace(/\{cidade\}/g, lead.cidade || 'sua cidade');
  return {
    nicho,
    buscas: base.buscas.map(preencher),
    essenciais: especifico.essenciais || base.essenciais,
    argumentos: base.argumentos,
    cuidados: especifico.cuidados || base.cuidados,
  };
}

// ------------------------------------------------------------------ concorrência no entorno

function distanciaKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Calcula, para cada lead, os concorrentes do mesmo segmento num raio (padrão 1,5 km). */
export function analisarConcorrencia(leads, raioKm = 1.5) {
  const porCategoria = new Map();
  for (const l of leads) {
    if (l.lat == null || l.lon == null) continue;
    const k = l.categoria || '';
    if (!porCategoria.has(k)) porCategoria.set(k, []);
    porCategoria.get(k).push(l);
  }
  for (const l of leads) {
    const grupo = porCategoria.get(l.categoria || '') || [];
    if (l.lat == null || l.lon == null) { l.concorrencia = null; continue; }
    const proximos = grupo.filter((o) => o !== l && o.id !== l.id && distanciaKm(l, o) <= raioKm);
    const comSite = proximos.filter((o) => o.site);
    l.concorrencia = {
      raioKm,
      total: proximos.length,
      comSite: comSite.length,
      exemplosComSite: comSite.slice(0, 3).map((o) => o.nome),
      exemplos: proximos.slice(0, 5).map((o) => o.nome),
    };
  }
  return leads;
}

// ------------------------------------------------------------------ diagnóstico

/** Pontua a oportunidade de venda de um site (0 a 100) e explica os motivos. */
export function diagnosticar(lead) {
  let pontos = 0;
  const motivos = [];
  if (!lead.site) { pontos += 35; motivos.push('Não tem site: está invisível para quem pesquisa no Google'); }
  else if (lead.auditoriaSite?.problemas?.length) { pontos += 20; motivos.push(`Site atual com problemas: ${lead.auditoriaSite.problemas.join(', ')}`); }
  if (lead.whatsapp) { pontos += 20; motivos.push('Tem WhatsApp: abordagem direta com o dono'); }
  else if (lead.telefone) { pontos += 8; motivos.push('Só telefone fixo: abordagem por ligação'); }
  else motivos.push('Sem telefone cadastrado: contato difícil');
  if (!lead.instagram && !lead.facebook) { pontos += 10; motivos.push('Sem redes sociais cadastradas'); }
  const c = lead.concorrencia;
  if (c?.comSite) { pontos += 15; motivos.push(`${c.comSite} de ${c.total} concorrentes num raio de ${String(c.raioKm).replace('.', ',')} km já têm site`); }
  else if (c?.total >= 3) { pontos += 8; motivos.push(`${c.total} concorrentes por perto e nenhum com site: chance de sair na frente`); }
  if (lead.avaliacao >= 4.3 && lead.numAvaliacoes >= 20 && !lead.site) { pontos += 10; motivos.push(`Bem avaliado (${String(lead.avaliacao).replace('.', ',')} com ${lead.numAvaliacoes} avaliações), mas sem vitrine própria`); }
  if ((lead.caracteristicas || []).length >= 2) { pontos += 5; motivos.push('Tem diferenciais concretos para explorar no site'); }
  if (lead.horario) pontos += 5;
  return { oportunidade: Math.min(100, pontos), motivos };
}

/** Aplica concorrência e diagnóstico a uma lista de leads (altera e devolve a lista). */
export function enriquecerOportunidades(leads) {
  analisarConcorrencia(leads);
  for (const l of leads) Object.assign(l, diagnosticar(l));
  return leads;
}

// ------------------------------------------------------------------ prompt individual

export function slugPrevia(lead) {
  return slug(`${lead.nome} ${lead.bairro || lead.cidade || ''}`);
}

export function caminhoPrevia(lead) {
  return `previas/${slugPrevia(lead)}/`;
}

function horarioLegivel(h) {
  if (!h) return '';
  const dias = { Mo: 'Seg', Tu: 'Ter', We: 'Qua', Th: 'Qui', Fr: 'Sex', Sa: 'Sáb', Su: 'Dom', PH: 'feriados' };
  return h.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (m) => dias[m]).replace(/\boff\b/g, 'fechado').replace('24/7', '24 horas, todos os dias');
}

function anguloDeVenda(lead) {
  const c = lead.concorrencia;
  if (!lead.site && c?.comSite) return `Mostrar que ${c.comSite} concorrentes próximos${c.exemplosComSite?.length ? ` (como ${c.exemplosComSite.slice(0, 2).join(' e ')})` : ''} já aparecem no Google com site próprio, e que esta prévia coloca a ${lead.nome} à frente deles.`;
  if (!lead.site && c?.total >= 3) return `Há ${c.total} concorrentes por perto e nenhum tem site: quem chegar primeiro ao Google domina a região.`;
  if (!lead.site) return `Quem procura ${lead.categoria?.toLowerCase() || 'esse serviço'} em ${lead.bairro || lead.cidade || 'sua região'} encontra apenas o endereço; com um site, encontra motivos para escolher a ${lead.nome}.`;
  if (lead.auditoriaSite?.problemas?.length) return `O site atual tem problemas (${lead.auditoriaSite.problemas.join(', ')}); a prévia mostra como seria uma versão moderna.`;
  return 'Mostrar uma presença digital mais moderna e focada em gerar contatos pelo WhatsApp.';
}

/**
 * Gera o prompt individual para o Claude criar a prévia personalizada.
 * @param {object} lead lead já diagnosticado
 * @param {{ baseSite?: string, agenciaNome?: string, agenciaWhatsapp?: string }} config
 */
export function promptDaPrevia(lead, config = {}) {
  const d = demandasDoNicho(lead);
  const caminho = caminhoPrevia(lead);
  const linkFinal = config.baseSite ? `${config.baseSite.replace(/\/?$/, '/')}${caminho}` : caminho;
  const c = lead.concorrencia;
  const dados = [
    ['Nome', lead.nome],
    ['Segmento', `${lead.categoria}${d.nicho ? ` (nicho: ${d.nicho.rotulo})` : ''}`],
    ['Endereço', lead.endereco],
    ['Bairro e cidade', [lead.bairro, [lead.cidade, lead.uf].filter(Boolean).join('/')].filter(Boolean).join(', ')],
    ['Telefone', (lead.telefones?.length ? lead.telefones : [lead.telefone]).filter(Boolean).join(' / ')],
    ['WhatsApp', lead.whatsapp ? `+${lead.whatsapp} (https://wa.me/${lead.whatsapp})` : ''],
    ['E-mail', lead.email],
    ['Instagram', lead.instagram],
    ['Facebook', lead.facebook],
    ['Site atual', lead.site || 'não tem'],
    ['Horário', horarioLegivel(lead.horario)],
    ['Avaliação no Google', lead.avaliacao ? `${lead.avaliacao} (${lead.numAvaliacoes} avaliações)` : ''],
    ['Coordenadas', lead.lat != null ? `${lead.lat}, ${lead.lon}` : ''],
    ['Descrição cadastrada', lead.descricao],
  ].filter(([, v]) => v);

  const linhas = [
    `# Prévia personalizada: ${lead.nome}`,
    '',
    `Crie uma prévia gratuita de site, exclusiva para este comércio, que eu vou enviar ao dono pelo WhatsApp. O objetivo é que ele abra no celular, se reconheça em cada detalhe e queira comprar o site. Siga as regras da seção "Prévias personalizadas" do CLAUDE.md do repositório.`,
    '',
    '## Entrega',
    `- Arquivo: \`${caminho}index.html\``,
    `- Link que vou enviar: ${linkFinal}`,
    `- Depois de criar: rode \`node scripts/verificar-previa.mjs ${caminho}index.html\`, faça commit e push, e me devolva o link e uma mensagem de WhatsApp curta e personalizada para enviar ao dono.`,
    '',
    '## Dados confirmados (OpenStreetMap)',
    ...dados.map(([k, v]) => `- ${k}: ${v}`),
    ...(lead.caracteristicas?.length ? ['', '## Características únicas do local', ...lead.caracteristicas.map((x) => `- ${x}`)] : []),
    '',
    `## Diagnóstico de oportunidade (${lead.oportunidade ?? '?'}/100)`,
    ...(lead.motivos || []).map((m) => `- ${m}`),
    '',
    '## Contexto local e concorrência',
    c ? `- ${c.total} concorrentes do mesmo segmento num raio de ${String(c.raioKm).replace('.', ',')} km; ${c.comSite} com site próprio.` : '- Concorrência não calculada (sem coordenadas).',
    ...(c?.exemplosComSite?.length ? [`- Concorrentes com site: ${c.exemplosComSite.join(', ')}. Pesquise-os rapidamente para criar algo claramente superior.`] : []),
    ...(c?.exemplos?.length && !c?.exemplosComSite?.length ? [`- Concorrentes próximos: ${c.exemplos.join(', ')}.`] : []),
    '',
    '## O que os clientes deste nicho procuram',
    `- Buscas típicas no Google: ${d.buscas.map((b) => `"${b}"`).join(', ')}. Use esses termos no título, na descrição e nos textos (SEO local).`,
    '- Seções indispensáveis:',
    ...d.essenciais.map((e) => `  - ${e}`),
    '- Argumentos que convertem:',
    ...d.argumentos.map((a) => `  - ${a}`),
    `- Cuidados: ${d.cuidados}`,
    '',
    '## Pesquisa na internet antes de criar',
    'Use a busca na web para levantar informações reais deste comércio:',
    `1. "${lead.nome}" ${lead.cidade || ''}`.trim(),
    `2. "${lead.nome}" instagram`,
    `3. "${lead.nome}" avaliações`,
    ...(lead.site ? [`4. O site atual: ${lead.site}`] : []),
    'Aproveite somente o que for confirmado: serviços, especialidades, tempo de mercado, nomes dos profissionais, tom de voz, cores e estilo da marca, elogios recorrentes. O que não for confirmado entra como texto de exemplo claramente editável. No fim, liste o que foi confirmado e a fonte.',
    '',
    '## Direção criativa',
    '- Crie um conceito visual próprio para este comércio, não um modelo genérico: paleta, tipografia e composição coerentes com o segmento, o bairro e a identidade encontrada na pesquisa.',
    `- Headline que una o principal benefício ao local (ex.: mencionar ${lead.bairro || lead.cidade || 'o bairro'}) e às características únicas listadas acima.`,
    '- Mobile em primeiro lugar: o dono vai abrir pelo WhatsApp no celular.',
    `- Botão de WhatsApp do próprio comércio em destaque${lead.whatsapp ? '' : ' (sem WhatsApp cadastrado: use o telefone)'}.`,
    '',
    '## Ângulo de venda',
    `- ${anguloDeVenda(lead)}`,
    '',
    '## Faixa de prévia',
    `- No topo: "Prévia gratuita criada por ${config.agenciaNome || '[minha marca]'} para a ${lead.nome}. Este ainda não é o site oficial."`,
    `- Botão "Quero este site" para ${config.agenciaWhatsapp ? `https://wa.me/${config.agenciaWhatsapp}` : '[meu WhatsApp]'} com a mensagem "Olá! Vi a prévia do site da ${lead.nome} e quero colocar no ar."`,
  ];
  return `${linhas.join('\n')}\n`;
}

/** Junta vários prompts em um único pedido (para criar várias prévias de uma vez). */
export function promptEmLote(leads, config = {}) {
  const cabecalho = [
    `# Lote de ${leads.length} prévias personalizadas`,
    '',
    'Crie uma prévia exclusiva para cada comércio abaixo, seguindo as instruções individuais e o CLAUDE.md. Faça um commit por prévia ou um commit único ao final, rode a verificação de cada arquivo, faça push e me devolva uma tabela com: comércio, link e mensagem de WhatsApp sugerida.',
    '',
  ].join('\n');
  return cabecalho + leads.map((l, i) => `\n---\n\n<!-- ${i + 1} de ${leads.length} -->\n${promptDaPrevia(l, config)}`).join('');
}

/** Mensagem para o cliente logo após o pagamento, pedindo tudo o que o site final precisa. */
export function mensagemOnboarding(lead, config = {}) {
  const primeiro = config.agenciaNome ? `Aqui é ${config.agenciaNome}. ` : '';
  return [
    `Olá! ${primeiro}Obrigado pela confiança: vamos colocar o site da ${lead.nome} no ar. Para começar, preciso de algumas informações:`,
    '',
    '*1. Domínio (endereço do site)*',
    '• Duas opções de nome, por exemplo nomedaempresa.com.br',
    '• Nome completo ou razão social e CPF/CNPJ do titular (o domínio fica no seu nome, no Registro.br)',
    '• Se já tiver um domínio: onde ele está registrado',
    '',
    '*2. Contas (ficam no seu nome)*',
    '• O e-mail que será dono das contas do site (Google, Cloudflare e GitHub)',
    '• O e-mail que vai receber as mensagens do formulário',
    '',
    '*3. Identidade e conteúdo*',
    '• Logotipo (de preferência em PNG ou PDF)',
    '• Fotos reais: fachada, ambiente, equipe e trabalhos (pode mandar por aqui mesmo)',
    '• Lista de serviços que quer destacar e o que mais te diferencia',
    '• Nome e registro profissional do responsável técnico, se a sua área exigir',
    '• Convênios, formas de pagamento e área de atendimento',
    '',
    '*4. Presença online*',
    '• Link do Instagram, Facebook e do perfil no Google (Google Meu Negócio)',
    '',
    'Pode mandar aos poucos. Assim que eu tiver o domínio e as fotos, já começo. 😊',
  ].join('\n');
}

/** Prompt para transformar a prévia aprovada no site definitivo, depois do pagamento. */
export function promptSiteFinal(lead, config = {}) {
  const slugAtual = slugPrevia(lead);
  const pasta = `sites/${slugAtual}`;
  const previa = lead.linkPrevia || `${(config.baseSite || '').replace(/\/?$/, '/')}${caminhoPrevia(lead)}`;
  const d = demandasDoNicho(lead);
  const linhas = [
    `# Site final: ${lead.nome}`,
    '',
    `O cliente aprovou a prévia e pagou${lead.valor ? ` (valor combinado: R$ ${lead.valor})` : ''}. Construa o site definitivo, completo e pronto para publicar, a partir da prévia aprovada. Siga a seção "Sites finais" do CLAUDE.md.`,
    '',
    '## Ponto de partida',
    `- Prévia aprovada: ${previa}`,
    `- Arquivo da prévia: previas/${slugAtual}/index.html (se existir no repositório). O design, a paleta e os textos aprovados são a referência visual obrigatória.`,
    `- Modelo-base técnico: modelos/site-base (já traz SEO, LGPD, cookies, formulário, medição, CMS e documentação).`,
    '',
    '## Passo a passo',
    `1. Copie modelos/site-base para ${pasta}.`,
    `2. Preencha ${pasta}/src/_data/site.json com os dados abaixo e com o que o cliente enviou (anotações). Deixe vazio o que ainda não existe (chaves, IDs, razão social): nunca invente.`,
    `3. Porte o design da prévia para ${pasta}/src/index.njk e ${pasta}/src/assets/css/site.css, mantendo a estrutura de dados do site.json, o formulário, o banner de cookies e os eventos de conversão. Remova a faixa de prévia.`,
    '4. Inclua as seções exigidas pelo nicho (abaixo), perguntas frequentes reais do segmento e textos com os termos de busca local.',
    `5. Gere as imagens: \`node scripts/gerar-imagens.mjs ${pasta}\`.`,
    `6. Compile: \`cd ${pasta} && npm install && npm run build\`.`,
    `7. Verifique: \`node scripts/verificar-site.mjs ${pasta}\`. Zero falhas; avisos só podem restar para dados que dependem do cliente.`,
    '8. Revise com o Playwright em 390 px e 1440 px: sem rolagem horizontal, contraste AA, foco visível, botões tocáveis, banner de cookies funcionando.',
    `9. Remova node_modules e _site, faça commit com a mensagem \`Site final: ${lead.nome}\` e push.`,
    '',
    '## Dados do comércio',
    `- Nome: ${lead.nome}`,
    `- Segmento: ${lead.categoria}${d.nicho ? ` (${d.nicho.rotulo})` : ''}`,
    `- Endereço: ${lead.endereco || [lead.bairro, lead.cidade, lead.uf].filter(Boolean).join(', ')}`,
    lead.cep ? `- CEP: ${lead.cep}` : '',
    `- Telefone: ${lead.telefone || 'não informado'}`,
    lead.whatsapp ? `- WhatsApp: ${lead.whatsapp}` : '- WhatsApp: não informado (confirmar com o cliente)',
    lead.email ? `- E-mail: ${lead.email}` : '',
    lead.instagram ? `- Instagram: ${lead.instagram}` : '',
    lead.facebook ? `- Facebook: ${lead.facebook}` : '',
    lead.horario ? `- Horário (formato OpenStreetMap, também serve para o schema): ${lead.horario}` : '',
    lead.lat != null ? `- Coordenadas: ${lead.lat}, ${lead.lon}` : '',
    ...(lead.caracteristicas?.length ? [`- Características: ${lead.caracteristicas.join('; ')}`] : []),
    '',
    '## Exigências do nicho',
    ...d.essenciais.map((e) => `- ${e}`),
    `- Cuidados: ${d.cuidados}`,
    `- Termos de busca local para título, descrição e textos: ${d.buscas.join(', ')}`,
    '',
    '## Anotações da negociação e material do cliente',
    lead.notas ? lead.notas : '(sem anotações: liste no fim o que falta pedir ao cliente)',
    '',
    '## Entregáveis da sua resposta',
    `- Caminho do projeto (${pasta}) e resultado da verificação.`,
    '- Lista do que ainda depende do cliente (domínio, chave do formulário, IDs de medição, fotos, razão social).',
    `- Roteiro de publicação personalizado a partir de ${pasta}/PUBLICACAO.md, já com o nome do domínio, se informado.`,
    '- Dados para o termo de entrega: lista de serviços configurados e onde cada um fica.',
  ];
  return linhas.filter((l) => l !== '').join('\n').replace(/\n(##)/g, '\n\n$1') + '\n';
}
