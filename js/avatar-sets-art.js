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
 function heisenberg(){return `<g stroke="${ink}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
 <ellipse cx="80" cy="191" rx="44" ry="5" fill="#c9c0b4" stroke="none"/>
 <path d="M59 148L56 181H74L80 154L86 181H104L101 148Z" fill="#242b2b"/><path d="M63 157L63 177M96 157L97 177" fill="none" stroke="#4a5150"/>
 <path d="M56 180Q49 184 49 190Q61 194 76 189L73 180ZM87 180L85 190Q100 194 113 190Q110 183 103 180Z" fill="#171d1d"/>
 <path d="M55 115Q42 118 40 134L43 154L54 156L62 128M103 115Q117 120 121 137L111 151L102 144L103 128" fill="#1f292c"/>
 <path d="M57 114Q80 109 102 115L107 155Q80 160 53 155Z" fill="#202c30"/>
 <path d="M68 114H92L96 152H65Z" fill="#354957"/><path d="M79 119V152" stroke="#60717a" stroke-width="1.2"/><g fill="#a3a898" stroke="none"><circle cx="82" cy="130" r="1"/><circle cx="82" cy="140" r="1"/></g>
 <path d="M65 114L58 125L72 143L76 117M96 114L103 125L90 142L86 117" fill="#172126"/>
 <path d="M42 152Q38 159 45 163L53 159L54 153M104 140Q97 137 95 144L98 151L109 151L113 146Z" fill="#d9b88f"/>
 <path d="M98 149L113 147L118 173Q106 178 96 172Z" fill="#93c7d1" fill-opacity=".85" stroke="#527f87"/><path d="m102 150 8-1m-9 13 5-6 3 8 4-5 1 10-6-2-6 4Z" fill="#7bd6e7" stroke="#45a7c2" stroke-width="1"/>
 <path d="M34 69Q22 66 24 80Q24 91 35 92M126 69Q139 66 137 80Q136 91 125 92" fill="#d7b58d"/>
 <path d="M35 41Q80 27 125 41L126 91Q126 110 108 113H53Q34 110 34 92Z" fill="#dfbe95"/><path d="M38 93Q39 106 54 109H107" fill="none" stroke="#c7a47f" stroke-width="3"/>
 <path d="M32 44L35 23Q36 14 48 14H111Q123 14 125 24L128 44Z" fill="#1e2222"/><path d="M35 35H125L128 46H32Z" fill="#353a38"/><path d="M26 43Q10 45 16 51Q81 62 144 51Q150 45 132 43Z" fill="#181d1d"/><path d="M42 19H110" stroke="#464b46" stroke-width="2"/>
 <path d="M43 65Q53 61 64 65M96 65Q107 61 117 65" fill="none" stroke="#675642" stroke-width="2.7"/>
 <g fill="#6c7773" fill-opacity=".65" stroke="#988b64" stroke-width="3"><rect x="37" y="67" width="32" height="25" rx="10"/><rect x="91" y="67" width="32" height="25" rx="10"/><path d="M69 76Q80 72 91 76M32 71L37 73M123 73L128 71" fill="none"/></g>
 <g fill="#303c3d" stroke="none"><ellipse cx="54" cy="79" rx="7" ry="8"/><ellipse cx="107" cy="79" rx="7" ry="8"/></g><path d="m42 71 8-1m47 1 8-1" stroke="#c9d1bc" stroke-width="1.6"/>
 <path d="M78 82L75 92L82 93" fill="#c7a47f" stroke="none"/>
 <path d="M64 96Q80 91 96 96L94 108Q81 119 66 108Z" fill="#624a36"/><path d="M67 97Q80 101 93 97L90 103H71Z" fill="#dfbe95" stroke="none"/><path d="M69 108Q80 114 91 108" fill="none" stroke="#876a4b" stroke-width="1.4"/>
 </g>`}
 function gus(){return `<g stroke="${ink}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
 <ellipse cx="80" cy="191" rx="44" ry="5" fill="#c9c0b4" stroke="none"/>
 <path d="M57 148L55 181L73 182L80 153L88 182L105 181L102 148Z" fill="#716250"/><path d="M63 155L62 178M96 155L97 178" fill="none" stroke="#95816a"/>
 <path d="M55 180Q47 184 48 190Q62 194 76 189L73 180ZM88 180L85 190Q100 194 114 190Q112 183 104 180Z" fill="#4c352a"/>
 <path d="M54 115Q42 118 40 134L42 155L53 155L61 128M104 115Q117 120 119 134L118 155L107 155L100 128" fill="#e5d79d"/>
 <path d="M57 113Q80 109 102 114L105 151Q80 158 54 151Z" fill="#eee0a9"/>
 <path d="M80 122V150M46 137L44 150M113 137L115 150" fill="none" stroke="#c7bb88" stroke-width="1.2"/>
 <path d="M67 111L79 119L92 111L95 121L85 127L80 121L74 127L64 121Z" fill="#f6eabe"/>
 <path d="M77 121L83 121L86 126L82 130L86 146L80 151L74 146L78 130L74 126Z" fill="#33352e"/>
 <path d="M56 149H104V154H56Z" fill="#55463a"/><rect x="77" y="148" width="9" height="8" fill="#c1b48b"/><path d="M93 132H101V142H93Z" fill="none" stroke="#c7bb88" stroke-width="1"/>
 <path d="M42 153Q38 157 42 162L50 163L55 157L51 152M108 153Q104 158 108 162L116 161L120 157L116 152" fill="#ad895e"/>
 <path d="M35 69Q22 66 24 81Q25 92 35 93M125 69Q138 66 136 81Q135 92 125 93" fill="#a37d55"/>
 <path d="M35 40Q80 24 125 40L126 91Q126 110 108 113H53Q34 110 34 92Z" fill="#b49468"/><path d="M38 93Q39 106 54 109H107" fill="none" stroke="#98754e" stroke-width="3"/>
 <path d="M33 66L29 43Q27 17 52 13L108 14Q130 19 130 43L126 66L120 38Q79 29 39 38Z" fill="#242b27"/>
 <path d="M37 29Q80 11 121 30M43 22L45 30M51 19L53 27M60 18L62 25M69 17L70 24M78 17V24M87 18L86 25M96 19L94 26M106 22L103 28M115 25L111 31" fill="none" stroke="#546052" stroke-width="1.5"/>
 <path d="M44 64Q54 61 64 64M96 64Q106 61 116 64" fill="none" stroke="#4c4933" stroke-width="2.5"/>
 <g fill="#7d8062" fill-opacity=".55" stroke="#ae9d62" stroke-width="3"><rect x="36" y="67" width="34" height="26" rx="10"/><rect x="90" y="67" width="34" height="26" rx="10"/><path d="M70 76Q80 73 90 76M31 72L36 74M124 74L129 72" fill="none"/></g>
 <g fill="#28322b" stroke="none"><ellipse cx="54" cy="80" rx="7" ry="8"/><ellipse cx="107" cy="80" rx="7" ry="8"/></g><path d="m41 71 9-1m46 1 9-1" stroke="#d6c58c" stroke-width="1.5"/>
 <path d="M79 83L75 93L82 94" fill="#98754e" stroke="none"/>
 </g>`}
 function deku(){return `<g stroke="${ink}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
 <path d="M32 173L20 150L28 131L15 112L21 99L9 82L14 68L31 89L23 103L37 120L28 139L39 154M124 178L137 159L129 141L145 125L135 106L143 92L132 83" fill="none" stroke="#218e8c" stroke-width="5"/><path d="M33 171L23 151L31 131L18 111L25 99L13 80M126 175L134 158L126 141L142 125L132 106" fill="none" stroke="#67dbcb" stroke-width="2"/>
 <ellipse cx="81" cy="193" rx="37" ry="4" fill="#b4c8c4" stroke="none"/>
 <path d="M53 145L52 167L66 174L77 150L85 162L83 183L100 184L104 158L100 144Z" fill="#243d37"/><path d="M52 158L47 163L49 177L66 179L72 164Z" fill="#222b29"/><path d="M84 169L82 185L99 186L103 170Z" fill="#212c29"/><path d="M50 170L65 174M85 178H99" stroke="#87463d" stroke-width="4"/>
 <path d="M48 175Q40 179 41 185Q54 191 68 185L66 177M83 184Q77 189 79 193L103 194Q107 187 99 182Z" fill="#202a27"/>
 <path d="M57 111Q42 113 39 130L43 147L54 145L61 122M102 111Q117 116 120 132L112 148L102 143L100 125" fill="#673a34"/>
 <path d="M57 111Q79 107 102 112L105 148Q81 156 54 148Z" fill="#31564b"/><path d="M62 117L59 143M98 117L99 142" stroke="#1c332d" stroke-width="5"/>
 <path d="M71 119H90V139H71Z" fill="#416b5c"/><path d="M75 123H86M75 129H86M75 135H86" stroke="#729582" stroke-width="1.4"/>
 <path d="M56 141H104L105 148L54 149Z" fill="#87463d"/><rect x="75" y="141" width="11" height="9" fill="#9fada1"/><path d="M59 139H69V151H58ZM92 139H101V151H92Z" fill="#a15844"/>
 <path d="M42 143Q37 146 41 155L46 158L49 151L52 157L57 153L53 142M106 142Q101 148 106 156L110 151L114 155L118 148L114 141Z" fill="#bbbca3"/><path d="m43 149 2 4m65-6 2 5" stroke="#818e7d" stroke-width="1.1"/>
 <path d="M52 109L36 115L28 130L40 126L44 132L57 121M106 109L123 116L131 130L119 126L115 132L101 121" fill="#c5a357"/><path d="M55 103Q79 117 104 103L111 115L105 125Q78 126 50 121L48 113Z" fill="#d7b969"/><path d="M55 114Q78 121 103 114M58 119L97 121" fill="none" stroke="#9b8246" stroke-width="1.6"/>
 <path d="M31 80L25 63L28 48L22 40L31 38L27 28L36 27L33 17L43 22L44 8L53 21L59 16L67 28Q80 19 94 28L102 16L108 21L113 7L119 20L128 16L126 28L135 29L131 40L138 44L132 56L136 65L127 82L121 99Q80 123 38 100Z" fill="#253d33"/>
 <path d="M66 27L62 18L74 23L80 16L89 23L95 20L99 28" fill="#1b987c"/>
 <path d="M44 27L54 45L61 47L67 63L63 81L41 75L33 60M116 27L107 45L99 48L93 63L97 81L121 75L129 60" fill="#1a2d25"/>
 <path d="M50 51L61 57M110 51L99 57M74 36L72 63L79 76L87 63L84 36" fill="none" stroke="#456454" stroke-width="2.4"/>
 <path d="M48 61Q58 62 59 71Q52 78 46 69ZM101 69Q103 62 113 61L114 69Q108 78 101 69Z" fill="#20b695" stroke="#168269" stroke-width="1.2"/>
 <path d="M32 80L44 84L51 81L62 91L79 90L96 89L107 81L117 84L129 79L125 99Q81 127 36 99Z" fill="#a1aaa0"/>
 <path d="M39 85L44 98L53 104L58 92L64 106L77 112L80 96L84 112L97 107L103 92L108 104L118 98L122 85" fill="none" stroke="#697c70" stroke-width="2"/>
 <path d="M76 94H85L88 103L80 108L73 103Z" fill="#c2c6b8"/><g fill="#6e8176" stroke="none"><circle cx="80" cy="98" r="1.4"/><circle cx="77" cy="102" r="1.4"/><circle cx="83" cy="102" r="1.4"/></g>
 <path d="M78 188Q70 177 66 188Q57 180 56 192Q47 187 49 196H113Q117 185 106 189Q100 178 94 188Q88 178 85 191Z" fill="#5aadaf" fill-opacity=".7" stroke="#438c91" stroke-width="1.2"/>
 </g>`}

 const art={set_lisbon:lisbon,set_jane:jane,set_deku:deku,set_heisenberg:heisenberg,set_gus:gus};
 const names={set_lisbon:'Lisbon',set_jane:'Patrick Jane',set_deku:'Deku',set_heisenberg:'Heisenberg',set_gus:'Gus Fring'};
 function draw(id){if(!Object.prototype.hasOwnProperty.call(art,id))return null;return `<svg class="ninho-avatar-art ninho-avatar-set" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Conjunto ${names[id]}"><path d="M23 29Q78 0 139 30Q156 75 145 133Q159 177 123 193H38Q0 175 14 130Q1 76 23 29Z" fill="#f1ebe0"/>${art[id]()}</svg>`}
 const api={draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NinhoAvatarSetsArt=api;
})(typeof window!=='undefined'?window:globalThis);
