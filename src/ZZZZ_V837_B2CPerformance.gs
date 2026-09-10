/**
 * Native Elaneeru V8.3.7 — B2C catalogue performance cache.
 *
 * Product and banner reads are shared across all B2C customers. Cache the
 * assembled public payload briefly so normal app opens do not re-read both
 * Sheets every time. Prices/statuses refresh automatically within two minutes.
 */
const V837_B2C_CONFIG_CACHE_KEY = 'NEL_B2C_APP_CONFIG_V837';
const V837_ORIGINAL_GET_APP_CONFIG = getAppConfig;

getAppConfig = function(){
  const cache = CacheService.getScriptCache();
  const hit = cache.get(V837_B2C_CONFIG_CACHE_KEY);
  if(hit){
    try{return JSON.parse(hit)}catch(err){}
  }

  const out = V837_ORIGINAL_GET_APP_CONFIG();
  out.appVersion = '8.3.7';
  try{
    const json = JSON.stringify(out);
    if(json.length < 95000) cache.put(V837_B2C_CONFIG_CACHE_KEY,json,120);
  }catch(err){}
  return out;
};

function clearB2CCatalogCacheV837_(){
  CacheService.getScriptCache().remove(V837_B2C_CONFIG_CACHE_KEY);
}
