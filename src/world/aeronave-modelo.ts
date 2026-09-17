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

import { Box3, Group, Vector3, type Color, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AircraftConfig } from "../flight/aircraft";
import type { AircraftMesh } from "./aircraft-mesh";
import { encenderPantallas } from "./pantallas-cabina";
import { prepararPatas } from "./patas";
import { encenderRelojes } from "./relojes-cabina";
import { encenderBotones } from "./botones-cabina";

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
    y: asiento.alto - 0.02,
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
    const gltf = await new GLTFLoader().loadAsync(url);
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

  const yaEscalada = new Box3().setFromObject(raiz);
  raiz.position.y -= yaEscalada.min.y + aircraft.gearHeight;
  raiz.position.x -= (yaEscalada.min.x + yaEscalada.max.x) / 2;
  raiz.position.z -= (yaEscalada.min.z + yaEscalada.max.z) / 2;

  group.add(raiz);

  const helices = ejesDeHelice(raiz);

  return {
    group,
    // La primera, para que lo que ya existía siga funcionando; y todas, para
    // que un bimotor gire las dos. Ver `AircraftMesh.helices`.
    propeller: helices[0] ?? new Group(),
    helices,
    ojo: ojoDePiloto(raiz, group),
    // Las pantallas del salpicadero, encendidas. Ver `pantallas-cabina.ts`.
    pantallas: encenderPantallas(raiz, group),
    // Y los relojes, que hasta hoy eran discos grises. Ver `relojes-cabina.ts`.
    relojes: encenderRelojes(raiz),
    // Y los mandos que se pulsan con el dedo. Ver `botones-cabina.ts`.
    botones: encenderBotones(raiz),
    // Y las patas, que en el avión que las mete se meten. Ver `patas.ts`.
    patas: prepararPatas(raiz),
    // Y que esto es el modelo, no el respaldo. Ver `AircraftMesh.deVerdad`.
    deVerdad: true,
  };
}
