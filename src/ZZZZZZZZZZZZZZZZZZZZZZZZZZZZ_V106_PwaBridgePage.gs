/*******************************************************************************
 * NATIVE ELANEERU V10.6 — PERSISTENT PWA RPC BRIDGE
 * Reliable external PWA -> Apps Script bridge using one HtmlService iframe.
 ******************************************************************************/

function pwaBridgePageV106_(){
  return HtmlService.createHtmlOutput(`<!doctype html>
<meta charset="utf-8">
<script>
(function(){
  function send(payload){
    try{ parent.postMessage({nelPwaRpcResult:true,payload:payload}, '*'); }catch(e){}
  }
  window.addEventListener('message', function(ev){
    var d=ev.data||{};
    if(d.nelPwaRpc!==true || !d.requestId || !d.method) return;
    var requestId=String(d.requestId||'');
    var method=String(d.method||'');
    var args=Array.isArray(d.args)?d.args:[];
    google.script.run
      .withSuccessHandler(function(result){ send({requestId:requestId,ok:true,result:result}); })
      .withFailureHandler(function(err){ send({requestId:requestId,ok:false,error:String(err&&err.message||err||'Request failed.')}); })
      .rpcV9(method,args);
  });
  send({requestId:'__ready__',ok:true,result:{ready:true,version:'10.6'}});
})();
</script>`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGetV106_(e){
  if(String(e&&e.parameter&&e.parameter.pwaBridge||'')==='1') return pwaBridgePageV106_();
  return doGetV99_(e);
}

doGet=doGetV106_;
