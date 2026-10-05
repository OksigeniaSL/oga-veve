/**
 * **Dónde está cada cosa de la vuelta al avión**, medido en el modelo.
 *
 * Casi todo ya lo mide la tarjeta del avión —el pitot, el tren, el motor, la
 * cola, las luces: ver `puntos-del-avion.ts`— y aquí se reutiliza, como pidió
 * Enrique: «hay datos del avión que ya existen: reutilizalos». Lo que la
 * tarjeta no tiene se mide aquí con las mismas herramientas: la boca del
 * combustible encima del ala, la puerta del costado y la caja de la rueda
 * para ponerle sus calzos delante y detrás.
 *
 * Todo en los ejes del grupo del avión y del lado izquierdo, como los puntos
 * de la tarjeta: la vuelta los refleja al otro lado cuando se mira desde allí.
 */

import { Box3, Matrix4, Vector3, type Object3D } from "three";
import type { AircraftConfig } from "../flight/aircraft";
import type { CosaDeLaVuelta } from "../flight/vuelta-al-avion";
import { mallasDe, vertices, type PiezaDelAvion, type PuntoDelAvion } from "./puntos-del-avion";

/** Un punto de la vuelta: dónde, y si tiene gemelo al otro lado. */
export interface PuntoDeLaVuelta {
  readonly donde: Vector3;
  readonly espejo: boolean;
}

/** Lo que la vuelta necesita del modelo. */
export interface PuntosDeLaVuelta {
  readonly puntos: ReadonlyMap<CosaDeLaVuelta, PuntoDeLaVuelta>;
  /** La rueda principal de la izquierda, para los calzos. */
  readonly rueda: Box3 | null;
  /**
   * Las sondas con su funda: una bajo el ala en la avioneta, una a cada lado
   * del morro en el de línea. Ver `sitioDelPitot` en `puntos-del-avion.ts`.
   */
  readonly fundas: readonly Vector3[];
  /** Lo que mide el avión de punta a punta y de morro a cola, m. */
  readonly tamano: number;
}

const delPunto = (puntos: readonly PuntoDelAvion[], pieza: PiezaDelAvion) =>
  puntos.find((p) => p.pieza === pieza) ?? null;

/**
 * Mide la vuelta en un modelo ya colocado. `puntos` son los de la tarjeta, ya
 * medidos en el mismo modelo: no se miden dos veces.
 */
export function puntosDeLaVuelta(
  raiz: Object3D,
  grupo: Object3D,
  a: AircraftConfig,
  puntos: readonly PuntoDelAvion[],
): PuntosDeLaVuelta {
  grupo.updateWorldMatrix(true, true);
  const aGrupo = new Matrix4().copy(grupo.matrixWorld).invert();
  const fuera = new Map<CosaDeLaVuelta, PuntoDeLaVuelta>();
  const poner = (c: CosaDeLaVuelta, donde: Vector3 | null | undefined, espejo = true) => {
    if (donde && Number.isFinite(donde.x + donde.y + donde.z))
      fuera.set(c, { donde: donde.clone(), espejo });
  };

  const pitot = delPunto(puntos, "pitot");
  const tren = delPunto(puntos, "tren");
  const motor = delPunto(puntos, "motor");
  const cola = delPunto(puntos, "profundidad");
  const luces = delPunto(puntos, "luces");

  // La avioneta: la funda del pitot, la cola, la rueda, el ala, el morro.
  poner("pitot", pitot?.donde, pitot?.espejo ?? false);
  poner("superficies", cola?.donde);
  poner("calzos", tren?.donde);
  poner("luces", luces?.donde);
  // El de línea: las sondas del morro, las ruedas con sus frenos, el motor.
  poner("sondas", pitot?.donde, pitot?.espejo ?? true);
  poner("frenos", tren?.donde);
  poner("motores", motor?.donde, motor?.espejo ?? true);

  /*
   * **El aceite y la hélice, en el motor.** El punto del motor de la tarjeta
   * es el capó, detrás de la hélice; la varilla del aceite se saca por la
   * tapa de arriba del capó y la hélice se mira delante, en su cono.
   */
  if (motor) {
    poner("aceite", motor.donde.clone().add(new Vector3(0, 0.22, 0.1)), motor.espejo);
    poner("helice", motor.donde.clone().add(new Vector3(0, 0, -0.55)), motor.espejo);
  }

  // El ala: la de arriba en el biplano, como en la tarjeta.
  const ala = vertices(mallasDe(raiz, /^(ala|ala-alta)$/), aGrupo, (v) => v.x < 0);
  const cajaAla = ala.length ? new Box3().setFromPoints(ala) : null;
  /*
   * **La boca del combustible, encima del ala.** En la avioneta de ala alta va
   * arriba, junto al montante; en la de ala baja, por fuera del motor. A cuatro
   * décimas de la semiala, por la mitad de la cuerda y en lo más alto del
   * perfil: donde se abre el tapón y se mira dentro.
   */
  if (cajaAla) {
    const x = cajaAla.min.x * 0.4;
    const tramo = ala.filter((v) => Math.abs(v.x - x) < 0.35);
    const t = tramo.length ? new Box3().setFromPoints(tramo) : cajaAla;
    poner("combustible", new Vector3(x, t.max.y + 0.03, (t.min.z + t.max.z) / 2));
  }

  /*
   * **La puerta del costado**: a tres décimas del largo desde el morro y en el
   * tercio de abajo del fuselaje, donde van las de la bodega de un avión de
   * línea —que es lo que se mira cerrado—.
   */
  const cuerpo = vertices(mallasDe(raiz, /^fuselaje$/), aGrupo);
  const cajaCuerpo = cuerpo.length ? new Box3().setFromPoints(cuerpo) : null;
  if (cajaCuerpo) {
    const largo = cajaCuerpo.max.z - cajaCuerpo.min.z;
    const z = cajaCuerpo.min.z + largo * 0.3;
    const corte = cuerpo.filter((v) => Math.abs(v.z - z) < largo * 0.03 && v.x < 0);
    const c = corte.length ? new Box3().setFromPoints(corte) : null;
    if (c) poner("puertas", new Vector3(c.min.x, c.min.y + (c.max.y - c.min.y) * 0.35, z));
  }

  // La rueda, entera: los calzos van delante y detrás de ella.
  const rueda = vertices(
    mallasDe(raiz, /^rueda-(principal|ala)(-izquierda)?$/),
    aGrupo,
    (v) => v.x < 0,
  );

  /*
   * Las fundas: donde está cada sonda. La de la avioneta va sola bajo el ala;
   * las del de línea, una a cada lado del morro.
   */
  const fundas: Vector3[] = [];
  if (pitot) {
    fundas.push(pitot.donde.clone());
    if (pitot.espejo) fundas.push(pitot.donde.clone().setX(-pitot.donde.x));
  }

  const todo = new Box3().setFromObject(raiz);
  const tam = todo.getSize(new Vector3());
  return {
    puntos: fuera,
    rueda: rueda.length ? new Box3().setFromPoints(rueda) : null,
    fundas,
    tamano: Math.max(tam.x, tam.z, a.wingSpan),
  };
}
