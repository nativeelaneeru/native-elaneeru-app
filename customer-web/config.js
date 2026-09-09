window.NEL_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycby4tO2Y1xWbVv1XqzbIYjuTKOt4XRWPzB9MseMC1x-qc8gbNYPvqvG1z6PuCPGZi5O2/exec',
  appVersion: '10.12.1-pwa',
  supportPhone: '7411807675',
  supportWhatsApp: '917411807675',
  parentCompany: 'Sri Govindadri Ventures',
  softLaunch: true,
  loginMode: 'mobile-device-session-optional-pin',
  paymentMode: 'COD',
  deliveryRadiusKm: 3
};
if (!window.NEL_RPC_V109) {
  document.write('<script src="./rpc-v109.js?v=1012"><\/script>');
}
if (!window.NEL_UI_V110) {
  document.write('<script src="./ui-v110.js?v=1012"><\/script>');
}
if (!window.NEL_UI_V111) {
  document.write('<script src="./ui-v111.js?v=1012"><\/script>');
}

/* B2C catalog compatibility hotfix.
 * Production main still exposes getAppConfig, while the current customer shell
 * asks for getB2CAppDataV9 during startup. Redirect only that one read call so
 * LIVE products load without changing login, cart, checkout, profile or orders.
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
