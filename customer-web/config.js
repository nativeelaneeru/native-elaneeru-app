window.NEL_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB/exec',
  appVersion: '10.12.4-pwa',
  supportPhone: '7411807675',
  supportWhatsApp: '917411807675',
  parentCompany: 'Sri Govindadri Ventures',
  softLaunch: true,
  loginMode: 'mobile-device-session-optional-pin',
  paymentMode: 'COD',
  deliveryRadiusKm: 3
};

/* Keep the B2C shell on its built-in POST bridge. The legacy JSONP runtime
 * must not take over window.rpc at page load.
 */
window.NEL_RPC_V109 = true;

if (!window.NEL_UI_V110) {
  document.write('<script src="./ui-v110.js?v=1012"><\/script>');
}
if (!window.NEL_UI_V111) {
  document.write('<script src="./ui-v111.js?v=1012"><\/script>');
}

/* The customer shell already requests getB2CAppDataV9. Do not rewrite that
 * method to getAppConfig: the current PWA backend rejects getAppConfig on its
 * RPC allowlist. Leaving the native V9 catalog method intact restores product
 * loading without changing any customer UI or checkout logic.
 */
