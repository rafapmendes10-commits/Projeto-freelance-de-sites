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

## Fluxo de venda com prévias personalizadas

1. **Buscar e diagnosticar:** o Radar encontra os comércios e calcula a **oportunidade** de cada um (0 a 100): se tem site, se o site atual tem problemas, se há WhatsApp, quantos concorrentes num raio de 1,5 km já têm site, quais características únicas o local tem (acessibilidade, delivery, Pix, horário estendido etc.).
2. **Gerar o prompt individual:** o botão da varinha (ou "Prompts das prévias", em lote de até 10) copia um prompt sob medida com dados confirmados, diagnóstico, concorrência, demandas típicas do nicho, cuidados de publicidade do conselho profissional, roteiro de pesquisa na internet, direção criativa e ângulo de venda.
3. **Criar a prévia com o Claude:** cole o prompt numa sessão do Claude Code com este repositório. Ele pesquisa o comércio, cria `previas/<slug>/index.html` seguindo as regras do `CLAUDE.md`, valida com `node scripts/verificar-previa.mjs`, publica e devolve o link e uma mensagem de WhatsApp pessoal.
4. **Registrar o link:** em Meus leads, clique em **Verificar prévias publicadas**. O link entra sozinho na variável `{link_previa}` da mensagem. Prévias feitas em outra ferramenta podem ser coladas manualmente na ficha do lead.
5. **Enviar:** o disparo assistido só envia o modelo com `{link_previa}` para quem já tem prévia pronta.
6. **Fechar:** ao clicar em **Pagamento prévio realizado**, o prompt do **site final** (a partir da prévia aprovada e das suas anotações) é copiado para você colar na conversa com o Claude, ou abrir no Lovable.

### Depois da venda: kit de entrega

Ao clicar em **Pagamento prévio realizado**, a ficha do cliente vira um roteiro de entrega:

1. **Mensagem de boas-vindas** no WhatsApp pedindo exatamente o que falta: domínio e CPF/CNPJ do titular, e-mail que será dono das contas, logo, fotos, serviços e redes.
2. **Prompt do site final:** o Claude copia `modelos/site-base` para `sites/<slug>/`, porta o design da prévia aprovada e entrega um site completo (Eleventy) com SEO local, JSON-LD, Open Graph, sitemap, política de privacidade (LGPD), banner de cookies com Consent Mode v2, GA4, Tag Manager e Meta Pixel por configuração, formulário com antispam, páginas de obrigado e 404, cabeçalhos de segurança, painel de edição Pages CMS, manual do cliente e roteiro de publicação. Valida com `scripts/verificar-site.mjs` e gera as imagens com `scripts/gerar-imagens.mjs`.
3. **Publicação no nome do cliente** seguindo `PUBLICACAO.md`: Registro.br, Cloudflare Pages e DNS, Web3Forms, Google Analytics, Search Console, Tag Manager, Meta Pixel e UptimeRobot.
4. **Termo de entrega** (`entrega.html`): documento de aceite com partes, objeto, itens entregues, tabela de acessos e titularidade (sem senhas), suporte com prazo e escopo, responsabilidades e assinaturas, pronto para salvar em PDF.

O robô semanal também gera, para cada busca, um arquivo `prompts-*.md` com as 10 melhores oportunidades, já com auditoria do site atual de cada comércio.

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
* calcula a oportunidade, audita o site atual de cada comércio e gera os prompts das 10 melhores prévias;
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
assets/js/oportunidade.js  Diagnóstico, concorrência, demandas por nicho e prompts
assets/js/exportar.js      CSV e Excel
assets/js/armazenamento.js CRM, histórico, modelos e fila (localStorage)
assets/vendor/             Leaflet (mapa) e SheetJS (Excel), sem depender de CDN
scripts/extrair-leads.mjs  Robô de extração, enriquecimento e auditoria de sites
scripts/verificar-previa.mjs Verificação de qualidade das prévias
previas/                   Prévias personalizadas publicadas (uma pasta por comércio)
entrega.html               Gerador do termo de entrega
modelos/site-base/         Modelo técnico dos sites finais (Eleventy)
sites/                     Sites finais dos clientes (não publicados no GitHub Pages)
scripts/gerar-imagens.mjs  Imagem de compartilhamento, ícone e favicon do site final
scripts/verificar-site.mjs Verificação de qualidade do site final antes da entrega
CLAUDE.md                  Regras para o Claude criar prévias e sites finais
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
