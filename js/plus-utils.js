(function(root){
 function cents(value){
  const raw=String(value??'').trim();if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))throw Error('Use um valor como 123,45');
  const [whole,fraction='']=raw.replaceAll('.','').split(',');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(n)||n<0||n>1000000000)throw Error('Valor fora do limite do teste');return n;
 }
 const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
 const editMoney=n=>(n/100).toFixed(2).replace('.',',');
 const api={cents,money,editMoney};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NinhoPlusUtils=api;
})(typeof window!=='undefined'?window:globalThis);
