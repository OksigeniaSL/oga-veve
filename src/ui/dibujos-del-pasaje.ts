/**
 * **Los dibujos de la ventanita, en la escena de pasaje**: lo que acompaña a
 * lo que se cuenta, dibujado en el código.
 *
 * Pedido por Enrique al probar el primer vuelo de pasaje de Ara: «podrían
 * aparecer ventanitas con gráficos e imágenes acompañando la explicación».
 * Van en la misma ventana de cristal que las fotos de las historias —ver
 * `ui/ventana-de-historia.ts`—, que ya sabe dónde cabe sin tapar nada y cómo
 * entrar y salir sin sobresalto.
 *
 * ## Dibujados aquí, y no traídos de fuera
 *
 * Es lo aprobado en el punto 231 de la lista: escenas hechas con lo que ya
 * tiene el juego, sin licencias que perseguir. Una gotita de nube, un oído o
 * un chaleco no necesitan una foto: necesitan que se vea **la idea**, y un
 * dibujo limpio la enseña mejor que una foto llena de cosas. Ni una imagen
 * generada: `CREDITOS.md` pide el origen de cada cosa, y el de esto es este
 * fichero. Menos las costas del mapa de la ruta, que son las de Natural
 * Earth, de dominio público y anotadas allí: una costa no se inventa. Ver
 * `mapa-de-la-ruta.ts`.
 *
 * ## Sin letras
 *
 * Se juega sin saber leer (regla 2 del AGENTS.md), así que los dibujos no
 * llevan texto: flechas, colores, un «1» y un «2» donde importa el orden, y el
 * «+» y el «−» de la presión. La única palabra es **EXIT**, que es lo que pone
 * en el letrero de cualquier avión —ver `marco-de-ventanilla.ts`— y lo que
 * quien juegue va a encontrarse el día que se suba a uno.
 *
 * ## Lo que se dibuja es lo de verdad
 *
 * Regla 4: se simplifica la presentación, no el contenido. El ala empuja el
 * aire hacia abajo y el aire la empuja hacia arriba —con menos presión encima
 * que debajo, que es lo mismo visto por el otro lado—, y no hay «camino más
 * largo» por ningún sitio. La máscara se pone primero quien es grande y
 * después ayuda. El chaleco se infla fuera del avión. Las islas son volcanes
 * que crecieron desde el fondo del mar. Las nubes de abajo son gotitas y las
 * de muy arriba, cristalitos de hielo. Las fuentes, en el ADR 0020.
 *
 * ## Con movimiento, y quietos si se pide
 *
 * Lo que se mueve —la hebilla que entra, la máscara que cae, el aire que
 * pasa— va con animación CSS dentro del propio SVG, que funciona también
 * dentro de una `<img>`; con `prefers-reduced-motion` se queda quieto en su
 * último fotograma, que es el que cuenta la idea.
 *
 * Cada dibujo es una cadena de SVG de 480 × 320, el mismo tamaño que las fotos
 * de las historias, y se le da a la ventana como URL de datos. Ver
 * `urlDelDibujo`.
 */

import { dibujoDelMapa, vueloDeMuestra, type LoDelVuelo, type MapaDeLaRuta } from "./mapa-de-la-ruta";

/** Los dibujos que hay, por su clave. Ver `DIBUJOS_DEL_PASAJE`. */
export type DibujoDelPasaje =
  | "cinturon"
  | "salidas"
  | "mascara"
  | "chaleco"
  | "tarjeta"
  | "modo-avion"
  | "persiana"
  | "nube"
  | "ala"
  | "alto"
  | "motor"
  | "frio"
  | "islas"
  | "ruta"
  | "oido"
  | "papi"
  | "estrellas"
  | "meneo"
  | "techo"
  | "vuelta-en-pista"
  | "maletero"
  | "tripulacion";

/** Los colores: los del juego, cálidos y tranquilos. */
const C = {
  papel: "#f3ead8",
  tinta: "#2a1c14",
  cielo: "#cfe6ee",
  mar: "#3f7fa6",
  marHondo: "#2d5f80",
  tierra: "#b98a5a",
  terracota: "#c8643c",
  amarillo: "#f2c230",
  rojo: "#c62f2f",
  blanco: "#ffffff",
  gris: "#9aa19d",
  verde: "#4f9a5a",
  naranja: "#f08a2c",
  hielo: "#e8f6fb",
  piel: "#e9b98f",
} as const;

/**
 * La lámina: el fondo, el estilo común y lo de dentro. El trazo es grueso
 * —la ventana mide 240 px de ancho y el dibujo, el doble—, que a ese tamaño
 * un trazo fino desaparece.
 */
function lamina(dentro: string, estilo = "", fondo: string = C.papel): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" width="480" height="320">
<style>
.t{fill:none;stroke:${C.tinta};stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
.tf{stroke:${C.tinta};stroke-width:6;stroke-linejoin:round}
.fino{stroke-width:4}
${estilo}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
</style>
<rect width="480" height="320" rx="18" fill="${fondo}"/>
${dentro}
</svg>`;
}

/** Una flecha gruesa de `(x1,y1)` a `(x2,y2)`, con su punta. */
function flecha(x1: number, y1: number, x2: number, y2: number, color: string = C.tinta, grosor = 7): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = 18;
  const ax = x2 - p * Math.cos(a - 0.5);
  const ay = y2 - p * Math.sin(a - 0.5);
  const bx = x2 - p * Math.cos(a + 0.5);
  const by = y2 - p * Math.sin(a + 0.5);
  const f = (n: number): string => n.toFixed(1);
  return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round"/>
<path d="M${f(ax)} ${f(ay)}L${f(x2)} ${f(y2)}L${f(bx)} ${f(by)}" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Un número en un círculo: el orden, que se entiende sin leer. */
function numero(x: number, y: number, n: number): string {
  return `<circle cx="${x}" cy="${y}" r="20" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="4"/>
<text x="${x}" y="${y + 9}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="26" fill="${C.blanco}">${n}</text>`;
}

/** Una persona sentada, de frente, simple: cabeza, cuerpo y su tamaño. */
function persona(x: number, y: number, escala: number, ropa: string): string {
  const s = escala;
  return `<g transform="translate(${x} ${y}) scale(${s})">
<rect x="-26" y="10" width="52" height="62" rx="20" fill="${ropa}" class="tf fino"/>
<circle cx="0" cy="-14" r="24" fill="${C.piel}" class="tf fino"/>
</g>`;
}

/**
 * **El cinturón**: el cartel encendido en el techo y, debajo, la hebilla que
 * entra hasta el clic, la cinta que se ajusta y la tapa que se levanta para
 * soltarlo. Las tres cosas del cinturón que enseña la tripulación.
 */
const CINTURON = lamina(
  `<rect x="20" y="18" width="440" height="78" rx="14" fill="#d9d2c4" class="tf fino"/>
<rect x="196" y="30" width="88" height="54" rx="12" fill="${C.amarillo}" class="tf fino luz"/>
<g transform="translate(240 57)">
<circle cx="0" cy="-15" r="7" fill="${C.tinta}"/>
<path d="M-12 -4h24v14h-24z" fill="${C.tinta}"/>
<path d="M-16 10h32" stroke="${C.tinta}" stroke-width="5" stroke-linecap="round"/>
<path d="M-14 3h28" stroke="${C.terracota}" stroke-width="4" stroke-linecap="round"/>
</g>
<circle cx="80" cy="57" r="12" fill="#efe6d4" class="tf fino"/>
<circle cx="400" cy="57" r="12" fill="#efe6d4" class="tf fino"/>
<rect x="30" y="196" width="190" height="44" rx="8" fill="${C.marHondo}" class="tf fino"/>
<g class="cinta">
<rect x="250" y="196" width="200" height="44" rx="8" fill="${C.marHondo}" class="tf fino"/>
</g>
<g class="lengua">
<rect x="212" y="200" width="70" height="36" rx="6" fill="#c9ccc9" class="tf fino"/>
</g>
<rect x="150" y="186" width="84" height="64" rx="12" fill="#d7dad7" class="tf fino"/>
<g class="tapa"><rect x="158" y="196" width="68" height="44" rx="8" fill="#eef0ee" class="tf fino"/></g>
<g class="clic"><path d="M192 160v-22M222 168l14-16M162 168l-14-16" class="t"/></g>
<g class="tira">${flecha(400, 270, 456, 270, C.terracota)}</g>`,
  `.lengua{animation:entra 6s infinite ease-in-out}
@keyframes entra{0%{transform:translateX(70px)}18%,70%{transform:translateX(0)}85%,100%{transform:translateX(70px)}}
.clic{opacity:0;animation:clic 6s infinite}
@keyframes clic{0%,16%{opacity:0}19%,28%{opacity:1}31%,100%{opacity:0}}
.tira{opacity:0;animation:tira 6s infinite}
@keyframes tira{0%,32%{opacity:0}36%,52%{opacity:1}56%,100%{opacity:0}}
.cinta{animation:aprieta 6s infinite}
@keyframes aprieta{0%,34%{transform:translateX(0)}48%,100%{transform:translateX(10px)}}
.tapa{transform-box:fill-box;transform-origin:0% 100%;animation:abre 6s infinite}
@keyframes abre{0%,58%{transform:rotate(0)}66%,80%{transform:rotate(-38deg)}88%,100%{transform:rotate(0)}}
.luz{animation:luz 2s infinite}
@keyframes luz{50%{fill:#ffd95a}}`,
);

/**
 * **Las salidas**: el avión visto desde arriba, con las filas de asientos, las
 * salidas delante, detrás y sobre las alas, y las lucecitas del suelo del
 * pasillo encendiéndose hacia ellas.
 */
const SALIDAS = (() => {
  const filas: string[] = [];
  for (let i = 0; i < 12; i++) {
    const x = 128 + i * 22;
    filas.push(`<rect x="${x}" y="122" width="14" height="22" rx="3" fill="${C.marHondo}"/>`);
    filas.push(`<rect x="${x}" y="176" width="14" height="22" rx="3" fill="${C.marHondo}"/>`);
  }
  const luces: string[] = [];
  for (let i = 0; i < 16; i++) {
    const x = 100 + i * 18;
    luces.push(`<circle cx="${x}" cy="160" r="5" fill="${C.amarillo}" class="l" style="animation-delay:${(i % 8) * 0.18}s"/>`);
  }
  const salida = (x: number, y: number): string =>
    `<rect x="${x - 24}" y="${y - 13}" width="48" height="26" rx="5" fill="${C.blanco}" stroke="${C.rojo}" stroke-width="3"/>
<text x="${x}" y="${y + 6}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="16" fill="${C.rojo}">EXIT</text>`;
  return lamina(
    `<path d="M196 112 L150 30 h46 l70 82z M196 208 L150 290 h46 l70 -82z" fill="#d9d2c4" class="tf fino"/>
<rect x="60" y="104" width="360" height="112" rx="56" fill="#efe9dd" class="tf fino"/>
<path d="M420 160 l40 -14 v28z" fill="#d9d2c4" class="tf fino"/>
${filas.join("")}${luces.join("")}
${salida(92, 92)}${salida(92, 228)}${salida(392, 92)}${salida(392, 228)}${salida(214, 66)}${salida(214, 254)}`,
    `.l{animation:l 1.44s infinite}
@keyframes l{0%,100%{opacity:.35}30%{opacity:1}}`,
  );
})();

/**
 * **Las máscaras**: caen del techo; primero se la pone quien es grande —el
 * uno— y después ayuda al pequeño —el dos—. Es el orden que pide la norma, y
 * el porqué: sin aire no se puede ayudar a nadie.
 */
const MASCARA = lamina(
  `<rect x="20" y="16" width="440" height="40" rx="10" fill="#d9d2c4" class="tf fino"/>
<g class="cae1">
<path d="M150 56 V130" stroke="${C.tinta}" stroke-width="3"/>
<path d="M132 130 h36 l-6 26 h-24z" fill="${C.amarillo}" class="tf fino"/>
</g>
<g class="cae2">
<path d="M330 56 V150" stroke="${C.tinta}" stroke-width="3"/>
<path d="M312 150 h36 l-6 26 h-24z" fill="${C.amarillo}" class="tf fino"/>
</g>
${persona(150, 214, 1.15, C.terracota)}
${persona(330, 236, 0.8, C.mar)}
<path d="M138 196 h26 l-4 18 h-18z" fill="${C.amarillo}" class="tf fino puesta"/>
<g class="ayuda">${flecha(196, 248, 282, 250, C.terracota)}</g>
${numero(84, 220, 1)}${numero(400, 240, 2)}`,
  `.cae1,.cae2{animation:cae 5s infinite ease-out}
@keyframes cae{0%{transform:translateY(-90px);opacity:0}15%{transform:translateY(0);opacity:1}100%{transform:translateY(0);opacity:1}}
.puesta{opacity:0;animation:puesta 5s infinite}
@keyframes puesta{0%,30%{opacity:0}38%,100%{opacity:1}}
.ayuda{opacity:0;animation:ayuda 5s infinite}
@keyframes ayuda{0%,50%{opacity:0}58%,100%{opacity:1}}`,
);

/**
 * **El chaleco**: debajo del asiento; dentro del avión, sin inflar —la cruz
 * sobre el inflado—, y fuera, en el agua, inflado tirando de las anillas
 * rojas.
 */
const CHALECO = lamina(
  `<path d="M40 70 h120 v110 h-120z" fill="${C.marHondo}" class="tf fino"/>
<path d="M30 180 h150 v26 h-150z" fill="${C.marHondo}" class="tf fino"/>
<path d="M50 206 v50 M160 206 v50" class="t"/>
<rect x="66" y="214" width="78" height="30" rx="8" fill="${C.amarillo}" class="tf fino guardado"/>
${flecha(186, 228, 236, 228)}
<path d="M246 60 h96 a40 40 0 0 1 40 40 v170 h-176 v-170 a40 40 0 0 1 40 -40z" fill="#efe9dd" class="tf fino"/>
<path d="M276 130 q18 -14 36 0 v60 h-36z" fill="${C.amarillo}" class="tf fino"/>
<path d="M262 104 q32 -20 64 0 v24 h-64z M262 160 q32 18 64 0 v-18 h-64z" fill="${C.amarillo}" opacity=".9" class="tf fino"/>
<path d="M258 92 l76 92 M334 92 l-76 92" stroke="${C.rojo}" stroke-width="9" stroke-linecap="round"/>
<path d="M392 252 q22 -10 44 0 t44 0" fill="none" stroke="${C.mar}" stroke-width="6"/>
<path d="M380 270 h100 v40 h-100z" fill="${C.mar}"/>
<g class="infla"><path d="M396 196 q28 -30 56 0 q14 34 0 58 q-28 18 -56 0 q-14 -24 0 -58z" fill="${C.amarillo}" class="tf fino"/>
<circle cx="424" cy="178" r="18" fill="${C.piel}" class="tf fino"/>
<path d="M410 252 v18 M438 252 v18" stroke="${C.rojo}" stroke-width="6" stroke-linecap="round"/></g>`,
  `.infla{transform-box:fill-box;transform-origin:50% 100%;animation:infla 4s infinite}
@keyframes infla{0%{transform:scale(.7)}30%,100%{transform:scale(1)}}`,
);

/** **La tarjeta de seguridad**, asomando del bolsillo del asiento de delante. */
const TARJETA = lamina(
  `<path d="M90 30 h300 a30 30 0 0 1 30 30 v240 h-360 v-240 a30 30 0 0 1 30 -30z" fill="${C.marHondo}" class="tf fino"/>
<g class="sale"><rect x="150" y="96" width="180" height="200" rx="10" fill="${C.blanco}" class="tf fino"/>
<rect x="166" y="112" width="70" height="52" rx="6" fill="${C.cielo}"/>
<rect x="244" y="112" width="70" height="52" rx="6" fill="${C.cielo}"/>
<rect x="166" y="172" width="70" height="52" rx="6" fill="${C.cielo}"/>
<rect x="244" y="172" width="70" height="52" rx="6" fill="${C.cielo}"/>
<path d="M178 140 h46 M196 132 v16" stroke="${C.marHondo}" stroke-width="7" stroke-linecap="round"/>
<path d="M266 124 h26 l-4 18 h-18z" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="3"/>
<path d="M186 184 q15 -8 30 0 v28 h-30z" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="3"/>
<rect x="258" y="182" width="42" height="22" rx="4" fill="${C.blanco}" stroke="${C.rojo}" stroke-width="3"/></g>
<path d="M110 236 h260 v58 h-260z" fill="#24506d" class="tf fino"/>`,
  `.sale{animation:sale 4s infinite ease-out}
@keyframes sale{0%{transform:translateY(60px)}35%,100%{transform:translateY(0)}}`,
);

/** **El teléfono en modo avión**: el avioncito encendido y las ondas tachadas. */
const MODO_AVION = lamina(
  `<rect x="170" y="30" width="140" height="260" rx="22" fill="${C.tinta}"/>
<rect x="182" y="58" width="116" height="200" rx="8" fill="${C.cielo}"/>
<g transform="translate(240 150) rotate(-45)">
<path d="M0 -46 q8 0 8 12 v22 l40 22 v12 l-40 -10 v24 l12 10 v10 l-20 -6 l-20 6 v-10 l12 -10 v-24 l-40 10 v-12 l40 -22 v-22 q0 -12 8 -12z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="3"/>
</g>
<path d="M352 110 q22 40 0 80 M380 92 q36 58 0 116" class="t" opacity=".55"/>
<path d="M128 110 q-22 40 0 80 M100 92 q-36 58 0 116" class="t" opacity=".55"/>
<path d="M92 92 l300 140" stroke="${C.rojo}" stroke-width="10" stroke-linecap="round" class="tacha"/>`,
  `.tacha{stroke-dasharray:340;stroke-dashoffset:340;animation:tacha 3s infinite}
@keyframes tacha{0%,20%{stroke-dashoffset:340}50%,100%{stroke-dashoffset:0}}`,
);

/**
 * **La persiana arriba**: la ventanilla abierta, el ojo que mira fuera y el
 * sol. Para despegar y aterrizar, la persiana va subida: se ve fuera si pasa
 * algo y los ojos ya están hechos a la luz de fuera.
 */
const PERSIANA = lamina(
  `<rect x="60" y="20" width="200" height="280" rx="90" fill="#e9e3d6" class="tf fino"/>
<rect x="88" y="62" width="144" height="196" rx="64" fill="${C.cielo}" class="tf fino"/>
<path d="M88 214 q72 -40 144 0 v10 q0 34 -64 34 h-16 q-64 0 -64 -34z" fill="${C.mar}"/>
<circle cx="190" cy="118" r="20" fill="${C.amarillo}"/>
<g class="sube"><rect x="88" y="54" width="144" height="28" rx="8" fill="#f7f3ea" class="tf fino"/></g>
${flecha(160, 46, 160, 10, C.terracota)}
<g transform="translate(372 160)">
<path d="M-70 0 q70 -60 140 0 q-70 60 -140 0z" fill="${C.blanco}" class="tf fino"/>
<circle cx="0" cy="0" r="24" fill="${C.mar}"/><circle cx="0" cy="0" r="10" fill="${C.tinta}"/>
</g>
${flecha(298, 160, 248, 160, C.tinta, 5)}`,
  `.sube{animation:sube 4s infinite ease-in-out}
@keyframes sube{0%{transform:translateY(150px)}40%,100%{transform:translateY(0)}}`,
);

/**
 * **De qué está hecha una nube**: la lupa sobre la nube enseña las gotitas de
 * agua —las de abajo— y los cristalitos de hielo —los de muy arriba, donde
 * hace mucho frío—. Y el sol: las gotitas desparraman toda su luz hacia todos
 * lados, por eso la nube se ve blanca.
 */
const NUBE = (() => {
  const gotas: string[] = [];
  const pos = [
    [300, 190], [330, 214], [352, 176], [376, 206], [318, 242], [362, 240], [394, 178], [286, 222],
    [344, 268], [392, 252], [410, 220], [306, 160],
  ];
  pos.forEach(([x, y], i) =>
    gotas.push(`<circle cx="${x}" cy="${y}" r="9" fill="${C.mar}" stroke="${C.tinta}" stroke-width="3" class="g" style="animation-delay:${(i * 0.37) % 2.2}s"/>`),
  );
  const hielo = (x: number, y: number): string =>
    `<g transform="translate(${x} ${y})"><g class="h"><path d="M0 -14 V14 M-12 -7 L12 7 M-12 7 L12 -7" stroke="${C.marHondo}" stroke-width="4" stroke-linecap="round"/></g></g>`;
  return lamina(
    `<circle cx="64" cy="58" r="30" fill="${C.amarillo}" class="tf fino"/>
<path d="M104 70 l46 26 M96 98 l36 40 M80 106 l14 48" stroke="${C.amarillo}" stroke-width="6" stroke-linecap="round"/>
<path d="M60 230 a40 40 0 0 1 30 -64 a56 56 0 0 1 100 -10 a40 40 0 0 1 56 40 a34 34 0 0 1 -10 66 h-150 a34 34 0 0 1 -26 -32z" fill="${C.blanco}" class="tf fino"/>
<path d="M200 214 L268 200" class="t fino" stroke-dasharray="6 10"/>
<circle cx="350" cy="214" r="98" fill="${C.hielo}" class="tf"/>
<path d="M418 286 l40 30" class="t" stroke-width="14"/>
<path d="M256 182 h188" stroke="${C.gris}" stroke-width="3" stroke-dasharray="8 8"/>
${hielo(318, 140)}${hielo(356, 132)}${hielo(392, 146)}
${gotas.join("")}
<path d="M366 206 l-26 -18 M366 206 l26 -10 M366 206 l-6 28 M366 206 l20 22" stroke="${C.amarillo}" stroke-width="4" stroke-linecap="round" class="luz"/>`,
    `.g{animation:g 2.2s infinite ease-in-out}
@keyframes g{50%{transform:translateY(5px)}}
.h{animation:h 6s infinite linear;transform-box:fill-box;transform-origin:center}
@keyframes h{to{transform:rotate(60deg)}}
.luz{animation:luz 2s infinite}
@keyframes luz{50%{opacity:.3}}`,
  );
})();

/**
 * **Cómo se sostiene el ala**: el perfil un poco inclinado, el aire que llega
 * y sale empujado hacia abajo, y la flecha grande hacia arriba. Encima, menos
 * presión —el «−»—; debajo, más —el «+»—. Las dos cosas son lo mismo visto
 * por cada lado.
 */
const ALA = lamina(
  `<path d="M40 110 C150 104 230 122 300 150 S420 214 460 240" class="t fino corre" stroke="${C.mar}"/>
<path d="M40 150 C150 144 230 160 300 186 S420 236 460 262" class="t fino corre" stroke="${C.mar}"/>
<path d="M40 250 C150 250 230 246 300 238 S420 270 460 290" class="t fino corre" stroke="${C.mar}"/>
<path d="M120 196 C140 160 220 150 300 168 C350 178 380 192 398 204 C350 210 250 216 170 214 C140 212 122 206 120 196z" fill="${C.terracota}" class="tf"/>
${flecha(260, 160, 260, 40, C.verde, 10)}
<text x="190" y="140" font-family="system-ui,sans-serif" font-weight="900" font-size="64" fill="${C.marHondo}">−</text>
<text x="222" y="272" font-family="system-ui,sans-serif" font-weight="900" font-size="64" fill="${C.marHondo}">+</text>
${flecha(420, 236, 446, 284, C.marHondo, 6)}`,
  `.corre{stroke-dasharray:22 18;animation:corre 1.2s infinite linear}
@keyframes corre{to{stroke-dashoffset:-40}}`,
  C.cielo,
);

/**
 * **Dentro de la nube, el avión se menea** (punto 280): el avión de frente,
 * dentro de la nube gris, con el aire que sube por un lado y baja por otro,
 * las alas doblándose un poco arriba y abajo —están hechas para eso—, y el
 * cinturón abrochado en el asiento.
 */
const MENEO = lamina(
  `<path d="M30 70 a40 40 0 0 1 70 -30 a50 50 0 0 1 90 6 a40 40 0 0 1 60 34 z" fill="${C.blanco}" opacity=".7"/>
<path d="M300 300 a40 40 0 0 1 60 -40 a46 46 0 0 1 80 20 a30 30 0 0 1 20 20z" fill="${C.blanco}" opacity=".7"/>
<g class="sube">${flecha(70, 250, 70, 150, C.mar, 7)}${flecha(116, 270, 116, 190, C.mar, 6)}</g>
<g class="baja">${flecha(364, 90, 364, 190, C.marHondo, 7)}${flecha(410, 70, 410, 150, C.marHondo, 6)}</g>
<g class="izq"><path d="M240 168 C200 170 160 174 128 172" class="t" stroke-width="12" stroke="${C.terracota}"/></g>
<g class="der"><path d="M240 168 C280 170 320 174 352 172" class="t" stroke-width="12" stroke="${C.terracota}"/></g>
<circle cx="240" cy="168" r="30" fill="#d9d2c4" class="tf"/>
<circle cx="240" cy="168" r="11" fill="${C.marHondo}"/>
<path d="M240 138 v-34" class="t" stroke-width="10"/>
<g transform="translate(240 268)"><rect x="-58" y="-22" width="116" height="44" rx="14" fill="${C.verde}" class="tf fino"/>
<rect x="-14" y="-12" width="28" height="24" rx="5" fill="${C.amarillo}" class="tf fino"/></g>`,
  `.izq{animation:ala 1.6s infinite ease-in-out;transform-origin:240px 168px}
.der{animation:ala2 1.6s infinite ease-in-out;transform-origin:240px 168px}
@keyframes ala{50%{transform:rotate(5deg)}}
@keyframes ala2{50%{transform:rotate(-5deg)}}
.sube{animation:sube 1.6s infinite ease-in-out}
@keyframes sube{50%{transform:translateY(-8px)}}
.baja{animation:baja 1.6s infinite ease-in-out}
@keyframes baja{50%{transform:translateY(8px)}}`,
  "#dfe3e4",
);

/**
 * **Por debajo de las nubes** (punto 295): la capa arriba con su base
 * marcada —el techo—, el avión justo debajo, la flecha de lo que falta
 * hasta el mar, y la mirada que llega lejos, hasta la isla con su pista.
 */
const TECHO = lamina(
  `<path d="M0 22 h480 v70 q-30 18 -60 4 q-30 18 -64 2 q-34 18 -66 2 q-32 18 -64 2 q-34 18 -66 2 q-32 18 -64 2 q-30 16 -56 4z" fill="${C.blanco}" class="tf fino"/>
<path d="M10 110 h460" stroke="${C.gris}" stroke-width="4" stroke-dasharray="12 10"/>
<path d="M0 268 h480 v52 h-480z" fill="${C.mar}"/>
<path d="M330 268 q30 -54 70 -60 q36 6 64 60z" fill="${C.tierra}" class="tf fino"/>
<path d="M344 262 h56" stroke="${C.tinta}" stroke-width="6"/>
<g transform="translate(110 136)">
<path d="M-40 0 q0 -8 10 -8 h48 q14 0 22 8 q-8 8 -22 8 h-48 q-10 0 -10 -8z" fill="${C.blanco}" class="tf fino"/>
<path d="M-6 0 l-18 18 h10 l26 -18z M-30 -8 l-8 -16 h8 l14 16z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="3"/>
</g>
<g class="mide">${flecha(110, 160, 110, 262, C.amarillo, 8)}</g>
<g class="mira"><path d="M150 140 L360 240" stroke="${C.verde}" stroke-width="6" stroke-dasharray="14 10" stroke-linecap="round"/>
${flecha(330, 226, 362, 241, C.verde, 6)}</g>`,
  `.mira{animation:mira 2s infinite ease-in-out}
@keyframes mira{50%{opacity:.35}}
.mide{animation:mide 2s infinite ease-in-out}
@keyframes mide{50%{transform:translateY(4px)}}`,
  C.cielo,
);

/**
 * **Más alto que el Teide, y más rápido que un coche**: la montaña con su
 * nieve y el avión por encima de la cumbre; y abajo, la flecha corta del
 * coche y la larga del avión.
 */
const ALTO = lamina(
  `<path d="M20 216 h440" stroke="${C.mar}" stroke-width="10"/>
<path d="M40 214 L150 96 L170 84 L190 96 L300 214z" fill="${C.tierra}" class="tf fino"/>
<path d="M150 96 L170 84 L190 96 L180 108 L170 100 L160 108z" fill="${C.blanco}"/>
<path d="M110 52 h290" stroke="${C.gris}" stroke-width="3" stroke-dasharray="8 8"/>
<path d="M170 84 V60" stroke="${C.gris}" stroke-width="3" stroke-dasharray="6 6"/>
<g class="vuela" transform="translate(330 52)">
<path d="M-40 0 q0 -8 10 -8 h48 q14 0 22 8 q-8 8 -22 8 h-48 q-10 0 -10 -8z" fill="${C.blanco}" class="tf fino"/>
<path d="M-6 0 l-18 18 h10 l26 -18z M-30 -8 l-8 -16 h8 l14 16z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="3"/>
</g>
<g transform="translate(70 266)"><rect x="-26" y="-12" width="52" height="20" rx="8" fill="${C.terracota}" class="tf fino"/>
<circle cx="-14" cy="10" r="7" fill="${C.tinta}"/><circle cx="14" cy="10" r="7" fill="${C.tinta}"/></g>
${flecha(104, 266, 150, 266, C.terracota, 7)}
<g transform="translate(200 266)"><path d="M-26 0 q0 -6 8 -6 h34 q10 0 16 6 q-6 6 -16 6 h-34 q-8 0 -8 -6z" fill="${C.blanco}" class="tf fino"/></g>
${flecha(236, 266, 456, 266, C.verde, 7)}`,
  `.vuela{animation:vuela 3s infinite ease-in-out}
@keyframes vuela{50%{transform:translate(338px,50px)}}`,
  C.cielo,
);

/**
 * **El motor por dentro**: el ventilador gigante de delante que traga aire,
 * el aire que se aprieta, el fuego del combustible que lo calienta y el
 * chorro que sale por detrás; y el avión, empujado hacia delante.
 */
const MOTOR = lamina(
  `<path d="M70 92 h300 q50 0 60 68 q-10 68 -60 68 h-300 q-20 -68 0 -136z" fill="#d9d2c4" class="tf"/>
<g transform="translate(96 160)">
<ellipse cx="0" cy="0" rx="14" ry="62" fill="${C.gris}" class="tf fino"/>
<path d="M0 -56 V56" stroke="${C.tinta}" stroke-width="8" stroke-dasharray="12 8" class="aspa"/>
</g>
<path d="M140 120 L260 140 V180 L140 200z" fill="#bfc6c2" class="tf fino"/>
<g class="fuego"><path d="M270 140 q18 20 0 40 q30 -4 46 -20 q-16 -16 -46 -20z" fill="${C.naranja}" stroke="${C.rojo}" stroke-width="4"/></g>
${flecha(10, 130, 70, 130, C.mar, 7)}${flecha(10, 190, 70, 190, C.mar, 7)}
<g class="sale">${flecha(400, 160, 470, 160, C.rojo, 9)}</g>
${flecha(250, 288, 150, 288, C.verde, 9)}`,
  `.aspa{animation:aspa .4s infinite linear}
@keyframes aspa{to{stroke-dashoffset:-20}}
.fuego{animation:fuego .4s infinite alternate;transform-box:fill-box;transform-origin:0 50%}
@keyframes fuego{to{transform:scaleX(1.25)}}
.sale{animation:sale 1s infinite}
@keyframes sale{50%{transform:translateX(8px)}}`,
);

/**
 * **El frío de fuera y el calorcito de dentro**: el termómetro de fuera, bajo
 * cero, con su copo; y dentro de la cabina, el aire calentado.
 */
const FRIO = lamina(
  `<rect x="20" y="20" width="200" height="280" rx="16" fill="${C.cielo}"/>
<g transform="translate(110 70)"><g class="copo"><path d="M0 -26 V26 M-22 -13 L22 13 M-22 13 L22 -13" stroke="${C.marHondo}" stroke-width="6" stroke-linecap="round"/></g></g>
<rect x="96" y="120" width="28" height="140" rx="14" fill="${C.blanco}" class="tf fino"/>
<circle cx="110" cy="268" r="24" fill="${C.mar}" class="tf fino"/>
<rect x="104" y="226" width="12" height="40" fill="${C.mar}"/>
<path d="M240 40 h220 v240 h-220z" fill="#f7e3cf" class="tf"/>
<rect x="216" y="130" width="48" height="60" rx="20" fill="${C.cielo}" class="tf fino"/>
<g transform="translate(330 60)"><path d="M0 0 q12 14 0 28 t0 28 M24 0 q12 14 0 28 t0 28 M48 0 q12 14 0 28 t0 28" fill="none" stroke="${C.naranja}" stroke-width="5" stroke-linecap="round" class="ola"/></g>
<rect x="346" y="140" width="28" height="120" rx="14" fill="${C.blanco}" class="tf fino"/>
<circle cx="360" cy="268" r="24" fill="${C.rojo}" class="tf fino"/>
<rect x="354" y="170" width="12" height="96" fill="${C.rojo}"/>`,
  `.copo{animation:copo 4s infinite linear;transform-box:fill-box;transform-origin:center}
@keyframes copo{to{transform:rotate(60deg)}}
.ola{animation:ola 1.6s infinite ease-in-out}
@keyframes ola{50%{transform:translateY(-6px)}}`,
);

/**
 * **Las islas, que eran volcanes**: el fondo del mar y tres volcanes que
 * crecen, uno debajo del agua, otro asomando y el último ya isla.
 */
const ISLAS = lamina(
  `<rect x="0" y="0" width="480" height="96" rx="18" fill="${C.cielo}"/>
<rect x="0" y="96" width="480" height="224" rx="0" fill="${C.mar}"/>
<path d="M0 96 q40 -8 80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="${C.blanco}" stroke-width="4"/>
<path d="M0 290 h480 v30 h-480z" fill="${C.tierra}"/>
<path d="M40 292 L90 230 L140 292z" fill="#8a5a3a" class="tf fino"/>
<path d="M170 292 L240 120 L310 292z" fill="#8a5a3a" class="tf fino"/>
<path d="M320 292 L400 60 L480 292z" fill="#8a5a3a" class="tf fino"/>
<path d="M330 96 L366 96 L400 60 L434 96 L470 96" fill="${C.verde}" stroke="${C.tinta}" stroke-width="4"/>
<g class="humo"><path d="M400 54 q-10 -16 4 -26 q14 -8 6 -22" fill="none" stroke="${C.gris}" stroke-width="6" stroke-linecap="round"/></g>
${flecha(110, 170, 168, 150, C.blanco, 6)}${flecha(270, 130, 330, 104, C.blanco, 6)}`,
  `.humo{animation:humo 3s infinite ease-in-out}
@keyframes humo{50%{transform:translateY(-6px);opacity:.5}}`,
);

/**
 * **El camino del vuelo, en el mapa de la ruta**: Tenerife, La Gomera, La
 * Palma y El Hierro con su costa de verdad, el camino del plan —lo volado
 * entero y lo que falta a puntos—, el avión donde va y la torre hablándole
 * por radio. Eran cuatro óvalos, y un mapa de Canarias con óvalos no lo
 * reconoce nadie que haya visto uno (punto 292). Lo pinta `mapa-de-la-ruta.ts`;
 * aquí va en su lámina.
 *
 * Jugando, el camino y el avión son los del vuelo —ver
 * `ponerLaVentanitaDeLaEscena` en `game.ts`—; sin el juego, el de muestra.
 */
export function laminaDeLaRuta(mapa: MapaDeLaRuta, vuelo: LoDelVuelo): string {
  return lamina(
    dibujoDelMapa(mapa, vuelo),
    `.radio{animation:radio 1.4s infinite}
@keyframes radio{50%{opacity:.2}}`,
    C.mar,
  );
}

const RUTA = (() => {
  const { mapa, vuelo } = vueloDeMuestra();
  return laminaDeLaRuta(mapa, vuelo);
})();

/**
 * **El oído al bajar**: el conducto, el tímpano que el aire de fuera empuja
 * hacia dentro al bajar, y el tubito que va a la garganta: al tragar o
 * bostezar entra aire por él y el tímpano vuelve a su sitio.
 */
const OIDO = lamina(
  `<path d="M40 120 q-10 -80 70 -90 q70 -6 76 60 q4 40 -30 56 q-26 12 -18 40 q8 30 -30 40 q-50 10 -68 -40" fill="${C.piel}" class="tf"/>
<path d="M150 150 h130" stroke="${C.tinta}" stroke-width="30" stroke-linecap="round"/>
<path d="M150 150 h130" stroke="#f4d2b4" stroke-width="20" stroke-linecap="round"/>
<path d="M290 112 q-14 38 0 76" fill="none" stroke="${C.terracota}" stroke-width="8" stroke-linecap="round" class="timpano"/>
<ellipse cx="340" cy="150" rx="44" ry="40" fill="#f4d2b4" class="tf fino"/>
<path d="M350 190 q10 60 60 90" fill="none" stroke="${C.tinta}" stroke-width="18" stroke-linecap="round"/>
<path d="M350 190 q10 60 60 90" fill="none" stroke="#f4d2b4" stroke-width="10" stroke-linecap="round"/>
<g class="empuja">${flecha(196, 110, 268, 134, C.mar, 6)}${flecha(196, 190, 268, 166, C.mar, 6)}</g>
<g class="sube">${flecha(418, 290, 372, 222, C.verde, 7)}</g>
<g transform="translate(420 284)"><circle r="26" fill="${C.piel}" class="tf fino"/><ellipse cx="0" cy="6" rx="10" ry="12" fill="${C.tinta}" class="boca"/></g>`,
  `.timpano{animation:timpano 4s infinite ease-in-out;transform-box:fill-box;transform-origin:center}
@keyframes timpano{0%,40%{transform:translateX(12px)}60%,100%{transform:translateX(0)}}
.empuja{animation:empuja 4s infinite}
@keyframes empuja{0%,40%{opacity:1}50%,100%{opacity:0}}
.sube{opacity:0;animation:sub 4s infinite}
@keyframes sub{0%,40%{opacity:0}48%,80%{opacity:1}90%,100%{opacity:0}}
.boca{transform-box:fill-box;transform-origin:center;animation:boca 4s infinite}
@keyframes boca{0%,36%{transform:scaleY(.3)}44%,70%{transform:scaleY(1)}80%,100%{transform:scaleY(.3)}}`,
);

/**
 * **Las cuatro luces de al lado de la pista**, el PAPI del Anexo 14 de la
 * OACI: la pista vista desde la final, con las cuatro luces a su izquierda;
 * dos blancas y dos rojas, el avión va por su senda.
 */
const PAPI = lamina(
  `<rect width="480" height="320" rx="18" fill="${C.cielo}"/>
<path d="M0 170 h480 v150 h-480z" fill="${C.verde}" opacity=".55"/>
<path d="M210 170 h60 l120 150 h-300z" fill="#5d625f" class="tf fino"/>
<path d="M240 186 v14 M240 214 v18 M240 248 v24 M240 290 v26" stroke="${C.blanco}" stroke-width="6" stroke-linecap="round"/>
<path d="M60 236 h110" stroke="${C.tinta}" stroke-width="6" stroke-linecap="round"/>
<circle cx="72" cy="226" r="13" fill="${C.blanco}" class="tf fino"/>
<circle cx="102" cy="226" r="13" fill="${C.blanco}" class="tf fino"/>
<circle cx="132" cy="226" r="13" fill="${C.rojo}" class="tf fino"/>
<circle cx="162" cy="226" r="13" fill="${C.rojo}" class="tf fino"/>
<g class="baja" transform="translate(300 70)">
<path d="M-34 0 q0 -7 9 -7 h44 q12 0 18 7 q-6 7 -18 7 h-44 q-9 0 -9 -7z" fill="${C.blanco}" class="tf fino"/>
<path d="M-4 0 l-16 15 h9 l23 -15z M-4 0 l-16 -15 h9 l23 15z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="3"/>
</g>
<path d="M330 80 L250 168" stroke="${C.blanco}" stroke-width="4" stroke-dasharray="8 10"/>`,
  `.baja{animation:baja 4s infinite ease-in-out}
@keyframes baja{0%{transform:translate(330px,50px)}100%{transform:translate(280px,110px)}}`,
);

/**
 * **Los telescopios de lo alto de La Palma**: la montaña sobre el mar de
 * nubes, las cúpulas blancas en la cumbre y el cielo de noche con sus
 * estrellas, que es lo que miran.
 */
const ESTRELLAS = (() => {
  const estrellas = [
    [60, 50], [130, 30], [200, 70], [270, 36], [350, 60], [420, 28], [100, 100], [300, 110], [440, 96], [170, 130],
  ]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 5 : 3.5}" fill="${C.amarillo}" class="e" style="animation-delay:${(i * 0.3) % 1.8}s"/>`)
    .join("");
  return lamina(
    `<rect width="480" height="320" rx="18" fill="#1d2a44"/>
${estrellas}
<path d="M0 320 V260 L120 200 L210 150 L250 140 L290 152 L380 210 L480 250 V320z" fill="#6b4a33" class="tf fino"/>
<path d="M0 290 q60 -18 120 -4 t120 -2 t120 4 t120 -6 V320 H0z" fill="${C.blanco}" opacity=".9"/>
<g transform="translate(232 140)"><path d="M-18 0 a18 18 0 0 1 36 0z" fill="${C.blanco}" class="tf fino"/><path d="M0 -6 l22 -26" stroke="${C.tinta}" stroke-width="6" stroke-linecap="round"/></g>
<g transform="translate(276 148)"><path d="M-12 0 a12 12 0 0 1 24 0z" fill="${C.blanco}" class="tf fino"/></g>
<g transform="translate(196 156)"><path d="M-10 0 a10 10 0 0 1 20 0z" fill="${C.blanco}" class="tf fino"/></g>`,
    `.e{animation:e 1.8s infinite ease-in-out}
@keyframes e{50%{opacity:.35}}`,
  );
})();

/** Un avioncito visto desde arriba, mirando a la derecha, en `(x,y)` y girado `grados`. */
function avioncito(x: number, y: number, grados: number, escala = 1, color: string = C.blanco): string {
  return `<g transform="translate(${x} ${y}) rotate(${grados}) scale(${escala})">
<path d="M-26 0 q0 -6 8 -6 h34 q10 0 14 6 q-4 6 -14 6 h-34 q-8 0 -8 -6z" fill="${color}" class="tf fino"/>
<path d="M-2 0 l-12 -24 h8 l18 24z M-2 0 l-12 24 h8 l18 -24z M-22 0 l-6 -10 h5 l8 10z M-22 0 l-6 10 h5 l8 -10z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
</g>`;
}

/**
 * **La vuelta en la pista de La Palma** (punto 300), desde arriba, como en
 * la carta del aeródromo: la pista, el ensanche redondo del final para girar
 * y la única calle hacia la terminal, a media pista y ya detrás. El camino
 * del avión, con su orden —1, 2, 3—: pista adelante hasta la punta, la vuelta
 * en el ensanche y de vuelta por la misma pista hasta la calle. Y arriba, el
 * avión que llega y espera dando vueltas: mientras uno va por la pista, nadie
 * aterriza en ella. Sin letras.
 */
const VUELTA_EN_PISTA = lamina(
  `<rect width="480" height="320" rx="18" fill="#cfe0b8"/>
<path d="M170 196 q8 34 44 48 h136" fill="none" stroke="#7d827f" stroke-width="26" stroke-linejoin="round"/>
<path d="M26 148 H372 A44 44 0 1 1 372 200 H26z" fill="#5d625f" class="tf fino"/>
<path d="M44 174 h18 M84 174 h18 M124 174 h18 M164 174 h18 M204 174 h18 M244 174 h18 M284 174 h18 M324 174 h18" stroke="${C.blanco}" stroke-width="5" stroke-linecap="round"/>
<rect x="300" y="256" width="150" height="44" rx="6" fill="${C.terracota}" class="tf fino"/>
<path d="M276 300 v-28 M266 272 h20 v-14 h-20z" fill="${C.cielo}" stroke="${C.tinta}" stroke-width="4" stroke-linejoin="round"/>
<path class="camino" d="M40 166 H372 A20 20 0 1 1 372 182 H186 Q170 182 172 200 q8 34 44 46 h120" fill="none" stroke="${C.amarillo}" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 12"/>
${numero(130, 124, 1)}
${numero(452, 112, 2)}
${numero(236, 216, 3)}
${avioncito(84, 166, 0, 0.8)}
<circle cx="80" cy="62" r="38" fill="none" stroke="${C.tinta}" stroke-width="4" stroke-dasharray="10 8"/>
<g class="espera">${avioncito(80, 24, 0, 0.7)}</g>`,
  `.camino{animation:anda 1.6s linear infinite}
@keyframes anda{to{stroke-dashoffset:-26}}
.espera{transform-box:view-box;transform-origin:80px 62px;animation:espera 6s linear infinite}
@keyframes espera{to{transform:rotate(360deg)}}`,
);

/**
 * **Los compartimentos de arriba**, al abrirlos en el puesto: la tapa
 * levantada y la maleta que se movió en el vuelo, asomando y cayéndose.
 */
const MALETERO = lamina(
  `<path d="M30 40 h420 v110 h-420z" fill="#d9d2c4" class="tf fino"/>
<path d="M60 70 h170 v70 h-170z" fill="#efe9dd" class="tf fino"/>
<g class="tapa"><path d="M250 150 h170 v-12 h-170z" fill="#efe9dd" class="tf fino"/></g>
<path d="M250 70 h170 v70 h-170z" fill="#8f8a80" class="tf fino"/>
<g class="cae"><rect x="300" y="96" width="92" height="64" rx="10" fill="${C.terracota}" class="tf fino"/>
<path d="M330 96 v-12 h32 v12" class="t"/></g>
<path d="M300 210 l-10 22 M346 214 v24 M392 210 l10 22" class="t fino"/>
<path d="M40 286 h400" stroke="${C.gris}" stroke-width="10" stroke-linecap="round"/>
<path d="M90 286 v-56 q0 -14 14 -14 h40 q14 0 14 14 v56" fill="${C.marHondo}" class="tf fino"/>`,
  `.tapa{transform-box:fill-box;transform-origin:100% 0%;animation:abre 5s infinite}
@keyframes abre{0%,15%{transform:rotate(0)}30%,100%{transform:rotate(-58deg)}}
.cae{transform-box:fill-box;transform-origin:50% 100%;animation:cae 5s infinite}
@keyframes cae{0%,32%{transform:translate(0,0) rotate(0)}48%{transform:translate(4px,18px) rotate(12deg)}60%,100%{transform:translate(4px,18px) rotate(12deg)}}`,
);

/**
 * **Lo que sabe hacer la tripulación de cabina** (punto 303), con las señales
 * de seguridad que se ven en cualquier aeropuerto: el botiquín —la cruz
 * blanca sobre verde de la ISO 7010— y el desfibrilador —el corazón con el
 * rayo—; el extintor apagando una llamita; la rampa de evacuación con el
 * reloj, que se vacía el avión en noventa segundos; y el chaleco en el agua.
 * Ni la cruz roja, que es un emblema protegido y no un dibujo.
 */
const TRIPULACION = lamina(
  `<rect x="34" y="28" width="112" height="112" rx="18" fill="${C.verde}" class="tf fino"/>
<path d="M76 48 h28 v28 h28 v28 h-28 v28 h-28 v-28 h-28 v-28 h28z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
<rect x="184" y="28" width="112" height="112" rx="18" fill="${C.verde}" class="tf fino"/>
<path class="late" d="M240 124 l-36 -36 a20 20 0 0 1 36 -26 a20 20 0 0 1 36 26z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
<path d="M246 64 l-16 26 h14 l-10 24 l26 -32 h-14 l10 -18z" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
<rect x="352" y="56" width="44" height="88" rx="16" fill="${C.rojo}" class="tf fino"/>
<path d="M362 56 v-14 h24 v14 M386 46 q24 -6 30 18" class="t fino"/>
<path class="chorro" d="M418 70 l22 22 M424 64 l26 14 M412 76 l18 26" stroke="${C.blanco}" stroke-width="5" stroke-linecap="round"/>
<path class="llama" d="M446 128 q-14 -14 -4 -30 q4 12 10 10 q-2 -10 6 -18 q8 22 0 38z" fill="${C.naranja}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
<path d="M34 268 h160" stroke="${C.gris}" stroke-width="8" stroke-linecap="round"/>
<path d="M50 176 h60 v40 h-60z" fill="#efe9dd" class="tf fino"/>
<path d="M110 206 l70 58" stroke="${C.amarillo}" stroke-width="16" stroke-linecap="round"/>
<g class="baja"><circle cx="126" cy="206" r="9" fill="${C.piel}" class="tf fino"/><path d="M124 216 l14 14" stroke="${C.marHondo}" stroke-width="9" stroke-linecap="round"/></g>
<circle cx="240" cy="222" r="34" fill="${C.blanco}" class="tf fino"/>
<path d="M240 184 v-8 M228 176 h24" class="t fino"/>
<path class="aguja" d="M240 222 v-24" stroke="${C.rojo}" stroke-width="5" stroke-linecap="round"/>
<path d="M300 276 q30 -12 60 0 t60 0 t60 0" fill="none" stroke="${C.mar}" stroke-width="6"/>
<path d="M300 284 h180 v26 h-180z" fill="${C.mar}"/>
<path d="M366 196 q28 -30 56 0 q14 34 0 58 q-28 18 -56 0 q-14 -24 0 -58z" fill="${C.amarillo}" class="tf fino"/>
<circle cx="394" cy="178" r="18" fill="${C.piel}" class="tf fino"/>`,
  `.late{transform-box:fill-box;transform-origin:center;animation:late 1.2s infinite}
@keyframes late{0%,100%{transform:scale(1)}15%{transform:scale(1.1)}30%{transform:scale(1)}}
.llama{transform-box:fill-box;transform-origin:50% 100%;animation:apaga 4s infinite}
@keyframes apaga{0%,20%{transform:scale(1)}60%,100%{transform:scale(0)}}
.chorro{opacity:0;animation:chorro 4s infinite}
@keyframes chorro{0%,10%{opacity:0}18%,60%{opacity:1}70%,100%{opacity:0}}
.baja{animation:desliza 3s infinite ease-in}
@keyframes desliza{0%{transform:translate(0,0)}70%,100%{transform:translate(46px,40px)}}
.aguja{transform-box:view-box;transform-origin:240px 222px;animation:gira 3s linear infinite}
@keyframes gira{to{transform:rotate(360deg)}}`,
);

/** Los dibujos, por clave: el SVG entero de cada uno. */
export const DIBUJOS_DEL_PASAJE: Readonly<Record<DibujoDelPasaje, string>> = {
  "vuelta-en-pista": VUELTA_EN_PISTA,
  maletero: MALETERO,
  tripulacion: TRIPULACION,
  papi: PAPI,
  estrellas: ESTRELLAS,
  meneo: MENEO,
  techo: TECHO,
  cinturon: CINTURON,
  salidas: SALIDAS,
  mascara: MASCARA,
  chaleco: CHALECO,
  tarjeta: TARJETA,
  "modo-avion": MODO_AVION,
  persiana: PERSIANA,
  nube: NUBE,
  ala: ALA,
  alto: ALTO,
  motor: MOTOR,
  frio: FRIO,
  islas: ISLAS,
  ruta: RUTA,
  oido: OIDO,
};

/** Si una clave es la de un dibujo de la escena. */
export function esDibujoDelPasaje(clave: string): clave is DibujoDelPasaje {
  return Object.prototype.hasOwnProperty.call(DIBUJOS_DEL_PASAJE, clave);
}

/**
 * **El dibujo como URL de datos**, para la `<img>` de la ventana. Codificado
 * entero —`encodeURIComponent`—, que un `#` de un color suelto cortaría la
 * URL por la mitad.
 */
export function urlDelDibujo(clave: DibujoDelPasaje): string {
  return urlDeLaLamina(DIBUJOS_DEL_PASAJE[clave]);
}

/** Una lámina cualquiera como URL de datos: la de la ruta con el vuelo de verdad, por ejemplo. */
export function urlDeLaLamina(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
