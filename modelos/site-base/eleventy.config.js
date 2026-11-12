// Configuração do gerador do site (Eleventy). O conteúdo editável fica em src/_data/site.json.
export default function (config) {
  config.addPassthroughCopy({ 'src/assets': 'assets' });
  config.addPassthroughCopy({ 'src/_headers': '_headers' });
  config.addPassthroughCopy({ 'src/_redirects': '_redirects' });
  config.addFilter('soDigitos', (v) => String(v || '').replace(/\D/g, ''));
  config.addFilter('json', (v) => JSON.stringify(v).replace(/</g, '\\u003c'));
  config.addFilter('anoAtual', () => new Date().getFullYear());
  config.addFilter('dataIso', () => new Date().toISOString().slice(0, 10));
  config.addFilter('urlAbsoluta', (caminho, base) => new URL(caminho, base).href);
  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'md', 'html'],
    htmlTemplateEngine: 'njk',
  };
}
