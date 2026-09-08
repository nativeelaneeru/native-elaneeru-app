/*******************************************************************************
 * NATIVE ELANEERU V9.6 — MARKETPLACE UX LAYER
 * Native Elaneeru visual identity with familiar Indian commerce patterns.
 * B2C: search/location/offer/product/cart flow inspired by modern food commerce.
 * B2B: dense business dashboard/credit/reorder flow inspired by wholesale commerce.
 * No third-party logos, names or copied trade dress are used.
 ******************************************************************************/

function marketplaceUxV96_(page){
  const isB2C=page==='index', isB2B=page==='B2B';
  if(!isB2C&&!isB2B) return '';
  const css=isB2C?`
  <style id="nel-v96-market-css">
    :root{--nel96:#087443;--nel96dark:#075b34;--nel96cream:#fff8ea;--nel96orange:#ef7d32;--nel96ink:#162019}
    body{background:
      radial-gradient(circle at 86% 22%,rgba(8,116,67,.045),transparent 24%),
      radial-gradient(circle at 14% 66%,rgba(243,198,79,.055),transparent 22%),#f7f8f7!important}
    body:before{content:'';position:fixed;right:-90px;bottom:90px;width:360px;height:360px;background:url('${NEL_V91_LOGO}') center/contain no-repeat;opacity:.022;pointer-events:none;z-index:-1}
    .app{max-width:920px!important;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.025),0 20px 80px rgba(22,55,36,.06)}
    .head,.header{background:#fff!important;color:var(--nel96ink)!important;box-shadow:0 2px 16px rgba(20,45,28,.08)!important;border-bottom:1px solid #edf0ed!important}
    .brandRow,.headerTop{align-items:center!important}.logo,.nel-v91-brandmark{width:48px!important;height:48px!important;border-radius:14px!important;box-shadow:none!important}
    .brand{color:#075b34!important;font-size:21px!important}.sub,.eyebrow{color:#768078!important;opacity:1!important}.support,.iconBtn{background:#f5f8f6!important;border:1px solid #e2e8e3!important;color:#075b34!important}
    .search{height:50px!important;border:1px solid #e2e6e3!important;border-radius:14px!important;box-shadow:0 4px 18px rgba(0,0,0,.055)!important;margin-top:12px!important}
    .wrap,.content{padding:15px!important}.hero,.banner{border-radius:22px!important;box-shadow:0 10px 30px rgba(45,61,50,.09)!important}.hero{background:linear-gradient(125deg,#fff5e3,#ecf8f0)!important}
    .hero h1{font-size:30px!important;color:#075b34!important}.coco{filter:drop-shadow(0 16px 18px rgba(56,68,57,.16))}
    .section,.sectionHead{margin-top:22px!important}.section h2,.sectionHead h2{font-size:20px!important;letter-spacing:-.35px!important}
    .quick{gap:9px!important}.quick button{border:0!important;background:#fff!important;box-shadow:0 5px 22px rgba(32,56,39,.07)!important;border-radius:16px!important}
    .products{gap:12px!important}.product{border:1px solid #edf0ed!important;border-radius:18px!important;padding:11px!important;box-shadow:0 7px 24px rgba(26,49,33,.07)!important;background:#fff!important}
    .visual{height:155px!important;border-radius:15px!important;background:linear-gradient(145deg,#edf8f1,#fff5df)!important}.pname{font-size:15px!important}.price{color:#075b34!important;font-size:19px!important}.add{background:#fff!important;color:#075b34!important;border:1.5px solid #075b34!important;font-weight:950!important}.add:hover{background:#eff8f2!important}
    .card{border:1px solid #ebefec!important;box-shadow:0 7px 24px rgba(26,49,33,.055)!important}.order{padding:15px 2px!important}.status{padding:6px 9px!important}
    .reward,.rewardHero{background:linear-gradient(135deg,#075b34,#0b8f50)!important;box-shadow:0 10px 25px rgba(7,91,52,.18)!important}
    .cartBar{background:#075b34!important;border-radius:14px!important;box-shadow:0 12px 34px rgba(7,91,52,.28)!important}.cartBar button{color:#075b34!important}
    .nav,.bottom{box-shadow:0 -5px 24px rgba(30,48,35,.07)!important;border-top:0!important}.nav .on,.nav.on{color:#075b34!important}
    .nel96-promise{margin:0 auto;max-width:920px;background:#fff8e8;border-bottom:1px solid #f0eadc;padding:9px 15px;display:flex;gap:15px;overflow:auto;white-space:nowrap;font-size:10px;font-weight:850;color:#5c675f}.nel96-promise b{color:#075b34}
    .nel96-trust{margin-top:13px;background:#fff;border:1px solid #e6ebe7;border-radius:18px;padding:14px;box-shadow:0 6px 20px rgba(26,49,33,.05)}.nel96-trust-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.nel96-trust-title{font-weight:950;font-size:15px}.nel96-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.nel96-pill{padding:6px 8px;border-radius:999px;background:#edf8f1;color:#075b34;font-size:9px;font-weight:900}.nel96-pill.pending{background:#fff2d9;color:#915500}.nel96-links{display:flex;gap:8px;overflow:auto;margin-top:10px}.nel96-links button{white-space:nowrap;border:1px solid #e0e7e2;background:#fff;border-radius:10px;padding:8px 10px;color:#075b34;font-size:10px;font-weight:900}
    .nel96-footer{margin:24px 0 90px;padding:18px 14px;text-align:center;color:#7a837d;font-size:9px;line-height:1.7;border-top:1px solid #e8ece9}.nel96-footer b{color:#075b34}
    @media(max-width:560px){.app{box-shadow:none}.wrap,.content{padding:11px!important}.visual{height:125px!important}.hero h1{font-size:27px!important}.nel96-promise{padding:8px 11px}.products{gap:8px!important}}
  </style>`:`
  <style id="nel-v96-market-css">
    :root{--nelB:#123a5a;--nelT:#0f7280;--nelGold:#d5a53c;--nelBg:#f2f5f8;--nelInk:#172634}
    body{background:#eef2f5!important;color:var(--nelInk)!important}
    body:before{content:'';position:fixed;right:-80px;bottom:80px;width:330px;height:330px;background:url('${NEL_V91_LOGO}') center/contain no-repeat;opacity:.018;pointer-events:none;z-index:-1}
    .app{max-width:980px!important;background:#f4f7f9!important;min-height:100vh}
    .login{background:linear-gradient(135deg,#0b253a,#123a5a 60%,#0f7280)!important}.panel{border-radius:20px!important}.logo,.headLogo,.nel-v91-brandmark{border-radius:12px!important}
    .head{background:linear-gradient(110deg,#0b253a,#123a5a 62%,#0f7280)!important;box-shadow:0 5px 20px rgba(12,41,64,.25)!important}
    .wrap{padding:16px!important}.credit{gap:10px!important}.credit div{background:rgba(255,255,255,.11)!important;border:1px solid rgba(255,255,255,.14)!important}.credit b{font-size:19px!important}
    .hero{background:#fff!important;border:1px solid #e1e7eb!important;box-shadow:0 8px 24px rgba(27,51,68,.07)!important}.hero .rate,.your b{color:#123a5a!important}
    .section h2,.sectionHead h2{font-size:19px!important}.card,.metric,.product{border:1px solid #e1e7eb!important;box-shadow:0 6px 20px rgba(27,51,68,.055)!important;border-radius:15px!important}
    .metrics{gap:9px!important}.metric{background:#fff!important}.metric b{color:#123a5a!important;font-size:17px!important}
    .products{gap:10px!important}.product{background:#fff!important}.visual{height:120px!important;background:linear-gradient(145deg,#e7f0f5,#fff4d7)!important}.pname{font-size:14px!important}.price{color:#123a5a!important;font-size:18px!important}.pbtn,.add{background:#123a5a!important;color:#fff!important;border-color:#123a5a!important}.qty button{color:#123a5a!important}
    .status,.badge{background:#eaf2f6!important;color:#123a5a!important}.cartBar{background:linear-gradient(120deg,#0b253a,#123a5a)!important}.nav .on,.nav.on{color:#0f7280!important}
    .nel96-bizbar{background:#fff;border-bottom:1px solid #e1e7eb;padding:10px 15px;display:flex;gap:9px;overflow:auto}.nel96-bizchip{white-space:nowrap;border:1px solid #dde6eb;border-radius:9px;padding:7px 9px;background:#f7fafb;color:#123a5a;font-size:10px;font-weight:900}.nel96-bizchip.gold{background:#fff7e3;color:#825c0b;border-color:#f0dfb0}
    .nel96-trust{margin-top:14px;background:#fff;border:1px solid #dfe7eb;border-radius:15px;padding:14px;box-shadow:0 6px 20px rgba(27,51,68,.05)}.nel96-trust-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.nel96-trust-title{font-weight:950;color:#123a5a}.nel96-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.nel96-pill{padding:6px 8px;border-radius:999px;background:#eaf2f6;color:#123a5a;font-size:9px;font-weight:900}.nel96-pill.pending{background:#fff3da;color:#8b5b00}.nel96-links{display:flex;gap:8px;overflow:auto;margin-top:10px}.nel96-links button{white-space:nowrap;border:1px solid #dfe7eb;background:#fff;border-radius:9px;padding:8px 10px;color:#123a5a;font-size:10px;font-weight:900}
    .nel96-footer{margin:24px 0 86px;padding:17px;text-align:center;color:#788590;font-size:9px;line-height:1.7;border-top:1px solid #dfe6ea}.nel96-footer b{color:#123a5a}
    @media(max-width:560px){.wrap{padding:11px!important}.products{grid-template-columns:1fr 1fr!important}.visual{height:105px!important}}
  </style>`;
  const mode=isB2C?'B2C':'B2B';
  return css+`<script>(function(){
    const MODE='${mode}';
    function el(tag,cls,html){const n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n}
    function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
    function openLegal(){const o=document.getElementById('nelLegalOverlay');if(o){const b=document.getElementById('nelLegalBtn');if(b)b.click();else o.classList.add('show')}}
    async function legalData(){try{return await rpc('getCompliancePublicV91',[])}catch(e){return null}}
    async function addTrust(){
      if(document.getElementById('nel96Trust'))return;
      const c=await legalData();if(!c)return;
      const card=el('div','nel96-trust');card.id='nel96Trust';
      card.innerHTML='<div class="nel96-trust-head"><div><div class="nel96-trust-title">'+(MODE==='B2C'?'🛡 Legal & Food Safety':'🛡 Business & Compliance')+'</div><div style="font-size:10px;color:#77827b;margin-top:2px">Sri Govindadri Ventures · '+esc(c.legalStructure||'Partnership')+'</div></div><button type="button" style="border:0;background:none;color:'+(MODE==='B2C'?'#075b34':'#123a5a')+';font-weight:900" id="nel96OpenLegal">View details →</button></div>'+
        '<div class="nel96-pills"><span class="nel96-pill '+(c.fssaiNo?'':'pending')+'">'+esc(c.fssaiNo?'FSSAI '+c.fssaiNo:'FSSAI application pending')+'</span><span class="nel96-pill '+(c.gstin?'':'pending')+'">'+esc(c.gstin?'GSTIN '+c.gstin:'GST not registered')+'</span><span class="nel96-pill">Grievance: '+esc(c.grievanceOfficer||'Indra Sena Reddy')+'</span></div>'+
        '<div class="nel96-links"><button type="button" data-legal>Terms of Service</button><button type="button" data-legal>Privacy Policy</button><button type="button" data-legal>Refund & Cancellation</button><button type="button" data-legal>Grievance & Support</button></div>';
      const account=MODE==='B2C'?document.getElementById('accountPage'):document.getElementById('accountPage');
      if(account)account.appendChild(card);else{const wrap=document.querySelector('.wrap,.content');if(wrap)wrap.appendChild(card)}
      card.querySelector('#nel96OpenLegal').onclick=openLegal;card.querySelectorAll('[data-legal]').forEach(b=>b.onclick=openLegal);
      const foot=el('div','nel96-footer','<b>Native Elaneeru</b> · '+esc(c.legalName||'Sri Govindadri Ventures')+'<br>Customer Care '+esc(c.supportPhone||'7411807675')+' · '+esc(c.fssaiNo?'FSSAI '+c.fssaiNo:'FSSAI application pending')+'<br>Terms · Privacy · Refund/Cancellation · Grievance redressal');foot.id='nel96Footer';
      const app=document.querySelector('.app');if(app)app.appendChild(foot);
    }
    function topStrip(){if(MODE==='B2C'){if(document.getElementById('nel96Promise'))return;const h=document.querySelector('.head,.header');if(!h)return;const d=el('div','nel96-promise','<span><b>✓ Fresh checked</b></span><span>🥥 Tender coconut specialist</span><span>📍 3 KM local delivery</span><span>💵 COD soft launch</span>');d.id='nel96Promise';h.insertAdjacentElement('afterend',d)}else{if(document.getElementById('nel96Bizbar'))return;const h=document.querySelector('.head');if(!h)return;const d=el('div','nel96-bizbar','<span class="nel96-bizchip">⚡ Quick reorder</span><span class="nel96-bizchip">📦 Bulk MOQ pricing</span><span class="nel96-bizchip">💳 Credit visibility</span><span class="nel96-bizchip gold">🧾 Invoice & compliance</span>');d.id='nel96Bizbar';h.insertAdjacentElement('afterend',d)}}
    function enhance(){topStrip();addTrust();}
    setTimeout(enhance,500);new MutationObserver(()=>{topStrip();if(!document.getElementById('nel96Trust'))addTrust()}).observe(document.body,{childList:true,subtree:true});
  })();</script>`;
}

function doGetV96_(e){
  const out=doGetV95_(e);
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return out;
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  const page=(p==='b2b')?'B2B':((!p||p==='home'||p==='b2c')?'index':'');
  if(page) out.append(marketplaceUxV96_(page));
  return out;
}

doGet=doGetV96_;
