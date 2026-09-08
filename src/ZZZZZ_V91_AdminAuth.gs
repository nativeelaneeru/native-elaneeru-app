/*******************************************************************************
 * NATIVE ELANEERU V9.1 — ADMIN AUTH FROM FRESH OPERATIONS
 *
 * Primary source: Admin_Users sheet
 * Fallback: legacy Script Properties
 * PIN is never stored in plain text; only SHA-256 hash is compared.
 *******************************************************************************/

function adminUsersV91_(){
  const sh=ss_().getSheetByName('Admin_Users');
  if(!sh || sh.getLastRow()<2) return [];
  const vals=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues();
  const h=vals[0].map(s_);
  return vals.slice(1).map((r,i)=>{
    const o={_row:i+2};
    h.forEach((k,j)=>{ if(k) o[k]=r[j]; });
    return o;
  });
}

function adminSheetOkV91_(email,pin){
  const e=s_(email).toLowerCase();
  const h=hashV8_(pin);
  if(!e || !h) return false;
  return adminUsersV91_().some(r=>
    s_(r.Email).toLowerCase()===e &&
    s_(r['PIN Hash'])===h &&
    active_(r.Status)
  );
}

function adminOk_(email,pin){
  if(adminSheetOkV91_(email,pin)) return true;

  // Legacy fallback so existing production credentials still work.
  const p=PropertiesService.getScriptProperties();
  const e=s_(p.getProperty('ADMIN_EMAIL')).toLowerCase();
  const h=s_(p.getProperty('ADMIN_PIN_HASH'));
  return !!e && e===s_(email).toLowerCase() && h===hashV8_(pin);
}

function adminLogin(email,pin){
  const ok=adminOk_(email,pin);
  if(ok){
    try{
      const e=s_(email).toLowerCase();
      const rows=adminUsersV91_();
      const hit=rows.find(r=>s_(r.Email).toLowerCase()===e && active_(r.Status));
      if(hit){
        const sh=ss_().getSheetByName('Admin_Users');
        const m=map_(sh);
        if(m['Last Login']) sh.getRange(hit._row,m['Last Login']).setValue(now_());
        if(m['Updated At']) sh.getRange(hit._row,m['Updated At']).setValue(now_());
      }
    }catch(err){}
  }
  return ok;
}

function requireAdmin_(email,pin){
  if(!adminOk_(email,pin)) throw new Error('Invalid admin credentials.');
}
