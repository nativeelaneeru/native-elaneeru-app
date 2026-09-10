window.NEL_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbwWt1gjknt21us91HbFVbFdr5DbkEta-ZmETke-axuepZYp8fQRwAiGTnlgiKrxthb3/exec',
  appVersion: '10.23.0-pwa',
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
  document.write('<script src="./ui-v110.js?v=10230"></script>');
}
if (!window.NEL_UI_V111) {
  document.write('<script src="./ui-v111.js?v=10230"></script>');
}
if (!window.NEL_UI_V112) {
  document.write('<script src="./ui-v112.js?v=10230"></script>');
}
if (!window.NEL_UI_V113) {
  document.write('<script src="./ui-v113.js?v=10230"></script>');
}
document.write('<script src="./separate-links.js?v=10230"></script>');
