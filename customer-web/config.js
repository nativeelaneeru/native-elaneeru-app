window.NEL_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB/exec',
  appVersion: '10.12.3-pwa',
  supportPhone: '7411807675',
  supportWhatsApp: '917411807675',
  parentCompany: 'Sri Govindadri Ventures',
  softLaunch: true,
  loginMode: 'mobile-device-session-optional-pin',
  paymentMode: 'COD',
  deliveryRadiusKm: 3
};

/* The current production Apps Script exposes the POST bridge, not the old JSONP
 * transport. Prevent rpc-v109.js from taking over window.rpc at page load.
 * The customer shell's built-in POST RPC remains the single transport.
 */
window.NEL_RPC_V109 = true;

if (!window.NEL_UI_V110) {
  document.write('<script src="./ui-v110.js?v=1012"><\/script>');
}
if (!window.NEL_UI_V111) {
  document.write('<script src="./ui-v111.js?v=1012"><\/script>');
}

/* B2C catalog compatibility hotfix.
 * Production main exposes getAppConfig, while the current customer shell asks
 * for getB2CAppDataV9 during startup. Redirect only that read call so LIVE
 * products load without changing login, cart, checkout, profile or orders.
 */
window.addEventListener('load', function () {
  var baseRpc = window.rpc;
  if (typeof baseRpc !== 'function' || baseRpc.__nelCatalogCompat) return;

  function catalogCompatibleRpc(method, args) {
    var safeMethod = method === 'getB2CAppDataV9' ? 'getAppConfig' : method;
    return baseRpc(safeMethod, args);
  }

  catalogCompatibleRpc.__nelCatalogCompat = true;
  window.rpc = catalogCompatibleRpc;
  try { rpc = catalogCompatibleRpc; } catch (e) {}
}, true);
