/*******************************************************************************
 * NATIVE ELANEERU V9.7 — B2C REFERENCE-LAYOUT ROUTER
 * B2C now owns its full consumer-commerce layout inside src/index.html.
 * Avoids stacking the older V9.6 B2C marketplace skin on top of it.
 * B2B continues to use the V9.6 wholesale marketplace layer.
 ******************************************************************************/
function doGetV97_(e){
  const out=doGetV95_(e);
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return out;
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(p==='b2b') out.append(marketplaceUxV96_('B2B'));
  return out;
}
doGet=doGetV97_;
