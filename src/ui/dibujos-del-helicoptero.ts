/**
 * **Los dibujos del helicóptero**: los mismos significados que los del avión,
 * con el aparato que se vuela.
 *
 * Enrique, con el Super Puma en pantalla: «¿qué sentido tiene dibujar un avión
 * en los cuadros de mandos o la línea de entrada de aterrizaje si es un
 * helicóptero?». Ninguno. El dibujo de un mando es el dibujo de lo que se
 * mueve, y lo que se mueve aquí es un helicóptero. Cada dibujo de avión que
 * sale volándolo tiene aquí su pareja, con la misma idea y el mismo encaje
 * —el freno es la barra delante del aparato, el aire es el aparato visto
 * desde arriba—, para que lo aprendido con uno sirva con el otro.
 *
 * Tres vistas, las de un libro: **de perfil** para la palanca del colectivo,
 * que hace subir y bajar; **desde arriba** para lo que se mira en planta —el
 * freno, la palanca de la pantalla, el «ya estás volando»—; y **de espaldas**
 * para los pictogramas, que miran como la cámara de persecución. Los tres
 * cuartos no: a este tamaño y sin sombreado no se lee nada.
 *
 * Y el hueco de la ventanilla y del buje, en negro translúcido y no en un
 * color: así funciona igual sobre la tecla naranja, sobre el botón oscuro y
 * sobre el botón rojo del freno.
 */

/** El hueco: un oscurecido del mismo color, que vale sobre cualquier fondo. */
const HUECO = 'fill="rgba(0,0,0,.45)"';

/**
 * **De perfil, con el morro a la derecha**, como los aviones de perfil del
 * juego. En una caja de 17 × 14: el rotor arriba, el mástil, la cabina con su
 * ventanilla, el botalón y la deriva, y las ruedas, que el Super Puma no lleva
 * patines.
 */
const PERFIL = `
  <rect x="0.6" y="0.8" width="16.2" height="1.5" rx="0.75" />
  <rect x="9" y="1.6" width="1.3" height="3" />
  <path d="M6.4 4.4 H12.2 C14.8 4.4 16.6 6.4 16.6 8.4 C16.6 10 15.4 11 13.6 11 H7.6 C6.6 11 6 10.2 6 9.2 Z" />
  <path d="M6.8 5.2 L1.6 5.6 L1.6 7.2 L7 8.6 Z" />
  <path d="M0.4 2.8 H2.2 L2.6 7.4 H0.8 Z" />
  <path d="M12.6 5.6 h1.2 c1.1 0 1.9 .8 2.1 2 h-3.3 Z" ${HUECO} />
  <circle cx="8.6" cy="12.6" r="1.2" />
  <circle cx="14.4" cy="12.6" r="1.2" />`;
const PERFIL_CENTRO_X = 8.6;
const PERFIL_CENTRO_Y = 7.3;
const PERFIL_MEDIO_ANCHO = 8.2;

/** El helicóptero de perfil, centrado en (cx, cy) y con ese medio ancho. */
export function helicopteroDePerfil(cx: number, cy: number, medioAncho: number): string {
  const s = medioAncho / PERFIL_MEDIO_ANCHO;
  const x = cx - PERFIL_CENTRO_X * s;
  const y = cy - PERFIL_CENTRO_Y * s;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(3)})">${PERFIL}</g>`;
}

/**
 * **Desde arriba, con el morro hacia arriba**, en una caja de 24 × 24: las
 * cuatro palas en aspa, la cabina, el botalón y el estabilizador de cola. Las
 * palas paradas y no el disco: un aro con una cabina dentro se lee como una
 * diana, y el aspa es lo que un niño dibuja cuando dibuja un helicóptero.
 * Todo relleno y nada en trazo: los botones pintan el relleno de su color, y
 * unas palas en trazo salían negras sobre el botón rojo del freno.
 */
const PLANTA = `
  <rect x="11.2" y="-0.55" width="1.6" height="21.5" rx="0.8" transform="rotate(45 12 10.2)" />
  <rect x="11.2" y="-0.55" width="1.6" height="21.5" rx="0.8" transform="rotate(-45 12 10.2)" />
  <ellipse cx="12" cy="10.6" rx="3.1" ry="5.2" />
  <path d="M11.3 14.6 h1.4 L12.5 21.2 h-1 Z" />
  <path d="M9.4 20.6 h5.2 v1.5 h-5.2 Z" />
  <circle cx="12" cy="10.2" r="1.3" ${HUECO} />`;

/** El helicóptero desde arriba, para un lienzo de 24 × 24. */
export const HELICOPTERO_DESDE_ARRIBA = PLANTA;

const icono = (cuerpo: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${cuerpo}</svg>`;

/** **Ya estás volando**: el helicóptero desde arriba, como el ala del avión. */
export const HELICOPTERO_VOLANDO = icono(PLANTA);

/**
 * **El freno**: la barra gorda y el helicóptero que va hacia ella, el mismo
 * encaje que el avión y la barra de `FRENO` en `ui/senal.ts`. El Super Puma
 * lleva frenos en las ruedas, y en tierra se usan igual.
 */
export const FRENO_DEL_HELICOPTERO = `
  <rect x="2.4" y="1.4" width="19.2" height="3" rx="1.5" />
  <g transform="translate(2.4 5.8) scale(0.8)">${PLANTA}</g>`;

/**
 * **El botón de la tarjeta**: el helicóptero desde arriba entre las dos
 * flechas de girarlo, como el avión del botón de los aviones.
 */
export const HELICOPTERO_DE_LA_TARJETA = `
  <g transform="translate(6.6 5.6) scale(0.45)">${PLANTA}</g>
  <path d="M4.2 9.4 A8.6 8.6 0 0 1 19.6 8 M19.8 14.6 A8.6 8.6 0 0 1 4.4 16"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />`;

/**
 * **De espaldas**, para los pictogramas: el rotor, el mástil, el fuselaje y
 * las dos ruedas. Va en trazo, como el avioncito de espaldas, y del mismo
 * ancho —dieciséis—, así que cae en el mismo sitio de cada tarjeta.
 */
export const HELICOPTERO_DE_ESPALDAS = `
  <path d="M0.8 3.6 h14.4 M8 3.6 v2.4 M5.4 13 v0.3 M10.6 13 v0.3" />
  <path d="M8 8.2 v2.2" style="stroke-width: 4.8" />`;

/**
 * **El rotor visto desde arriba**, para el pictograma que gira: cuatro palas
 * largas y estrechas, que es lo que lo distingue de una hélice, más ancha y
 * corta. Gira con las vueltas del rotor y no con el colectivo: en un
 * helicóptero el rotor va siempre a las mismas.
 */
export function palasDeRotor(cx: number, cy: number, r: number): string {
  const a = r * 0.13;
  return `
    <rect x="${(cx - a / 2).toFixed(2)}" y="${cy - r}" width="${a.toFixed(2)}" height="${2 * r}" rx="${(a / 2).toFixed(2)}" />
    <rect x="${cx - r}" y="${(cy - a / 2).toFixed(2)}" width="${2 * r}" height="${a.toFixed(2)}" rx="${(a / 2).toFixed(2)}" />`;
}
