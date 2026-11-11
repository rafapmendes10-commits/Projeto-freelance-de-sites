// Exportação de leads para CSV (puro, também usado no Node) e Excel (navegador, via SheetJS).

export const COLUNAS = [
  ['nome', 'Nome'],
  ['categoria', 'Categoria'],
  ['telefone', 'Telefone'],
  ['whatsapp', 'WhatsApp'],
  ['linkWhatsapp', 'Link WhatsApp'],
  ['email', 'E-mail'],
  ['site', 'Site'],
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['endereco', 'Endereço'],
  ['bairro', 'Bairro'],
  ['cidade', 'Cidade'],
  ['uf', 'UF'],
  ['cep', 'CEP'],
  ['horario', 'Horário'],
  ['avaliacao', 'Avaliação'],
  ['numAvaliacoes', 'Nº avaliações'],
  ['pontuacao', 'Pontuação'],
  ['etapaRotulo', 'Etapa no funil'],
  ['notas', 'Anotações'],
  ['lat', 'Latitude'],
  ['lon', 'Longitude'],
  ['linkMaps', 'Link Google Maps'],
  ['linkOsm', 'Link OpenStreetMap'],
  ['fonte', 'Fonte'],
  ['coletadoEm', 'Coletado em'],
];

const ETAPAS_ROTULO = { novo: 'Novo', contatado: 'Contatado', negociando: 'Em negociação', ganho: 'Fechado', perdido: 'Perdido' };

export function linhaExportacao(lead) {
  return {
    ...lead,
    telefone: (lead.telefones && lead.telefones.length ? lead.telefones : [lead.telefone]).filter(Boolean).join(' / '),
    linkWhatsapp: lead.whatsapp ? `https://wa.me/${lead.whatsapp}` : '',
    etapaRotulo: ETAPAS_ROTULO[lead.etapa] || '',
  };
}

function celulaCsv(valor, separador) {
  if (valor === null || valor === undefined) return '';
  let s = String(valor);
  if (/^[=@\t\r]/.test(s)) s = `'${s}`; // evita execução de fórmulas ao abrir no Excel
  return /["\n\r]/.test(s) || s.includes(separador) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Gera CSV com ponto e vírgula (padrão do Excel em português) e BOM para preservar acentos. */
export function gerarCsv(leads, { separador = ';', bom = true } = {}) {
  const cab = COLUNAS.map(([, rotulo]) => celulaCsv(rotulo, separador)).join(separador);
  const linhas = leads.map((l) => {
    const r = linhaExportacao(l);
    return COLUNAS.map(([chave]) => celulaCsv(r[chave], separador)).join(separador);
  });
  return `${bom ? '﻿' : ''}${[cab, ...linhas].join('\r\n')}\r\n`;
}

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function baixarCsv(leads, nomeBase) {
  baixarBlob(new Blob([gerarCsv(leads)], { type: 'text/csv;charset=utf-8' }), `${nomeBase}.csv`);
}

export function baixarExcel(leads, nomeBase) {
  const XLSX = globalThis.XLSX;
  if (!XLSX) {
    baixarCsv(leads, nomeBase);
    return;
  }
  const dados = leads.map((l) => {
    const r = linhaExportacao(l);
    const o = {};
    for (const [chave, rotulo] of COLUNAS) o[rotulo] = r[chave] ?? '';
    return o;
  });
  const planilha = XLSX.utils.json_to_sheet(dados, { header: COLUNAS.map(([, r]) => r) });
  planilha['!cols'] = COLUNAS.map(([chave]) => ({ wch: ['nome', 'endereco', 'site', 'linkMaps', 'horario'].includes(chave) ? 38 : 16 }));
  planilha['!autofilter'] = { ref: planilha['!ref'] };
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Leads');
  const bytes = XLSX.write(livro, { bookType: 'xlsx', type: 'array' });
  baixarBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${nomeBase}.xlsx`);
}

export function baixarJson(objeto, nomeArquivo) {
  baixarBlob(new Blob([JSON.stringify(objeto, null, 2)], { type: 'application/json' }), nomeArquivo);
}
