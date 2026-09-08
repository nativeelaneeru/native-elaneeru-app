/*******************************************************************************
 * NATIVE ELANEERU V9.8.1 — CLEAN B2C ROUTER / SINGLE OWNER
 *
 * B2C uses src/index.html as the only customer UI owner.
 * This layer adds only a safe RPC fallback, one Legal & Food Safety modal,
 * one Legal card, customer login, and final embedded logo replacement.
 ******************************************************************************/

function b2cRuntimeV98_(){
  return `<style>
    #nel98LegalOverlay{position:fixed;inset:0;background:#0009;z-index:999990;display:none;align-items:flex-end}
    #nel98LegalOverlay.show{display:flex}
    .nel98LegalSheet{width:100%;max-width:780px;margin:auto;background:#fff;border-radius:24px 24px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));max-height:88vh;overflow:auto;color:#172019}
    .nel98LegalHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.nel98LegalHead h2{margin:0;color:#075b34}
    .nel98LegalClose{border:0;background:#edf7f0;color:#075b34;width:38px;height:38px;border-radius:11px;font-size:20px}
    .nel98LegalRow{display:grid;grid-template-columns:125px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid #e7ebe8;font-size:11px}.nel98LegalRow b{color:#66736b}
    #nel98LegalCard{cursor:pointer}.nel98LegalStatus{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.nel98LegalPill{padding:6px 8px;border-radius:999px;background:#edf8f1;color:#075b34;font-size:9px;font-weight:900}.nel98LegalPill.pending{background:#fff1d7;color:#8a5700}
    @media(max-width:430px){.nel98LegalRow{grid-template-columns:1fr;gap:2px}}
  </style>
  <div id="nel98LegalOverlay" onclick="if(event.target===this)nel98CloseLegal()"><div class="nel98LegalSheet"><div class="nel98LegalHead"><div><h2>Legal & Food Safety</h2><div style="font-size:10px;color:#78827b;margin-top:3px">Native Elaneeru · Sri Govindadri Ventures</div></div><button class="nel98LegalClose" onclick="nel98CloseLegal()">×</button></div><div id="nel98LegalBody" style="margin-top:10px">Loading…</div></div></div>
  <script>(function(){
    var LOGO='${NEL_V91_LOGO}';
    if(typeof window.rpc!=='function'){
      window.rpc=function(name,args){
        args=Array.isArray(args)?args:[];
        return new Promise(function(resolve,reject){
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(function(e){reject(new Error(e&&e.message?e.message:String(e)))})
            .rpcV9(name,args);
        });
      };
    }
    function esc98(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
    function fixLogo98(){
      document.querySelectorAll('img.logo,img.headLogo,img.nel-v91-brandmark,img.nel9-brandmark').forEach(function(img){
        if(img.src!==LOGO) img.src=LOGO;
        img.onerror=null;
      });
    }
    async function loadLegal98(){
      var body=document.getElementById('nel98LegalBody');
      if(!body)return;
      try{
        var c=await window.rpc('getCompliancePublicV91',[]);
        var rows=[
          ['Legal entity',(c.legalName||'Sri Govindadri Ventures')+' ('+(c.legalStructure||'Partnership')+')'],
          ['Business address',c.businessAddress||'Address pending'],
          ['FSSAI',c.fssaiNo||'Application Pending'],
          ['GST',c.gstin||'Not Registered'],
          ['Grievance Officer',c.grievanceOfficer||'Indra Sena Reddy'],
          ['Grievance email',c.grievanceEmail||'To be confirmed'],
          ['Customer care',c.supportPhone||'7411807675'],
          ['Invoice type',c.invoiceDocumentType||'Commercial Invoice / Receipt']
        ];
        body.innerHTML=rows.map(function(r){return '<div class="nel98LegalRow"><b>'+esc98(r[0])+'</b><span>'+esc98(r[1])+'</span></div>'}).join('')+
          '<div style="margin-top:11px;padding:10px;border-radius:12px;background:'+(c.fssaiNo?'#edf8f1':'#fff4df')+';font-size:10px;line-height:1.5">'+
          (c.fssaiNo?'FSSAI licence is configured in the compliance master.':'FSSAI application is pending. No licence number is being claimed in the app.')+'</div>';
        var status=document.querySelector('#nel98LegalCard .nel98LegalStatus');
        if(status){
          status.innerHTML='<span class="nel98LegalPill '+(c.fssaiNo?'':'pending')+'">'+esc98(c.fssaiNo?'FSSAI '+c.fssaiNo:'FSSAI Application Pending')+'</span>'+
            '<span class="nel98LegalPill '+(c.gstin?'':'pending')+'">'+esc98(c.gstin?'GSTIN '+c.gstin:'GST Not Registered')+'</span>';
        }
      }catch(e){body.textContent=e&&e.message?e.message:String(e)}
    }
    window.nel98OpenLegal=function(){var o=document.getElementById('nel98LegalOverlay');if(o)o.classList.add('show');loadLegal98()};
    window.nel98CloseLegal=function(){var o=document.getElementById('nel98LegalOverlay');if(o)o.classList.remove('show')};
    function installSingleLegalCard98(){
      var account=document.getElementById('accountPage');
      if(!account)return;
      if(document.getElementById('nel98LegalCard'))return;
      var cards=Array.prototype.slice.call(account.querySelectorAll('.card'));
      var legalCards=cards.filter(function(c){return /Legal & Food Safety|FSSAI|Grievance Officer|Business & Compliance/i.test(c.textContent||'')});
      var card=legalCards.shift()||document.createElement('div');
      legalCards.forEach(function(x){x.remove()});
      if(!card.parentNode){card.className='card';account.appendChild(card)}
      card.id='nel98LegalCard';
      card.onclick=window.nel98OpenLegal;
      card.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div><b>🛡 Legal & Food Safety</b><div class="meta" style="margin-top:4px">Business registration, FSSAI, GST, grievance and invoice information</div></div><b style="color:#075b34">View →</b></div><div class="nel98LegalStatus"><span class="nel98LegalPill pending">Checking compliance…</span></div>';
      loadLegal98();
    }
    function boot98(){fixLogo98();installSingleLegalCard98()}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot98,{once:true});else boot98();
    setTimeout(boot98,500);
  })();</script>`;
}

function b2cPageV98_(e){
  var out=HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Native Elaneeru - B2C')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
  out.append(b2cRuntimeV98_());
  out.append(b2cLoginUiV95_());
  return out;
}

function doGetV97_(e){
  var isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  var p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(!isBridge && ['','home','b2c'].includes(p)) return b2cPageV98_(e);
  var out=doGetV95_(e);
  if(!isBridge && p==='b2b') out.append(marketplaceUxV96_('B2B'));
  return out;
}

doGet=doGetV97_;
