/* Layered vector avatars: catalog IDs map to fixed shapes, never arbitrary markup. */
(function(root){
 const skins={light:'#f4c9a5',medium:'#c88e62',deep:'#825139'};
 const shirts={top_sage:'#8da982',top_sun:'#efbd4b',top_ocean:'#669dbd',top_berry:'#ad7394'};
 function draw(style={}){
  const s=skins[style.skin]||skins.medium,e=style.equipped||{},top=shirts[e.top]||shirts.top_sage;
  const hair=e.hair==='hair_dark'?'#302c32':'#664635';
  const curls=e.hair==='hair_curls'?'<g fill="#49362e"><circle cx="36" cy="33" r="11"/><circle cx="47" cy="25" r="11"/><circle cx="61" cy="23" r="11"/><circle cx="75" cy="27" r="11"/><circle cx="84" cy="38" r="10"/></g>':`<path d="M33 56Q23 17 61 16Q95 16 87 57L81 38Q64 42 49 32L38 56Z" fill="${hair}"/>`;
  const accessory=e.accessory==='accessory_cap'?'<path d="M31 34Q33 9 62 10Q86 11 86 33Z" fill="#577e9a"/><path d="M57 33H96Q101 40 88 41H57Z" fill="#416580"/>':e.accessory==='accessory_glasses'?'<g fill="none" stroke="#3d443d" stroke-width="3"><circle cx="47" cy="54" r="10"/><circle cx="74" cy="54" r="10"/><path d="M57 54H64M34 52L38 53M84 53L88 51"/></g>':e.accessory==='accessory_star'?'<path d="m83 94 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#f7d46c" stroke="#be8e33"/>':'';
  return `<svg class="ninho-avatar-art" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar personalizado"><rect x="2" y="2" width="116" height="136" rx="32" fill="#e9efdf"/><ellipse cx="60" cy="130" rx="39" ry="5" fill="#d7e2cd"/><path d="M22 132V111Q23 88 48 86H72Q97 88 98 111V132Z" fill="${top}"/><path d="M49 79H71V94Q60 105 49 94Z" fill="${s}"/><path d="M33 113V132M87 113V132" stroke="#ffffff45" stroke-width="3"/><ellipse cx="60" cy="53" rx="28" ry="32" fill="${s}"/>${curls}<ellipse cx="49" cy="54" rx="2.6" ry="3.5" fill="#342b29"/><ellipse cx="72" cy="54" rx="2.6" ry="3.5" fill="#342b29"/><path d="M52 69Q61 76 69 68" fill="none" stroke="#764b40" stroke-width="3" stroke-linecap="round"/><circle cx="41" cy="64" r="5" fill="#df9c8d" opacity=".4"/><circle cx="80" cy="64" r="5" fill="#df9c8d" opacity=".4"/>${accessory}</svg>`;
 }
 const api={draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NinhoAvatarArt=api;
})(typeof window!=='undefined'?window:globalThis);
