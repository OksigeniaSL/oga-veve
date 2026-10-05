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
 *
 * ## Y las mismas que los demás, con las mismas reglas
 *
 * Tu avión llevaba tres de navegación que se veían **desde todos lados**, una
 * baliza y los focos; los demás, ya once, cada una alumbrando hacia donde
 * alumbra —ver `luces-del-trafico.ts`—. Visto desde la cámara de fuera, por
 * detrás, tu avión enseñaba los dos focos de aterrizaje encendidos y la roja
 * y la verde, que desde atrás no se ven: la lección al revés, en el avión que
 * más se mira. Ahora es la misma clase, con el equipo de tu avión —la baliza
 * en la deriva de la avioneta, abajo y arriba en el reactor—, los destellos
 * en la pista y en vuelo, el faro de rodaje rodando, y cada una en su sector.
 */

import {
  Box3,
  CanvasTexture,
  Group,
  type Mesh,
  Object3D,
  Vector3,
} from "three";
import { modeloPorId } from "../flight/flota";
import {
  type Encendidas,
  equipoDe,
  LucesDeUnAvion,
  materialDeLuces,
  type SitiosDeLuz,
  sitiosDeLuz,
} from "./luces-del-trafico";

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
  /** Dónde ha puesto cada luz: las puntas, la cola, la deriva, el foco… */
  readonly sitios: SitiosDeLuz;
  /** Las luces mismas, para las pruebas. Ver `LucesDeUnAvion`. */
  readonly luces: LucesDeUnAvion;
  /**
   * Un paso del reloj del vuelo: qué va encendido ahora. Lo decide la misma
   * tabla que el tráfico, con lo que está haciendo tu avión. Ver
   * `faseDelTuyo` y `lucesDelTrafico`.
   */
  paso(segundos: number, encendidas: Encendidas): void;
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
 *
 * Y es la misma cuenta para los aviones de los demás: un reactor del tráfico
 * lleva sus luces donde tiene las puntas, igual que el tuyo. Ver
 * `luces-del-trafico.ts`.
 */
export interface Puntas {
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

export function puntasDe(cuerpo: Object3D): Puntas | null {
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
  /*
   * **Y el foco, buscado en el ala y no en lo que haya delante.**
   *
   * Se buscaba el punto más adelantado de la franja junto al fuselaje, y en
   * un bimotor o un cuatrimotor lo más adelantado de esa franja **es el
   * motor**: los focos salían en el buje de las hélices del JAZ 60 y en la
   * toma de aire de los reactores, como los faros de un coche. En un avión de
   * verdad van en el borde de ataque del ala, junto a la raíz. Si el modelo
   * trae su ala con nombre, se busca solo ahí.
   */
  let hayAla = false;
  cuerpo.traverse((o) => {
    if (o.name.startsWith("ala") && (o as Mesh).geometry) hayAla = true;
  });
  /*
   * **Y fuera de las góndolas** (punto 209). En el JAZ 60 la franja de la raíz
   * llega hasta el motor, y el ala sigue por dentro de la góndola: el punto más
   * adelantado del ala en esa franja estaba **dentro** de ella, y los focos no
   * se veían de frente. En un turbohélice de su clase —el 1900D de su ficha:
   * ala baja, cola en T y el tren en las góndolas— van en el borde de ataque,
   * entre el fuselaje y el motor, y alumbran a través del disco de la hélice.
   * Así que lo que cae dentro de una góndola o de un motor no cuenta.
   */
  /*
   * Una caja por banda y no una por malla: las góndolas van de dos en dos en
   * la misma malla, por simetría, y su caja juntas cubría el fuselaje entero.
   */
  const gondolas: Box3[] = [];
  cuerpo.traverse((o) => {
    const pos = (o as Mesh).geometry?.getAttribute?.("position");
    if (!/^(gondola|motor)/.test(o.name) || !pos) return;
    const bandas = [new Box3(), new Box3()];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      bandas[v.x >= centro.x ? 0 : 1]!.expandByPoint(v);
    }
    for (const c of bandas) if (!c.isEmpty()) gondolas.push(c.expandByScalar(0.05));
  });
  const enUnaGondola = (p: Vector3): boolean => gondolas.some((g) => g.containsPoint(p));

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
      if (
        (!hayAla || o.name.startsWith("ala")) &&
        fuera > medido.x * 0.07 &&
        fuera < medido.x * 0.18 &&
        v.z < foco.z &&
        !enUnaGondola(v)
      )
        foco.copy(v);
    }
  });

  if (!Number.isFinite(ala.x) || !Number.isFinite(alaIzquierda.x)) return null;
  /*
   * **Y en un ala con winglet, en el pie del winglet, no en su punta.**
   *
   * El vértice más exterior de un ala con winglet está arriba del todo del
   * winglet, dos o tres metros por encima del ala: mirado de frente con
   * teleobjetivo, la roja y la verde de un reactor flotaban sobre las puntas.
   * La luz de navegación de esos aviones va en la punta del ala, al pie del
   * winglet. Así que de lo que queda a un tres por ciento de la envergadura
   * del extremo, el punto más bajo; en un ala sin winglet es la misma punta.
   *
   * **Y el más bajo del ala, no de lo que cuelgue de ella.** El JAZ 120 lleva
   * aleta partida: una hoja sube y otra **baja** sesenta grados hacia fuera,
   * metro y medio por debajo del ala. Lo más bajo de la punta era la punta de
   * esa hoja, y ahí acabaron la roja y la verde, colgando en el aire debajo
   * del ala —medido de frente con la tarjeta de verdad—. La luz va en la
   * punta del ala, en la unión con las aletas, así que si el modelo trae su
   * ala con nombre se busca solo en ella, como el foco: la hoja de abajo es
   * otra pieza (`remate`, la del terracota). Sin nombres —la geometría fundida
   * del tráfico— se mira todo, que en los modelos que usa, de aleta solo
   * hacia arriba, es lo mismo.
   */
  const casiEnLaPunta = medido.x * 0.03;
  const alPie = (lado: 1 | -1, punta: Vector3): void => {
    const extremo = punta.x;
    cuerpo.traverse((o) => {
      if (hayAla && !o.name.startsWith("ala")) return;
      const pos = (o as Mesh).geometry?.getAttribute?.("position");
      if (!pos) return;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (lado * (extremo - v.x) <= casiEnLaPunta && v.y < punta.y) punta.copy(v);
      }
    });
  };
  alPie(1, ala);
  alPie(-1, alaIzquierda);
  /*
   * **Y el foco en el borde de ataque, aunque el ala no tenga un vértice
   * donde va.** Un ala recta como la del 172 se dibuja con sus estaciones en
   * la raíz y en la punta, y entre el siete y el dieciocho por ciento de la
   * envergadura no hay ninguna: el foco caía en el sitio de respaldo, a la
   * altura del centro de la caja, que en un ala alta es **un metro por debajo
   * del ala**, a media puerta. Se ve de frente: los faros flotando junto a
   * los montantes. Así que se busca el borde de ataque del ala —lo más
   * adelantado de su mitad de dentro— y el foco va en él, a su sitio de
   * siempre de la envergadura, con la altura del vértice de ese borde más
   * cercano.
   */
  if (!Number.isFinite(foco.z) && hayAla) {
    const donde = medido.x * 0.12;
    let delante = Infinity;
    const borde: Vector3[] = [];
    cuerpo.traverse((o) => {
      const pos = (o as Mesh).geometry?.getAttribute?.("position");
      if (!pos || !o.name.startsWith("ala")) return;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const fuera = v.x - centro.x;
        if (fuera <= 0 || fuera > medido.x * 0.25) continue;
        delante = Math.min(delante, v.z);
        borde.push(v.clone());
      }
    });
    let cerca = Infinity;
    for (const p of borde) {
      if (p.z > delante + medido.z * 0.01) continue;
      const d = Math.abs(p.x - centro.x - donde);
      if (d < cerca) {
        cerca = d;
        foco.set(centro.x + donde, p.y, p.z);
      }
    }
  }
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
 * **Lo que miden las de tu avión**, veces las del tráfico.
 *
 * Uno y medio. El tráfico se ve casi siempre de lejos y sus luces son puntos
 * pequeños; el tuyo se ve a veinte metros desde la cámara de fuera, y a ese
 * tamaño una luz de seis píxeles en la punta de un ala de once metros no se
 * encuentra. Son las mismas luces y la misma regla; solo cambia lo cerca que
 * se miran.
 */
export const LAS_TUYAS = 1.5;

/**
 * Las luces de una aeronave, en las puntas de verdad de su modelo y con el
 * equipo de su clase: la avioneta con la baliza en la deriva, el reactor con
 * dos, arriba y abajo. Ver `equipoDe`.
 */
export function crearLucesDePosicion(
  a: { readonly wingSpan: number; readonly chord: number; readonly id?: string },
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
  const sitios = (cuerpo ? sitiosDeLuz(cuerpo) : null) ?? porLaFicha(a);
  const material = materialDeLuces();
  material.size = LAS_TUYAS;
  const silueta = (a.id ? modeloPorId(a.id)?.silueta : undefined) ?? "reactor";
  const luces = new LucesDeUnAvion(sitios, material, 0, equipoDe(silueta));
  const grupo = new Group();
  grupo.name = "luces-de-posicion";
  grupo.add(luces.puntos);
  return {
    grupo,
    sitios,
    luces,
    paso(segundos, encendidas) {
      luces.paso(segundos, encendidas);
    },
  };
}

/**
 * Los sitios sacados de la ficha, sin modelo: media envergadura a cada lado,
 * la cola detrás del ala, el foco en la raíz y la deriva sobre la cola.
 */
function porLaFicha(a: {
  readonly wingSpan: number;
  readonly chord: number;
}): SitiosDeLuz {
  const media = a.wingSpan / 2;
  return {
    alaDerecha: new Vector3(media, 0, 0),
    alaIzquierda: new Vector3(-media, 0, 0),
    cola: new Vector3(0, a.chord * 0.35, a.chord * 1.9),
    lomo: new Vector3(0, a.chord * 0.42, 0),
    panza: new Vector3(0, -a.chord * 0.3, 0),
    foco: new Vector3(media * 0.28, 0, -a.chord),
    morro: new Vector3(0, -a.chord * 0.2, -a.chord * 1.6),
    deriva: new Vector3(0, a.chord * 0.9, a.chord * 1.7),
  };
}
