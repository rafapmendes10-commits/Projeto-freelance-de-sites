// Termo de entrega: preenche com os dados do CRM, salva no próprio lead e gera o documento para impressão/PDF.

import { crm, config } from './armazenamento.js';
import { escaparHtml as h } from './util.js';

const id = decodeURIComponent(location.hash.slice(1));
const lead = crm.obter(id);
const form = document.getElementById('form');
const doc = document.getElementById('documento');
const campos = [...form.querySelectorAll('input, textarea')].filter((el) => el.id);

function valores() {
  const v = {};
  for (const el of campos) v[el.id] = el.type === 'checkbox' ? el.checked : el.value.trim();
  return v;
}

function preencherInicial() {
  const c = config.obter();
  const salvo = lead.entrega || {};
  const padrao = {
    clienteNome: lead.nome,
    valor: lead.valor || '',
    dataEntrega: new Date().toISOString().slice(0, 10),
    cidadeAssinatura: lead.cidade || '',
    agenciaNome: c.agenciaNome || '',
    agenciaDocumento: c.agenciaDocumento || '',
  };
  for (const el of campos) {
    const valor = el.id in salvo ? salvo[el.id] : padrao[el.id];
    if (valor === undefined) continue;
    if (el.type === 'checkbox') el.checked = Boolean(valor);
    else el.value = valor;
  }
}

const ou = (v, alternativa = '<span class="vazio">a preencher</span>') => (v ? h(v) : alternativa);
const dataBr = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '');

function fimSuporte(v) {
  if (!v.dataEntrega || !v.suporteDias) return '';
  const d = new Date(`${v.dataEntrega}T12:00:00`);
  d.setDate(d.getDate() + Number(v.suporteDias));
  return d.toLocaleDateString('pt-BR');
}

function renderizar() {
  const v = valores();
  const titular = ou(v.clienteEmail, 'conta do contratante');
  const acessos = [
    ['Domínio', `${ou(v.dominio)} no ${ou(v.registrador)}`, `Titular: ${ou(v.clienteNome)}${v.clienteDocumento ? `, ${h(v.clienteDocumento)}` : ''}`, v.eppEntregue ? 'Transferido com código EPP/Auth Code' : 'Registrado em nome do contratante'],
    ['Hospedagem e DNS', ou(v.hospedagem), titular, 'HTTPS ativo; zona DNS sob controle do contratante'],
    ['E-mail profissional', ou(v.emailProfissional, 'Não contratado'), titular, v.emailProfissional ? 'Encaminhamento configurado' : ''],
    ['Código-fonte', ou(v.repositorio), titular, v.backupEntregue ? 'Repositório transferido e backup .zip entregue' : 'Repositório transferido'],
    ['Painel de edição (CMS)', ou(v.cms), titular, 'Acesso de administrador do contratante'],
    ['Formulário de contato', ou(v.formulario, 'Contato pelo WhatsApp'), titular, ''],
    ['Pagamentos e outras APIs', ou(v.pagamentos, 'Não se aplica'), v.pagamentos ? titular : '', ''],
    ['Google Analytics 4', ou(v.ga4, 'Não configurado'), v.ga4 ? `Propriedade na conta Google ${titular}` : '', v.ga4 ? 'Ativado após consentimento de cookies' : ''],
    ['Google Search Console', v.searchConsole ? 'Verificado' : 'Não configurado', v.searchConsole ? titular : '', v.searchConsole ? 'Sitemap enviado' : ''],
    ['Google Tag Manager', ou(v.gtm, 'Não configurado'), v.gtm ? titular : '', ''],
    ['Meta Pixel', ou(v.pixel, 'Não configurado'), v.pixel ? titular : '', ''],
    ['Monitoramento', v.monitoramento ? 'UptimeRobot' : 'Não configurado', v.monitoramento ? titular : '', v.monitoramento ? 'Alertas por e-mail' : ''],
  ];

  doc.innerHTML = `
    <h2>Termo de entrega e aceite de website</h2>
    <p class="sub">${ou(v.clienteNome)}${v.urlSite ? ` · ${h(v.urlSite)}` : ''}</p>

    <h3>1. Partes</h3>
    <p><strong>Contratante:</strong> ${ou(v.clienteNome)}${v.clienteDocumento ? `, inscrito(a) sob ${h(v.clienteDocumento)}` : ''}${v.clienteResponsavel ? `, neste ato representado(a) por ${h(v.clienteResponsavel)}` : ''}.<br>
    <strong>Contratado:</strong> ${ou(v.agenciaNome)}${v.agenciaDocumento ? `, inscrito(a) sob ${h(v.agenciaDocumento)}` : ''}.</p>

    <h3>2. Objeto</h3>
    <p>Entrega do website institucional de ${ou(v.clienteNome)}${v.urlSite ? `, publicado em <strong>${h(v.urlSite)}</strong>` : ''}${v.valor ? `, pelo valor total de R$ ${h(v.valor)}` : ''}, com a transferência integral da titularidade de todas as contas, arquivos e acessos relacionados.</p>

    <h3>3. Itens entregues</h3>
    <ul>
      <li>Website responsivo (celular, tablet e computador), com certificado de segurança (HTTPS).</li>
      <li>Otimização para buscas locais: títulos, descrições, dados estruturados (schema.org), sitemap, robots e imagem de compartilhamento.</li>
      <li>Política de privacidade e cookies conforme a LGPD, com banner de consentimento (Consent Mode v2).</li>
      <li>Botões de WhatsApp e telefone, formulário de contato com proteção contra spam, mapa e horários.</li>
      <li>Medição de visitas e conversões ativada mediante consentimento do visitante.</li>
      <li>Painel de edição de conteúdo e manual de uso do site.</li>
      <li>Código-fonte completo${v.backupEntregue ? ' e cópia de segurança (.zip)' : ''}.</li>
    </ul>

    <h3>4. Acessos e titularidade</h3>
    <table>
      <thead><tr><th>Serviço</th><th>Plataforma ou identificação</th><th>Titular</th><th>Situação</th></tr></thead>
      <tbody>${acessos.map((a) => `<tr>${a.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <p><strong>Nenhuma senha consta deste documento.</strong> As contas foram criadas ou transferidas para o e-mail do contratante, e as senhas são definidas exclusivamente por ele. Recomenda-se ativar a verificação em duas etapas em todos os serviços.</p>

    <h3>5. Suporte</h3>
    <p>Período de suporte de <strong>${ou(v.suporteDias)} dias</strong> a partir da data de entrega${fimSuporte(v) ? `, até ${fimSuporte(v)}` : ''}.</p>
    <p><strong>Inclui:</strong> ${ou(v.suporteInclui)}</p>
    <p><strong>Não inclui:</strong> ${ou(v.suporteNaoInclui)}</p>
    <p>Após o período, novos serviços poderão ser contratados mediante orçamento ou plano de manutenção.</p>

    <h3>6. Responsabilidades do contratante</h3>
    <ul>
      <li>Manter atualizados os dados das contas e renovar o domínio e os serviços nos prazos.</li>
      <li>Responder pelo conteúdo publicado e pelas informações fornecidas para o site.</li>
      <li>Atuar como controlador dos dados pessoais recebidos pelo site, nos termos da LGPD.</li>
      <li>Guardar as próprias senhas e conceder acessos apenas por convite nas plataformas.</li>
    </ul>
    ${v.observacoes ? `<h3>7. Observações</h3><p>${h(v.observacoes)}</p>` : ''}

    <section class="aceite">
    <h3>${v.observacoes ? '8' : '7'}. Aceite</h3>
    <p>O contratante declara ter recebido o website e os acessos listados acima, em pleno funcionamento, dando por concluída a entrega.</p>
    <p>${ou(v.cidadeAssinatura, '______________')}, ${dataBr(v.dataEntrega) || '____ de ____________ de ______'}.</p>
    <div class="assinaturas">
      <div>${ou(v.clienteResponsavel || v.clienteNome)}<br>Contratante</div>
      <div>${ou(v.agenciaNome)}<br>Contratado</div>
    </div>
    </section>`;
}

function salvar() {
  const v = valores();
  crm.atualizar(id, { entrega: v });
  config.salvar({ agenciaDocumento: v.agenciaDocumento });
}

if (!lead) {
  document.getElementById('status').textContent = 'Cliente não encontrado no CRM deste navegador. Abra o termo pela ficha do cliente.';
  doc.innerHTML = '<p>Abra esta página pelo botão "Termo de entrega" na ficha do cliente.</p>';
} else {
  document.getElementById('status').textContent = `Cliente: ${lead.nome}. As alterações são salvas automaticamente.`;
  document.title = `Termo de entrega | ${lead.nome}`;
  preencherInicial();
  renderizar();
  form.addEventListener('input', () => { renderizar(); salvar(); });
  document.getElementById('imprimir').addEventListener('click', () => { salvar(); window.print(); });
}
