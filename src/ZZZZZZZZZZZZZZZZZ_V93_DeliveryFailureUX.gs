/*******************************************************************************
 * NATIVE ELANEERU V9.3 — DELIVERY FAILURE UX
 * Adds a mandatory reason sheet to existing Apps Script Driver/Delivery pages.
 ******************************************************************************/

function deliveryFailureUiV93_(page){
  const type=page==='Driver'?'B2B':'B2C';
  return `<style>
    .nel-fail-btn{width:100%;margin-top:9px;border:1px solid #efc4bf!important;background:#fff3f1!important;color:#b42318!important;font-weight:900!important}
    .nel-fail-sheet{position:fixed;inset:0;z-index:99990;background:#0008;display:none;align-items:flex-end}.nel-fail-sheet.show{display:flex}
    .nel-fail-box{width:100%;max-width:700px;margin:auto;background:#fff;border-radius:24px 24px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px #0003}
    .nel-fail-box select,.nel-fail-box textarea{width:100%;margin-top:8px;padding:12px;border:1px solid #dfe7e1;border-radius:12px;background:#fff}.nel-fail-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    @media(max-width:480px){.nel-fail-actions{grid-template-columns:1fr}}
  </style><div id="nelFailSheet" class="nel-fail-sheet"><div class="nel-fail-box"><h3 style="margin:0">Unable to Deliver</h3><div style="font-size:12px;color:#68766d;margin-top:4px">Reason, GPS, time, driver and order are logged automatically.</div><select id="nelFailReason"><option value="">Choose reason</option><option value="CUSTOMER_UNAVAILABLE">Customer unavailable</option><option value="WRONG_ADDRESS">Wrong address</option><option value="RESCHEDULE">Reschedule requested</option><option value="DAMAGED">Damaged stock</option><option value="REJECTED">Rejected by customer</option></select><textarea id="nelFailRemarks" rows="3" placeholder="Remarks (recommended)"></textarea><div class="nel-fail-actions"><button type="button" onclick="nelCloseFailV93()" style="background:#eef3ef;color:#33423a">Cancel</button><button type="button" onclick="nelConfirmFailV93()" style="background:#b42318;color:#fff">Confirm Unable to Deliver</button></div></div></div><script>
  (function(){
    const TYPE='${type}'; let FAIL_STOP='';
    window.nelCloseFailV93=function(){document.getElementById('nelFailSheet').classList.remove('show');FAIL_STOP='';};
    window.nelOpenFailV93=function(id){FAIL_STOP=id;document.getElementById('nelFailReason').value='';document.getElementById('nelFailRemarks').value='';document.getElementById('nelFailSheet').classList.add('show');};
    window.nelConfirmFailV93=async function(){const reason=document.getElementById('nelFailReason').value;if(!reason)return alert('Choose a reason');if(!FAIL_STOP)return;try{const p=await pos();const r=await rpc('driverUnableToDeliverV92',[MOB,PIN,TYPE,FAIL_STOP,reason,document.getElementById('nelFailRemarks').value,p.coords.latitude,p.coords.longitude]);nelCloseFailV93();try{stopGps()}catch(e){};alert(r.routeCompleted?'Exception saved. Route completed.':'Exception saved. Moving to next stop.');await refresh()}catch(e){alert(e.message)}};
    function activeStop(){try{return (DATA&&DATA.stops||[]).find(x=>!['COMPLETED','CANCELLED'].includes(String(x.status||'').toUpperCase()))||null}catch(e){return null}}
    function ensure(){const st=activeStop();if(!st)return;const host=TYPE==='B2B'?document.querySelector('.card.stop.active'):document.querySelector('.card.activeCard');if(!host||host.querySelector('.nel-fail-btn'))return;const b=document.createElement('button');b.className='nel-fail-btn';b.type='button';b.textContent='⚠ Unable to Deliver';b.onclick=()=>nelOpenFailV93(st.stopId);host.appendChild(b)}
    new MutationObserver(ensure).observe(document.body,{childList:true,subtree:true});setInterval(ensure,1200);setTimeout(ensure,300);
  })();
  </script>`;
}

function doGetV93_(e){
  const out=doGetV91Compliance_(e);
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return out;
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(['driver','b2bdriver'].includes(p)) out.append(deliveryFailureUiV93_('Driver'));
  if(['delivery','b2cdelivery'].includes(p)) out.append(deliveryFailureUiV93_('Delivery'));
  return out;
}

doGet=doGetV93_;
