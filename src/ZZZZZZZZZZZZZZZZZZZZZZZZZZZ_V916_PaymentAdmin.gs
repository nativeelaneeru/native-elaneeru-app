/**
 * Native Elaneeru V9.1.6 — central Admin UPI payment review.
 * Read-only listing spans B2C + B2B Payment_Ledger rows. Verification actions
 * remain channel-specific and require valid Admin credentials.
 */

function getUpiPaymentsAdminV916(email,pin,statusFilter,channelFilter){
  requireAdmin_(email,pin);
  const status=s_(statusFilter||'VERIFICATION_PENDING').toUpperCase();
  const channel=s_(channelFilter||'ALL').toUpperCase();
  if(!['ALL','INTENT_CREATED','VERIFICATION_PENDING','PAID','REJECTED'].includes(status))throw new Error('Invalid payment status filter.');
  if(!['ALL','B2C','B2B'].includes(channel))throw new Error('Invalid payment channel filter.');

  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const sh=ss.getSheetByName(V8.SHEETS.PAYMENTS);
  if(!sh||sh.getLastRow()<2)return {ok:true,rows:[],counts:{pending:0,paid:0,rejected:0,intents:0}};

  const paymentRows=v914RowsFromSheet_(ss,V8.SHEETS.PAYMENTS).filter(function(r){
    if(s_(r.Method).toUpperCase()!=='UPI')return false;
    const st=s_(r.Status).toUpperCase(),ch=s_(r.Channel).toUpperCase();
    return (status==='ALL'||st===status)&&(channel==='ALL'||ch===channel);
  });
  const allPayments=v914RowsFromSheet_(ss,V8.SHEETS.PAYMENTS).filter(function(r){return s_(r.Method).toUpperCase()==='UPI';});
  const b2cOrders=v914RowsFromSheet_(ss,V8.SHEETS.ORDERS),b2bOrders=v914RowsFromSheet_(ss,V8.SHEETS.B2B_ORDERS);
  const b2cById={},b2bById={};
  b2cOrders.forEach(function(o){b2cById[s_(o['Order ID'])]=o;});
  b2bOrders.forEach(function(o){b2bById[s_(o['Order ID'])]=o;});

  const out=paymentRows.map(function(r){
    const ch=s_(r.Channel).toUpperCase(),orderId=s_(r['Order ID']);
    const order=ch==='B2B'?b2bById[orderId]:b2cById[orderId];
    return {
      paymentId:s_(r['Payment ID']),orderId:orderId,channel:ch||'B2C',method:'UPI',mobile:digits_(r.Mobile),
      amount:n_(r.Amount),utr:s_(r.UTR),status:s_(r.Status).toUpperCase(),merchantUpiId:s_(r['Merchant UPI ID']),
      partyName:order?s_(order['Business Name']||order['Customer Name']):'',area:order?s_(order.Area):'',
      orderStatus:order?s_(order.Status):'',paymentStatus:order?s_(order['Payment Status']):'',
      createdAt:fmtDT_(r['Created At']),submittedAt:fmtDT_(r['Submitted At']),verifiedAt:fmtDT_(r['Verified At']),
      verifiedBy:s_(r['Verified By']),notes:s_(r.Notes)
    };
  }).sort(function(a,b){return String(b.submittedAt||b.createdAt).localeCompare(String(a.submittedAt||a.createdAt));}).slice(0,100);

  function count(st){return allPayments.filter(function(r){return s_(r.Status).toUpperCase()===st;}).length;}
  return {ok:true,rows:out,counts:{pending:count('VERIFICATION_PENDING'),paid:count('PAID'),rejected:count('REJECTED'),intents:count('INTENT_CREATED')},storageSheet:V8.SHEETS.PAYMENTS};
}
