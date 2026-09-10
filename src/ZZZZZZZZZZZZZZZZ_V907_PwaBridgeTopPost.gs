/**
 * Native Elaneeru V9.0.7 — external PWA bridge delivery fix.
 *
 * Apps Script HtmlService can render the returned bridge HTML inside its own
 * sandbox wrapper. In that case `parent` is the Apps Script wrapper rather
 * than the GitHub Pages PWA, so a response posted only to `parent` never
 * reaches the caller and the customer/vendor app waits until timeout.
 *
 * Send the existing bridge payload to the top-level PWA as well as parent.
 * Duplicate delivery is harmless because the PWA resolves a requestId once.
 */
function bridgeHtml_(payload){
  let data=JSON.stringify({nelBridge:true,payload:payload})
    .replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
    .replace(/\\u2028/g,'\\\\u2028').replace(/\\u2029/g,'\\\\u2029');
  const script = '<!doctype html><meta charset="utf-8"><script>'+
    'var d='+data+';'+
    'try{parent.postMessage(d,"*")}catch(e){};'+
    'try{if(top!==parent)top.postMessage(d,"*")}catch(e){};'+
    '<\/script>';
  return HtmlService.createHtmlOutput(script)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
