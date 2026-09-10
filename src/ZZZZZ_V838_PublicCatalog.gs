/**
 * Native Elaneeru V8.3.8 — public read-only B2C catalogue endpoint.
 * Uses JSONP so the GitHub Pages PWA can fetch products and banners quickly
 * without relying on Apps Script's wrapped HTML POST response.
 */
const V838_ORIGINAL_DO_GET = doGet;

doGet = function(e){
  const jsonp = String(e && e.parameter && e.parameter.jsonp || '') === '1';
  if(!jsonp) return V838_ORIGINAL_DO_GET(e);

  let callback = String(e && e.parameter && e.parameter.callback || '');
  if(!/^[A-Za-z_$][0-9A-Za-z_$]{0,100}$/.test(callback)) callback = '__nelCatalogCallback';

  let response;
  try{
    const request = JSON.parse(String(e && e.parameter && e.parameter.payload || '{}'));
    if(String(request.method || '') !== 'getAppConfig') throw new Error('Method not allowed.');
    response = {
      ok:true,
      result:getAppConfig(),
      requestId:String(request.requestId || '')
    };
  }catch(error){
    response = {
      ok:false,
      error:String(error && error.message || error),
      requestId:''
    };
  }

  const json = JSON.stringify(response)
    .replace(/</g,'\\u003c')
    .replace(/\u2028/g,'\\u2028')
    .replace(/\u2029/g,'\\u2029');
  return ContentService
    .createTextOutput(callback + '(' + json + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
};
