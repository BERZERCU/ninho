(function(root){
 function changes(before,after){
  if(!before||!after)return [];
  const values=[before.balance,before.earned,after.balance,after.earned];
  if(!values.every(n=>Number.isSafeInteger(n)&&n>=0)||after.earned<before.earned)return [];
  const earned=after.earned-before.earned,spent=before.balance+earned-after.balance;
  if(spent<0)return [];
  return [...(earned?[earned]:[]),...(spent?[-spent]:[])];
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={changes};return}
 let origin=null;const running=new Set(),chips=new Set();
 const visible=node=>{if(!node||!node.getClientRects().length)return false;const r=node.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.right>0&&r.left<innerWidth};
 const point=node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}};
 function remember(node){if(node)origin={...point(node),at:Date.now()}}
 function clear(){for(const item of running)item.remove();for(const chip of chips)chip.remove();running.clear();chips.clear();origin=null}
 function play(before,after){
  const deltas=changes(before,after);if(!deltas.length)return;
  let target=[...document.querySelectorAll('.avatar-balance,#avatarEntryPoints')].find(visible);
  let chip=null;
  if(!target){chip=document.createElement('div');chip.className='avatar-points-receipt';chip.textContent='✦ '+after.balance+' pontos';chip.setAttribute('aria-hidden','true');document.body.appendChild(chip);chips.add(chip);target=chip;setTimeout(()=>{chip.remove();chips.delete(chip)},2600)}
  const destination=point(target),recent=origin&&Date.now()-origin.at<20000?origin:null;
  const start=recent||{x:innerWidth/2,y:Math.min(innerHeight-100,destination.y+180)};
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const announce=document.createElement('div');announce.className='avatar-points-announcement';announce.setAttribute('role','status');announce.textContent=deltas.map(d=>d>0?`Você ganhou ${d} ${d===1?'ponto':'pontos'}`:`Você usou ${-d} ${d===-1?'ponto':'pontos'}`).join('. ');document.body.appendChild(announce);running.add(announce);setTimeout(()=>{announce.remove();running.delete(announce)},3000);
  deltas.forEach((delta,index)=>{
   const from=delta>0?start:destination,to=delta>0?destination:(recent||{x:destination.x,y:Math.min(innerHeight-65,destination.y+125)});
   const label=document.createElement('span');label.className='avatar-point-flight '+(delta>0?'gain':'spend');label.textContent=(delta>0?'+':'−')+Math.abs(delta);label.setAttribute('aria-hidden','true');document.body.appendChild(label);running.add(label);
   const clamp=(n,max)=>Math.max(30,Math.min(max-30,n));
   const a={x:clamp(from.x,innerWidth),y:clamp(from.y,innerHeight)},b={x:clamp(to.x,innerWidth),y:clamp(to.y,innerHeight)};
   label.style.left=(reduced?b.x:a.x)+'px';label.style.top=(reduced?b.y:a.y)+'px';
   const frames=reduced?[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{opacity:0}]:[
    {transform:'translate(-50%,-50%) scale(.65)',opacity:0},
    {transform:'translate(-50%,-65%) scale(1.15)',opacity:1,offset:.15},
    {transform:`translate(calc(-50% + ${(b.x-a.x)*.5}px),calc(-50% + ${(b.y-a.y)*.5-30}px)) scale(1)`,opacity:1,offset:.55},
    {transform:`translate(calc(-50% + ${b.x-a.x}px),calc(-50% + ${b.y-a.y}px)) scale(.65)`,opacity:0}
   ];
   if(label.animate){const animation=label.animate(frames,{duration:reduced?1200:1250,delay:index*250,easing:'cubic-bezier(.22,.65,.3,1)',fill:'both'});animation.finished.catch(()=>{}).finally(()=>{label.remove();running.delete(label)})}
   else setTimeout(()=>{label.remove();running.delete(label)},1400);
  });
  origin=null;
 }
 root.NinhoPointEffects={changes,remember,play,clear};
})(typeof window!=='undefined'?window:globalThis);
