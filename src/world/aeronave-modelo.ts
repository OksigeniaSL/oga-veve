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
   * El morro a la Z negativa. Un avión es más largo que ancho salvo en los
   * planeadores, así que si el modelo viene más largo en X que en Z, está
   * atravesado y se gira un cuarto de vuelta.
   */
  if (tam.x > tam.z) raiz.rotation.y = Math.PI / 2;

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

  let propeller: Object3D = new Group();
  raiz.traverse((o) => {
    const nombre = o.name.toLowerCase();
    if (NOMBRES_DE_HELICE.some((n) => nombre.includes(n))) propeller = o;
  });
  if (!propeller.parent) group.add(propeller);

  return { group, propeller };
}
