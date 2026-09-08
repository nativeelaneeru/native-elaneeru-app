/*******************************************************************************
 * NATIVE ELANEERU V10.1 — B2C CUSTOMER ROUTER
 ******************************************************************************/
function b2cPageV101_(){
  return HtmlService.createTemplateFromFile('B2C101').evaluate()
    .setTitle('Native Elaneeru - B2C')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
}
function doGetV101_(e){
  var isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  var p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(!isBridge && (p==='' || p==='home' || p==='b2c')) return b2cPageV101_();
  return doGetV100_(e);
}
doGet=doGetV101_;
