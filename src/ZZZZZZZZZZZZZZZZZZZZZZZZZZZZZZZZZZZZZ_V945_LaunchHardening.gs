/** Native Elaneeru V9.4.5 — launch-safe catalogue presentation. */
const V945_BASE_GET_APP_CONFIG=getAppConfig;
function v945ValidImage_(url){
  url=s_(url);
  if(!/^https:\/\//i.test(url)||/your-image-link|example\.com|placeholder/i.test(url))return '';
  const match=url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i)||url.match(/[?&]id=([A-Za-z0-9_-]+)/i);
  return match?'https://lh3.googleusercontent.com/d/'+encodeURIComponent(match[1])+'=w1200':url;
}
function v945BundleText_(p){
  if(n_(p.offerQty2)>0&&n_(p.offerPrice2)>0)return n_(p.offerQty2)+' for ₹'+n_(p.offerPrice2);
  if(n_(p.offerQty1)>0&&n_(p.offerPrice1)>0)return n_(p.offerQty1)+' for ₹'+n_(p.offerPrice1);
  return '';
}
getAppConfig=function(){
  const out=V945_BASE_GET_APP_CONFIG.apply(this,arguments),products=Array.isArray(out.products)?out.products:[],byId={};
  products.forEach(function(p){p.imageUrl=v945ValidImage_(p.imageUrl);byId[s_(p.productId)]=p;});
  out.banners=(Array.isArray(out.banners)?out.banners:[]).map(function(b){
    const x=Object.assign({},b),p=byId[s_(x.productId||x.redirectValue)];
    x.imageUrl=v945ValidImage_(x.imageUrl)||(p?p.imageUrl:'');
    if(p){const bundle=v945BundleText_(p);if(bundle)x.offerText=bundle;}
    return x;
  });
  out.appVersion='9.4.5';
  return out;
};
