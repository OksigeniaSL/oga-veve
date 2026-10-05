/**
 * **Las explicaciones que trae el juego**: las del cuadro y las curiosidades
 * del vuelo.
 *
 * Primero las piezas que ya salen en los peldaños de abajo —la velocidad, la
 * altura, el rumbo, el horizonte, el motor, el tren, los flaps—, que es lo
 * que pidió Enrique para el 117; después los símbolos de la pantalla de
 * navegación que no se reconocen sin preguntar —el arco verde, el rombo del
 * TCAS, el círculo del T/D y del T/C, el rombo de la senda—, que son el 204,
 * el 151 y el 154; y el rincón de las curiosidades, el 196.
 *
 * ## Lo que dice cada una es lo real
 *
 * Simplificado en la presentación tanto como haga falta, y nunca falseado: la
 * regla 4 de AGENTS.md. Quien aprenda aquí qué es el T/D tiene que leerlo
 * igual el día que mire una pantalla de navegación de verdad. Dos cosas que
 * se miraron al escribirlas:
 *
 * - **El TCAS**: rombo hueco, otro tráfico; rombo lleno, tráfico cerca;
 *   círculo ámbar, aviso de tráfico. El cuadrado rojo existe —es el aviso de
 *   maniobra, el RA— y este juego no lo da, porque trabaja en TA ONLY. La
 *   explicación lo dice así en vez de callarlo o de inventarle un color. Ver
 *   la cabecera de `flight/tcas.ts`.
 * - **La senda**: el rombo dice dónde está la senda, no dónde estás tú. Rombo
 *   abajo es que vas alto, y se baja «hacia el rombo». Es lo que se enseña en
 *   cualquier escuela, y es al revés de lo que parece.
 *
 * ## Y los dibujos son los de la pantalla
 *
 * Los símbolos de la pantalla de navegación se dibujan con sus colores y
 * sobre su fondo oscuro: se explica el círculo verde que se tocó, y no un
 * dibujo parecido. Lo que ya tenía dibujo en la tarjeta de señal —el tren, los
 * flaps, la máscara— lo reusa. Ninguno lleva letras: en el primer peldaño no
 * se lee, y el dibujo va en los cuatro.
 */

import type { TranslationKey } from "../i18n";
import { barrasDe, type Grado } from "../flight/cuaderno";
import { INSTRUCTORA_CALLADA } from "./instructora-callada";
import { dibujoDe, EXPLICACIONES_DEL_AVION } from "./explicaciones-del-avion";
import {
  explicacionDe,
  registrarExplicacion,
  type Explicacion,
} from "./explicaciones";

/** Un dibujo de pantalla, con el fondo oscuro de la cabina. */
const pantalla = (cuerpo: string): string =>
  `<svg viewBox="0 0 120 80" aria-hidden="true">
     <rect x="1" y="1" width="118" height="78" rx="8" class="ex-pantalla" />${cuerpo}
   </svg>`;

/** Un dibujo de trazo, en el lienzo de veinticuatro de la tarjeta de señal. */
const trazo = (cuerpo: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" class="ex-trazo">${cuerpo}</svg>`;

/** El avión propio de la carta: el triángulo amarillo, abajo y en medio. */
const YO = `<path class="ex-f-yo" d="M60 70 l-5 7 h10 Z" />`;

/* ── Los dibujos del cuadro ───────────────────────────────────────────── */

const VELOCIDAD = pantalla(`
  <rect x="38" y="8" width="30" height="64" rx="3" class="ex-ventana" />
  <rect x="64" y="8" width="4" height="10" class="ex-f-rojo" />
  <rect x="64" y="18" width="4" height="36" class="ex-f-verde" />
  <rect x="61" y="40" width="3" height="24" class="ex-f-blanco" />
  <rect x="64" y="54" width="4" height="18" class="ex-f-ambar" />
  <path d="M60 16 h4 M60 28 h4 M60 40 h4 M60 52 h4 M60 64 h4" class="ex-s-blanco" />
  <path d="M34 33 h28 l5 7 l-5 7 h-28 Z" class="ex-caja" />
  <path d="M74 40 l10 -6 v12 Z" class="ex-f-magenta" />
`);

const ALTITUD = pantalla(`
  <path d="M10 70 q14 -22 28 -8 q10 -16 24 0 v10 H10 Z" class="ex-f-tierra" />
  <path d="M20 40 l10 -4 l4 2 l-10 4 Z" class="ex-f-yo" />
  <path d="M27 58 v-12 M23 50 l4 -5 l4 5" class="ex-s-blanco" />
  <rect x="70" y="8" width="34" height="64" rx="3" class="ex-ventana" />
  <path d="M70 16 h8 M70 28 h5 M70 40 h8 M70 52 h5 M70 64 h8" class="ex-s-blanco" />
  <path d="M70 16 h7 l-4 5 l4 5 h-7 Z" class="ex-f-magenta" />
  <path d="M66 33 h38 v14 h-38 Z" class="ex-caja" />
  <text x="101" y="44" class="ex-cifra ex-f-blanco" text-anchor="end">2000</text>
`);

const RUMBO = pantalla(`
  <circle cx="60" cy="58" r="44" class="ex-s-blanco ex-fino" />
  <path d="M60 14 v8 M60 14 v8 M38 20 l3 6 M82 20 l-3 6 M19 37 l6 4 M101 37 l-6 4
           M16 58 h8 M96 58 h8" class="ex-s-blanco" />
  <path d="M60 10 l-5 -7 h10 Z" class="ex-f-magenta" />
  <path d="M60 26 l4 8 h-8 Z" class="ex-f-blanco" />
  <path d="M60 46 v20 M50 54 h20 M55 64 h10" class="ex-s-yo ex-grueso" />
`);

const ACTITUD = pantalla(`
  <clipPath id="ex-actitud"><circle cx="60" cy="40" r="34" /></clipPath>
  <g clip-path="url(#ex-actitud)" transform="rotate(-14 60 40)">
    <rect x="10" y="-10" width="100" height="54" class="ex-f-cielo" />
    <rect x="10" y="44" width="100" height="50" class="ex-f-tierra" />
    <path d="M10 44 h100" class="ex-s-blanco" />
    <path d="M50 34 h20 M54 24 h12 M50 54 h20" class="ex-s-blanco ex-fino" />
  </g>
  <circle cx="60" cy="40" r="34" class="ex-s-bisel" />
  <path d="M34 40 h16 l4 5 M86 40 h-16 l-4 5" class="ex-s-yo ex-grueso" />
  <circle cx="60" cy="40" r="2.6" class="ex-f-yo" />
`);

const VARIOMETRO = pantalla(`
  <path d="M30 10 a34 34 0 0 1 0 60" class="ex-s-blanco ex-fino" />
  <path d="M30 10 l6 3 M38 22 l6 2 M42 40 h8 M38 58 l6 -2 M30 70 l6 -3" class="ex-s-blanco" />
  <path d="M30 40 L74 22" class="ex-s-blanco ex-grueso" />
  <path d="M92 52 V18 M84 28 l8 -10 l8 10" class="ex-s-verde ex-grueso" />
`);

const MOTOR = pantalla(`
  <path d="M24 62 a36 36 0 1 1 72 0" class="ex-s-blanco ex-fino" />
  <path d="M88 32 a36 36 0 0 1 8 30" class="ex-s-rojo ex-grueso" />
  <path d="M27 50 a36 36 0 0 1 58 -22" class="ex-s-verde ex-grueso" />
  <path d="M60 62 L84 34" class="ex-s-blanco ex-grueso" />
  <circle cx="60" cy="62" r="4" class="ex-f-blanco" />
  <path d="M57 26 l3 -6 l3 6 Z" class="ex-f-magenta" />
`);

const TREN = pantalla(`
  <path d="M14 30 q46 -18 92 0 v6 q-46 -10 -92 0 Z" class="ex-f-blanco" />
  <path d="M60 30 v24 M30 34 v22 M90 34 v22" class="ex-s-blanco ex-grueso" />
  <circle cx="60" cy="60" r="7" class="ex-f-rueda" />
  <circle cx="30" cy="62" r="7" class="ex-f-rueda" />
  <circle cx="90" cy="62" r="7" class="ex-f-rueda" />
  <circle cx="30" cy="14" r="6" class="ex-f-verde" />
  <circle cx="60" cy="10" r="6" class="ex-f-verde" />
  <circle cx="90" cy="14" r="6" class="ex-f-verde" />
`);

const PRESURIZACION = pantalla(`
  <circle cx="60" cy="40" r="28" class="ex-s-blanco ex-grueso" />
  <path d="M38 46 h44" class="ex-s-blanco ex-fino" />
  <circle cx="50" cy="38" r="4" class="ex-f-blanco" />
  <circle cx="70" cy="38" r="4" class="ex-f-blanco" />
  <path d="M8 40 h14 M16 34 l6 6 l-6 6 M112 40 h-14 M104 34 l-6 6 l6 6
           M60 4 v8 M54 6 l6 6 l6 -6" class="ex-s-celeste ex-grueso" />
`);

const MATRICULA = pantalla(`
  <rect x="14" y="24" width="92" height="32" rx="4" class="ex-f-chapa" />
  <circle cx="21" cy="40" r="2.4" class="ex-f-tornillo" />
  <circle cx="99" cy="40" r="2.4" class="ex-f-tornillo" />
  <path d="M30 32 h12 l-12 16 h12 M48 32 v16 M48 32 h7 a4 4 0 0 1 0 8 h-7
           M62 40 h6 M74 48 l6 -16 l6 16 M76.5 42 h7 M92 32 v16" class="ex-s-negro ex-grueso" />
`);

const AVISOS = pantalla(`
  <rect x="10" y="14" width="46" height="22" rx="3" class="ex-f-ambar" />
  <rect x="64" y="14" width="46" height="22" rx="3" class="ex-f-rojo" />
  <rect x="10" y="44" width="46" height="22" rx="3" class="ex-apagada" />
  <rect x="64" y="44" width="46" height="22" rx="3" class="ex-apagada" />
  <path d="M33 18 v8 M33 30 v2" class="ex-s-negro ex-grueso" />
  <path d="M87 18 v8 M87 30 v2" class="ex-s-blanco ex-grueso" />
`);

const COORDINADOR = pantalla(`
  <circle cx="60" cy="36" r="28" class="ex-s-bisel" />
  <g transform="rotate(-18 60 36)">
    <path d="M30 36 h60 M60 36 v-8 M54 44 h12" class="ex-s-blanco ex-grueso" />
    <circle cx="60" cy="36" r="4" class="ex-f-blanco" />
  </g>
  <path d="M38 70 q22 8 44 0" class="ex-s-blanco ex-grueso" />
  <circle cx="60" cy="72" r="4.6" class="ex-f-negro" />
  <circle cx="60" cy="72" r="4.6" class="ex-s-blanco ex-fino" />
`);

/**
 * La manga de la comandante, con sus cuatro barras: la que se explica al
 * tocar la manga del cuaderno, que es la de quien juega.
 */
const GALONES = `<svg viewBox="0 0 120 80" aria-hidden="true">
  <path d="M18 10 h84 l-6 62 h-72 Z" class="ex-f-manga" />
  <rect x="24" y="30" width="72" height="5" class="ex-f-oro" />
  <rect x="24" y="40" width="72" height="5" class="ex-f-oro" />
  <rect x="24" y="50" width="72" height="5" class="ex-f-oro" />
  <rect x="24" y="60" width="72" height="5" class="ex-f-oro" />
</svg>`;

/*
 * ── Cada grado, con lo que quiere decir ───────────────────────────────
 *
 * El 131 lo pide así: «los galones que se ganan, con lo que significan». La
 * manga de arriba explica las barras en general; estas, cada escalón: la
 * manga de ese grado a la izquierda —la misma que pinta el cuaderno, con sus
 * barras— y a la derecha **de qué se responde** con ella. No de qué se manda:
 * los galones no son mando, son responsabilidad (AGENTS.md).
 *
 * **Con las barras de `barrasDe`, no con un número a mano.** Aquí iban una,
 * dos, tres y cuatro —una por escalón— mientras el cuaderno ya pintaba una,
 * tres, cuatro y cuatro: tocar la manga de la piloto, con sus tres barras,
 * abría un dibujo con dos.
 */

/** La manga de un grado, con sus barras, en la mitad izquierda del lienzo. */
const mangaDeGrado = (g: Grado): string =>
  `<path d="M6 8 h48 l-4 64 h-40 Z" class="ex-f-manga" />
   ${Array.from(
     { length: barrasDe(g) },
     (_, i) => `<rect x="10" y="${60 - i * 10}" width="40" height="5" class="ex-f-oro" />`,
   ).join("")}`;

/** Una persona de dibujo: cabeza y hombros. `r` es el radio de la cabeza. */
const persona = (cx: number, cy: number, r: number, clase = "ex-f-blanco"): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" class="${clase}" />
   <path d="M${cx - r * 1.7} ${cy + r * 3.2} q0 ${-r * 2} ${r * 1.7} ${-r * 2} q${r * 1.7} 0 ${r * 1.7} ${r * 2} Z" class="${clase}" />`;

/** Aprendiz: aprendés al lado de la instructora, que te dice qué toca. */
const GRADO_APRENDIZ = `<svg viewBox="0 0 120 80" aria-hidden="true">
  ${mangaDeGrado("aprendiz")}
  ${persona(98, 30, 9, "ex-f-ambar")}
  <path d="M86 24 a12 12 0 0 1 24 0" class="ex-s-blanco" />
  ${persona(74, 42, 7, "ex-f-yo")}
</svg>`;

/** Piloto: el avión lo llevás vos, del puesto al puesto. */
const GRADO_PILOTO = `<svg viewBox="0 0 120 80" aria-hidden="true">
  ${mangaDeGrado("piloto")}
  <path d="M64 66 H116" class="ex-s-blanco" />
  <path d="M70 58 L104 30 L110 32 L84 58 Z M92 42 L84 34 L88 32 L98 38 Z" class="ex-f-yo" />
</svg>`;

/** Comandante: respondés por el avión y por todos los que van a bordo. */
const GRADO_COMANDANTE = `<svg viewBox="0 0 120 80" aria-hidden="true">
  ${mangaDeGrado("comandante")}
  <path d="M64 30 Q90 4 116 30" class="ex-s-ambar ex-grueso" />
  ${persona(72, 34, 7, "ex-f-yo")}
  ${persona(90, 40, 4.4)}
  ${persona(106, 40, 4.4)}
  ${persona(98, 56, 4.4)}
  ${persona(111, 56, 4.4)}
</svg>`;

/** Instructora: sabés tanto que podés enseñarle a otro. */
const GRADO_INSTRUCTORA = `<svg viewBox="0 0 120 80" aria-hidden="true">
  ${mangaDeGrado("instructora")}
  ${persona(76, 30, 9, "ex-f-yo")}
  <path d="M84 40 L100 32" class="ex-s-blanco" />
  ${persona(104, 44, 6)}
</svg>`;

/**
 * **La hoja de la instructora**: la tablilla con su pinza y tres filas, cada
 * una con su raya escrita y su visto verde. Es lo que se gana en cada vuelo,
 * y no lleva barras: las barras son del grado. Ver `ui/hoja.ts`.
 */
const HOJA = `<svg viewBox="0 0 120 80" aria-hidden="true">
  <rect x="34" y="6" width="52" height="70" rx="5" class="ex-f-blanco" />
  <rect x="48" y="2" width="24" height="10" rx="3" class="ex-f-ambar" />
  ${[24, 42, 60]
    .map(
      (y) => `<path d="M42 ${y + 4} h22" class="ex-s-gris ex-grueso" />
    <circle cx="74" cy="${y + 4}" r="6" class="ex-f-verde" />
    <path d="M70.8 ${y + 4.2} l2.2 2.2 l4 -4.4" class="ex-s-blanco" />`,
    )
    .join("")}
</svg>`;

/* ── Los de la pantalla de navegación ─────────────────────────────────── */

/** La rosa de la carta, abierta por arriba: lo de delante es lo que viene. */
const ROSA = `<path d="M8 76 a56 56 0 0 1 104 0" class="ex-s-gris" />`;

const CARTA = pantalla(`
  ${ROSA}
  <path d="M60 70 L48 30 L70 12" class="ex-s-magenta" />
  <path d="M28 52 l5 -5 l5 5 l-5 5 Z" class="ex-s-cian" />
  <text x="33" y="42" class="ex-cifra ex-f-cian" text-anchor="middle">+10</text>
  <path d="M86 40 l5 -5 l5 5 l-5 5 Z" class="ex-s-cian" />
  <text x="91" y="58" class="ex-cifra ex-f-cian" text-anchor="middle">-05</text>
  ${YO}
`);

const TCAS = pantalla(`
  <path d="M20 26 l8 -8 l8 8 l-8 8 Z" class="ex-s-cian ex-grueso" />
  <path d="M52 26 l8 -8 l8 8 l-8 8 Z" class="ex-f-cian" />
  <circle cx="92" cy="26" r="8" class="ex-f-ambar" />
  <text x="28" y="54" class="ex-cifra ex-f-cian" text-anchor="middle">+10</text>
  <path d="M44 54 v-9 M41 48 l3 -4 l3 4" class="ex-s-cian" />
  <text x="60" y="54" class="ex-cifra ex-f-cian" text-anchor="middle">-05</text>
  <text x="92" y="54" class="ex-cifra ex-f-ambar" text-anchor="middle">+02</text>
  <path d="M108 45 v9 M105 51 l3 4 l3 -4" class="ex-s-ambar" />
  ${YO}
`);

const ARCO = pantalla(`
  ${ROSA}
  <path d="M60 70 V16" class="ex-s-magenta" />
  <path d="M38 34 a30 30 0 0 1 44 0" class="ex-s-verde ex-grueso" />
  <rect x="56" y="10" width="8" height="18" class="ex-f-pista" />
  ${YO}
`);

const TD = pantalla(`
  <path d="M8 26 H54 L112 66" class="ex-s-magenta" />
  <circle cx="54" cy="26" r="9" class="ex-s-verde ex-grueso" />
  <path d="M94 72 h20" class="ex-s-blanco ex-grueso" />
`);

const TC = pantalla(`
  <path d="M8 66 L66 26 H112" class="ex-s-magenta" />
  <circle cx="66" cy="26" r="9" class="ex-s-verde ex-grueso" />
  <path d="M6 72 h20" class="ex-s-blanco ex-grueso" />
`);

const SENDA = pantalla(`
  <path d="M10 12 L70 60" class="ex-s-magenta ex-raya" />
  <path d="M64 66 h44" class="ex-s-blanco ex-grueso" />
  <path d="M22 30 l12 -5 l4 2 l-12 5 Z" class="ex-f-yo" />
  <circle cx="100" cy="16" r="2.6" class="ex-f-blanco" />
  <circle cx="100" cy="28" r="2.6" class="ex-f-blanco" />
  <path d="M94 40 h12" class="ex-s-blanco" />
  <circle cx="100" cy="52" r="2.6" class="ex-f-blanco" />
  <circle cx="100" cy="64" r="2.6" class="ex-f-blanco" />
  <path d="M100 46 l6 6 l-6 6 l-6 -6 Z" class="ex-f-magenta" />
`);

const GS_RODAJE = pantalla(`
  <path d="M14 36 l18 -6 l6 2 l-6 3 h-12 Z" class="ex-f-blanco" />
  <circle cx="20" cy="40" r="3" class="ex-f-blanco" />
  <circle cx="32" cy="40" r="3" class="ex-f-blanco" />
  <rect x="46" y="30" width="62" height="12" rx="3" class="ex-ventana" />
  <rect x="46" y="30" width="38" height="12" rx="3" class="ex-f-verde" />
  <rect x="88" y="27" width="4" height="18" class="ex-f-magenta" />
  <path d="M10 62 q50 -10 100 0" class="ex-s-amarillo ex-grueso" />
`);

/* ── Los de las curiosidades, de trazo como la tarjeta de señal ───────── */

const PERSIANAS = trazo(`
  <rect x="5" y="2.6" width="14" height="18.8" rx="6" />
  <path d="M7.2 8 h9.6" />
  <path d="M12 8 v-3.4 M10.2 6.2 l1.8 -1.8 l1.8 1.8" />
  <path d="M8.6 15.4 q3.4 -3 6.8 0" />
`);

const VIDEO = trazo(`
  <rect x="2.4" y="3.4" width="19.2" height="13" rx="1.8" />
  <path d="M9 21 h6 M12 16.6 v4.4" />
  <path d="M7 10 h7 M11.6 7.4 l2.6 2.6 l-2.6 2.6" />
  <path d="M17.6 6.6 v6.8" />
`);

const NO_FUMAR = `<svg viewBox="0 0 24 24" aria-hidden="true" class="ex-trazo">
  <rect x="4" y="12" width="13" height="3.2" rx="0.6" />
  <path d="M17 12 v3.2" />
  <path d="M15 9.4 q-1.4 -1.6 0 -3.2 q1.4 -1.6 0 -3.2" />
  <circle cx="12" cy="12" r="10.2" class="ex-s-rojo" />
  <path d="M4.8 4.8 L19.2 19.2" class="ex-s-rojo" />
</svg>`;

const CINTURON = trazo(`
  <path d="M2 9.6 q10 4 20 0" />
  <path d="M2 14.4 q10 4 20 0" />
  <rect x="8.4" y="8.6" width="7.2" height="7.6" rx="1.6" />
  <path d="M10.4 12.4 h3.2" />
`);

const MESITAS = trazo(`
  <path d="M7 2.6 l2.4 13.8 h8.6" />
  <path d="M9.4 16.4 l-2 5" />
  <path d="M18 16.4 v5" />
  <path d="M4.4 9 l3.8 -0.6" />
  <path d="M14.6 6 l-2.4 0.4 l0.6 3.6 l2.4 -0.4" />
`);

const MODO_AVION = trazo(`
  <rect x="6" y="1.8" width="12" height="20.4" rx="2.2" />
  <path d="M10.6 19 h2.8" />
  <path d="M12 6 v9 M8.2 11.2 l3.8 -1.6 l3.8 1.6 M10 15.6 l2 -0.8 l2 0.8" />
`);

/**
 * **El camión de bomberos de un aeropuerto**, de lado: la cisterna con su
 * cañón de agua, la cabina y las ruedas. El mismo que sale en el hangar cuando
 * un avión no se ofrece por sus bomberos. Ver `flight/bomberos.ts`.
 */
const BOMBEROS = trazo(`
  <rect x="2" y="9.6" width="12.4" height="7.6" rx="1" />
  <path d="M14.4 17.2 V11.2 h3.8 l3.2 3.4 v2.6 Z" />
  <path d="M16 12.8 h2 l1.4 1.6" />
  <path d="M5.4 9.6 l2.4 -3 h3" />
  <path d="M11 6.6 q3 -2.4 6.2 -1.4" stroke-dasharray="1.2 1.4" />
  <circle cx="6" cy="18.4" r="1.9" />
  <circle cx="17.6" cy="18.4" r="1.9" />
`);

/* ── La tabla ──────────────────────────────────────────────────────────── */

/** La frase de cada explicación, armada de su `id` para que no se descuadre. */
const claves = (id: string) => ({
  corta: `explica.${id}.corta` as TranslationKey,
  texto: `explica.${id}.texto` as TranslationKey,
});

/** Pone a toda una lista en su rincón. */
const enRincon = (
  rincon: Explicacion["rincon"],
  lista: readonly Explicacion[],
): readonly Explicacion[] => lista.map((e) => ({ ...e, rincon }));

const DEL_CUADRO = enRincon("cuadro", [
  { id: "velocidad", rotulo: "IAS", dibujo: { svg: VELOCIDAD }, ...claves("velocidad") },
  { id: "altitud", rotulo: "ALT", dibujo: { svg: ALTITUD }, ...claves("altitud") },
  { id: "rumbo", rotulo: "HDG", dibujo: { svg: RUMBO }, ...claves("rumbo") },
  { id: "actitud", dibujo: { svg: ACTITUD }, ...claves("actitud") },
  { id: "variometro", rotulo: "V/S", dibujo: { svg: VARIOMETRO }, ...claves("variometro") },
  { id: "coordinador", dibujo: { svg: COORDINADOR }, ...claves("coordinador") },
  { id: "motor", dibujo: { svg: MOTOR }, ...claves("motor") },
  { id: "flaps", rotulo: "FLAPS", dibujo: { senal: "flaps" }, ...claves("flaps") },
  { id: "tren", rotulo: "GEAR", dibujo: { svg: TREN }, ...claves("tren") },
  { id: "combustible", rotulo: "FUEL", dibujo: { senal: "combustible" }, ...claves("combustible") },
  {
    id: "presurizacion",
    rotulo: "CAB ALT",
    dibujo: { svg: PRESURIZACION },
    ...claves("presurizacion"),
  },
  { id: "avisos", dibujo: { svg: AVISOS }, ...claves("avisos") },
  { id: "matricula", dibujo: { svg: MATRICULA }, ...claves("matricula") },
  /*
   * **La pantalla de navegación entera**, con su variante de tierra. Es la
   * respuesta a «hay un avión a la derecha, al fondo, y el radar no lo
   * detecta»: el TCAS enseña los que vuelan cerca de tu altura, y lo de
   * mucho más arriba o más abajo se ve por la ventanilla y no en la carta,
   * como en una cabina de verdad. Y en tierra, descansa.
   */
  {
    id: "carta",
    rotulo: "ND",
    dibujo: { svg: CARTA },
    ...claves("carta"),
    enTierra: { texto: "explica.carta.tierra" },
  },
  {
    id: "tcas",
    rotulo: "TCAS",
    dibujo: { svg: TCAS },
    ...claves("tcas"),
    enTierra: { texto: "explica.carta.tierra" },
  },
  {
    id: "arco",
    dibujo: { svg: ARCO },
    ...claves("arco"),
    presenta: "explica.arco.presenta",
    tarjeta: "nivelar",
  },
  {
    id: "td",
    rotulo: "T/D",
    dibujo: { svg: TD },
    ...claves("td"),
    presenta: "explica.td.presenta",
    tarjeta: "descenso",
  },
  {
    id: "tc",
    rotulo: "T/C",
    dibujo: { svg: TC },
    ...claves("tc"),
    presenta: "explica.tc.presenta",
    tarjeta: "crucero",
  },
  {
    id: "senda",
    rotulo: "G/S",
    dibujo: { svg: SENDA },
    ...claves("senda"),
    presenta: "explica.senda.presenta",
    tarjeta: "senda",
  },
  {
    id: "gs-rodaje",
    rotulo: "GS",
    dibujo: { svg: GS_RODAJE },
    ...claves("gs-rodaje"),
    presenta: "explica.gs-rodaje.presenta",
    tarjeta: "velocidad",
  },
  /*
   * **Los galones de la manga**, que no son del cuadro sino del cuaderno.
   * Están porque AGENTS.md lo pide sin rodeos: si el juego enseña a contar las
   * barras, tiene que enseñar también qué significan. Cuatro barras no
   * quieren decir que mandes: quieren decir que respondes.
   */
  { id: "galones", dibujo: { svg: GALONES }, ...claves("galones") },
  /*
   * **Y cada grado, con lo suyo**, que se abre tocando su manga en la
   * escalera del cuaderno. Ver arriba, `GRADO_APRENDIZ`.
   */
  { id: "grado-aprendiz", dibujo: { svg: GRADO_APRENDIZ }, ...claves("grado-aprendiz") },
  { id: "grado-piloto", dibujo: { svg: GRADO_PILOTO }, ...claves("grado-piloto") },
  { id: "grado-comandante", dibujo: { svg: GRADO_COMANDANTE }, ...claves("grado-comandante") },
  { id: "grado-instructora", dibujo: { svg: GRADO_INSTRUCTORA }, ...claves("grado-instructora") },
  /*
   * **Y la hoja de la instructora**, que es lo que se gana en cada vuelo: se
   * abre tocando la hoja de un vuelo en el cuaderno. Las barras son del grado
   * y la hoja, del vuelo; si el juego enseña las dos, explica las dos.
   */
  { id: "hoja", dibujo: { svg: HOJA }, ...claves("hoja") },
  /*
   * **Y volar sin instructora**, que se abre desde su interruptor: qué calla,
   * qué no, y por qué hace falta ser comandante. Ver
   * `flight/sin-instructora.ts`.
   */
  { id: "sin-instructora", dibujo: { svg: INSTRUCTORA_CALLADA }, ...claves("sin-instructora") },
]);

/*
 * Los galones, los grados y el modo sin instructora se abren desde el
 * cuaderno y no desde el cuadro: no salen en ningún rincón.
 */
const SIN_RINCON = new Set([
  "galones",
  "hoja",
  "grado-aprendiz",
  "grado-piloto",
  "grado-comandante",
  "grado-instructora",
  "sin-instructora",
]);

const CURIOSIDADES = enRincon("curiosidades", [
  { id: "persianas", dibujo: { svg: PERSIANAS }, ...claves("persianas") },
  { id: "video-seguridad", dibujo: { svg: VIDEO }, ...claves("video-seguridad") },
  { id: "mascaras", dibujo: { senal: "mascara" }, ...claves("mascaras") },
  { id: "no-fumar", dibujo: { svg: NO_FUMAR }, ...claves("no-fumar") },
  { id: "cinturon", dibujo: { svg: CINTURON }, ...claves("cinturon") },
  { id: "mesitas", dibujo: { svg: MESITAS }, ...claves("mesitas") },
  { id: "modo-avion", dibujo: { svg: MODO_AVION }, ...claves("modo-avion") },
  /*
   * **Por qué a algunos aeropuertos solo van aviones chicos**, con el caso de
   * La Gomera: la pista, y a veces los bomberos. Ver `flight/bomberos.ts`.
   */
  { id: "bomberos-y-aviones", dibujo: { svg: BOMBEROS }, ...claves("bomberos-y-aviones") },
]);

/**
 * **Las del hangar**, sin rincón: se abren tocando el porqué de un avión o de
 * un destino que no se ofrece. Hoy, la de los bomberos —«y se explica de algún
 * modo, eso se tiene que saber, yo no tenía ni idea», dijo Enrique al ver la
 * regla—. Ver `abrirBomberos` en `ui/hangar.ts`.
 */
const DEL_HANGAR: readonly Explicacion[] = [
  { id: "bomberos", dibujo: { svg: BOMBEROS }, ...claves("bomberos") },
];

/**
 * **Los puntos de la tarjeta del avión en 3D**, en el mismo registro.
 *
 * La tarjeta los enseña en su globo, junto al punto, y así sigue. Pero hasta
 * ahora vivían solo ahí: con su `id`, su dibujo, su texto y su voz preparados
 * para el registro y sin apuntar en él, así que no se podían abrir por su `id`
 * desde ningún otro sitio —un rincón, un enlace, una presentación de la
 * instructora—. Se apuntan con su palabra corta, que es el título de la
 * ventana, y sin rincón: se llega a ellos desde la tarjeta o por su `id`. Ver
 * `ui/explicaciones-del-avion.ts`.
 */
const DEL_AVION: readonly Explicacion[] = EXPLICACIONES_DEL_AVION.map((e) => ({
  id: e.id,
  dibujo: { svg: dibujoDe(e, "ex-avion") },
  corta: e.corta,
  texto: e.texto,
  voz: e.voz,
  ...(e.video ? { video: { src: e.video } } : {}),
}));

/** Los `id` de las que trae el juego. Para las pruebas y para el banco. */
export const DE_SERIE: readonly string[] = [
  ...DEL_CUADRO,
  ...CURIOSIDADES,
  ...DEL_HANGAR,
  ...DEL_AVION,
].map((e) => e.id);

/**
 * **Apunta las de serie.** Se puede llamar las veces que haga falta: si una ya
 * está —porque alguien la afinó después—, no se pisa.
 */
export function ponerLasDeSerie(): void {
  for (const e of [...DEL_CUADRO, ...CURIOSIDADES, ...DEL_HANGAR, ...DEL_AVION]) {
    if (explicacionDe(e.id)) continue;
    registrarExplicacion(
      SIN_RINCON.has(e.id) ? { ...e, rincon: undefined } : e,
    );
  }
}
