/**
 * Native Elaneeru V9.0.1 — canonical B2C order wrapper.
 *
 * There must be exactly one saveOrder wrapper in the Apps Script project.
 * Older V839/V841 wrappers were removed because chained global overrides can
 * become circular when Apps Script file order changes during clasp deploys.
 */
const V901_CORE_SAVE_ORDER = saveOrder;

saveOrder = function(order){
  order=order||{};
  ensureB2CCustomerForOrderV841_(order);
  const result=V901_CORE_SAVE_ORDER(order);
  clearB2CDashboardCacheV839_(order.mobile);
  return result;
};

function getB2COrderEngineHealthV901(){
  return {
    ok:true,
    version:'9.0.1',
    canonicalOrderHandler:true,
    recursiveWrappers:false
  };
}
