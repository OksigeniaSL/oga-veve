/**
 * La aeronave, si hay un modelo de verdad; y si no, las cajas de siempre.
 *
 * El avión de este juego son media docena de cajas, y desde fuera pasa —tiene
 * su forma y su color— pero desde dentro no hay cabina que valga: la vista de
 * piloto es volar dentro de un cubo. Un modelo de verdad es el salto visual más
 * grande que le queda al juego.
 *
 * **Y no obliga a cambiar de licencia.** Un modelo en CC0 o CC-BY convive con
 * Apache-2.0 sin contagiar nada; lo único que pide CC-BY es atribución, que en
 * este proyecto se hace de todos modos. Ver `CREDITOS.md`.
 *
 * ## Cómo se enchufa
 *
 * Se deja un fichero glTF binario en `public/assets/aeronaves/<id>.glb` y se
 * anota su procedencia y su licencia en `CREDITOS.md`. Nada más: el juego lo
 * busca solo al arrancar, y **si no está, o si falla, sigue con las cajas**.
 * Eso no es prudencia de más — es la misma regla que el resto del proyecto:
 * que falte un recurso externo no puede dejar a nadie sin volar, igual que sin
 * clave de teselas se vuela el mundo dibujado.
 *
 * ## Qué se le hace al modelo
 *
 * Un modelo de un sitio cualquiera no viene con las convenciones de este juego,
 * así que se le imponen tres:
 *
 * 1. **La escala sale de la envergadura.** El avión mide lo que dice
 *    `aircraft.wingSpan`, no lo que trajera el fichero — que puede venir en
 *    metros, en centímetros o en pulgadas, y no hay forma de saberlo.
 * 2. **El morro mira a la Z negativa**, que es adelante en este mundo.
 * 3. **Las ruedas quedan en el suelo.** El juego coloca la aeronave a la cota
 *    del terreno **más la altura de su tren**, así que el modelo hay que
 *    bajarlo lo que mide él y además lo que el juego lo ha subido. Faltaba lo
 *    segundo y el avión flotaba exactamente la altura de su tren: 1,40 m el
 *    Pykasu y 1,80 el Mainumby, medidos con el avión parado en la pista.
 */

import {
  Box3,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  type Color,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AircraftConfig } from "../flight/aircraft";
import type { AircraftMesh } from "./aircraft-mesh";
import { crearLucesDePosicion } from "./luces-de-posicion";
import { encenderPantallas } from "./pantallas-cabina";
import { prepararPatas } from "./patas";
import { prepararFlaps } from "./flaps";
import { encenderRelojes } from "./relojes-cabina";
import { encenderBotones } from "./botones-cabina";
import { luzDeCabina } from "./luz-de-cabina";
import { vestirLaLibrea } from "./librea";
import { conPlazo, PLAZO_DE_IMAGEN } from "../datos/con-plazo";

/** Dónde se dejan los modelos. Uno por aeronave, con su identificador. */
const CARPETA = "assets/aeronaves";

/**
 * Nombres por los que se reconoce la hélice dentro del modelo.
 *
 * Se busca por nombre porque es lo único que traen todos: un glTF no tiene
 * forma de decir «esto gira». Si no aparece ninguno, la hélice se queda quieta
 * y el avión vuela igual — es un adorno, no un mando.
 */
const NOMBRES_DE_HELICE = [
  "prop",
  "helice",
  "hélice",
  "propeller",
  "spinner",
  "blade",
];

/**
 * Junta las piezas de la hélice en un eje que gira sobre su propio centro.
 *
 * Hacía falta al enchufar el primer modelo de verdad: buscaba **un** nodo y en
 * ese avión la hélice son tres —`prop.002`, `prop.003` y `spinner.001`—, así
 * que habría girado una pala sola y dejado las otras quietas. Y aunque fueran
 * una, girar el nodo tal cual lo haría alrededor del origen del avión, no del
 * buje: la hélice describiría un círculo de dos metros por delante del morro.
 *
 * Así que se crea un eje **en el centro de las piezas** y se cuelgan de él con
 * `attach`, que conserva la posición de cada una en el mundo. A partir de ahí,
 * girar el eje es girar la hélice.
 *
 * Lo de `attach` no es un detalle: el primer intento restaba a mano el centro
 * —medido en coordenadas del mundo— de la posición de cada pieza, que está en
 * coordenadas de su padre. Con el modelo escalado y girado, esas dos no son la
 * misma cosa, así que el buje quedaba desplazado y las palas **orbitaban
 * alrededor del avión** en vez de girar sobre sí mismas. Se describió mejor de
 * lo que yo lo escribiría: «tiene una cosa dándole vueltas en sentido
 * antihorario alrededor, parece una polilla cojonera».
 *
 * ## Y un eje por hélice, no uno para todas
 *
 * Un solo eje valió mientras la flota fue un monomotor traído de fuera y un
 * biplano hecho en casa: todas las piezas de hélice que hay en el avión son la
 * misma hélice, su centro es el buje, y ahí gira. En un bimotor es falso — el
 * centro de las dos cae en el eje del fuselaje, que es justo donde **no** hay
 * ninguna, y las dos se pondrían a dar vueltas alrededor del morro. La polilla
 * cojonera otra vez, pero por duplicado.
 *
 * El respaldo de cajas ya lo hacía bien: `AircraftMesh.helices` es una lista
 * precisamente por esto, y `game.ts` gira todas las que haya. Lo que faltaba
 * era que el cargador de modelos la rellenara.
 *
 * Se agrupan **por cercanía**, que es lo único que no depende de cómo haya
 * nombrado las piezas quien hizo el modelo — y de fuera vienen nombradas de
 * cualquier manera. Las piezas de una hélice están todas a un palmo del buje;
 * dos hélices de un bimotor están a media envergadura la una de la otra. El
 * umbral es una fracción de lo que mide el avión de ancho, así que vale igual
 * para el biplano que para el cuatrimotor.
 */
const UMBRAL_DE_HELICE = 0.15;

/**
 * Dónde está el buje de una hélice, dadas sus piezas.
 *
 * **No es el centro de su caja**, y ésa fue la segunda parte del mismo fallo.
 * Con dos palas —una barra que cruza el buje de punta a punta— el centro de la
 * caja *es* el buje, y con eso bastó para el biplano. Con **tres** palas, que
 * es lo que lleva el bimotor, la hélice no es simétrica: una pala apunta a un
 * lado y las otras dos se reparten el otro, así que la caja sobresale más por
 * un lado que por el otro y su centro cae a veintiún centímetros del buje.
 * Medido en el Panambi: los dos ejes salían en −2,24 y +2,66 en vez de ±2,45,
 * la misma desviación en los dos. Una hélice girando alrededor de un punto a
 * un palmo de su eje no gira: bambolea.
 *
 * El buje es lo que **todas** las palas tienen en común: de ahí salen todas y
 * el cono lo tapa. Así que se cruzan sus cajas y lo que queda es el buje.
 *
 * Y se cruzan las de las **mallas sueltas**, no las de las piezas, que es la
 * otra mitad de lo mismo: la caja de un objeto incluye la de sus hijas, y en
 * los modelos de esta casa las palas cuelgan del cono, así que preguntarle su
 * caja al cono devuelve la hélice entera con su asimetría dentro.
 *
 * Si no queda nada en común, es que las piezas ni se tocan y no hay nada mejor
 * que decir que el centro de todas. Es el caso de un modelo traído de fuera
 * cuyas piezas de hélice vengan sueltas, que es como venía el Pykasu.
 */
type ConGeometria = Object3D & {
  geometry?: { boundingBox: Box3 | null; computeBoundingBox(): void };
};

/** La caja de **su** geometría, sin la de sus hijas. Ver `bujeDe`. */
function cajaPropia(o: ConGeometria): Box3 | null {
  const geo = o.geometry;
  if (!geo) return null;
  if (!geo.boundingBox) geo.computeBoundingBox();
  if (!geo.boundingBox) return null;
  return geo.boundingBox.clone().applyMatrix4(o.matrixWorld);
}

function bujeDe(piezas: Object3D[]): Vector3 {
  const sueltas: Box3[] = [];
  for (const p of piezas)
    p.traverse((o) => {
      const c = cajaPropia(o as ConGeometria);
      if (c) sueltas.push(c);
    });
  if (!sueltas.length) {
    const juntas = new Box3();
    for (const p of piezas) juntas.expandByObject(p);
    return juntas.getCenter(new Vector3());
  }

  const juntas = new Box3();
  const comun = sueltas[0]!.clone();
  for (const suya of sueltas) {
    juntas.union(suya);
    comun.intersect(suya);
  }
  return (comun.isEmpty() ? juntas : comun).getCenter(new Vector3());
}

export function ejesDeHelice(raiz: Object3D): Object3D[] {
  const piezas: Object3D[] = [];
  raiz.traverse((o) => {
    const nombre = o.name.toLowerCase();
    if (!NOMBRES_DE_HELICE.some((n) => nombre.includes(n))) return;
    // Solo la de más arriba de cada rama: si se cogen padre e hijo, el hijo
    // acaba girando dos veces.
    if (piezas.some((p) => esAncestro(p, o))) return;
    piezas.push(o);
  });
  if (!piezas.length) return [];

  raiz.updateWorldMatrix(true, true);
  const ancho = new Box3().setFromObject(raiz).getSize(new Vector3()).x;
  const cerca = Math.max(0.05, ancho * UMBRAL_DE_HELICE);

  // Dónde está cada pieza, en el mundo. Se mide una vez: `expandByObject`
  // recorre la rama entera y no es gratis.
  const donde = piezas.map((p) =>
    new Box3().expandByObject(p).getCenter(new Vector3()),
  );

  /*
   * Grupos por enlace simple: una pieza entra en un grupo si está cerca de
   * **alguna** de las que ya están dentro. Es lo que junta un buje con sus
   * palas aunque la punta de una pala esté más lejos del buje que el buje del
   * motor de al lado, que pasa en cuanto las hélices son grandes.
   */
  const grupos: number[][] = [];
  for (let i = 0; i < piezas.length; i++) {
    const suyos = grupos.filter((g) =>
      g.some((j) => donde[i]!.distanceTo(donde[j]!) <= cerca),
    );
    if (!suyos.length) {
      grupos.push([i]);
      continue;
    }
    // Si toca a varios, es que eran el mismo y no se sabía: se funden.
    const primero = suyos[0]!;
    primero.push(i);
    for (const otro of suyos.slice(1)) {
      primero.push(...otro);
      grupos.splice(grupos.indexOf(otro), 1);
    }
  }

  // De izquierda a derecha, para que el número de cada hélice sea estable:
  // `propeller` es siempre la misma pieza entre una carga y otra.
  grupos.sort((a, b) => donde[a[0]!]!.x - donde[b[0]!]!.x);

  return grupos.map((grupo, n) => {
    const eje = new Group();
    eje.name = grupos.length > 1 ? `helice-${n + 1}` : "helice";
    raiz.add(eje);
    // El buje, traído a las coordenadas del padre. `worldToLocal` necesita las
    // matrices al día, y por eso el `updateWorldMatrix` de arriba.
    eje.position.copy(raiz.worldToLocal(bujeDe(grupo.map((i) => piezas[i]!))));
    // Y `attach`, no `add`: conserva dónde está cada pieza en el mundo, así
    // que colgarlas del eje no las mueve ni un milímetro.
    for (const i of grupo) eje.attach(piezas[i]!);
    return eje;
  });
}

/**
 * Los nombres de material que este proyecto le pone a los modelos que hace.
 *
 * Un modelo nuestro sale de `modelos/<id>.py` con un material por pieza y con
 * estos nombres, y el juego lo repinta con los colores de la flota. Un modelo
 * traído de fuera trae los suyos —el Pykasu tiene treinta, de `fuselarge` a
 * `ruder_petal`— y no coincide ninguno, así que se queda con su librea tal
 * como vino. Que es lo que se quiere: al de fuera no se le toca.
 */
const RANURAS = {
  casco: "body",
  capo: "accent",
  detalle: "trim",
  // La deriva que lleva el motivo de la casa: del color del capó, que es el
  // fondo del motivo, hasta que `vestirLaLibrea` le pone el dibujo encima. Si
  // no se lo puede poner, la cola se queda como estaba.
  cola: "accent",
} as const;

/**
 * El cristal y la goma, que son iguales en todos los aviones.
 *
 * No están en la paleta de la flota porque no distinguen a un avión de otro:
 * las ruedas son negras en los cinco y el parabrisas es oscuro en los cinco.
 * Poner dos colores más en cada ficha sería repetir cinco veces el mismo par.
 */
const CRISTAL = 0x1b262d;
const GOMA = 0x16161a;

/**
 * Repinta el modelo con los colores de su ficha.
 *
 * **Por qué se repinta y no se exporta pintado.** El color de cada avión ya
 * vive en `aircraft.ts` y de ahí lo sacan las cajas del respaldo, los retratos
 * del hangar y la ficha de «¿Con qué volás?». Si además lo trajera el `.glb`
 * habría dos verdades, y la primera vez que alguien cambiara una tendríamos un
 * Mainumby crema en el hangar y beige en la pista.
 *
 * **Y hacía falta.** El Mainumby salía gris. Los colores del guion de Blender
 * estaban escritos como sRGB —`(0.72, 0.28, 0.16)` para el terracota del
 * capó— y un glTF los guarda en **lineal**, así que al pintarlos el navegador
 * los subía otra vez: el terracota llegaba a la pista como `#DD906F`, un
 * salmón; el verde oscuro de los detalles como `#7C8179`, gris; y la goma
 * negra de las ruedas como `#555550`. Lo oscuro es lo que más se levanta al
 * confundir los dos espacios, y por eso lo que se veía era un avión
 * descolorido. Se arregló también en el guion —ver `srgb()` en
 * `modelos/jaz-25-mainumby.py`—, pero quien manda aquí es la ficha.
 */
function pintarDeLaFlota(raiz: Object3D, aircraft: AircraftConfig): void {
  raiz.traverse((o) => {
    const mallas = o as { material?: unknown };
    const materiales = Array.isArray(mallas.material)
      ? mallas.material
      : mallas.material
        ? [mallas.material]
        : [];
    for (const m of materiales as { name?: string; color?: Color }[]) {
      if (!m.color) continue;
      const ranura = RANURAS[m.name as keyof typeof RANURAS];
      if (ranura) m.color.setHex(aircraft.appearance[ranura]);
      else if (m.name === "cristal") m.color.setHex(CRISTAL);
      else if (m.name === "goma") m.color.setHex(GOMA);
    }
  });
}

/**
 * Dónde se sienta el piloto, preguntándoselo al modelo.
 *
 * La vista de cabina se colocaba con una fórmula sobre la cuerda del ala, y con
 * las cajas valía porque dentro no había nada. Con una cabina de verdad se
 * notó enseguida: la cámara quedaba detrás de los asientos, mirando el interior
 * entero en vez de mirar por el parabrisas.
 *
 * Y no hay que estimarlo. Este modelo trae los asientos como piezas con nombre,
 * igual que la hélice, así que el sitio del piloto es **el asiento de más
 * adelante** —el de delante del todo, no la media de los cuatro—, con los ojos
 * un poco por encima del cojín.
 *
 * Si el modelo no trae asientos se devuelve `undefined` y manda la fórmula de
 * siempre, que es lo que hacen las cajas.
 */
function ojoDePiloto(
  raiz: Object3D,
  grupo: Object3D,
): { x: number; y: number; z: number } | undefined {
  /*
   * **El asiento de delante, no la media de los cuatro.**
   *
   * Esto metía todos los asientos en una misma caja y se sentaba en su centro,
   * y un 172 lleva cuatro: el centro de esa caja cae en mitad de la cabina,
   * medio metro por detrás del piloto. De ahí venía todo lo demás — «cuando
   * estás dentro de la cabina solo se ven los mandos, no veo por dónde estoy
   * volando»—: desde el asiento de atrás, el parabrisas es una rendija y el
   * marco se come el mundo. Y empujar la cabeza hacia delante a ojo no
   * arreglaba nada, porque diez centímetros de más la sacaban del avión.
   *
   * Ahora se busca **el que está más adelante**, que en un avión es el del
   * piloto. Se mide asiento a asiento, y el de la Z más pequeña gana: en este
   * modelo, como en three.js, el morro mira al menos Z.
   */
  grupo.updateWorldMatrix(true, true);
  const caja = new Box3();
  const centro = new Vector3();
  let mejor: { z: number; alto: number; x: number } | null = null;
  raiz.traverse((o) => {
    const n = o.name.toLowerCase();
    if (!n.includes("chair") && !n.includes("seat") && !n.includes("asiento"))
      return;
    caja.setFromObject(o);
    if (caja.isEmpty()) return;
    caja.getCenter(centro);
    const local = grupo.worldToLocal(centro.clone());
    const alto = grupo.worldToLocal(caja.max.clone()).y;
    if (mejor && local.z >= mejor.z) return;
    mejor = { z: local.z, alto, x: local.x };
  });
  if (!mejor) return undefined;
  const asiento: { z: number; alto: number; x: number } = mejor;

  return {
    /*
     * **En el asiento del piloto, no en medio de los dos.**
     *
     * Esto devolvía cero, o sea el eje del avión. En una avioneta con dos
     * plazas juntas eso es medio brazo de diferencia y no se nota; en una
     * cabina de avión de línea son cuarenta y seis centímetros, y desde el
     * medio **no hay ningún instrumento delante**: los del comandante quedan a
     * la izquierda, los del copiloto a la derecha y los dos se salen de la
     * pantalla por sus bordes. «El cuadro se sale y no veo los datos.»
     *
     * Desde el asiento de la izquierda se ve lo que ve quien va sentado ahí:
     * sus dos pantallas delante y las del otro, de refilón. Que es justo la
     * gracia de sentarse en un sitio y no en otro.
     */
    x: asiento.x,
    /*
     * **Los ojos por encima del respaldo, no a su altura.**
     *
     * Estaban a la altura del cojín más media silla, y eso los dejaba justo a
     * la altura del borde de arriba del panel: se veía el panel entero
     * llenando media pantalla y por el parabrisas quedaba una rendija. «Cuando
     * estás dentro de la cabina solo se ven los mandos, no veo por dónde estoy
     * volando.» Y es exactamente lo que le pasa a quien es bajito y no sube el
     * asiento: en un avión de verdad el panel se mira **desde arriba**, no de
     * frente, y por eso los asientos suben.
     *
     * Justo en el borde de arriba del respaldo, que es donde tiene la cabeza
     * quien va sentado. Desde ahí el borde de arriba del panel cae un par de
     * grados por debajo de la horizontal, así que el panel se queda en el tercio de abajo, el capó
     * debajo del horizonte y el mundo por encima: lo que se ve desde un 172.
     */
    /*
     * **Y un palmo por encima del respaldo, no a su altura.** Con los ojos en
     * el borde del respaldo, la visera quedaba casi a su misma altura y por el
     * parabrisas se veía cielo y nada más —en crucero, con el morro un poco
     * arriba, ni el horizonte—: «ir volando y no ver nada enfrente, es raro».
     * Sentado, la cabeza sobresale del respaldo; y con los ojos ahí, por
     * encima del morro se ven los diez grados hacia abajo que se ven en un
     * avión de verdad. Ver `baja_minima` en `modelos/comun.py`.
     */
    y: asiento.alto + 0.1,
    /*
     * Y un palmo adelante del respaldo, que es donde va la cabeza.
     *
     * Poco, y a propósito: sentado en el sitio del piloto, el panel ya está a
     * medio metro escaso. Los sesenta centímetros que llegó a haber aquí eran
     * para compensar que la cámara nacía en mitad de la cabina —se metían los
     * cuatro asientos en la misma caja y se sentaba en su centro—, y con el
     * asiento bien elegido sacan la cabeza por el parabrisas: se veía el capó
     * desde fuera y ni rastro del panel.
     */
    z: asiento.z - 0.08,
  };
}

/**
 * Cuánto cae la visera por debajo de la línea de los ojos, en radianes.
 *
 * Es lo que necesita la cámara de cabina para encuadrar: el borde de la visera
 * es la raya que separa el mundo del panel, y **dónde cae esa raya en la
 * pantalla** decide cuánto se ve por el parabrisas. Se mide sobre el borde de
 * arriba y de atrás —el que da al piloto—, que es el que se ve desde el
 * asiento. Ver `encuadreDeCabina` en `cameras/dentro.ts`.
 *
 * `undefined` si el modelo no trae visera: entonces manda la inclinación fija.
 */
/**
 * Lo que la cámara de cabina necesita saber para encuadrar, medido desde los
 * ojos. Ver `encuadreDeCabina` en `cameras/dentro.ts`.
 *
 * - `visera`: cuánto cae su borde por debajo de la línea de los ojos, rad. Es
 *   la raya que separa el mundo del panel, y dónde cae en la pantalla decide
 *   cuánto se ve por el parabrisas. Se mide el borde de arriba y de atrás, el
 *   que da al piloto.
 * - `lados`: hasta dónde llegan a los lados los instrumentos y los mandos, como
 *   tangente del ángulo desde el frente. Lo más abierto de los dos lados.
 * - `abajo`: cuánto cae lo más bajo de ellos, rad.
 *
 * Los instrumentos son lo que se lee y se toca —relojes, pantallas y botones—,
 * encontrados por nombre, que es el contrato de los guiones de `modelos/`.
 */
export interface EncuadreDeCabina {
  readonly visera: number;
  readonly lados: number;
  readonly abajo: number;
}

const INSTRUMENTO = /^(reloj-|pantalla-|boton-)/;

function conSuEncuadre(
  ojo: { x: number; y: number; z: number } | undefined,
  raiz: Object3D,
  grupo: Object3D,
): { x: number; y: number; z: number; encuadre?: EncuadreDeCabina } | undefined {
  if (!ojo) return undefined;
  grupo.updateWorldMatrix(true, true);
  const v = new Vector3();
  let visera: number | undefined;
  let lados = 0;
  let abajo = -Infinity;
  raiz.traverse((o) => {
    const esVisera = o.name === "visera";
    const esInstrumento =
      INSTRUMENTO.test(o.name) ||
      (o as { material?: { name?: string } }).material?.name === "g1000_display";
    if (!esVisera && !esInstrumento) return;
    const pos = (o as { geometry?: { attributes?: { position?: {
      count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number;
    } } } }).geometry?.attributes?.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      o.localToWorld(v);
      grupo.worldToLocal(v);
      const delante = ojo.z - v.z;
      if (delante <= 0.05) continue;
      const caida = Math.atan2(ojo.y - v.y, delante);
      if (esVisera) {
        // La visera tapa por su punto más alto en pantalla.
        if (visera === undefined || caida < visera) visera = caida;
      } else {
        lados = Math.max(lados, Math.abs(v.x - ojo.x) / delante);
        abajo = Math.max(abajo, caida);
      }
    }
  });
  if (visera === undefined || !Number.isFinite(abajo)) return ojo;
  return { ...ojo, encuadre: { visera, lados, abajo } };
}

/**
 * **Y la hélice, borrosa cuando gira deprisa.**
 *
 * A tope da dieciséis vueltas por segundo, y a sesenta imágenes por segundo
 * una hélice de cuatro palas avanza casi un cuarto de vuelta entre imagen e
 * imagen: la cámara la pillaba siempre en la misma postura y se veía **quieta
 * y en cruz**, con el motor a fondo. Es el mismo efecto que hace que las
 * ruedas de los coches parezcan ir hacia atrás en las películas, y lo que ve
 * el ojo —y cualquier foto— es un disco translúcido. Así que al subir de
 * vueltas las palas se desvanecen y aparece el disco.
 *
 * Cada eje lleva su disco, del radio de sus palas y en el plano en el que
 * giran; las palas se quedan con una copia de su material para poder
 * desvanecerse sin desvanecer el tren, que lleva el mismo.
 */
function discoDeHelice(ejes: readonly Object3D[]): ((cuanto: number) => void) | undefined {
  const partes: { palas: Material[]; disco: MeshBasicMaterial }[] = [];
  const v = new Vector3();
  for (const eje of ejes) {
    eje.updateWorldMatrix(true, true);
    const palas: Material[] = [];
    let radio = 0;
    eje.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh || !/pala|blade/i.test(m.name)) return;
      const suyo = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!suyo) return;
      const copia = suyo.clone();
      copia.transparent = true;
      m.material = copia;
      palas.push(copia);
      const pos = m.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        m.localToWorld(v);
        eje.worldToLocal(v);
        radio = Math.max(radio, Math.hypot(v.x, v.y));
      }
    });
    if (!palas.length || radio <= 0) continue;
    // Gris oscuro y no el color de la pala: una hélice girando se ve como
    // un velo sombrío, y en el color de la librea parecía un halo naranja.
    const disco = new MeshBasicMaterial({
      color: 0x2c2e31,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: DoubleSide,
    });
    const malla = new Mesh(new CircleGeometry(radio, 40), disco);
    malla.name = "disco-de-helice";
    malla.visible = false;
    eje.add(malla);
    partes.push({ palas, disco });
  }
  if (!partes.length) return undefined;
  return (cuanto) => {
    const k = Math.max(0, Math.min(1, cuanto));
    for (const p of partes) {
      for (const m of p.palas) m.opacity = 1 - k * 0.92;
      p.disco.opacity = k * 0.32;
      (p.disco as { visible?: boolean }).visible = k > 0.01;
    }
    for (const eje of ejes)
      for (const h of eje.children)
        if (h.name === "disco-de-helice") h.visible = k > 0.01;
  };
}

function esAncestro(posible: Object3D, hijo: Object3D): boolean {
  for (let o: Object3D | null = hijo.parent; o; o = o.parent)
    if (o === posible) return true;
  return false;
}

/**
 * Carga el modelo de una aeronave, o `null` si no lo hay.
 *
 * Devuelve lo mismo que `createAircraftMesh` para que quien lo use no tenga que
 * saber de dónde salió el avión.
 */
export async function cargarModelo(
  aircraft: AircraftConfig,
  base = import.meta.env.BASE_URL ?? "/",
): Promise<AircraftMesh | null> {
  const url = `${base}${base.endsWith("/") ? "" : "/"}${CARPETA}/${aircraft.id}.glb`;

  try {
    // Se pregunta antes de cargar: `GLTFLoader` con un 404 escupe un error de
    // análisis que parece un fichero corrupto, y no lo es — es que no está.
    const hay = await fetch(url, { method: "HEAD" });
    if (!hay.ok) return null;
  } catch {
    return null;
  }

  let raiz: Object3D;
  try {
    /*
     * Con plazo, y aquí importa doble: este fichero ya tiene decidido que
     * **si falta el modelo se vuela con las cajas de respaldo**, y una carga
     * sin plazo convierte esa decisión en lo contrario — no se vuela nada.
     * Ver `datos/con-plazo.ts`.
     */
    const gltf = await conPlazo(
      new GLTFLoader().loadAsync(url),
      PLAZO_DE_IMAGEN,
      `el modelo ${url.split("/").pop()}`,
    );
    if (!gltf) return null;
    raiz = gltf.scene;
  } catch {
    // Un modelo roto no puede dejar a nadie sin volar.
    return null;
  }

  const group = new Group();
  group.name = `aeronave:${aircraft.id}`;

  /*
   * ¿Es de los nuestros?
   *
   * Un modelo salido de `modelos/*.py` trae, del vacío desde el que se gira la
   * escena antes de exportar, **un nodo llamado `avion`** — ver `aBlender` en
   * `modelos/comun.py`—, y con él trae la garantía de que ya viene en los ejes
   * de este juego: la X a lo ancho, la Y arriba y el morro en la Z negativa.
   *
   * Eso importa porque lo de abajo son **adivinanzas**, y las adivinanzas
   * fallan. Son necesarias con un modelo traído de cualquier sitio, que puede
   * venir tumbado, en pulgadas y mirando hacia atrás; aplicárselas a uno hecho
   * aquí es tirar una certeza a cambio de una conjetura.
   */
  const deLaCasa = !!raiz.getObjectByName("avion");

  const caja = new Box3().setFromObject(raiz);
  const tam = caja.getSize(new Vector3());

  /*
   * La escala, por envergadura. Se mide el modelo y se lleva su ala a la
   * envergadura que dice la configuración de vuelo, que es la que usa el
   * modelo de vuelo para calcular la sustentación: si el dibujo y la física no
   * miden lo mismo, el avión parece de otro tamaño del que vuela.
   *
   * En uno de los nuestros el ala es la X y no hay nada que decidir. En uno de
   * fuera se coge la mayor de las dos horizontales, que es la adivinanza de
   * siempre.
   */
  const anchoModelo = deLaCasa ? tam.x : Math.max(tam.x, tam.z);
  if (anchoModelo > 0) {
    raiz.scale.multiplyScalar(aircraft.wingSpan / anchoModelo);
  }

  /*
   * **Las alas a lo ancho.** En este mundo la X es el eje de las alas y la Z el
   * del morro, así que la dimensión mayor del modelo tiene que acabar en la X.
   *
   * Y la mayor es la envergadura, no el largo: un 172 mide once metros de
   * punta a punta de ala y ocho y medio de morro a cola. El primer intento
   * daba por hecho lo contrario —«un avión es más largo que ancho»—, que es
   * verdad en un caza y mentira en una avioneta, y el modelo entró en el juego
   * cruzado en la calle de rodaje.
   *
   * **Y es mentira otra vez en cuanto el avión es grande.** El JAZ 90 mide
   * veintiséis metros de ala y treinta y uno y medio de morro a cola; el JAZ
   * 120, sesenta de ala y sesenta y ocho de largo. Los dos son más largos que
   * anchos, como el caza, así que esta regla los habría metido cruzados en la
   * calle de rodaje **y además escalados por el largo**: un reactor de
   * veintiséis metros de punta a punta de fuselaje. Los dos aciertos de esta
   * adivinanza fueron dos avionetas; el primer avión de línea la rompe.
   *
   * De los nuestros no hay que adivinar nada, y por eso no se les toca.
   */
  if (!deLaCasa && tam.z > tam.x) raiz.rotation.y = Math.PI / 2;

  /*
   * **Y el morro hacia delante, que lo dice la hélice.**
   *
   * Poner las alas a lo ancho deja el fuselaje en el eje correcto pero no dice
   * hacia qué lado mira: puede quedar igual de bien con el morro a +Z que a −Z,
   * y salió al revés. Se vio enseguida — «no sabía que los aviones sabían volar
   * marcha atrás».
   *
   * No hace falta adivinarlo: **la hélice está en el morro**, y ya se sabe cuál
   * es porque hay que encontrarla igualmente para hacerla girar. Si su centro
   * cae en la Z positiva, el avión está del revés y se le da media vuelta.
   *
   * Tampoco vale para todos, y por eso tampoco se le aplica a los nuestros: un
   * reactor no tiene hélice que mire a ningún sitio.
   */
  raiz.updateWorldMatrix(true, true);
  const morro = new Box3();
  let hayHelice = false;
  raiz.traverse((o) => {
    if (!NOMBRES_DE_HELICE.some((n) => o.name.toLowerCase().includes(n)))
      return;
    morro.expandByObject(o);
    hayHelice = true;
  });
  if (!deLaCasa && hayHelice) {
    const centroAvion = new Box3().setFromObject(raiz).getCenter(new Vector3());
    if (morro.getCenter(new Vector3()).z > centroAvion.z)
      raiz.rotation.y += Math.PI;
  }

  /*
   * **Y las ruedas al suelo, no al origen.**
   *
   * El juego coloca la aeronave a `sampleHeight` **más `gearHeight`**: su
   * origen no está en las ruedas, está a la altura del tren por encima de
   * ellas. Un modelo cualquiera viene centrado en su propio centro, así que
   * hay que bajarlo hasta que su punto más bajo caiga en el suelo — o sea, lo
   * que mide el modelo **más** lo que el juego lo ha subido.
   *
   * Faltaba el segundo término y el avión flotaba exactamente la altura de su
   * tren: medido con el avión parado en la pista, el Pykasu a 1,40 m del
   * asfalto y el Mainumby a 1,80. Llevaba así desde que existe el cargador de
   * glTF, y no se veía porque la sombra se dibuja aparte, contra el suelo, y
   * tapaba el hueco desde la cámara de persecución. El respaldo de cajas sí lo
   * hacía bien —`aircraft-mesh.ts` resta `gearHeight`—, que es lo que hacía
   * que el avión de la fábrica se posara y el de verdad no.
   */
  pintarDeLaFlota(raiz, aircraft);
  // Y la librea de la casa encima: el motivo de la cola y la firma. Ver
  // `librea.ts`.
  vestirLaLibrea(raiz, aircraft);

  const yaEscalada = new Box3().setFromObject(raiz);
  raiz.position.y -= yaEscalada.min.y + aircraft.gearHeight;
  raiz.position.x -= (yaEscalada.min.x + yaEscalada.max.x) / 2;
  /*
   * **Y a lo largo, por su centro de gravedad si lo trae.**
   *
   * El origen del grupo es el punto sobre el que el modelo de vuelo hace
   * girar el avión, y se ponía en el centro de la caja. En un avión de línea
   * da casi igual —el ala está a media eslora—, pero en una avioneta de
   * proporciones de verdad el morro es corto y la cola larga, y el centro de
   * la caja cae metro y pico por detrás del ala: al rotar, las ruedas
   * principales se levantaban del suelo antes que el morro. Los modelos de
   * `modelos/` llevan un nodo `centro-de-gravedad` a un cuarto de la cuerda
   * del ala, que es donde lo tiene un avión de verdad.
   */
  const cdg = raiz.getObjectByName("centro-de-gravedad");
  if (cdg) {
    raiz.updateWorldMatrix(true, true);
    raiz.position.z -= cdg.getWorldPosition(new Vector3()).z;
  } else {
    raiz.position.z -= (yaEscalada.min.z + yaEscalada.max.z) / 2;
  }

  group.add(raiz);

  const helices = ejesDeHelice(raiz);

  /*
   * **Y las luces de posición, aquí también.**
   *
   * Se pusieron en `createAircraftMesh` —el avión de cajas— y este es el otro
   * constructor de una aeronave: el que carga el modelo de Blender y
   * **sustituye** al anterior entero. O sea que los aviones con modelo, que
   * son los que más se miran, se quedaron sin ellas. «No veo las luces en el
   * avión», y no estaban.
   *
   * Es el fallo de siempre en este proyecto, el de las dos superficies: se
   * arregla donde se mira y no donde también se mira.
   */
  // Con el avión ya montado: las puntas de ala son las suyas, no las de la
  // ficha. Ver `crearLucesDePosicion`.
  const luces = crearLucesDePosicion(aircraft, raiz);
  group.add(luces.grupo);

  const ojo = conSuEncuadre(ojoDePiloto(raiz, group), raiz, group);
  return {
    group,
    luces,
    // La primera, para que lo que ya existía siga funcionando; y todas, para
    // que un bimotor gire las dos. Ver `AircraftMesh.helices`.
    propeller: helices[0] ?? new Group(),
    helices,
    borrarHelices: discoDeHelice(helices),
    ojo,
    // Las pantallas del salpicadero, encendidas. Ver `pantallas-cabina.ts`.
    pantallas: encenderPantallas(raiz, group),
    // Y los relojes, que hasta hoy eran discos grises. Ver `relojes-cabina.ts`.
    relojes: encenderRelojes(raiz),
    // Y los mandos que se pulsan con el dedo. Ver `botones-cabina.ts`.
    botones: encenderBotones(
      raiz,
      ojo ? group.localToWorld(new Vector3(ojo.x, ojo.y, ojo.z)) : null,
    ),
    // Y las patas, que en el avión que las mete se meten. Ver `patas.ts`.
    patas: prepararPatas(raiz),
    // Y los flaps, que en el avión que los trae sueltos bajan. Ver `flaps.ts`.
    flaps: prepararFlaps(raiz),
    /*
     * Y la luz de dentro, **la última**: lo de arriba cambia los materiales
     * de los relojes y de los mandos, y la luz tiene que ver los que quedan.
     * Ver `luz-de-cabina.ts`.
     */
    luzDeCabina: luzDeCabina(raiz),
    // Y que esto es el modelo, no el respaldo. Ver `AircraftMesh.deVerdad`.
    deVerdad: true,
  };
}
