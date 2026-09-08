/*******************************************************************************
 * NATIVE ELANEERU V10 — CLEAN B2C ROUTER
 ******************************************************************************/

function b2cBrandLogoV100_(){
  try { return NEL_V9_LOGO_DATA_ || ''; }
  catch(e) { return ''; }
}

function b2cPageV100_(){
  return HtmlService.createTemplateFromFile('B2C100').evaluate()
    .setTitle('Native Elaneeru - B2C')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
}

function doGetV100_(e){
  var isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  var p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(!isBridge && (p==='' || p==='home' || p==='b2c')) return b2cPageV100_();
  return doGetV99_(e);
}

doGet=doGetV100_;
