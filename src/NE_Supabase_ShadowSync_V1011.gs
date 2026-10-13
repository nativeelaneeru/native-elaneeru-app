/**
 * Native Elaneeru - read-only shadow replication from Sheets to Supabase.
 * IMPORTANT:
 *   - Google Sheets remains the source of truth. This file does not modify Sheets.
 *   - Supabase public.ne_shadow_records is an isolated mirror, NOT live orders/payments.
 *   - Disabled unless NE_SHADOW_ENABLED=true in Apps Script Script Properties.
 *   - NE_SHADOW_SERVICE_KEY must be the Supabase legacy service_role JWT, set ONLY
 *     in Apps Script Script Properties (never hardcode or expose it to the PWA).
 *   - All Apps Script functions end with '_' so anonymous HtmlService users\n *     cannot invoke server-side sync, pause, or trigger installation via google.script.run.\n *   - Calls the strictly service_role-only RPC ne_shadow_upsert.
 *   - Canonical B2C fast checkout uses setValues directly, so poll Sheets rather
 *     than intercepting append_() (which would miss transactions).
 */
var NE_SHADOW_V1011 = Object.freeze({
  ENDPOINT: 'https://oiadqhorhxrrtdykplxe.supabase.co/rest/v1/rpc/ne_shadow_upsert',
  IMPORTANT: ['Orders','Order_Items','B2B_Orders','B2B_Order_Items'],
  ROTATING: [
    'Customers','B2B_Vendors','Products','Coconut_Batches',
    'Batch_Assignments','Inventory_Ledger','B2B_Collections',
    'Payment_Ledger','Vendor_Onboarding','Vendor_Pricing',
    'Delivery_Events','Purchase_Orders','Purchase_Order_Items','NE_Suppliers'
  ],
  ROTATION_PER_TICK: 3,
  CATCHUP_ROWS: 40,
  RECENT_ROWS: 30,
  RPC_BATCH_SIZE: 60
});

function neShadowSecretFreeStatusV1011_() {
  var properties = PropertiesService.getScriptProperties();
  return {
    enabled: properties.getProperty('NE_SHADOW_ENABLED') === 'true',
    serviceKeyConfigured: !!properties.getProperty('NE_SHADOW_SERVICE_KEY'),
    endpoint: NE_SHADOW_V1011.ENDPOINT,
    source: 'Google Sheets',
    destination: 'Supabase shadow table, not live orders',
    schedule: '5 minutes when trigger is installed'
  };
}

function neShadowSafeCellV1011_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  if (v == null) return '';
  if (typeof v === 'number' && !isFinite(v)) return '';
  return v;
}

function neShadowSanitizeV1011_(headers, cells) {
  var p = {};
  headers.forEach(function(h,i) {
    h = String(h || '').trim();
    if (!h || /(^|[^a-z])(pin|password|secret|token|otp|key|hash|credential)([^a-z]|$)/i.test(h)) return;
    if (i < cells.length) p[h] = neShadowSafeCellV1011_(cells[i]);
  });
  return p;
}

function neShadowReadWindowV1011_(sh, headers, start, end, sheetName, out) {
  if (start > end) return;
  var values = sh.getRange(start, 1, end-start+1, headers.length).getValues();
  var lineNo = headers.indexOf('Line No');
  values.forEach(function(row, j) {
    if (!row.some(function(v) {return String(v == null ? '' : v).trim() !== ''; })) return;
    var sourceId = String(row[0] == null ? '' : row[0]).trim();
    if (!sourceId) return;
    if (sheetName === 'Purchase_Order_Items') {
      var line = lineNo < 0 ? '' : String(row[lineNo] == null ? '' : row[lineNo]).trim();
      if (!line) return;
      sourceId += '::' + line;
    }
    if (sourceId.length > 160) return;
    out[sourceId] = {
      source_sheet: sheetName,
      source_id: sourceId,
      payload: neShadowSanitizeV1011_(headers, row)
    };
  });
}

function neShadowPostV1011_(entries, secret) {
  if (!entries.length) return {accepted:0,changed:0,unchanged:0};
  var result = {accepted:0,changed:0,unchanged:0};
  for(var i=0; i<entries.length; i+=NE_SHADOW_V1011.RPC_BATCH_SIZE) {
    var portion = entries.slice(i,i+NE_SHADOW_V1011.RPC_BATCH_SIZE);
    var response = UrlFetchApp.fetch(NE_SHADOW_V1011.ENDPOINT, {
      method:'post',
      contentType:'application/json',
      headers:{'apikey':secret,'Authorization':'Bearer '+secret},
      payload:JSON.stringify({batch:portion}),
      muteHttpExceptions:true,
      followRedirects:false
    });
    var status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      // Do not expose service key or row payloads in errors.
      throw new Error('Supabase shadow sync returned HTTP '+status);
    }
    var json;
    try{json=JSON.parse(response.getContentText());}
    catch(e){throw new Error('Supabase shadow sync returned invalid JSON');}
    if (!json || Number(json.accepted)!==portion.length) {
      throw new Error('Supabase shadow sync acknowledgment mismatch');
    }
    result.accepted += Number(json.accepted)||0;
    result.changed += Number(json.changed)||0;
    result.unchanged += Number(json.unchanged)||0;
  }
  return result;
}

function neShadowSyncTableV1011_(ss, name, props, secret) {
  var sh=ss.getSheetByName(name);
  if(!sh)throw new Error('Shadow sync missing source tab '+name);
  var last=sh.getLastRow(), col=sh.getLastColumn();
  if (last < 2 || col<1) return {sheet:name,accepted:0,changed:0,unchanged:0};
  var header=sh.getRange(1,1,1,col).getValues()[0];
  var key='NE_SHADOW_NEXT_'+name;
  var cursor=Number(props.getProperty(key)||2);
  if(!isFinite(cursor)||cursor<2||cursor>last)cursor=2;
  var end=Math.min(last,cursor+NE_SHADOW_V1011.CATCHUP_ROWS-1);
  var latestStart=Math.max(2,last-NE_SHADOW_V1011.RECENT_ROWS+1);
  var rows={};
  neShadowReadWindowV1011_(sh,header,cursor,end,name,rows);
  neShadowReadWindowV1011_(sh,header,latestStart,last,name,rows);
  var entries=Object.keys(rows).map(function(id){return rows[id]});
  var posted=neShadowPostV1011_(entries,secret);
  // Advance only on a fully acknowledged call. Retried calls are idempotent.
  props.setProperty(key,String(end>=last?2:end+1));
  return {sheet:name,accepted:posted.accepted,changed:posted.changed,unchanged:posted.unchanged};
}

function neShadowTickV1011_() {
  var props=PropertiesService.getScriptProperties();
  if(props.getProperty('NE_SHADOW_ENABLED')!=='true')return {enabled:false,message:'No writes attempted'};
  var key=props.getProperty('NE_SHADOW_SERVICE_KEY');
  if(!key)throw new Error('Set NE_SHADOW_SERVICE_KEY in Apps Script Script Properties first');
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return {enabled:true,busy:true};
  try {
    var ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
    var tabCursor=Number(props.getProperty('NE_SHADOW_TAB_CURSOR')||0);
    if(!isFinite(tabCursor)||tabCursor<0)tabCursor=0;
    var t=NE_SHADOW_V1011.ROTATING,chosen=NE_SHADOW_V1011.IMPORTANT.slice();
    for(var i=0;i<NE_SHADOW_V1011.ROTATION_PER_TICK;i++)
      chosen.push(t[(tabCursor+i)%t.length]);
    var reports=[];
    chosen.forEach(function(name){reports.push(neShadowSyncTableV1011_(ss,name,props,key));});
    props.setProperty('NE_SHADOW_TAB_CURSOR',String((tabCursor+NE_SHADOW_V1011.ROTATION_PER_TICK)%t.length));
    return {enabled:true,tables:reports.length,recordsAccepted:reports.reduce(function(n,x){return n+x.accepted},0),recordsChanged:reports.reduce(function(n,x){return n+x.changed},0),recordsUnchanged:reports.reduce(function(n,x){return n+x.unchanged},0)};
  } finally {lock.releaseLock();}
}

/** Run ONCE in the Apps Script editor after setting NE_SHADOW_ENABLED and
 *  NE_SHADOW_SERVICE_KEY. This installs 5-minute eventually-consistent sync. */
function neShadowInstallTriggerV1011_() {
  var c=neShadowSecretFreeStatusV1011_();
  if(!c.enabled||!c.serviceKeyConfigured)
    throw new Error('Enable mirror and configure its private server-side key first');
  var fn='neShadowTickV1011_';
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if(trigger.getHandlerFunction()===fn) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger(fn).timeBased().everyMinutes(5).create();
  return {installed:true,frequencyMinutes:5,source:'Sheets',destination:'Supabase shadow'};
}

/** Emergency pause: leaves existing Sheets and mirrored data unchanged. */
function neShadowPauseV1011_() {
  PropertiesService.getScriptProperties().setProperty('NE_SHADOW_ENABLED','false');
  return {enabled:false,existingDataPreserved:true};
}
