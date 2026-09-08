/*******************************************************************************
 * NATIVE ELANEERU V9.1 — COMPLIANCE ROUTER LAYER
 * Adds legal/FSSAI + invoice UI after the existing V9.1 product UX router.
 ******************************************************************************/

function doGetV91Compliance_(e){
  const out=doGetV91_(e);
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return out;
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  const page=(p==='b2b')?'B2B':((!p||p==='home'||p==='b2c')?'index':'');
  if(page) out.append(complianceUiV91_(page));
  return out;
}

doGet=doGetV91Compliance_;
