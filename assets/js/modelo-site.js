// Gerador de sites a partir dos dados de um lead.
// Usado para: prévia gratuita (previa.html), download do site pronto e briefing para Lovable/Claude.

import { encontrarNicho } from './nichos.js';

// ------------------------------------------------------------------ conteúdo por segmento

const ICONES = {
  saude: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  beleza: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  fitness: '<path d="M6.5 6.5h11M6.5 17.5h11M3 9v6M21 9v6M6 5v14M18 5v14"/>',
  pet: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  alimentacao: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  automotivo: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
  servicos: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  varejo: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  educacao: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  hospedagem: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
};

const BASE = {
  'Saúde': {
    icone: 'saude', cores: ['#0e7490', '#14b8a6'], cta: 'Agendar consulta',
    titulo: 'Cuidado de verdade, perto de você',
    subtitulo: 'Atendimento humanizado, estrutura moderna e profissionais qualificados em {cidade}.',
    servicos: [['Consultas e avaliações', 'Atendimento individual com diagnóstico claro e plano de cuidado.'], ['Exames e acompanhamento', 'Acompanhamento próximo em cada etapa do tratamento.'], ['Atendimento humanizado', 'Escuta atenta, explicações simples e respeito ao seu tempo.'], ['Estrutura moderna', 'Equipamentos atualizados e ambiente confortável.'], ['Agendamento fácil', 'Marque pelo WhatsApp em poucos minutos.'], ['Convênios e particular', 'Consulte as formas de atendimento e pagamento.']],
    diferenciais: [['Profissionais qualificados', 'Equipe em constante atualização.'], ['Pontualidade', 'Respeito ao horário marcado.'], ['Localização acessível', 'Fácil de chegar, no {bairro}.']],
  },
  'Pet': {
    icone: 'pet', cores: ['#c2410c', '#f59e0b'], cta: 'Agendar horário',
    titulo: 'Seu pet tratado como da família',
    subtitulo: 'Carinho, segurança e profissionais apaixonados por animais em {cidade}.',
    servicos: [['Banho e tosa', 'Produtos de qualidade e muito cuidado em cada detalhe.'], ['Consultas', 'Avaliação completa da saúde do seu pet.'], ['Vacinas', 'Calendário de vacinação em dia.'], ['Produtos e rações', 'As melhores marcas para cada fase da vida.'], ['Leva e traz', 'Consulte disponibilidade na sua região.'], ['Atendimento pelo WhatsApp', 'Tire dúvidas e agende rapidamente.']],
    diferenciais: [['Ambiente seguro', 'Espaço limpo e preparado.'], ['Equipe carinhosa', 'Paciência e respeito ao bichinho.'], ['Perto de você', 'Atendemos no {bairro} e região.']],
  },
  'Beleza': {
    icone: 'beleza', cores: ['#be185d', '#f472b6'], cta: 'Agendar horário',
    titulo: 'Realce o que você tem de mais bonito',
    subtitulo: 'Profissionais experientes, técnicas atuais e um ambiente pensado para o seu bem-estar em {cidade}.',
    servicos: [['Cortes e penteados', 'Estilo que combina com você.'], ['Coloração e tratamentos', 'Cuidado profundo para cabelos saudáveis.'], ['Estética facial', 'Limpeza de pele e protocolos personalizados.'], ['Mãos e pés', 'Acabamento impecável e higiene garantida.'], ['Dia da noiva', 'Pacotes especiais para datas importantes.'], ['Agendamento online', 'Reserve seu horário pelo WhatsApp.']],
    diferenciais: [['Produtos premium', 'Marcas reconhecidas.'], ['Biossegurança', 'Materiais esterilizados.'], ['Ambiente acolhedor', 'Conforto no {bairro}.']],
  },
  'Alimentação': {
    icone: 'alimentacao', cores: ['#b91c1c', '#f97316'], cta: 'Fazer pedido',
    titulo: 'Sabor que faz voltar',
    subtitulo: 'Ingredientes selecionados, preparo caprichado e atendimento que encanta em {cidade}.',
    servicos: [['Cardápio completo', 'Opções para todos os gostos.'], ['Delivery', 'Peça pelo WhatsApp e receba em casa.'], ['Retirada no local', 'Peça antes e retire sem fila.'], ['Ingredientes frescos', 'Qualidade em cada prato.'], ['Encomendas e eventos', 'Atendemos festas e grupos.'], ['Ambiente agradável', 'Venha conhecer pessoalmente.']],
    diferenciais: [['Feito na hora', 'Preparado quando você pede.'], ['Preço justo', 'Qualidade que cabe no bolso.'], ['Tradição', 'Referência no {bairro}.']],
  },
  'Automotivo': {
    icone: 'automotivo', cores: ['#1e3a8a', '#3b82f6'], cta: 'Solicitar orçamento',
    titulo: 'Seu veículo em mãos de confiança',
    subtitulo: 'Diagnóstico preciso, serviço transparente e garantia no que fazemos em {cidade}.',
    servicos: [['Revisão completa', 'Checklist detalhado do seu veículo.'], ['Mecânica geral', 'Motor, suspensão, freios e embreagem.'], ['Elétrica e injeção', 'Diagnóstico com equipamento moderno.'], ['Troca de óleo e filtros', 'Rápido e com produtos de qualidade.'], ['Orçamento sem compromisso', 'Você aprova antes de qualquer serviço.'], ['Atendimento pelo WhatsApp', 'Envie fotos e receba uma estimativa.']],
    diferenciais: [['Transparência', 'Peças trocadas devolvidas.'], ['Garantia', 'Serviço garantido.'], ['Agilidade', 'Prazo combinado e cumprido.']],
  },
  'Serviços': {
    icone: 'servicos', cores: ['#1f2937', '#0ea5e9'], cta: 'Falar com especialista',
    titulo: 'Soluções profissionais para você e sua empresa',
    subtitulo: 'Atendimento próximo, experiência comprovada e resultados concretos em {cidade}.',
    servicos: [['Atendimento personalizado', 'Cada caso analisado com atenção.'], ['Consultoria', 'Orientação clara para decisões seguras.'], ['Acompanhamento', 'Você informado em cada etapa.'], ['Atendimento a empresas', 'Soluções sob medida para negócios.'], ['Atendimento remoto', 'Reuniões online quando preferir.'], ['Primeiro contato rápido', 'Fale conosco pelo WhatsApp.']],
    diferenciais: [['Experiência', 'Anos de atuação no mercado.'], ['Ética e sigilo', 'Seus dados protegidos.'], ['Proximidade', 'Escritório no {bairro}.']],
  },
  'Varejo': {
    icone: 'varejo', cores: ['#4338ca', '#a855f7'], cta: 'Ver produtos',
    titulo: 'Tudo o que você procura, com preço justo',
    subtitulo: 'Variedade, qualidade e atendimento de quem entende do assunto em {cidade}.',
    servicos: [['Variedade de produtos', 'Grandes marcas e novidades toda semana.'], ['Atendimento especializado', 'Ajudamos você a escolher.'], ['Formas de pagamento', 'Pix, cartão e parcelamento.'], ['Entrega', 'Consulte entrega na sua região.'], ['Encomendas', 'Não achou? Nós buscamos para você.'], ['Pedidos pelo WhatsApp', 'Compre sem sair de casa.']],
    diferenciais: [['Preço justo', 'Ofertas reais.'], ['Confiança', 'Loja física no {bairro}.'], ['Pós-venda', 'Suporte depois da compra.']],
  },
  'Educação': {
    icone: 'educacao', cores: ['#065f46', '#22c55e'], cta: 'Agendar visita',
    titulo: 'Aprender com quem se importa',
    subtitulo: 'Metodologia moderna, professores dedicados e acompanhamento próximo em {cidade}.',
    servicos: [['Turmas regulares', 'Grupos reduzidos para mais atenção.'], ['Aulas particulares', 'Ritmo e conteúdo personalizados.'], ['Material didático', 'Conteúdo atualizado e prático.'], ['Acompanhamento', 'Relatórios de evolução.'], ['Aula experimental', 'Conheça antes de se matricular.'], ['Matrículas abertas', 'Fale conosco pelo WhatsApp.']],
    diferenciais: [['Professores qualificados', 'Experiência e didática.'], ['Estrutura completa', 'Ambiente pensado para aprender.'], ['Localização', 'No coração do {bairro}.']],
  },
  'Hospedagem': {
    icone: 'hospedagem', cores: ['#0f766e', '#eab308'], cta: 'Reservar agora',
    titulo: 'Conforto e hospitalidade do jeito certo',
    subtitulo: 'Quartos aconchegantes, ótima localização e atendimento acolhedor em {cidade}.',
    servicos: [['Quartos confortáveis', 'Camas de qualidade e ambiente limpo.'], ['Café da manhã', 'Comece o dia bem.'], ['Wi-Fi gratuito', 'Conexão em todo o espaço.'], ['Estacionamento', 'Consulte disponibilidade.'], ['Reserva direta', 'Melhor tarifa reservando conosco.'], ['Atendimento 24 horas', 'Estamos sempre por perto.']],
    diferenciais: [['Localização', 'Perto de tudo no {bairro}.'], ['Custo-benefício', 'Qualidade por um preço justo.'], ['Hospitalidade', 'Você se sente em casa.']],
  },
};

const ESPECIFICOS = {
  dentista: {
    titulo: 'Seu sorriso merece o melhor cuidado', cta: 'Agendar avaliação',
    subtitulo: 'Odontologia moderna, sem dor e com atendimento humanizado em {cidade}.',
    servicos: [['Clínica geral', 'Limpeza, restaurações e prevenção.'], ['Ortodontia', 'Aparelhos fixos e alinhadores.'], ['Implantes', 'Reabilitação com segurança e naturalidade.'], ['Clareamento', 'Sorriso mais branco com acompanhamento.'], ['Odontopediatria', 'Cuidado especial para os pequenos.'], ['Urgências', 'Atendimento rápido quando você precisar.']],
  },
  estetica: {
    titulo: 'Autoestima e bem-estar em cada detalhe', cta: 'Agendar avaliação',
    servicos: [['Limpeza de pele', 'Pele renovada e saudável.'], ['Harmonização facial', 'Resultados naturais e seguros.'], ['Depilação', 'Técnicas modernas e confortáveis.'], ['Tratamentos corporais', 'Protocolos personalizados.'], ['Massagens', 'Relaxamento e drenagem.'], ['Avaliação gratuita', 'Descubra o melhor tratamento para você.']],
  },
  barbearia: {
    titulo: 'Estilo, precisão e aquele papo bom', cores: ['#111827', '#d97706'], cta: 'Agendar corte',
    servicos: [['Corte masculino', 'Do clássico ao moderno.'], ['Barba', 'Toalha quente e navalha.'], ['Corte e barba', 'O combo completo.'], ['Pigmentação', 'Acabamento impecável.'], ['Sobrancelha', 'Detalhe que faz diferença.'], ['Agendamento rápido', 'Sem fila, pelo WhatsApp.']],
  },
  academia: {
    icone: 'fitness', cores: ['#111827', '#22c55e'], cta: 'Agendar aula experimental',
    titulo: 'Sua melhor versão começa aqui',
    subtitulo: 'Equipamentos modernos, professores qualificados e planos que cabem na sua rotina em {cidade}.',
    servicos: [['Musculação', 'Treinos com acompanhamento.'], ['Aulas coletivas', 'Energia e motivação em grupo.'], ['Funcional', 'Condicionamento para o dia a dia.'], ['Avaliação física', 'Metas claras e mensuráveis.'], ['Personal trainer', 'Atenção individual.'], ['Planos flexíveis', 'Mensal, trimestral ou anual.']],
    diferenciais: [['Horário estendido', 'Treine quando puder.'], ['Equipe qualificada', 'Profissionais de educação física.'], ['Perto de você', 'No {bairro}.']],
  },
  advogado: {
    titulo: 'Seus direitos defendidos com seriedade', cores: ['#1e293b', '#b45309'], cta: 'Agendar consulta',
    servicos: [['Direito civil', 'Contratos, indenizações e família.'], ['Direito trabalhista', 'Orientação para empregados e empresas.'], ['Direito do consumidor', 'Defesa contra abusos.'], ['Direito empresarial', 'Segurança jurídica para o seu negócio.'], ['Previdenciário', 'Aposentadorias e benefícios.'], ['Consulta inicial', 'Entenda seu caso com clareza.']],
  },
  contabilidade: {
    titulo: 'Contabilidade que ajuda sua empresa a crescer', cores: ['#0c4a6e', '#10b981'], cta: 'Falar com um contador',
    servicos: [['Abertura de empresas', 'Do CNPJ ao alvará.'], ['MEI e Simples Nacional', 'Enquadramento correto e econômico.'], ['Folha de pagamento', 'Rotinas trabalhistas em dia.'], ['Imposto de renda', 'Pessoa física e jurídica.'], ['Planejamento tributário', 'Pague menos, dentro da lei.'], ['Atendimento digital', 'Tudo resolvido pelo WhatsApp.']],
  },
  imobiliaria: {
    titulo: 'O imóvel certo para o seu momento', cores: ['#14532d', '#0ea5e9'], cta: 'Falar com um corretor',
    servicos: [['Venda de imóveis', 'Casas, apartamentos e terrenos.'], ['Locação', 'Processo simples e seguro.'], ['Avaliação', 'Saiba quanto vale seu imóvel.'], ['Administração', 'Cuidamos do seu imóvel alugado.'], ['Financiamento', 'Orientação do início ao fim.'], ['Atendimento personalizado', 'Imóveis selecionados para você.']],
  },
  oficina: {},
  pizzaria: {
    titulo: 'A pizza que a sua noite merece', cta: 'Pedir agora',
    servicos: [['Pizzas tradicionais', 'Os sabores clássicos de sempre.'], ['Pizzas especiais', 'Combinações da casa.'], ['Pizzas doces', 'Para fechar com chave de ouro.'], ['Delivery', 'Quentinha na sua casa.'], ['Bebidas', 'Refrigerantes, sucos e mais.'], ['Pedidos pelo WhatsApp', 'Rápido e sem complicação.']],
  },
  petshop: {}, veterinario: { titulo: 'Saúde e carinho para o seu pet', cta: 'Agendar consulta' },
};

const GRUPO_PARA_BASE = { 'Saúde': 'Saúde', Pet: 'Pet', Beleza: 'Beleza', 'Alimentação': 'Alimentação', Automotivo: 'Automotivo', 'Serviços': 'Serviços', Varejo: 'Varejo', 'Educação': 'Educação', Hospedagem: 'Hospedagem' };

/** Escolhe o conteúdo (tema) adequado ao nicho do lead. */
export function temaDoLead(dados) {
  const nicho = (dados.ni && encontrarNicho(dados.ni)) || encontrarNicho(dados.nicho || '') || encontrarNicho(dados.c || dados.categoria || '');
  const base = BASE[GRUPO_PARA_BASE[nicho?.grupo]] || BASE['Serviços'];
  const tema = { ...base, ...(nicho ? ESPECIFICOS[nicho.id] || {} : {}) };
  return { ...tema, nichoId: nicho?.id || '', nichoRotulo: nicho?.rotulo || dados.c || '' };
}

// ------------------------------------------------------------------ codificação dos dados no link

/** Converte um lead nos campos curtos usados pela prévia. */
export function dadosDaPrevia(lead) {
  const nicho = encontrarNicho(lead.nicho || '') || encontrarNicho(lead.categoria || '');
  const d = {
    n: lead.nome, c: lead.categoria, ni: nicho?.id, t: lead.telefone, w: lead.whatsapp, e: lead.endereco,
    b: lead.bairro, ci: lead.cidade, uf: lead.uf, h: lead.horario, ig: lead.instagram, em: lead.email,
    la: lead.lat != null ? Number(Number(lead.lat).toFixed(5)) : undefined,
    lo: lead.lon != null ? Number(Number(lead.lon).toFixed(5)) : undefined,
  };
  for (const k of Object.keys(d)) if (d[k] === '' || d[k] == null) delete d[k];
  return d;
}

export function codificar(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodificar(txt) {
  const b64 = txt.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

/** Monta o link público da prévia. "base" é o endereço do site (ex.: https://usuario.github.io/repo/). */
export function linkDaPrevia(lead, base, agencia = {}) {
  const d = dadosDaPrevia(lead);
  if (agencia.nome) d.an = agencia.nome;
  if (agencia.whatsapp) d.aw = agencia.whatsapp;
  return `${new URL('previa.html', base).href}#d=${codificar(d)}`;
}

// ------------------------------------------------------------------ renderização

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function preencher(txt, d) {
  return String(txt)
    .replace(/\{cidade\}/g, d.ci || 'sua cidade')
    .replace(/\{bairro\}/g, d.b || d.ci || 'seu bairro');
}

function horarioLegivel(h) {
  if (!h) return '';
  const dias = { Mo: 'Seg', Tu: 'Ter', We: 'Qua', Th: 'Qui', Fr: 'Sex', Sa: 'Sáb', Su: 'Dom', PH: 'Feriados' };
  return h.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (m) => dias[m]).replace(/\boff\b/g, 'fechado').replace(/24\/7/, 'Todos os dias, 24 horas')
    .replace(/(\p{L}{3})-(\p{L}{3})/gu, '$1 a $2').split(/\s*;\s*/).join('<br>');
}

function iniciais(nome) {
  return String(nome || '?').split(/\s+/).filter((p) => p.length > 2 || /^[A-Z]/.test(p)).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

function icone(nome, tam = 24) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ICONES.servicos}</svg>`;
}

const ZAP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91A9.9 9.9 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.42 1.3-1.96 1.35-.5.05-.98.23-3.3-.69-2.8-1.1-4.56-3.97-4.7-4.15-.14-.18-1.12-1.49-1.12-2.85s.71-2.02.97-2.3c.25-.27.55-.34.73-.34l.53.01c.17 0 .4-.06.62.48.24.56.8 1.94.86 2.08.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.28.14.44.11.6-.07.16-.18.69-.8.88-1.08.18-.27.37-.23.62-.14.25.09 1.6.76 1.88.9.27.13.45.2.52.31.06.12.06.66-.17 1.3Z"/></svg>';

export const CSS_SITE = `
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#0f172a;background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.env{width:min(1120px,100% - 32px);margin-inline:auto}
.aviso-previa{background:#0b1424;color:#e2e8f0;font-size:14px;padding:10px 0}
.aviso-previa .env{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.aviso-previa a{background:#22c55e;color:#04140d;font-weight:700;padding:8px 14px;border-radius:8px;white-space:nowrap}
.topo{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid #e5e7eb}
.topo .env{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px}
.marca{display:flex;align-items:center;gap:12px;font-weight:800;font-size:18px;letter-spacing:-.02em}
.monograma{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;color:#fff;font-weight:800;background:linear-gradient(135deg,var(--c1),var(--c2))}
.menu{display:flex;gap:26px;font-weight:600;font-size:15px;color:#475569}
.menu a:hover{color:var(--c1)}
.btn{display:inline-flex;align-items:center;gap:8px;justify-content:center;min-height:48px;padding:0 22px;border-radius:12px;font-weight:700;font-size:15.5px;border:2px solid transparent;cursor:pointer;transition:transform .1s,filter .15s}
.btn:hover{filter:brightness(1.07);transform:translateY(-1px)}
.btn-p{background:var(--c1);color:#fff}
.btn-z{background:#1fa855;color:#fff}
.btn-c{background:#fff;color:#0f172a;border-color:#e2e8f0}
.heroi{position:relative;overflow:hidden;padding:88px 0 96px;background:radial-gradient(800px 400px at 90% 0%,color-mix(in srgb,var(--c2) 28%,transparent),transparent 70%),radial-gradient(600px 400px at 0% 100%,color-mix(in srgb,var(--c1) 14%,transparent),transparent 70%),#f8fafc}
.heroi .env{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center}
.etiqueta{display:inline-flex;gap:8px;align-items:center;background:#fff;border:1px solid #e2e8f0;padding:6px 14px;border-radius:999px;font-size:13.5px;font-weight:600;color:var(--c1)}
.heroi h1{font-size:clamp(36px,5vw,58px);line-height:1.05;letter-spacing:-.035em;margin:18px 0 16px}
.heroi p.sub{font-size:19px;color:#475569;max-width:560px;margin:0 0 28px}
.acoes{display:flex;gap:12px;flex-wrap:wrap}
.cartao-heroi{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:28px;box-shadow:0 30px 60px -30px rgba(15,23,42,.35)}
.cartao-heroi .ic{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));margin-bottom:18px}
.cartao-heroi h3{margin:0 0 4px;font-size:21px;letter-spacing:-.02em}
.cartao-heroi .linha{display:flex;gap:10px;padding:12px 0;border-top:1px solid #f1f5f9;font-size:14.5px;color:#334155}
.cartao-heroi .linha b{min-width:84px;color:#0f172a}
.secao{padding:88px 0}
.secao.cinza{background:#f8fafc}
.cab{max-width:680px;margin:0 auto 48px;text-align:center}
.cab span{color:var(--c1);font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase}
.cab h2{font-size:clamp(28px,3.4vw,40px);letter-spacing:-.03em;margin:10px 0 10px;line-height:1.15}
.cab p{color:#64748b;font-size:17px;margin:0}
.grade{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.servico{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:26px;transition:box-shadow .2s,transform .2s}
.servico:hover{box-shadow:0 20px 40px -24px rgba(15,23,42,.35);transform:translateY(-2px)}
.servico .ic{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--c1) 10%,#fff);color:var(--c1);margin-bottom:16px}
.servico h3{margin:0 0 6px;font-size:18px;letter-spacing:-.01em}
.servico p{margin:0;color:#64748b;font-size:15px}
.sobre{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.sobre h2{font-size:clamp(28px,3.2vw,38px);letter-spacing:-.03em;line-height:1.15;margin:10px 0 16px}
.sobre p{color:#475569;font-size:17px}
.difs{display:flex;flex-direction:column;gap:14px}
.dif{display:flex;gap:16px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px}
.dif .num{flex:none;width:40px;height:40px;border-radius:10px;display:grid;place-items:center;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2))}
.dif h3{margin:0 0 2px;font-size:17px}
.dif p{margin:0;color:#64748b;font-size:15px}
.faixa{background:linear-gradient(135deg,var(--c1),var(--c2));color:#fff;border-radius:24px;padding:56px 32px;text-align:center}
.faixa h2{font-size:clamp(26px,3.2vw,36px);letter-spacing:-.03em;margin:0 0 10px}
.faixa p{opacity:.92;margin:0 0 26px;font-size:17px}
.faixa .btn-c{border-color:#fff}
.contato{display:grid;grid-template-columns:1fr 1.2fr;gap:32px;align-items:stretch}
.info{display:flex;flex-direction:column;gap:14px}
.item{display:flex;gap:14px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px}
.item b{display:block;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.item span,.item a{font-size:16px;font-weight:600;color:#0f172a}
.mapa{border:0;width:100%;min-height:380px;height:100%;border-radius:18px;background:#e2e8f0}
.rodape{padding:32px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:14px}
.rodape .env{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
.zap-flutuante{position:fixed;right:20px;bottom:20px;width:60px;height:60px;border-radius:50%;background:#1fa855;color:#fff;display:grid;place-items:center;box-shadow:0 12px 30px -8px rgba(31,168,85,.6);z-index:20}
.zap-flutuante svg{width:30px;height:30px}
@media (max-width:900px){.heroi .env,.sobre,.contato{grid-template-columns:1fr}.grade{grid-template-columns:1fr 1fr}.menu{display:none}.heroi{padding:56px 0 64px}}
@media (max-width:600px){.grade{grid-template-columns:1fr}.secao{padding:64px 0}.topo .btn span{display:none}.topo .btn{padding:0 14px}.acoes .btn{flex:1}}
`;

/**
 * Gera o conteúdo do site (sem <html>/<head>) e a cor do tema.
 * @param {object} d dados curtos (ver dadosDaPrevia)
 * @param {{ previa?: boolean, linkPrevia?: string }} opcoes
 */
export function renderizarCorpo(d, opcoes = {}) {
  const tema = temaDoLead(d);
  const [c1, c2] = tema.cores;
  const nome = esc(d.n || 'Sua empresa');
  const msgZap = encodeURIComponent(`Olá! Vim pelo site da ${d.n || 'empresa'} e gostaria de mais informações.`);
  const linkZap = d.w ? `https://wa.me/${esc(d.w)}?text=${msgZap}` : '';
  const telLink = d.t ? `tel:+55${String(d.t).replace(/\D/g, '')}` : '';
  const ctaPrincipal = linkZap
    ? `<a class="btn btn-z" href="${linkZap}" target="_blank" rel="noopener">${ZAP}${esc(tema.cta)}</a>`
    : telLink ? `<a class="btn btn-p" href="${telLink}">${esc(tema.cta)}</a>` : `<a class="btn btn-p" href="#contato">${esc(tema.cta)}</a>`;
  const comoChegar = d.la && d.lo
    ? `https://www.google.com/maps/dir/?api=1&destination=${d.la},${d.lo}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.n, d.e || d.ci].filter(Boolean).join(', '))}`;
  const local = [d.b, d.ci && d.uf ? `${d.ci}/${d.uf}` : d.ci].filter(Boolean).join(', ');
  const horario = horarioLegivel(d.h);
  const mapa = d.la && d.lo
    ? `<iframe class="mapa" title="Mapa" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${d.lo - 0.006},${d.la - 0.004},${d.lo + 0.006},${d.la + 0.004}&layer=mapnik&marker=${d.la},${d.lo}"></iframe>`
    : `<div class="mapa" style="display:grid;place-items:center;color:#64748b">${esc(d.e || local || 'Endereço sob consulta')}</div>`;

  const msgAgencia = encodeURIComponent(`Olá! Vi a prévia do site da ${d.n || 'minha empresa'} e quero saber como colocar no ar.`);
  const avisoPrevia = opcoes.previa ? `
  <div class="aviso-previa"><div class="env">
    <span>✨ <strong>Prévia gratuita</strong> criada${d.an ? ` por ${esc(d.an)}` : ''} para a ${nome}. Este ainda não é o site oficial da empresa.</span>
    ${d.aw ? `<a href="https://wa.me/${esc(d.aw)}?text=${msgAgencia}" target="_blank" rel="noopener">Quero este site</a>` : ''}
  </div></div>` : '';

  const html = `${avisoPrevia}
  <header class="topo"><div class="env">
    <a class="marca" href="#inicio"><span class="monograma">${esc(iniciais(d.n))}</span>${nome}</a>
    <nav class="menu"><a href="#servicos">Serviços</a><a href="#sobre">Sobre</a><a href="#contato">Contato</a></nav>
    ${linkZap ? `<a class="btn btn-z" href="${linkZap}" target="_blank" rel="noopener">${ZAP}<span>WhatsApp</span></a>` : telLink ? `<a class="btn btn-p" href="${telLink}"><span>Ligar agora</span></a>` : ''}
  </div></header>

  <main id="inicio">
    <section class="heroi"><div class="env">
      <div>
        <span class="etiqueta">${esc(d.c || tema.nichoRotulo || 'Atendimento')}${local ? ` · ${esc(local)}` : ''}</span>
        <h1>${esc(preencher(tema.titulo, d))}</h1>
        <p class="sub">${esc(preencher(tema.subtitulo, d))}</p>
        <div class="acoes">${ctaPrincipal}<a class="btn btn-c" href="${comoChegar}" target="_blank" rel="noopener">Como chegar</a></div>
      </div>
      <div class="cartao-heroi">
        <div class="ic">${icone(tema.icone, 32)}</div>
        <h3>${nome}</h3>
        <p style="margin:0 0 10px;color:#64748b">${esc(d.c || '')}</p>
        ${d.t ? `<div class="linha"><b>Telefone</b><a href="${telLink}">${esc(d.t)}</a></div>` : ''}
        ${horario ? `<div class="linha"><b>Horário</b><span>${horario}</span></div>` : ''}
        ${d.e || local ? `<div class="linha"><b>Endereço</b><span>${esc(d.e || local)}</span></div>` : ''}
      </div>
    </div></section>

    <section class="secao" id="servicos"><div class="env">
      <div class="cab"><span>O que fazemos</span><h2>Serviços pensados para você</h2><p>Conheça as principais soluções da ${nome}.</p></div>
      <div class="grade">${tema.servicos.map(([t, p]) => `<article class="servico"><div class="ic">${icone(tema.icone)}</div><h3>${esc(t)}</h3><p>${esc(p)}</p></article>`).join('')}</div>
    </div></section>

    <section class="secao cinza" id="sobre"><div class="env sobre">
      <div>
        <span style="color:var(--c1);font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase">Sobre nós</span>
        <h2>Por que escolher a ${nome}?</h2>
        <p>Atendemos ${esc(d.ci || 'a região')} com dedicação, qualidade e respeito a cada cliente. Nosso compromisso é oferecer uma experiência simples, transparente e com resultado.</p>
        <div class="acoes" style="margin-top:22px">${ctaPrincipal}</div>
      </div>
      <div class="difs">${tema.diferenciais.map(([t, p], i) => `<div class="dif"><span class="num">${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(preencher(p, d))}</p></div></div>`).join('')}</div>
    </div></section>

    <section class="secao"><div class="env">
      <div class="faixa">
        <h2>Pronto para ser atendido pela ${nome}?</h2>
        <p>Fale com a gente agora mesmo. Resposta rápida pelo WhatsApp.</p>
        <div class="acoes" style="justify-content:center">${linkZap ? `<a class="btn btn-c" href="${linkZap}" target="_blank" rel="noopener">${ZAP}Chamar no WhatsApp</a>` : telLink ? `<a class="btn btn-c" href="${telLink}">Ligar agora</a>` : ''}</div>
      </div>
    </div></section>

    <section class="secao cinza" id="contato"><div class="env">
      <div class="cab"><span>Contato</span><h2>Venha nos visitar</h2></div>
      <div class="contato">
        <div class="info">
          ${d.w ? `<div class="item"><div><b>WhatsApp</b><a href="${linkZap}" target="_blank" rel="noopener">${esc(d.t || d.w)}</a></div></div>` : ''}
          ${d.t ? `<div class="item"><div><b>Telefone</b><a href="${telLink}">${esc(d.t)}</a></div></div>` : ''}
          ${d.em ? `<div class="item"><div><b>E-mail</b><a href="mailto:${esc(d.em)}">${esc(d.em)}</a></div></div>` : ''}
          ${d.e || local ? `<div class="item"><div><b>Endereço</b><span>${esc(d.e || local)}</span></div></div>` : ''}
          ${horario ? `<div class="item"><div><b>Horário de atendimento</b><span>${horario}</span></div></div>` : ''}
          ${d.ig ? `<div class="item"><div><b>Instagram</b><a href="${esc(d.ig)}" target="_blank" rel="noopener">${esc(d.ig.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, ''))}</a></div></div>` : ''}
        </div>
        ${mapa}
      </div>
    </div></section>
  </main>

  <footer class="rodape"><div class="env">
    <span>© ${new Date().getFullYear()} ${nome}. Todos os direitos reservados.</span>
    <span>${esc(local)}</span>
  </div></footer>
  ${linkZap ? `<a class="zap-flutuante" href="${linkZap}" target="_blank" rel="noopener" aria-label="WhatsApp">${ZAP}</a>` : ''}`;

  return { html, c1, c2, tema };
}

/** Documento HTML completo e independente, pronto para publicar (sem aviso de prévia). */
export function documentoCompleto(d) {
  const { html, c1, c2, tema } = renderizarCorpo(d, { previa: false });
  const descricao = `${preencher(tema.subtitulo, d)}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.n)}${d.ci ? ` | ${esc(d.c || '')} em ${esc(d.ci)}` : ''}</title>
<meta name="description" content="${esc(descricao)}">
<meta property="og:title" content="${esc(d.n)}">
<meta property="og:description" content="${esc(descricao)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>:root{--c1:${c1};--c2:${c2}}${CSS_SITE}</style>
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: d.n, telephone: d.t || undefined, email: d.em || undefined,
    address: d.e ? { '@type': 'PostalAddress', streetAddress: d.e, addressLocality: d.ci, addressRegion: d.uf, addressCountry: 'BR' } : undefined,
    geo: d.la ? { '@type': 'GeoCoordinates', latitude: d.la, longitude: d.lo } : undefined,
  }).replace(/</g, '\\u003c')}</script>
</head>
<body>
${html}
</body>
</html>
`;
}

/** Briefing detalhado para criar a versão completa em uma ferramenta de IA (Lovable, Claude). */
export function briefingDoSite(d, extras = {}) {
  const tema = temaDoLead(d);
  const linhas = [
    `Crie um site institucional profissional, moderno, responsivo e pronto para publicar, em português do Brasil, para a empresa abaixo.`,
    '',
    'DADOS DA EMPRESA',
    `Nome: ${d.n}`,
    `Segmento: ${d.c || tema.nichoRotulo}`,
    d.e ? `Endereço: ${d.e}` : `Cidade: ${[d.ci, d.uf].filter(Boolean).join('/')}`,
    d.t ? `Telefone: ${d.t}` : '',
    d.w ? `WhatsApp: +${d.w} (link https://wa.me/${d.w})` : '',
    d.em ? `E-mail: ${d.em}` : '',
    d.ig ? `Instagram: ${d.ig}` : '',
    d.h ? `Horário de funcionamento (formato OpenStreetMap): ${d.h}` : '',
    d.la ? `Coordenadas para o mapa: ${d.la}, ${d.lo}` : '',
    extras.observacoes ? `Observações do cliente: ${extras.observacoes}` : '',
    '',
    'ESTRUTURA',
    `1. Cabeçalho fixo com logotipo em texto, menu (Serviços, Sobre, Depoimentos, Contato) e botão de WhatsApp.`,
    `2. Seção principal com o título "${preencher(tema.titulo, d)}", subtítulo "${preencher(tema.subtitulo, d)}" e botões "${tema.cta}" (WhatsApp) e "Como chegar" (Google Maps).`,
    `3. Serviços em cartões: ${tema.servicos.map(([t]) => t).join(', ')}.`,
    `4. Sobre a empresa e diferenciais: ${tema.diferenciais.map(([t]) => t).join(', ')}.`,
    '5. Seção de depoimentos preparada para receber avaliações reais (deixe textos de exemplo claramente marcados para substituição).',
    '6. Perguntas frequentes do segmento.',
    '7. Contato com mapa incorporado, telefone, WhatsApp, endereço e horário.',
    '8. Rodapé com dados da empresa e botão flutuante de WhatsApp.',
    '',
    'REQUISITOS',
    `Paleta baseada em ${tema.cores.join(' e ')}, tipografia moderna, ótimo desempenho no celular, SEO local (título, descrição, dados estruturados LocalBusiness), acessibilidade e textos persuasivos sem exageros. Não invente prêmios, números ou depoimentos como se fossem reais.`,
  ];
  return linhas.filter((l) => l !== '').join('\n').replace(/\n(DADOS|ESTRUTURA|REQUISITOS)/g, '\n\n$1');
}

/** Link do Lovable com o briefing preenchido (a construção começa quando o usuário clica em enviar). */
export function linkLovable(d, extras) {
  return `https://lovable.dev/#prompt=${encodeURIComponent(briefingDoSite(d, extras))}`;
}
