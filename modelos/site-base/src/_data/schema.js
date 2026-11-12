// Dados estruturados (schema.org) e configuração do navegador, calculados a partir de site.json.
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('./site.json', import.meta.url), 'utf8'));

export default {
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': site.tipoSchema || 'LocalBusiness',
    name: site.nome,
    description: site.descricao,
    url: site.url,
    image: new URL('/assets/img/og.png', site.url).href,
    telephone: site.telefone || undefined,
    email: site.email || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [site.endereco.rua, site.endereco.numero].filter(Boolean).join(', '),
      addressLocality: site.endereco.cidade,
      addressRegion: site.endereco.uf,
      postalCode: site.endereco.cep,
      addressCountry: 'BR',
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lon },
    openingHours: (site.horario || []).map((h) => h.schema).filter(Boolean),
    sameAs: Object.values(site.redes || {}).filter(Boolean),
  },
  navegador: { ga4: site.integracoes.ga4, gtm: site.integracoes.gtm, pixel: site.integracoes.metaPixel },
};
