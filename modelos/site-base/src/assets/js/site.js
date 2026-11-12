// Consentimento de cookies (LGPD) com Google Consent Mode v2, medição opcional e formulário.
(function () {
  const CHAVE = 'consentimento-cookies';
  const cfg = JSON.parse(document.getElementById('configuracao')?.textContent || '{}');
  const banner = document.getElementById('cookies');

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });

  function carregarScript(src) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  let carregado = false;
  function ativarMedicao() {
    gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
    if (carregado) return;
    carregado = true;
    if (cfg.gtm) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      carregarScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cfg.gtm)}`);
    } else if (cfg.ga4) {
      carregarScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4)}`);
      gtag('js', new Date());
      gtag('config', cfg.ga4);
    }
    if (cfg.pixel) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', cfg.pixel);
      window.fbq('track', 'PageView');
    }
  }

  function lerEscolha() { try { return localStorage.getItem(CHAVE); } catch { return null; } }
  function gravarEscolha(v) { try { localStorage.setItem(CHAVE, v); } catch { /* sem armazenamento */ } }

  const temMedicao = cfg.ga4 || cfg.gtm || cfg.pixel;
  const escolha = lerEscolha();
  if (escolha === 'aceitar') ativarMedicao();
  if (banner && temMedicao && !escolha) banner.hidden = false;

  document.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-cookies]');
    if (botao) {
      gravarEscolha(botao.dataset.cookies);
      banner.hidden = true;
      if (botao.dataset.cookies === 'aceitar') ativarMedicao();
      else if (carregado) location.reload();
    }
    if (e.target.closest('[data-abrir-cookies]') && banner) banner.hidden = false;
    // Conversões: cliques no WhatsApp e no telefone
    const link = e.target.closest('a[href*="wa.me"], a[href^="tel:"]');
    if (link && carregado) {
      const tipo = link.href.includes('wa.me') ? 'clique_whatsapp' : 'clique_telefone';
      gtag('event', tipo);
      window.dataLayer.push({ event: tipo });
      if (window.fbq) window.fbq('track', 'Contact');
    }
  });

  // Formulário sem chave configurada: envia pelo WhatsApp
  document.querySelectorAll('form[data-sem-chave]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const texto = `Olá! Meu nome é ${d.get('nome')} (${d.get('telefone')}). ${d.get('mensagem')}`;
      window.open(`https://wa.me/${form.dataset.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    });
  });
  document.querySelectorAll('form[action*="web3forms"]:not([data-sem-chave])').forEach((form) => {
    form.addEventListener('submit', () => { if (carregado) { gtag('event', 'generate_lead'); if (window.fbq) window.fbq('track', 'Lead'); } });
  });
})();
