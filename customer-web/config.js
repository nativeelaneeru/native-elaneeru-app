window.NEL_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB/exec',
  appVersion: '10.13.0-pwa',
  supportPhone: '7411807675',
  supportWhatsApp: '917411807675',
  parentCompany: 'Sri Govindadri Ventures',
  softLaunch: true,
  loginMode: 'mobile-device-session-optional-pin',
  paymentMode: 'COD',
  deliveryRadiusKm: 3
};

/* Use the B2C shell's supported POST bridge. The legacy JSONP transport
 * cannot load the current product and banner payload from this deployment.
 */
window.NEL_RPC_V109 = true;

if (!window.NEL_UI_V110) {
  document.write('<script src="./ui-v110.js?v=1012"><\/script>');
}
if (!window.NEL_UI_V111) {
  document.write('<script src="./ui-v111.js?v=1012"><\/script>');
}
if (!window.NEL_UI_V112) {
  document.write('<script src="./ui-v112.js?v=10130"><\/script>');
}
