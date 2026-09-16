/**
 * TEMPORARY TEST BRIDGE ONLY.
 * This file exists only on test/approved-temp-ops-e2e and is never intended
 * for production main. The workflow replaces the placeholder with a random
 * one-run secret before deploying an old Preview slot, then restores that
 * Preview deployment and production Apps Script HEAD.
 */
const V962_TEMP_E2E_SECRET='__V962_RUNTIME_SECRET__';
const V962_PREVIOUS_DO_POST=doPost;

function v962Json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

doPost=function(e){
  const isTemp=String(e&&e.parameter&&e.parameter.v962||'')==='1';
  if(!isTemp)return V962_PREVIOUS_DO_POST(e);
  try{
    const secret=String(e&&e.parameter&&e.parameter.secret||'');
    if(!secret||secret!==V962_TEMP_E2E_SECRET)throw new Error('Unauthorized temporary E2E request.');
    const action=String(e&&e.parameter&&e.parameter.action||'').toLowerCase();
    if(action==='health')return v962Json_({ok:true,result:getApprovedTempOpsE2EHealthV961()});
    if(action==='run')return v962Json_({ok:true,result:runApprovedTempOpsE2EV961()});
    throw new Error('Unknown temporary E2E action.');
  }catch(err){
    return v962Json_({ok:false,error:String(err&&err.message||err)});
  }
};
