/*******************************************************************************
 * NATIVE ELANEERU V9.1 — COMPLIANCE + INVOICES
 * Master source: Compliance_Config + Invoices in Fresh Operations.
 * Customer-facing legal details are read from the sheet; no fake licence IDs.
 ******************************************************************************/

const NEL_V91_COMPLIANCE_SHEET='Compliance_Config';
const NEL_V91_INVOICES_SHEET='Invoices';

function complianceCfgV91_(){
  const sh=ss_().getSheetByName(NEL_V91_COMPLIANCE_SHEET);
  const out={};
  if(!sh||sh.getLastRow()<2) return out;
  sh.getRange(2,1,sh.getLastRow()-1,4).getValues().forEach(r=>{if(s_(r[0])) out[s_(r[0])]=r[1];});
  return out;
}

function getCompliancePublicV91(){
  const c=complianceCfgV91_();
  const fno=s_(c['FSSAI Licence No']);
  const gstin=s_(c.GSTIN);
  return {
    legalName:s_(c['Legal Entity Name']||'Sri Govindadri Ventures'),
    legalStructure:s_(c['Legal Structure']||'Partnership'),
    businessAddress:s_(c['Business Address']||'Bengaluru, Karnataka, India'),
    addressStatus:s_(c['Business Address'])?'CONFIGURED':'PENDING',
    supportPhone:s_(c['Support Phone']||'7411807675'),
    supportWhatsApp:s_(c['Support WhatsApp']||'917411807675'),
    grievanceOfficer:s_(c['Grievance Officer']||'Indra Sena Reddy'),
    grievanceEmail:s_(c['Grievance Email']||''),
    fssaiStatus:s_(c['FSSAI Status']||'NOT_APPLIED'),
    fssaiNo:fno,
    fssaiLabel:fno?('FSSAI • '+fno):'FSSAI • Application Pending',
    gstStatus:s_(c['GST Status']||'NOT_REGISTERED'),
    gstin:gstin,
    invoiceDocumentType:s_(c['Invoice Document Type']||'COMMERCIAL INVOICE / RECEIPT'),
    termsStatus:s_(c['Terms Status']||'DRAFT_REQUIRED'),
    privacyStatus:s_(c['Privacy Status']||'DRAFT_REQUIRED'),
    refundStatus:s_(c['Refund/Cancellation Status']||'DRAFT_REQUIRED')
  };
}

function invoiceFyV91_(d){
  d=d||new Date();
  const y=d.getMonth()>=3?d.getFullYear():d.getFullYear()-1;
  return String(y).slice(-2)+'-'+String(y+1).slice(-2);
}

function invoiceRowsV91_(channel,orderId){
  const sh=ss_().getSheetByName(NEL_V91_INVOICES_SHEET);
  if(!sh||sh.getLastRow()<2) return [];
  return rows_(NEL_V91_INVOICES_SHEET).filter(r=>s_(r.Channel)===s_(channel)&&s_(r['Order ID'])===s_(orderId));
}

function invoicePayloadFromRowsV91_(rr){
  if(!rr||!rr.length) return null;
  const f=rr[0], legal=getCompliancePublicV91();
  return {
    invoiceId:s_(f['Invoice ID']),invoiceNo:s_(f['Invoice No']),invoiceDate:fmtDT_(f['Invoice Date']),
    channel:s_(f.Channel),orderId:s_(f['Order ID']),partyId:s_(f['Party ID']),partyName:s_(f['Party Name']),
    mobile:s_(f.Mobile),address:s_(f['Billing/Delivery Address']),documentType:legal.invoiceDocumentType,
    subtotal:n_(f.Subtotal),deliveryFee:n_(f['Delivery Fee']),discount:n_(f.Discount),gstRate:n_(f['GST Rate']),
    gstAmount:n_(f['GST Amount']),total:n_(f['Total Amount']),paymentType:s_(f['Payment Type']),
    status:s_(f.Status),legal:legal,
    items:rr.map(r=>({productId:s_(r['Product ID']),productName:s_(r['Product Name']),hsn:s_(r.HSN),qty:n_(r.Qty),rate:n_(r.Rate),lineAmount:n_(r['Line Amount'])}))
  };
}

function ensureInvoiceV91_(channel,order,items){
  return lockRun_(()=>{
    const existing=invoiceRowsV91_(channel,s_(order['Order ID']));
    if(existing.length) return invoicePayloadFromRowsV91_(existing);
    if(!items||!items.length) throw new Error('No order items found for invoice.');

    const c=complianceCfgV91_(), all=rows_(NEL_V91_INVOICES_SHEET);
    const seen={}; all.forEach(r=>{if(s_(r['Invoice ID'])) seen[s_(r['Invoice ID'])]=true;});
    const seq=Object.keys(seen).length+1, now=new Date(), fy=invoiceFyV91_(now), prefix=s_(c['Invoice Prefix']||'NEL');
    const invoiceId=id_('INV-'), invoiceNo=prefix+'/'+fy+'/'+channel+'/'+String(seq).padStart(6,'0');
    const orderId=s_(order['Order ID']);
    const partyId=channel==='B2B'?s_(order['Vendor ID']):s_(order['Customer ID']);
    const partyName=channel==='B2B'?s_(order['Business Name']||order['Owner Name']):s_(order['Customer Name']||order.Name);
    const address=channel==='B2B'?s_(order['Delivery Address']||order.Address):s_(order.Address);
    const deliveryFee=channel==='B2B'?n_(order['Delivery Charge']):n_(order['Delivery Fee']);
    const subtotal=n_(order.Subtotal), discount=n_(order.Discount), total=n_(order['Total Amount']||order['Final Amount']);
    const gstRate=n_(c['Tender Coconut GST Rate']), gstAmount=0, fssai=s_(c['FSSAI Licence No']), gstin=s_(c.GSTIN);

    items.forEach(it=>{
      const productId=s_(it['Product ID']), productName=s_(it['Product Name']), qty=n_(it.Quantity), rate=n_(it['Unit Price']);
      const lineAmount=n_(it['Line Amount']||it['Line Total']||qty*rate);
      append_(NEL_V91_INVOICES_SHEET,{
        'Invoice ID':invoiceId,'Invoice No':invoiceNo,'Invoice Date':now,'Channel':channel,'Order ID':orderId,
        'Party ID':partyId,'Party Name':partyName,'Mobile':digits_(order.Mobile),'Billing/Delivery Address':address,
        'Product ID':productId,'Product Name':productName,'HSN':productId==='TC'?s_(c['Tender Coconut HSN']||'0801'):'',
        'Qty':qty,'Rate':rate,'Line Amount':lineAmount,'Subtotal':subtotal,'Delivery Fee':deliveryFee,'Discount':discount,
        'GST Rate':gstRate,'GST Amount':gstAmount,'Total Amount':total,'Payment Type':s_(order['Payment Type']),
        'FSSAI Licence No':fssai,'GSTIN':gstin,'Status':'ISSUED','Created At':now
      });
    });
    return invoicePayloadFromRowsV91_(invoiceRowsV91_(channel,orderId));
  });
}

function getB2CInvoiceV91(mobile,orderId){
  mobile=digits_(mobile); orderId=s_(orderId);
  const order=find_(V8.SHEETS.ORDERS,'Order ID',orderId);
  if(!order) throw new Error('Order not found.');
  if(digits_(order.Mobile)!==mobile) throw new Error('This order does not belong to this customer.');
  const items=rows_(V8.SHEETS.ORDER_ITEMS).filter(r=>s_(r['Order ID'])===orderId);
  return ensureInvoiceV91_('B2C',order,items);
}

function getB2BInvoiceV91(token,orderId){
  const vendor=vendor_(token), vendorId=s_(vendor['Vendor ID']); orderId=s_(orderId);
  const order=find_(V8.SHEETS.B2B_ORDERS,'Order ID',orderId);
  if(!order) throw new Error('Order not found.');
  if(s_(order['Vendor ID'])!==vendorId) throw new Error('This order does not belong to this business account.');
  const items=rows_(V8.SHEETS.B2B_ORDER_ITEMS).filter(r=>s_(r['Order ID'])===orderId);
  return ensureInvoiceV91_('B2B',order,items);
}

function getAdminInvoiceV91(email,pin,channel,orderId){
  requireAdmin_(email,pin); channel=s_(channel).toUpperCase(); orderId=s_(orderId);
  if(channel==='B2B'){
    const order=find_(V8.SHEETS.B2B_ORDERS,'Order ID',orderId); if(!order) throw new Error('Order not found.');
    return ensureInvoiceV91_('B2B',order,rows_(V8.SHEETS.B2B_ORDER_ITEMS).filter(r=>s_(r['Order ID'])===orderId));
  }
  const order=find_(V8.SHEETS.ORDERS,'Order ID',orderId); if(!order) throw new Error('Order not found.');
  return ensureInvoiceV91_('B2C',order,rows_(V8.SHEETS.ORDER_ITEMS).filter(r=>s_(r['Order ID'])===orderId));
}

function complianceUiV91_(page){
  if(page!=='index'&&page!=='B2B') return '';
  const channel=page==='B2B'?'B2B':'B2C';
  return `<style>
    .nel-legal-btn{border:1px solid #ffffff55;background:#ffffff18;color:#fff;border-radius:11px;padding:8px 10px;font-weight:900;font-size:10px;white-space:nowrap;margin-left:auto}.nel-legal-btn.pending{background:#8a5a001f;border-color:#ffd77b66;color:#fff4cf}
    .nel-legal-overlay{position:fixed;inset:0;background:#0009;z-index:99990;display:none;align-items:flex-end}.nel-legal-overlay.show{display:flex}.nel-legal-sheet{width:100%;max-width:760px;margin:auto;background:#fff;border-radius:24px 24px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));max-height:88vh;overflow:auto;color:#17211b}.nel-legal-row{display:grid;grid-template-columns:130px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid #e8ece9;font-size:12px}.nel-legal-row b{color:#58645d}.nel-legal-close{float:right;border:0;background:#edf3ef;color:#173d24;width:36px;height:36px;border-radius:10px;font-size:20px}.nel-invoice-btn{border:1px solid #bfd5c6;background:#f1f8f3;color:#075b34;border-radius:9px;padding:7px 9px;font-size:10px;font-weight:900;margin-top:8px}
    @media(max-width:430px){.nel-legal-btn{font-size:9px;padding:7px 8px}.nel-legal-row{grid-template-columns:1fr;gap:2px}}
  </style>
  <div id="nelLegalOverlay" class="nel-legal-overlay" onclick="if(event.target===this)this.classList.remove('show')"><div class="nel-legal-sheet"><button class="nel-legal-close" onclick="document.getElementById('nelLegalOverlay').classList.remove('show')">×</button><h2 style="margin:4px 0 3px">Legal & Food Safety</h2><div style="font-size:11px;color:#6b776e;margin-bottom:10px">Native Elaneeru · Sri Govindadri Ventures</div><div id="nelLegalBody">Loading…</div></div></div>
  <script>(function(){
    const CHANNEL='${channel}'; let LEGAL=null;
    const e=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
    function legalRows(c){return [
      ['Legal entity',c.legalName+' ('+c.legalStructure+')'],['Business address',c.businessAddress],['FSSAI',c.fssaiNo?c.fssaiNo:'Application pending'],['GST',c.gstin?c.gstin:'Not registered'],
      ['Grievance Officer',c.grievanceOfficer],['Grievance email',c.grievanceEmail||'To be confirmed'],['Customer care',c.supportPhone],['Invoice type',c.invoiceDocumentType]
    ].map(x=>'<div class="nel-legal-row"><b>'+e(x[0])+'</b><span>'+e(x[1])+'</span></div>').join('')+
    '<div style="margin-top:12px;padding:10px;border-radius:12px;background:'+(c.fssaiNo?'#edf8f1':'#fff6df')+';font-size:11px">'+(c.fssaiNo?'FSSAI licence is configured in the master compliance record.':'FSSAI Central Licence has not been applied for yet. No licence number is being claimed in this app.')+'</div>';
    async function loadLegal(){try{LEGAL=await rpc('getCompliancePublicV91',[]);let target=document.querySelector('.brandRow')||document.querySelector('.headTop');if(target&&!document.getElementById('nelLegalBtn')){const b=document.createElement('button');b.id='nelLegalBtn';b.className='nel-legal-btn '+(LEGAL.fssaiNo?'':'pending');b.textContent=LEGAL.fssaiLabel;b.onclick=()=>{document.getElementById('nelLegalBody').innerHTML=legalRows(LEGAL);document.getElementById('nelLegalOverlay').classList.add('show')};target.appendChild(b)}}catch(err){}}
    function extractId(card){const t=card.textContent||'';const r=CHANNEL==='B2B'?/NEB2B-[A-Z0-9-]+/i:/NEL-[A-Z0-9-]+/i;const m=t.match(r);return m?m[0]:''}
    function invoiceDoc(d){const rows=(d.items||[]).map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+e(x.productName)+'</td><td>'+e(x.hsn)+'</td><td style="text-align:right">'+x.qty+'</td><td style="text-align:right">'+money(x.rate)+'</td><td style="text-align:right">'+money(x.lineAmount)+'</td></tr>').join('');const l=d.legal||{};return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+e(d.invoiceNo)+'</title><style>body{font-family:Arial,sans-serif;color:#17211b;margin:28px}.top{display:flex;justify-content:space-between;gap:20px}.brand{font-size:24px;font-weight:900;color:#075b34}.muted{color:#66736b;font-size:12px}.box{border:1px solid #dde5df;border-radius:10px;padding:12px;margin-top:14px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #e7ece8;padding:9px;font-size:12px}th{background:#f1f7f3;text-align:left}.sum{margin-left:auto;width:300px;margin-top:14px}.sum div{display:flex;justify-content:space-between;padding:5px}.total{font-size:17px;font-weight:900;border-top:2px solid #1b5332;margin-top:5px;padding-top:9px!important}.footer{font-size:11px;color:#66736b;margin-top:24px;line-height:1.6}@media print{button{display:none}body{margin:12mm}}</style></head><body><div class="top"><div><div class="brand">Native Elaneeru</div><b>'+e(l.legalName||'Sri Govindadri Ventures')+'</b><div class="muted">'+e(l.legalStructure||'')+' · '+e(l.businessAddress||'')+'</div></div><div style="text-align:right"><h2 style="margin:0">'+e(d.documentType)+'</h2><div class="muted">Invoice: '+e(d.invoiceNo)+'<br>Date: '+e(d.invoiceDate)+'<br>Order: '+e(d.orderId)+'</div></div></div><div class="box"><b>Customer / Business</b><div class="muted" style="margin-top:5px">'+e(d.partyName)+' · '+e(d.mobile)+'<br>'+e(d.address)+'</div></div><table><thead><tr><th>#</th><th>Product</th><th>HSN</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>'+rows+'</tbody></table><div class="sum"><div><span>Subtotal</span><b>'+money(d.subtotal)+'</b></div><div><span>Delivery</span><b>'+money(d.deliveryFee)+'</b></div><div><span>Discount</span><b>- '+money(d.discount)+'</b></div><div><span>GST</span><b>'+money(d.gstAmount)+'</b></div><div class="total"><span>Total</span><b>'+money(d.total)+'</b></div></div><div class="footer">Payment: '+e(d.paymentType)+'<br>GSTIN: '+e(l.gstin||'Not registered')+'<br>FSSAI Licence: '+e(l.fssaiNo||'Application pending')+'<br>Grievance Officer: '+e(l.grievanceOfficer||'')+' · '+e(l.grievanceEmail||'')+'<br>Customer Care: '+e(l.supportPhone||'7411807675')+'</div><button onclick="window.print()" style="margin-top:18px;padding:10px 14px;border:0;border-radius:9px;background:#075b34;color:#fff;font-weight:900">Print / Save PDF</button></body></html>'}
    async function openInvoice(id){const w=window.open('','_blank');if(!w)return alert('Allow pop-ups to open invoice.');w.document.write('<p style="font-family:Arial;padding:20px">Generating invoice…</p>');try{let d;if(CHANNEL==='B2B'){const token=(typeof S!=='undefined'&&S.token)||sessionStorage.getItem('nel_b2b_token')||'';if(!token)throw new Error('Please login again.');d=await rpc('getB2BInvoiceV91',[token,id])}else{let mobile='';try{mobile=(document.getElementById('mobile')||{}).value||JSON.parse(localStorage.getItem('nel_profile_v9')||'{}').mobile||''}catch(x){}if(!mobile)throw new Error('Save your mobile number in Account first.');d=await rpc('getB2CInvoiceV91',[mobile,id])}w.document.open();w.document.write(invoiceDoc(d));w.document.close()}catch(err){w.close();alert(err.message||err)}}
    function addInvoiceButtons(){document.querySelectorAll('.order').forEach(card=>{if(card.querySelector('.nel-invoice-btn'))return;const id=extractId(card);if(!id)return;const b=document.createElement('button');b.className='nel-invoice-btn';b.textContent='🧾 Invoice';b.onclick=()=>openInvoice(id);card.appendChild(b)})}
    const ob=new MutationObserver(()=>addInvoiceButtons());ob.observe(document.documentElement,{subtree:true,childList:true});document.addEventListener('DOMContentLoaded',()=>{loadLegal();addInvoiceButtons()});setTimeout(()=>{loadLegal();addInvoiceButtons()},500);
  })();</script>`;
}
