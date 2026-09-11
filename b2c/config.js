window.NEL_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbwWt1gjknt21us91HbFVbFdr5DbkEta-ZmETke-axuepZYp8fQRwAiGTnlgiKrxthb3/exec',
  appVersion: '10.41.0-pwa',
  paymentRelease: '10.35.0-pwa',
  supportPhone: '7411807675',
  supportWhatsApp: '917411807675',
  parentCompany: 'Sri Govindadri Ventures',
  softLaunch: true,
  loginMode: 'mobile-device-session-optional-pin',
  paymentMode: 'COD',
  paymentIntegration: 'direct-upi-v9.1.3',
  deliveryRadiusKm: 3
};

window.NEL_RPC_V109 = true;

/* Runs before the main inline app boot so stale/corrupt browser state cannot blank the PWA. */
document.write('<script src="./boot-recovery-v10360.js?v=10360"></script>');
document.write('<script src="./image-fallback-v918.js?v=10380"></script>');
document.write('<script src="./product-images-v10380.js?v=10390"></script>');
document.write('<script src="./idb-v1.js?v=10350"></script>');
if (!window.NEL_UI_V110) document.write('<script src="./ui-v110.js?v=10350"></script>');
if (!window.NEL_UI_V111) document.write('<script src="./ui-v111.js?v=10350"></script>');
if (!window.NEL_UI_V112) document.write('<script src="./ui-v112.js?v=10350"></script>');
if (!window.NEL_UI_V113) document.write('<script src="./ui-v113.js?v=10350"></script>');
if (!window.NEL_UI_V125) document.write('<script src="./ui-v125.js?v=10350"></script>');
if (!window.NEL_UI_V127) document.write('<script src="./ui-v127.js?v=10350"></script>');
document.write('<script src="./order-sync-v1.js?v=10350"></script>');
document.write('<script src="./separate-links.js?v=10350"></script>');
document.write('<script src="./cart-visibility-v10320.js?v=10350"></script>');
document.write('<script src="./customer-growth-v10330.js?v=10350"></script>');
document.write('<script src="./referral-reward-v10340.js?v=10360"></script>');
document.write('<script src="./payment-upi-v10350.js?v=10350"></script>');
document.write('<script src="./update-notifier.js?v=10360"></script>');
