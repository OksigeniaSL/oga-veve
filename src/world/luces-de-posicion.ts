/**
 * Las luces de posición del avión: verde a estribor, roja a babor, blanca a la
 * cola. Y la de choque, que es la que parpadea.
 *
 * Preguntado jugando al volar de noche: «¿y si es de noche, el avión no lleva
 * luces de posición?». No las llevaba, y es de las cosas que más se notan que
 * faltan: **un avión de noche es un puñado de luces con un patrón**, y ese
 * patrón es lo primero que se aprende mirando al cielo.
 *
 * ## Por qué esos colores y en ese lado
 *
 * No es una convención del juego: es la de la navegación entera, barcos
 * incluidos, y está en el Anexo 2 de OACI. **Verde a la derecha, roja a la
 * izquierda**, y lo que enseña es a saber hacia dónde va lo que ves sin más
 * datos: si ves la verde, te está pasando por tu derecha y va hacia tu
 * izquierda; si ves las dos, viene de frente. Eso último es lo que hay que
 * saber, y se aprende en un segundo si las luces están.
 *
 * ## Y la de choque parpadea, que no es decoración
 *
 * La roja de arriba —*anti-collision*— se enciende **antes de arrancar el
 * motor** y dice «esto está vivo, no te acerques». Es la única luz del avión
 * que tiene una regla de cuándo, y por eso aquí también: se enciende con el
 * motor y no con la noche.
 *
 * ## De día también
 *
 * Las de posición se llevan encendidas siempre en vuelo, no solo de noche. Lo
 * que cambia de día es que no se ven, y eso sale gratis: son puntos pequeños
 * y de día se los come la luz, igual que pasa de verdad.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  PointsMaterial,
} from "three";

/** Los tres colores de posición, tal cual los fija la norma. */
const VERDE = 0x2ad04a;
const ROJA = 0xe8352c;
const BLANCA = 0xf2f4f0;

/**
 * Lo que mide una luz en pantalla, en píxeles.
 *
 * Nueve. Una luz de navegación de verdad se ve a kilómetros como un punto, no
 * como una bombilla: lo que llega de ella es su brillo, no su tamaño. Por eso
 * no se atenúa con la distancia —`sizeAttenuation` apagado— que es lo mismo
 * que ya hacen las luces del aeropuerto.
 */
const TAMANO = 9;

/** Cada cuántos segundos da un destello la de choque. */
export const CADA_DESTELLO = 1.1;

/** Y cuánto dura el destello. Corto: es un flash, no una linterna. */
export const DURA_EL_DESTELLO = 0.12;

/**
 * Si la luz de choque está encendida en este instante.
 *
 * Fuera de la clase para poder comprobar el parpadeo sin montar nada: es una
 * cuenta sobre el reloj y nada más.
 */
export function destellaAhora(segundos: number): boolean {
  return segundos % CADA_DESTELLO < DURA_EL_DESTELLO;
}

export interface LucesDePosicion {
  readonly grupo: Group;
  /** Un paso: el reloj del vuelo y si el motor está en marcha. */
  paso(segundos: number, motor: boolean): void;
}

/**
 * Las luces de una aeronave, colocadas por su envergadura y su largo.
 *
 * No hace falta saber de qué avión es: las puntas de ala y la cola están
 * donde están en todos, y es lo que hace que esto valga para los seis y para
 * los que vengan.
 */
export function crearLucesDePosicion(a: {
  readonly wingSpan: number;
  readonly chord: number;
}): LucesDePosicion {
  const media = a.wingSpan / 2;
  // La cola, hacia atrás: en el marco de la aeronave el morro mira a −Z.
  const cola = a.chord * 1.9;
  const sitios: [number, number, number, number][] = [
    // Punta de ala derecha: verde. Estribor.
    [media, 0, 0, VERDE],
    // Punta de ala izquierda: roja. Babor.
    [-media, 0, 0, ROJA],
    // Cola: blanca, mirando atrás.
    [0, a.chord * 0.35, cola, BLANCA],
  ];

  const grupo = new Group();
  grupo.name = "luces-de-posicion";

  const posiciones = new Float32Array(sitios.length * 3);
  const colores = new Float32Array(sitios.length * 3);
  sitios.forEach(([x, y, z, color], i) => {
    posiciones[i * 3] = x;
    posiciones[i * 3 + 1] = y;
    posiciones[i * 3 + 2] = z;
    colores[i * 3] = ((color >> 16) & 255) / 255;
    colores[i * 3 + 1] = ((color >> 8) & 255) / 255;
    colores[i * 3 + 2] = (color & 255) / 255;
  });
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(posiciones, 3));
  geo.setAttribute("color", new BufferAttribute(colores, 3));
  const fijas = new Points(
    geo,
    new PointsMaterial({
      size: TAMANO,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  grupo.add(fijas);

  // Y la de choque, roja y arriba del fuselaje, que va por su cuenta.
  const choqueGeo = new BufferGeometry();
  choqueGeo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([0, a.chord * 0.42, 0]), 3),
  );
  const choque = new Points(
    choqueGeo,
    new PointsMaterial({
      size: TAMANO * 1.5,
      sizeAttenuation: false,
      color: ROJA,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  grupo.add(choque);

  return {
    grupo,
    paso(segundos, motor) {
      // La de choque solo con el motor en marcha, que es su regla de verdad.
      choque.visible = motor && destellaAhora(segundos);
    },
  };
}
