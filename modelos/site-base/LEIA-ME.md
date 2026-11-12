# Modelo-base de site profissional

Estrutura usada pelo Radar Leads para os sites finais dos clientes.

- Gerador estático Eleventy: `npm install` e `npm run build` (saída em `_site`).
- Todo o conteúdo editável em `src/_data/site.json` (também pelo painel Pages CMS, configurado em `.pages.yml`).
- Incluído: SEO local (title, description, canonical, Open Graph, JSON-LD), sitemap, robots, manifest, política de privacidade (LGPD), banner de cookies com Consent Mode v2, GA4, Tag Manager e Meta Pixel ativados por configuração, formulário com antispam (Web3Forms) e alternativa pelo WhatsApp, páginas de obrigado e 404, cabeçalhos de segurança da Cloudflare (`_headers`), eventos de conversão (cliques no WhatsApp e no telefone, envio do formulário).
- Publicação e entrega: `PUBLICACAO.md`. Manual para o cliente: `MANUAL-DO-CLIENTE.md`.
