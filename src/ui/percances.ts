/**
 * Los dibujos de los percances: lo que se ve cuando algo sale mal.
 *
 * Son la mitad que enseña. «Que entienda que metió la pata, sin sangre ni
 * miembros desperdigados por ahí, pero que vea que algo pasa»: eso es
 * exactamente el registro de la granja, y también el único que funciona a los
 * cuatro años. Un dibujo de una avioneta con la hélice torcida y una nubecilla
 * de humo se lee entero en medio segundo y da risa; un mensaje rojo de error
 * no se lee, y da miedo.
 *
 * Van más grandes que los de la tarjeta —sesenta y cuatro en vez de
 * veinticuatro— porque ocupan el sitio de la manga en la pantalla de fin de
 * vuelo, que es el único sitio donde este juego pide mirar y no volar.
 *
 * Y cada uno dice **qué** pasó, no que hayas sido malo: el coche con cara de
 * susto, el hangar con el morro dentro, el avión en la hierba al lado de su
 * pista. Quien lo ve sabe qué repetir sin que nadie se lo explique.
 */

import type { Percance } from "../flight/percance";

const lienzo = (contenido: string): string =>
  `<svg class="percance" viewBox="0 0 64 64" role="img" aria-hidden="true">${contenido}</svg>`;

/** La avioneta de frente, con la hélice doblada. Se repite en varios. */
const AVIONETA = `
  <path d="M14 34 h36" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" />
  <path d="M30 26 h4 v12 h-4 Z" />
  <path d="M27 42 h10 l-2 4 h-6 Z" />
  <path d="M32 26 v-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
  <path d="M32 21 l-7 -3 M32 21 l6 -5" stroke="currentColor" stroke-width="2.8"
        stroke-linecap="round" fill="none" />
`;

/** Y la nubecilla, que es lo que convierte un golpe en un chiste. */
const HUMO = `
  <circle cx="47" cy="20" r="3.4" opacity="0.8" />
  <circle cx="52" cy="15" r="2.6" opacity="0.6" />
  <circle cx="55.5" cy="11" r="1.8" opacity="0.45" />
`;

/** Las estrellitas del golpe: el idioma universal de «ay». */
const CHISPAS = `
  <path d="M20 16 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6
           3.6 -1.6 Z" opacity="0.9" />
  <path d="M45 44 l1.2 2.7 2.7 1.2 -2.7 1.2 -1.2 2.7 -1.2 -2.7 -2.7 -1.2
           2.7 -1.2 Z" opacity="0.6" />
`;

/**
 * El coche del sígame, atropellado, con cara de circunstancias.
 *
 * La cara es el dibujo entero: dos ojos como platos y una boca torcida. Es lo
 * que pidió quien lo juega, y tiene razón — el coche es un personaje desde que
 * sale a esperarte delante del morro, y un personaje al que atropellas tiene
 * que poner cara.
 */
const COCHE = lienzo(`
  ${CHISPAS}
  <rect x="8" y="34" width="34" height="12" rx="3" />
  <rect x="14" y="26" width="20" height="9" rx="2.5" />
  <circle class="percance__hueco" cx="19" cy="30.5" r="1.8" />
  <circle class="percance__hueco" cx="29" cy="30.5" r="1.8" />
  <path d="M20 33.4 q4 -2.2 8 0" stroke="currentColor" stroke-width="1.6"
        fill="none" stroke-linecap="round" class="percance__hueco" />
  <circle cx="16" cy="48" r="4.2" />
  <circle cx="35" cy="48" r="4.2" />
  <path d="M44 30 h14 M46 38 h12" stroke="currentColor" stroke-width="3.4"
        stroke-linecap="round" fill="none" />
  <path d="M50 22 l3 -6 M57 26 l6 -3" stroke="currentColor" stroke-width="2.6"
        stroke-linecap="round" fill="none" opacity="0.7" />
`);

/** El morro dentro del hangar. */
const EDIFICIO = lienzo(`
  ${CHISPAS}
  <path d="M10 50 v-16 l14 -8 14 8 v16 Z" opacity="0.8" />
  <path d="M16 50 v-10 h16 v10 Z" class="percance__hueco" />
  <g transform="translate(18 6) scale(0.62)">${AVIONETA}</g>
  ${HUMO}
`);

/** La pista, y el avión en la hierba de al lado. */
const FUERA = lienzo(`
  <path d="M10 8 h12 v48 h-12 Z" opacity="0.75" />
  <path d="M16 12 v6 M16 24 v6 M16 36 v6 M16 48 v6" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round" fill="none"
        class="percance__hueco" />
  <g transform="translate(14 8) scale(0.75)">${AVIONETA}</g>
  ${HUMO}
`);

/** El golpe contra el suelo: el avión y el rebote. */
const GOLPE = lienzo(`
  ${CHISPAS}
  <g transform="translate(0 2)">${AVIONETA}</g>
  <path d="M8 54 h48" stroke="currentColor" stroke-width="3.4"
        stroke-linecap="round" fill="none" />
  <path d="M22 50 q10 -8 20 0" stroke="currentColor" stroke-width="2.2"
        fill="none" stroke-dasharray="3 3" />
  ${HUMO}
`);

/** Pasarse por el final: la pista se acaba y el avión sigue. */
const PASADA = lienzo(`
  <path d="M6 40 h30 v10 H6 Z" opacity="0.75" />
  <path d="M36 38 v14" stroke="currentColor" stroke-width="3" fill="none" />
  <g transform="translate(28 4) scale(0.7)">${AVIONETA}</g>
  ${HUMO}
`);

/**
 * Entrar en pista sin permiso: la doble raya cruzada y la luz en rojo.
 *
 * El dibujo es el sitio donde había que parar, y por eso no lleva avión roto:
 * aquí no se rompió nada, y lo que hay que entender no es «te has hecho daño»
 * sino «has pasado por donde no se pasa». La lámpara al lado, encendida en la
 * de arriba, dice qué era lo que había que mirar.
 */
const SIN_PERMISO = lienzo(`
  <path d="M6 26 h40 M6 34 h40" stroke="currentColor" stroke-width="4"
        stroke-linecap="round" fill="none" />
  <path d="M14 14 l24 32 M38 14 l-24 32" stroke="currentColor" stroke-width="3"
        stroke-linecap="round" fill="none" opacity="0.85" />
  <rect x="50" y="14" width="10" height="26" rx="5" opacity="0.35" />
  <circle cx="55" cy="21" r="3.4" />
  <circle class="percance__hueco" cx="55" cy="33" r="3.4" />
`);

const DIBUJOS: Record<Percance, string> = {
  coche: COCHE,
  edificio: EDIFICIO,
  fuera: FUERA,
  golpe: GOLPE,
  pasada: PASADA,
  sinpermiso: SIN_PERMISO,
};

export const dibujoDePercance = (p: Percance): string => DIBUJOS[p];
