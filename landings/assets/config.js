/* =========================================================
   LIA · Landings — configuração central
   Edite SÓ aqui. Vale para todas as landings.
   ========================================================= */
window.LIA = {
  // >>> TROQUE pela URL real do app em produção <<<
  // Ex.: "https://app.lia.com.br" ou a URL do Netlify/produto.
  APP_URL: "https://SEU-APP-AQUI.netlify.app",

  // Caminho de cadastro (plano Free). Ajuste se a rota mudar.
  SIGNUP_PATH: "/auth/login",

  // Pixels de tracking (deixe vazio para desligar).
  META_PIXEL_ID: "",        // ex.: "123456789012345"
  LINKEDIN_PARTNER_ID: "",  // ex.: "1234567"
};

/* ---- Lógica compartilhada (não precisa editar) ---- */
(function () {
  const cfg = window.LIA;

  // 1) Monta o link de signup já repassando as UTMs do anúncio (atribuição).
  function signupUrl() {
    const qs = window.location.search; // ?utm_source=...&utm_campaign=...
    return cfg.APP_URL + cfg.SIGNUP_PATH + (qs || "");
  }

  // 2) Aplica em todo [data-cta] e dispara evento de conversão no clique.
  document.addEventListener("DOMContentLoaded", function () {
    const url = signupUrl();
    document.querySelectorAll("[data-cta]").forEach(function (el) {
      if (el.tagName === "A") el.setAttribute("href", url);
      el.addEventListener("click", function () {
        try { if (window.fbq) fbq("track", "Lead"); } catch (e) {}
        try { if (window.lintrk) lintrk("track", { conversion_id: 0 }); } catch (e) {}
      });
    });
  });

  // 3) Meta Pixel
  if (cfg.META_PIXEL_ID) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', cfg.META_PIXEL_ID); window.fbq('track', 'PageView');
  }

  // 4) LinkedIn Insight Tag
  if (cfg.LINKEDIN_PARTNER_ID) {
    window._linkedin_partner_id = cfg.LINKEDIN_PARTNER_ID;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(cfg.LINKEDIN_PARTNER_ID);
    (function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};
    window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];
    var b=document.createElement("script");b.type="text/javascript";b.async=true;
    b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";
    s.parentNode.insertBefore(b,s);})(window.lintrk);
  }
})();
