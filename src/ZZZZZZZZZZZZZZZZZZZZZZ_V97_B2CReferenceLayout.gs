/*******************************************************************************
 * NATIVE ELANEERU V9.8 — CLEAN B2C ROUTER / SINGLE OWNER
 *
 * B2C no longer traverses the older V9.1 compliance + V9.6 marketplace
 * injection chain. The rich consumer layout in src/index.html owns the B2C UI.
 * This router adds only:
 *   1) a guaranteed RPC bridge,
 *   2) one Legal & Food Safety card/modal,
 *   3) the V9.5 mobile-session login,
 *   4) final embedded Native Elaneeru logo replacement.
 *
 * B2B and all operational apps continue through the existing V9.7 chain.
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
    const LOGO='${NEL_V91_LOGO}';
    if(typeof window.rpc!=='function'){
      window.rpc=function(name,args){args=Array.isArray(args)?args:[];return new Promise(function(resolve,reject){google.script.run.withSuccessHandler(resolve).withFailureHandler(function(e){reject(new Error(e&&e.message?e.message:String(e)))}).rpcV9(name,args)})};
    }
    function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
    function fixLogo(){document.querySelectorAll('img.logo,img.headLogo,img.nel-v91-brandmark,img.nel9-brandmark').forEach(function(img){img.src=LOGO;img.onerror=null})}
    async function loadLegal(){
      const body=document.getElementById('nel98LegalBody');
      try{
        const c=await window.rpc('getCompliancePublicV91',[]);
        const rows=[['Legal entity',(c.legalName||'Sri Govindadri Ventures')+' ('+(c.legalStructure||'Partnership')+')'],['Business address',c.businessAddress||'Address pending'],['FSSAI',c.fssaiNo||'Application Pending'],['GST',c.gstin||'Not Registered'],['Grievance Officer',c.grievanceOfficer||'Indra Sena Reddy'],['Grievance email',c.grievanceEmail||'To be confirmed'],['Customer care',c.supportPhone||'7411807675'],['Invoice type',c.invoiceDocumentType||'Commercial Invoice / Receipt']];
        body.innerHTML=rows.map(function(r){return '<div class="nel98LegalRow"><b>'+esc(r[0])+'</b><span>'+esc(r[1])+'</span></div>'}).join('')+'<div style="margin-top:11px;padding:10px;border-radius:12px;background:'+(c.fssaiNo?'#edf8f1':'#fff4df')+';font-size:10px;line-height:1.5">'+(c.fssaiNo?'FSSAI licence is configured in the compliance master.':'FSSAI application is pending. No licence number is being claimed in the app.')+'</div>';
        const card=document.getElementById('nel98LegalCard');
        if(card){card.querySelector('.nel98LegalStatus').innerHTML='<span class="nel98LegalPill '+(c.fssaiNo?'':'pending')+'">'+esc(c.fssaiNo?'FSSAI '+c.fssaiNo:'FSSAI Application Pending')+'</span><span class="nel98LegalPill '+(c.gstin?'':'pending')+'">'+esc(c.gstin?'GSTIN '+c.gstin:'GST Not Registered')+'</span>'}
      }catch(e){body.textContent=e&&e.message?e.message:String(e)}
    }
    window.nel98OpenLegal=function(){document.getElementById('nel98LegalOverlay').classList.add('show');loadLegal()};
    window.nel98CloseLegal=function(){document.getElementById('nel98LegalOverlay').classList.remove('show')};
    function installSingleLegalCard(){
      const account=document.getElementById('accountPage');if(!account)return;
      const cards=Array.prototype.slice.call(account.querySelectorAll('.card'));
      const legalCards=cards.filter(function(c){return /Legal & Food Safety|FSSAI|Grievance Officer|Business & Compliance/i.test(c.textContent||'')});
      let card=legalCards[0];legalCards.slice(1).forEach(function(x){x.remove()});
      if(!card){card=document.createElement('div');card.className='card';account.appendChild(card)}
      card.id='nel98LegalCard';card.onclick=window.nel98OpenLegal;
      card.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div><b>🛡 Legal & Food Safety</b><div class="meta" style="margin-top:4px">Business registration, FSSAI, GST, grievance and invoice information</div></div><b style="color:#075b34">View →</b></div><div class="nel98LegalStatus"><span class="nel98LegalPill pending">Checking compliance…</span></div>';
      loadLegal();
    }
    fixLogo();installSingleLegalCard();
    new MutationObserver(function(){fixLogo();installSingleLegalCard()}).observe(document.body,{childList:true,subtree:true});
    setTimeout(function(){fixLogo();installSingleLegalCard()},300);
  })();</script>`;
}

function b2cPageV98_(e){
  const out=HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Native Elaneeru - B2C')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
  // Important: runtime first, then login. Login uses window.rpc after a short timeout.
  out.append(b2cRuntimeV98_());
  out.append(b2cLoginUiV95_());
  return out;
}

function doGetV97_(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(!isBridge && ['','home','b2c'].includes(p)) return b2cPageV98_(e);
  // B2B / Admin / Ops stay on the existing chain.
  const out=doGetV95_(e);
  if(!isBridge && p==='b2b') out.append(marketplaceUxV96_('B2B'));
  return out;
}

doGet=doGetV97_;
