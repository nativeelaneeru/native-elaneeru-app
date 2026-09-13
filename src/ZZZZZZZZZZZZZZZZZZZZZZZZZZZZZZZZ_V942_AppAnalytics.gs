const V942_ANALYTICS_SHEET='App_Analytics';

function trackAppEventsV942(events){
  const allowed={OPEN:true,PLV:true,ATC:true,ORDER:true,INSTALL:true};
  const rows=(Array.isArray(events)?events:[]).slice(0,20).map(function(e){
    const event=String(e&&e.event||'').toUpperCase();
    const app=String(e&&e.app||'').toUpperCase();
    if(!allowed[event]||!/^B2[CB]$/.test(app))return null;
    return [new Date(),app,event,String(e.visitorId||'').slice(0,80),String(e.path||'').slice(0,200),JSON.stringify(e.meta||{}).slice(0,1000),String(e.at||'').slice(0,40)];
  }).filter(Boolean);
  if(!rows.length)return {accepted:0};
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  let sh=ss.getSheetByName(V942_ANALYTICS_SHEET);
  if(!sh)sh=ss.insertSheet(V942_ANALYTICS_SHEET);
  if(sh.getLastRow()===0)sh.appendRow(['Server Time','App','Event','Visitor ID','Path','Metadata','Client Time']);
  sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
  return {accepted:rows.length};
}

function getAppAnalyticsV942(email,pin,start,end){
  if(adminLogin(email,pin)!==true)throw new Error('Invalid admin credentials.');
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID),sh=ss.getSheetByName(V942_ANALYTICS_SHEET);
  const out={B2C:{OPEN:0,PLV:0,ATC:0,ORDER:0,INSTALL:0,visitors:{}},B2B:{OPEN:0,PLV:0,ATC:0,ORDER:0,INSTALL:0,visitors:{}}};
  if(!sh||sh.getLastRow()<2)return out;
  const from=start?new Date(start+'T00:00:00'):null,to=end?new Date(end+'T23:59:59'):null;
  sh.getRange(2,1,sh.getLastRow()-1,7).getValues().forEach(function(r){const d=new Date(r[0]);if((from&&d<from)||(to&&d>to))return;const a=out[String(r[1])],ev=String(r[2]);if(!a||a[ev]===undefined)return;a[ev]++;if(r[3])a.visitors[String(r[3])]=true});
  Object.keys(out).forEach(function(k){out[k].uniqueVisitors=Object.keys(out[k].visitors).length;delete out[k].visitors});return out;
}
