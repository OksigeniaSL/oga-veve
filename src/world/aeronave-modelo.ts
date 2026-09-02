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
 * 3. **Las ruedas quedan en el origen**, porque el juego coloca la aeronave por
 *    su tren de aterrizaje y no por su centro.
 */

import { Box3, Group, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AircraftConfig } from '../flight/aircraft';
import type { AircraftMesh } from './aircraft-mesh';

/** Dónde se dejan los modelos. Uno por aeronave, con su identificador. */
const CARPETA = 'assets/aeronaves';

/**
 * Nombres por los que se reconoce la hélice dentro del modelo.
 *
 * Se busca por nombre porque es lo único que traen todos: un glTF no tiene
 * forma de decir «esto gira». Si no aparece ninguno, la hélice se queda quieta
 * y el avión vuela igual — es un adorno, no un mando.
 */
const NOMBRES_DE_HELICE = ['prop', 'helice', 'hélice', 'propeller', 'spinner', 'blade'];

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
 */
function ejeDeHelice(raiz: Object3D): Object3D {
  const piezas: Object3D[] = [];
  raiz.traverse((o) => {
    const nombre = o.name.toLowerCase();
    if (!NOMBRES_DE_HELICE.some((n) => nombre.includes(n))) return;
    // Solo la de más arriba de cada rama: si se cogen padre e hijo, el hijo
    // acaba girando dos veces.
    if (piezas.some((p) => esAncestro(p, o))) return;
    piezas.push(o);
  });
  if (!piezas.length) return new Group();

  raiz.updateWorldMatrix(true, true);
  const centro = new Box3();
  for (const p of piezas) centro.expandByObject(p);
  const medioEnElMundo = centro.getCenter(new Vector3());

  const eje = new Group();
  eje.name = 'helice';
  raiz.add(eje);
  // El centro, traído a las coordenadas del padre. `worldToLocal` necesita las
  // matrices al día, y por eso el `updateWorldMatrix` de arriba.
  eje.position.copy(raiz.worldToLocal(medioEnElMundo.clone()));
  // Y `attach`, no `add`: conserva dónde está cada pieza en el mundo, así que
  // colgarlas del eje no las mueve ni un milímetro.
  for (const p of piezas) eje.attach(p);
  return eje;
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
 * adelante**, con los ojos un poco por encima del respaldo.
 *
 * Si el modelo no trae asientos se devuelve `undefined` y manda la fórmula de
 * siempre, que es lo que hacen las cajas.
 */
function ojoDePiloto(
  raiz: Object3D,
  grupo: Object3D,
): { x: number; y: number; z: number } | undefined {
  const asientos = new Box3();
  let hay = false;
  raiz.traverse((o) => {
    const n = o.name.toLowerCase();
    if (!n.includes('chair') && !n.includes('seat') && !n.includes('asiento')) return;
    asientos.expandByObject(o);
    hay = true;
  });
  if (!hay) return undefined;

  grupo.updateWorldMatrix(true, true);
  const centro = asientos.getCenter(new Vector3());
  const local = grupo.worldToLocal(centro);
  const alto = asientos.max.y - asientos.min.y;
  return {
    x: 0,
    // Los ojos por encima del respaldo, no a la altura del cojín.
    y: local.y + alto * 0.55,
    // Y medio metro adelante, que es de donde se mira: pegado al panel, no
    // desde el centro del asiento.
    z: local.z - 0.5,
  };
}

function esAncestro(posible: Object3D, hijo: Object3D): boolean {
  for (let o: Object3D | null = hijo.parent; o; o = o.parent) if (o === posible) return true;
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
  base = import.meta.env.BASE_URL ?? '/',
): Promise<AircraftMesh | null> {
  const url = `${base}${base.endsWith('/') ? '' : '/'}${CARPETA}/${aircraft.id}.glb`;

  try {
    // Se pregunta antes de cargar: `GLTFLoader` con un 404 escupe un error de
    // análisis que parece un fichero corrupto, y no lo es — es que no está.
    const hay = await fetch(url, { method: 'HEAD' });
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
   * La escala, por envergadura. Se mide el modelo y se lleva su lado más ancho
   * a la envergadura que dice la configuración de vuelo, que es la que usa el
   * modelo de vuelo para calcular la sustentación: si el dibujo y la física no
   * miden lo mismo, el avión parece de otro tamaño del que vuela.
   */
  const caja = new Box3().setFromObject(raiz);
  const tam = caja.getSize(new Vector3());
  const anchoModelo = Math.max(tam.x, tam.z);
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
   */
  if (tam.z > tam.x) raiz.rotation.y = Math.PI / 2;

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
   */
  raiz.updateWorldMatrix(true, true);
  const morro = new Box3();
  let hayHelice = false;
  raiz.traverse((o) => {
    if (!NOMBRES_DE_HELICE.some((n) => o.name.toLowerCase().includes(n))) return;
    morro.expandByObject(o);
    hayHelice = true;
  });
  if (hayHelice) {
    const centroAvion = new Box3().setFromObject(raiz).getCenter(new Vector3());
    if (morro.getCenter(new Vector3()).z > centroAvion.z) raiz.rotation.y += Math.PI;
  }

  /*
   * Y las ruedas al origen. El juego coloca la aeronave por su tren —
   * `sampleHeight` más `gearHeight`— y un modelo cualquiera viene centrado en
   * su propio centro, así que se baja hasta que su punto más bajo sea el cero.
   */
  const yaEscalada = new Box3().setFromObject(raiz);
  raiz.position.y -= yaEscalada.min.y;
  raiz.position.x -= (yaEscalada.min.x + yaEscalada.max.x) / 2;
  raiz.position.z -= (yaEscalada.min.z + yaEscalada.max.z) / 2;

  group.add(raiz);

  return { group, propeller: ejeDeHelice(raiz), ojo: ojoDePiloto(raiz, group) };
}
