/* Native Elaneeru Business — approved launch policy. Staging only.
   Pure functions: do not read/write production state. */
(function(root){
  "use strict";
  const POLICY=Object.freeze({minimumOrderQty:200,creditCheckoutEnabled:false,targetBasis:"DELIVERED",manualRewardApproval:true,notifications:"IN_APP",tracking:"GPS_WHEN_VALID"});
  function integerQty(value){const n=Number(value);return Number.isSafeInteger(n)&&n>=POLICY.minimumOrderQty?n:null}
  function eligiblePieces(items){return (items||[]).reduce((sum,item)=>{
    const delivered=Number(item.deliveredQty||0),returned=Number(item.returnedQty||0),rejected=Number(item.rejectedQty||0);
    if(![delivered,returned,rejected].every(Number.isFinite))return sum;
    return sum+Math.max(0,Math.floor(delivered)-Math.max(0,Math.floor(returned))-Math.max(0,Math.floor(rejected)));
  },0)}
  function rewardState({achieved=0,target=0,approved=false,issued=false}={}){
    if(issued)return "ISSUED";
    if(!(target>0&&achieved>=target))return "IN_PROGRESS";
    return approved?"APPROVED":"AWAITING_ADMIN_APPROVAL";
  }
  function deliverySlotEligible(slot,quantity,now){
    const q=integerQty(quantity),cutoff=Date.parse(slot&&slot.cutoffAt||"");
    return !!(q&&slot&&slot.enabled===true&&Number(slot.availableQty)>=q&&Number.isFinite(cutoff)&&cutoff>now);
  }
  const api=Object.freeze({POLICY,integerQty,eligiblePieces,rewardState,deliverySlotEligible});
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.NE_APPROVED_POLICY=api;
})(typeof window!=="undefined"?window:null);
