# Radar Leads

Plataforma gratuita de prospecção: encontre empresas por **nicho e cidade**, veja telefone, WhatsApp, site, e-mail, redes sociais e endereço, **exporte para Excel/CSV**, organize em um **CRM com funil** e aborde pelo **WhatsApp** com mensagens personalizadas.

Tudo roda no navegador, sem servidor, sem banco de dados e sem mensalidade. A hospedagem é gratuita no GitHub Pages e a automação semanal é gratuita no GitHub Actions.

## Recursos

| Recurso | Onde |
| --- | --- |
| Busca por 82 nichos prontos (com sinônimos) ou qualquer palavra-chave | Painel, Buscar leads |
| Cidade inteira, bairro, endereço ou raio de 1 a 25 km; várias cidades separadas por `;` | Painel |
| Identificação automática de celular com WhatsApp | Painel |
| Indicadores e filtros: com telefone, WhatsApp, e-mail, site, **sem site (oportunidade)**, redes sociais | Painel |
| Pontuação de qualidade de cada lead (0 a 100) | Painel |
| Mapa interativo com os estabelecimentos | Painel |
| Exportação para **Excel (.xlsx)** e **CSV** com 26 colunas, incluindo link do WhatsApp e do Google Maps | Painel |
| Copiar telefones para colar em planilhas | Painel |
| **CRM** com funil (Novo, Contatado, Em negociação, Fechado, Perdido), arrastar e soltar, anotações e histórico | Meus leads |
| **Disparo assistido no WhatsApp**: fila, modelos com variáveis `{nome}`, `{cidade}`, `{nicho}`, intervalo de segurança | Disparo WhatsApp |
| Histórico de buscas com repetição em um clique | Histórico |
| Backup e restauração, importação de CSV para o CRM, tema claro e escuro | Configurações |
| Fonte opcional **Google Places** (avaliações e mais telefones) com chave própria | Configurações |
| **Robô de extração** agendado no GitHub Actions, com enriquecimento de e-mail, Instagram e WhatsApp a partir dos sites | `scripts/` e `.github/workflows/` |

## Fluxo de venda automatizado

1. **Buscar:** o Radar encontra as empresas e já gera, para cada uma, uma **prévia gratuita do site** com nome, telefone, WhatsApp, endereço, mapa, horário e textos do segmento. A prévia é só um link (`previa.html#d=...`), sem servidor e sem custo.
2. **Enviar:** o modelo de mensagem "Prévia gratuita do site" inclui `{link_previa}`. No disparo assistido, cada envio é um toque: o WhatsApp abre com a mensagem pronta.
3. **Fechar:** na ficha do lead, clique em **Pagamento prévio realizado** e informe o valor.
4. **Produzir:** o site pronto é baixado na hora (arquivo único com SEO local, mapa e WhatsApp). Também é possível abrir o **Lovable** com o briefing completo ou copiar o briefing para o Claude.

Configure seu nome e WhatsApp em **Configurações, Sua marca nas prévias** para que a prévia mostre o botão **Quero este site**.

Por que o envio não é 100% automático: a API oficial do WhatsApp é paga e exige consentimento prévio para mensagens de marketing, e robôs não oficiais violam os termos de uso e levam ao banimento do número. O envio assistido mantém o seu número seguro.

## De onde vêm os dados

* **Padrão, gratuito:** [OpenStreetMap](https://www.openstreetmap.org), via APIs públicas Nominatim (localização) e Overpass (estabelecimentos). Licença ODbL, sem chave e sem custo. Os resultados citam a fonte.
* **Opcional:** Google Places API (New) com a sua chave. O Google oferece uma cota mensal gratuita e cobra acima dela; os dados seguem os termos da Google Maps Platform.

Observação honesta: o OpenStreetMap é colaborativo, então a quantidade de telefones e sites varia por cidade. Para ampliar a cobertura, use o enriquecimento automático do robô ou a fonte Google.

## Como publicar o site gratuitamente (GitHub Pages)

1. No GitHub, abra o repositório e vá em **Settings, Pages**.
2. Em **Build and deployment, Source**, escolha **GitHub Actions**.
3. Faça qualquer push na branch padrão (ou rode manualmente o workflow **Publicar site no GitHub Pages** na aba Actions).
4. O endereço aparece na própria página de Pages, no formato `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Para usar um domínio próprio (por exemplo, `www.suaempresa.com.br`), informe-o em **Settings, Pages, Custom domain** e crie o registro CNAME no seu provedor de DNS.

## Automação gratuita (GitHub Actions)

O workflow **Extrair leads automaticamente** (`.github/workflows/extrair-leads.yml`):

* roda **toda segunda-feira** com as buscas listadas em `automacao/buscas.json`;
* pode ser executado **manualmente** em Actions, Run workflow, informando nicho, cidade e raio;
* visita o site de cada empresa para descobrir **e-mail, Instagram, Facebook e WhatsApp**;
* gera o **link da prévia gratuita** de cada empresa;
* disponibiliza CSV, JSON e um resumo para download na própria execução (por 7 dias). Gravar no repositório é opcional e vem desligado, porque em repositório público os arquivos ficariam visíveis.

Para editar as buscas agendadas, altere `automacao/buscas.json`:

```json
[
  { "nicho": "dentista", "local": "Campinas, SP" },
  { "nicho": "academia", "local": "Sorocaba, SP", "raioKm": 10 }
]
```

Para usar o Google na automação, crie o segredo `GOOGLE_PLACES_API_KEY` em **Settings, Secrets and variables, Actions** e escolha a fonte `google` ao executar.

Depois, no painel, use **Configurações, Importar CSV** para levar os leads ao CRM.

## Uso local

Requisitos: Node 18 ou superior (apenas para o robô e os testes) e Python 3 (servidor local).

```bash
npm run dev
```

Abra `http://localhost:8080`.

```bash
node scripts/extrair-leads.mjs --nicho "pizzaria" --local "Curitiba, PR" --enriquecer
```

```bash
npm test
```

Se a sua rede usa proxy corporativo, rode o robô com `NODE_USE_ENV_PROXY=1`.

## Estrutura

```
index.html                 Página de apresentação
app.html                   Painel (busca, CRM, disparo, histórico, configurações)
assets/css/                Estilos (base compartilhada, site e painel)
assets/js/app.js           Interface do painel
assets/js/nichos.js        Catálogo de nichos e reconhecimento de sinônimos
assets/js/fontes/osm.js    Motor gratuito (Nominatim + Overpass)
assets/js/fontes/google.js Motor opcional (Google Places)
assets/js/exportar.js      CSV e Excel
assets/js/armazenamento.js CRM, histórico, modelos e fila (localStorage)
assets/vendor/             Leaflet (mapa) e SheetJS (Excel), sem depender de CDN
scripts/extrair-leads.mjs  Robô de extração e enriquecimento
automacao/buscas.json      Buscas agendadas
.github/workflows/         Publicação no Pages e automação semanal
testes/                    Testes automatizados (node --test)
```

## Uso responsável

* Prospecte **empresas** (B2B) com finalidade legítima, conforme a LGPD.
* Identifique-se, personalize a abordagem e respeite quem pedir para não receber mensagens.
* O disparo é assistido (você confirma cada envio no seu WhatsApp) justamente para evitar spam e bloqueios.
* Respeite os limites dos servidores públicos do OpenStreetMap: evite buscas repetidas em sequência sobre áreas muito grandes.

## Licenças de terceiros

Dados de mapas © colaboradores do OpenStreetMap (ODbL). Leaflet (BSD 2-Clause) e SheetJS Community Edition (Apache 2.0) incluídos em `assets/vendor/`.
