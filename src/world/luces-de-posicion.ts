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
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  type Mesh,
  Object3D,
  Points,
  PointsMaterial,
  Vector3,
} from "three";

/**
 * El dibujo de una luz: un punto redondo que se apaga hacia el borde.
 *
 * Sin textura, un `Points` de three.js dibuja **cuadrados**. Y se ve: la
 * primera versión puso una luz cuadrada en el lomo del 747 y lo primero que
 * se preguntó fue «¿una luz cuadrada en el lomo?». Una bombilla no tiene
 * esquinas.
 *
 * Se hace una vez y la comparten todas: es una textura de treinta y dos
 * píxeles.
 */
let redonda: CanvasTexture | null | undefined;
export function laRedonda(): CanvasTexture | null {
  if (redonda !== undefined) return redonda;
  if (typeof document === "undefined") {
    redonda = null;
    return null;
  }
  const lado = 32;
  const lienzo = document.createElement("canvas");
  lienzo.width = lado;
  lienzo.height = lado;
  const g = lienzo.getContext("2d")!;
  const halo = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  halo.addColorStop(0, "rgba(255,255,255,1)");
  halo.addColorStop(0.35, "rgba(255,255,255,0.95)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, lado, lado);
  redonda = new CanvasTexture(lienzo);
  return redonda;
}

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
  /**
   * Un paso del reloj del vuelo.
   *
   * `motor` enciende la de choque y `aterrizando` el foco. Ver `paso` abajo.
   */
  paso(segundos: number, motor: boolean, aterrizando: boolean): void;
}

/**
 * Cuándo se enciende el foco de aterrizaje, y por qué esa regla.
 *
 * Preguntado jugando: «los aviones encienden un foco al aterrizar, ¿o ya
 * no?». Sí, y no solo al aterrizar: se encienden **al entrar en pista para
 * despegar** y se apagan pasados los diez mil pies, y se vuelven a encender
 * al bajar de ahí. La regla de verdad es «por debajo de diez mil pies», y
 * tiene un porqué que se puede contar: a esa altura es donde hay más tráfico
 * y donde hay pájaros, y un foco encendido es lo que hace que te vean.
 *
 * Aquí se pide la altura sobre el campo y el tren, que son los dos datos que
 * el juego ya tiene a mano: con el tren fuera siempre, y por debajo de tres
 * mil metros también. Es la misma regla dicha con lo que hay.
 */
export function focoEncendido(
  sobreElCampo: number,
  trenFuera: boolean,
): boolean {
  return trenFuera || sobreElCampo < 3048;
}

/**
 * Dónde están de verdad las puntas del avión que se está dibujando.
 *
 * La caja que envuelve al avión —un `Box3`— da la envergadura, pero **no da
 * la punta del ala**: un ala en flecha tiene la punta muy atrás, y la caja
 * solo sabe hasta dónde llega en cada eje por separado. Puesta la luz a media
 * envergadura y a la mitad del fuselaje, salía por dentro del ala y por
 * delante de ella: medido en captura, al 79 % de la semienvergadura y
 * flotando cincuenta píxeles sobre el plano.
 *
 * Así que se busca el vértice. Es un recorrido por la malla, una vez, al
 * cargar el avión: lo que cuesta no se nota y lo que da es el sitio exacto
 * donde el fabricante puso la punta del ala, que es donde va la luz en el
 * avión de verdad.
 */
interface Puntas {
  /** Punta de ala derecha, la de la verde. */
  readonly ala: Vector3;
  /** Punta de ala izquierda, la de la roja. */
  readonly alaIzquierda: Vector3;
  /** El punto más atrás de todo el avión: el cono de cola o el timón. */
  readonly cola: Vector3;
  /** El lomo del fuselaje, no la punta del timón: ahí va la de choque. */
  readonly lomo: Vector3;
  /** La raíz del ala por delante, que es donde va el foco de aterrizaje. */
  readonly foco: Vector3;
}

function puntasDe(cuerpo: Object3D): Puntas | null {
  cuerpo.updateWorldMatrix(true, true);
  const caja = new Box3().setFromObject(cuerpo);
  if (caja.isEmpty()) return null;
  const medido = caja.getSize(new Vector3());
  const centro = caja.getCenter(new Vector3());

  const ala = new Vector3(-Infinity, 0, 0);
  const alaIzquierda = new Vector3(Infinity, 0, 0);
  const cola = new Vector3(0, 0, -Infinity);
  const lomo = new Vector3(0, -Infinity, 0);
  const foco = new Vector3(0, 0, Infinity);
  const v = new Vector3();

  cuerpo.traverse((o) => {
    const geo = (o as Mesh).geometry;
    const pos = geo?.getAttribute?.("position");
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.x > ala.x) ala.copy(v);
      if (v.x < alaIzquierda.x) alaIzquierda.copy(v);
      if (v.z > cola.z) cola.copy(v);
      const fuera = Math.abs(v.x - centro.x);
      /*
       * El lomo se busca **solo en la franja central y a media eslora**: sin
       * acotar, el punto más alto del avión es la punta del timón, y la luz
       * de choque acababa en la deriva en vez de en el techo de la cabina de
       * pasaje.
       */
      if (
        fuera < medido.x * 0.05 &&
        Math.abs(v.z - centro.z) < medido.z * 0.2 &&
        v.y > lomo.y
      )
        lomo.copy(v);
      // Y el foco, en la raíz del ala y lo más adelante que llegue.
      if (fuera > medido.x * 0.07 && fuera < medido.x * 0.18 && v.z < foco.z)
        foco.copy(v);
    }
  });

  if (!Number.isFinite(ala.x) || !Number.isFinite(alaIzquierda.x)) return null;
  /*
   * **Y un dedo por fuera de la chapa.**
   *
   * Clavada en el vértice, la luz queda a ras del ala y la prueba de
   * profundidad la tapa con la propia ala: en captura salían las dos del
   * foco y ninguna de las puntas. Un piloto de navegación de verdad tampoco
   * está enrasado — va en una carcasa que sobresale de la punta— así que
   * salirse un poco es lo que hace y además es lo que se ve.
   *
   * Un uno por ciento de la medida del avión: seis decímetros en el grande,
   * un palmo en la avioneta.
   */
  const dedo = Math.max(medido.x, medido.z) * 0.01;
  ala.x += dedo;
  alaIzquierda.x -= dedo;
  cola.z += dedo;
  lomo.y += dedo;
  foco.z -= dedo;
  if (!Number.isFinite(cola.z)) cola.set(0, centro.y, caja.max.z);
  if (!Number.isFinite(lomo.y))
    lomo.set(0, centro.y + medido.y * 0.3, centro.z);
  if (!Number.isFinite(foco.z))
    foco.set(medido.x * 0.12, centro.y, caja.min.z + medido.z * 0.35);
  return { ala, alaIzquierda, cola, lomo, foco };
}

/**
 * Las luces de una aeronave, colocadas por su envergadura y su largo.
 *
 * No hace falta saber de qué avión es: las puntas de ala y la cola están
 * donde están en todos, y es lo que hace que esto valga para los seis y para
 * los que vengan.
 */
export function crearLucesDePosicion(
  a: { readonly wingSpan: number; readonly chord: number },
  /**
   * El avión ya montado, si lo hay: de él se sacan **las puntas de ala de
   * verdad**.
   *
   * La ficha da la envergadura, y con eso se colocaban a media envergadura y
   * a la altura del origen: en el 747 salían por dentro del ala y flotando
   * por encima. Un modelo tiene sus alas donde las tiene, y eso no lo sabe ni
   * la ficha ni su caja: lo saben sus vértices. Ver `puntasDe`.
   *
   * Sin modelo —el avión de cajas de las pruebas— la ficha es exacta, que es
   * de donde salió.
   */
  cuerpo?: Object3D,
): LucesDePosicion {
  const p = cuerpo ? puntasDe(cuerpo) : null;
  const media = a.wingSpan / 2;
  const ala = p?.ala ?? new Vector3(media, 0, 0);
  const alaIzquierda = p?.alaIzquierda ?? new Vector3(-media, 0, 0);
  const cola = p?.cola ?? new Vector3(0, a.chord * 0.35, a.chord * 1.9);
  const lomo = p?.lomo ?? new Vector3(0, a.chord * 0.42, 0);
  const dondeFoco = p?.foco ?? new Vector3(media * 0.28, 0, -a.chord);
  const sitios: [Vector3, number][] = [
    // Punta de ala derecha: verde. Estribor.
    [ala, VERDE],
    // Punta de ala izquierda: roja. Babor.
    [alaIzquierda, ROJA],
    // Cola: blanca, mirando atrás.
    [cola, BLANCA],
  ];

  const grupo = new Group();
  grupo.name = "luces-de-posicion";

  const posiciones = new Float32Array(sitios.length * 3);
  const colores = new Float32Array(sitios.length * 3);
  sitios.forEach(([donde, color], i) => {
    posiciones[i * 3] = donde.x;
    posiciones[i * 3 + 1] = donde.y;
    posiciones[i * 3 + 2] = donde.z;
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
      map: laRedonda(),
    }),
  );
  grupo.add(fijas);

  // Y la de choque, roja y arriba del fuselaje, que va por su cuenta.
  const choqueGeo = new BufferGeometry();
  choqueGeo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([lomo.x, lomo.y, lomo.z]), 3),
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
      map: laRedonda(),
    }),
  );
  grupo.add(choque);

  /*
   * **Y el foco de aterrizaje, que es el que se ve desde fuera.**
   *
   * Dos luces blancas grandes en la raíz del ala, mirando adelante. Aquí no
   * son un haz que ilumine el suelo —eso es un foco de verdad en el motor de
   * render y cuesta— sino lo que se ve de él desde fuera, que es un avión con
   * dos puntos muy brillantes delante. Es lo que se reconoce en aproximación
   * desde el suelo, y es lo que se preguntó.
   */
  const focoGeo = new BufferGeometry();
  const xFoco = Math.abs(dondeFoco.x);
  focoGeo.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([
        xFoco,
        dondeFoco.y,
        dondeFoco.z,
        -xFoco,
        dondeFoco.y,
        dondeFoco.z,
      ]),
      3,
    ),
  );
  const foco = new Points(
    focoGeo,
    new PointsMaterial({
      size: TAMANO * 2.2,
      sizeAttenuation: false,
      color: 0xfff6e0,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      map: laRedonda(),
    }),
  );
  foco.visible = false;
  grupo.add(foco);

  return {
    grupo,
    paso(segundos, motor, aterrizando) {
      // La de choque solo con el motor en marcha, que es su regla de verdad.
      choque.visible = motor && destellaAhora(segundos);
      // Y el foco cuando toca: con el motor parado no alumbra nadie.
      foco.visible = motor && aterrizando;
    },
  };
}
