/* ============================================================
   MUV.E · Configuração da página. É o único arquivo a editar para ligar:
   - endpoint: URL que recebe o formulário (POST em JSON). Pode ser Make,
     n8n, CRM ou um servidor próprio. Enquanto estiver vazio, a página
     publicada avisa que o envio não está disponível e NÃO finge sucesso.
   - gtmId: contêiner do Google Tag Manager (GA4 e Google Ads entram por ele).
   - metaPixelId: Pixel da Meta, se não for instalado pelo GTM.
   Rastreamento só carrega depois do "Aceitar" no aviso de cookies.
   O aviso só aparece quando houver gtmId ou metaPixelId preenchido.
   ============================================================ */
window.MUVE_CONFIG = {
  endpoint: '',
  gtmId: '',
  metaPixelId: '',
};
