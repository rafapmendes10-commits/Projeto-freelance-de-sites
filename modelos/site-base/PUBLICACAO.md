# Roteiro de publicação e entrega

Siga na ordem. Todas as contas são criadas **no e-mail do cliente**; você entra como convidado. Assim nenhuma senha precisa ser repassada no fim.

## 1. Domínio (Registro.br)
- [ ] O cliente cria a conta em https://registro.br com o CPF ou CNPJ dele e registra o domínio (cerca de R$ 40 por ano para .com.br).
- [ ] Domínio já existente em outro lugar: peça o código de transferência (EPP/Auth Code) ao provedor atual, ou apenas altere os servidores DNS no painel atual.
- [ ] Ative a verificação em duas etapas.

## 2. Código (GitHub)
- [ ] Crie o repositório na conta do cliente (ou crie na sua e use **Settings, Transfer ownership** na entrega).
- [ ] Envie o conteúdo desta pasta como raiz do repositório.

## 3. Hospedagem e DNS (Cloudflare, gratuito e com uso comercial permitido)
- [ ] O cliente cria a conta em https://dash.cloudflare.com e convida você em **Manage Account, Members**.
- [ ] **Workers & Pages, Create, Pages, Connect to Git**: escolha o repositório.
- [ ] Configuração de build: comando `npm run build`, pasta de saída `_site`, variável `NODE_VERSION = 20`.
- [ ] **Add a site** com o domínio e, no Registro.br, troque os servidores DNS pelos dois informados pela Cloudflare.
- [ ] Em **Pages, Custom domains**, adicione `dominio.com.br` e `www.dominio.com.br`. O HTTPS é emitido sozinho.
- [ ] Opcional: **Email Routing** para criar `contato@dominio.com.br` redirecionando para o e-mail do cliente (gratuito).

## 4. Formulário (Web3Forms, gratuito)
- [ ] Em https://web3forms.com gere a chave com o e-mail que vai receber os contatos.
- [ ] Coloque a chave em `src/_data/site.json`, campo `integracoes.formulario.chave`.

## 5. Medição (sempre na conta Google do cliente)
- [ ] **Google Analytics 4**: crie a propriedade e copie o ID `G-XXXX` para `integracoes.ga4`.
- [ ] **Search Console**: adicione o domínio (verificação por DNS na Cloudflare ou meta tag em `integracoes.searchConsole`) e envie `https://dominio.com.br/sitemap.xml`.
- [ ] **Tag Manager** (opcional, substitui o GA4 direto): ID `GTM-XXXX` em `integracoes.gtm`.
- [ ] **Meta Pixel** (se o cliente anunciar no Instagram/Facebook): ID em `integracoes.metaPixel`.
- [ ] Todos os scripts só carregam depois do consentimento de cookies (LGPD), com Consent Mode v2.
- [ ] **Google Meu Negócio**: coloque o link do site no perfil e o link do perfil em `redes.googleMeuNegocio`.

## 6. Monitoramento
- [ ] UptimeRobot (gratuito) monitorando o domínio, com alerta para o e-mail do cliente e o seu.

## 7. Painel de edição (Pages CMS)
- [ ] Mostre ao cliente como entrar em https://app.pagescms.org e editar o conteúdo (veja `MANUAL-DO-CLIENTE.md`).

## 8. Testes finais
- [ ] Site abre em `https://` com e sem `www`.
- [ ] Formulário chega no e-mail; botões de WhatsApp e telefone funcionam.
- [ ] Banner de cookies aparece e o Analytics registra a visita depois de aceitar.
- [ ] PageSpeed Insights (https://pagespeed.web.dev) com nota 90+ no celular.
- [ ] Compartilhar o link no WhatsApp mostra imagem, título e descrição.

## 9. Entrega
- [ ] Remova seu acesso de administrador onde o cliente preferir (ou mantenha como membro durante o suporte).
- [ ] Gere o **termo de entrega** no Radar Leads (ficha do cliente) e colha a assinatura.
- [ ] Envie o `MANUAL-DO-CLIENTE.md` e um backup em .zip do repositório (GitHub, **Code, Download ZIP**).
