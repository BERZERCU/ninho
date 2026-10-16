/* Fixed vector collectible miniatures. No uploaded images or arbitrary SVG input. */
(function(root){
 const ink='#35312d';
 function lisbon(){return `<g stroke="${ink}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
 <ellipse cx="80" cy="191" rx="43" ry="5" fill="#c9c0b4" stroke="none"/>
 <path d="M58 148L57 181L72 183L80 151L85 182L102 182L100 148Z" fill="#202730"/><path d="M64 155L63 178M94 155L95 177" fill="none" stroke="#404753"/>
 <path d="M57 179Q53 184 51 190Q62 194 75 189L73 180ZM85 180L84 190Q99 195 111 190Q108 183 101 179Z" fill="#202322"/>
 <path d="M55 116Q43 117 42 133L43 155L53 157L63 127M103 117Q115 121 116 136L116 155L106 157L98 130" fill="#242e3a"/>
 <path d="M57 115Q80 110 102 116L106 153Q82 161 54 154Z" fill="#26313c"/>
 <path d="M70 113L80 122L90 113L96 150L65 150Z" fill="#687575"/>
 <path d="M66 115L59 124L70 139L75 121M94 115L101 124L90 138L85 122" fill="#192532"/>
 <path d="M71 111L80 119L89 111L90 120L84 126L80 121L75 126L69 119Z" fill="#82908c"/>
 <path d="M73 121L77 139M87 121L83 139" fill="none" stroke="#c2c6ba" stroke-width="1.4"/>
 <rect x="76" y="136" width="9" height="12" rx="1.3" fill="#bec3bb"/><rect x="78" y="138" width="5" height="5" fill="#4c5960" stroke="none"/><path d="M78 145h5" stroke="#626f70" stroke-width="1"/>
 <path d="M56 149H104V154H56Z" fill="#23282d"/><path d="M80 148H87V156H80Z" fill="#b49c4b"/><path d="M92 147h7v10h-7Z" fill="#141d24"/>
 <path d="M42 153Q40 157 44 161L52 162L55 156L51 151M107 152Q104 157 107 162L114 161L118 157L114 151" fill="#e2bd96"/>
 <path d="M38 140L51 137L58 160L44 163Z" fill="#20384e"/><path d="M43 143l7 15" fill="none" stroke="#d4d7c6" stroke-width="1.4"/><path d="M45 144l2 5m1 2 1 3" stroke="#b0b8b7" stroke-width="2"/>
 <path d="M113 148L118 149L116 162L111 161Z" fill="#667d88"/>
 <path d="M34 54Q32 14 81 13Q129 9 133 52L131 111Q123 125 110 119L103 111L53 112L48 121Q34 121 30 108Z" fill="#3f302a"/>
 <path d="M34 72Q22 66 24 81Q24 92 34 94M126 72Q138 66 136 81Q136 92 126 94" fill="#e2bd96"/>
 <path d="M36 42Q80 23 124 42L126 91Q126 109 109 111L52 111Q34 109 34 92Z" fill="#e6c39b"/>
 <path d="M37 90Q38 104 52 107H109" fill="none" stroke="#d4aa7f" stroke-width="3"/>
 <path d="M33 71Q23 49 34 31Q45 12 66 14Q82 8 95 15Q115 10 128 32Q139 53 125 75L120 50L106 39L112 54Q94 47 84 34L91 52Q73 45 66 32L58 48L57 36L45 57L42 47Z" fill="#42322b"/>
 <path d="M42 30Q53 19 66 22M76 19Q94 16 107 27M100 29L118 45M52 28L39 45" fill="none" stroke="#655045" stroke-width="2.7"/>
 <path d="M32 83L37 106L43 113M126 84L123 106L116 113" fill="none" stroke="#655045" stroke-width="2.5"/>
 <path d="M45 66Q54 62 62 66M97 66Q105 62 114 66" fill="none" stroke="#665044" stroke-width="2.4"/>
 <g fill="#141b1b" stroke="#252b27"><ellipse cx="54" cy="80" rx="9" ry="10"/><ellipse cx="106" cy="80" rx="9" ry="10"/></g>
 <g stroke="#252b27" stroke-width="1.7"><path d="m46 73-3-4m7 1-2-4m57 4 2-4m5 7 4-3"/></g>
 <ellipse cx="51" cy="76" rx="2" ry="2.4" fill="#59605b" stroke="none"/><ellipse cx="103" cy="76" rx="2" ry="2.4" fill="#59605b" stroke="none"/>
 <path d="M78 83L76 91L82 92" fill="#d5ad83" stroke="none"/>
 </g>`}
 function jane(){return `<g stroke="${ink}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
 <ellipse cx="80" cy="191" rx="44" ry="5" fill="#c9c0b4" stroke="none"/>
 <path d="M59 149L57 181L74 182L80 155L86 181L103 181L100 149Z" fill="#26343d"/><path d="M65 157L64 177M95 158L95 178" fill="none" stroke="#4c5b61"/>
 <path d="M58 179Q50 184 51 190Q63 194 76 189L74 179ZM86 179L84 190Q98 194 111 190Q111 184 102 179Z" fill="#1e2627"/>
 <path d="M55 115Q42 118 40 133L45 153L56 149L61 129M104 116Q117 122 119 137L111 157L101 151L101 130" fill="#26343f"/>
 <path d="M56 113Q80 108 103 115L108 153Q83 160 53 154Z" fill="#273641"/>
 <path d="M68 116L80 124L93 115L96 153H65Z" fill="#1c2a32"/><path d="M74 126L77 149M88 125L84 150" fill="none" stroke="#43525b"/>
 <path d="M68 112L78 121L91 111L95 121L86 126L81 121L76 128L66 120Z" fill="#dbe6df"/>
 <path d="M64 115L58 126L69 141L75 124M96 115L103 126L92 142L86 125" fill="#1a2832"/>
 <circle cx="80" cy="141" r="1.3" fill="#9b9f91" stroke="none"/>
 <path d="M43 140Q37 143 42 150L51 153L55 148L51 140M100 143Q94 144 92 150Q97 155 105 153L111 149L108 142" fill="#e2c19c"/>
 <ellipse cx="92" cy="153" rx="15" ry="3.4" fill="#269dc3"/><path d="M78 150Q92 154 105 150" fill="none" stroke="#87cfda" stroke-width="1"/>
 <path d="M44 132Q56 129 63 133L61 144Q53 151 46 144Z" fill="#239dc2"/><path d="M63 134Q72 133 69 140Q66 144 62 140" fill="none" stroke="#239dc2" stroke-width="3"/><ellipse cx="54" cy="132" rx="9.5" ry="2.6" fill="#5cc4dc" stroke="#1983a9" stroke-width="1"/>
 <path d="M34 71Q22 65 24 81Q25 92 35 92M126 71Q138 66 136 81Q135 92 126 92" fill="#e2c19c"/>
 <path d="M36 41Q80 23 124 41L126 91Q126 109 108 112L53 112Q34 110 34 92Z" fill="#e7c8a3"/>
 <path d="M38 92Q39 105 53 108H108" fill="none" stroke="#d7b38b" stroke-width="3"/>
 <path d="M34 72L29 55Q24 44 34 35Q24 24 40 23Q43 8 58 15Q66 5 79 13Q91 6 103 17Q118 14 126 28Q140 34 130 46L125 68L118 48Q104 48 98 33Q91 48 77 42Q66 51 55 41Q48 52 39 47Z" fill="#bc953d"/>
 <path d="M34 36Q43 42 49 29Q55 20 62 23Q66 39 55 41M66 18Q78 18 73 36M79 17Q94 21 86 38M94 20Q108 29 99 35M109 23Q123 31 117 39M125 34Q135 39 126 47" fill="none" stroke="#dfb958" stroke-width="4"/>
 <path d="M40 20Q47 17 52 22M32 48l5 9M122 51l2 7" fill="none" stroke="#9d7a32" stroke-width="2"/>
 <path d="M45 65Q53 62 62 65M98 65Q106 62 114 65" fill="none" stroke="#a18d4b" stroke-width="3"/>
 <g fill="#141b1b" stroke="#252b27"><ellipse cx="54" cy="80" rx="8.8" ry="10"/><ellipse cx="106" cy="80" rx="8.8" ry="10"/></g>
 <ellipse cx="51" cy="76" rx="2" ry="2.5" fill="#626b65" stroke="none"/><ellipse cx="103" cy="76" rx="2" ry="2.5" fill="#626b65" stroke="none"/>
 <path d="M79 83L76 92L82 93" fill="#d6b38d" stroke="none"/>
 </g>`}
 const art={set_lisbon:lisbon,set_jane:jane};
 function draw(id){if(!Object.prototype.hasOwnProperty.call(art,id))return null;return `<svg class="ninho-avatar-art ninho-avatar-set" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${id==='set_lisbon'?'Conjunto Lisbon':'Conjunto Patrick Jane'}"><path d="M23 29Q78 0 139 30Q156 75 145 133Q159 177 123 193H38Q0 175 14 130Q1 76 23 29Z" fill="#f1ebe0"/>${art[id]()}</svg>`}
 const api={draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NinhoAvatarSetsArt=api;
})(typeof window!=='undefined'?window:globalThis);
