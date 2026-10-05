/**
 * **Dónde está cada pieza que se explica**, sacado del propio modelo.
 *
 * La tarjeta del avión lleva puntos que se tocan —los alerones, los flaps, el
 * timón, el pitot, los motores, el tren y las luces— y cada uno tiene que caer
 * encima de su pieza. Escribir sus coordenadas a mano serían seis aviones por
 * nueve puntos de números que se quedan viejos en cuanto alguien retoca un
 * modelo en Blender; y un punto que señala el ala cuando habla del flap enseña
 * justo lo que no es. Así que se miden **los vértices de la pieza que se
 * llama así**, como ya hacen `flaps.ts`, `patas.ts` y `luces-de-posicion.ts`.
 *
 * Todo en los ejes del grupo del avión —el morro hacia la −Z, la derecha del
 * piloto hacia la +X— y siempre **del lado izquierdo**: la tarjeta lo refleja
 * al derecho cuando se mira el avión por ese lado, salvo en lo que de verdad
 * solo va a un lado. El pitot de una avioneta de ala alta va bajo el ala
 * izquierda y no bajo las dos, y el punto lo dice.
 */

import { Box3, Matrix4, Vector3, type Mesh, type Object3D } from "three";
import type { AircraftConfig } from "../flight/aircraft";
import { modeloPorId } from "../flight/flota";

/** Las piezas que se explican. Ver `ui/explicaciones-del-avion.ts`. */
export type PiezaDelAvion =
  | "alerones"
  | "profundidad"
  | "timon"
  | "flaps"
  | "aerofrenos"
  | "pitot"
  | "motor"
  | "tren"
  | "luces";

/** Un punto que se toca: la pieza, dónde está y si tiene gemelo al otro lado. */
export interface PuntoDelAvion {
  readonly pieza: PiezaDelAvion;
  /** En los ejes del grupo del avión, del lado izquierdo. */
  readonly donde: Vector3;
  /**
   * Si la misma pieza está también al otro lado, en espejo.
   *
   * Casi todo va a pares —dos alerones, dos patas, dos luces de punta— y el
   * punto se pone en el lado que se ve. El pitot de una avioneta, no: va en
   * un ala sola, y si se mira el avión por el otro lado el punto se queda
   * donde está, detrás.
   */
  readonly espejo: boolean;
}

/** Los vértices de unas mallas, en los ejes del grupo, que cumplan `vale`. */
export function vertices(
  mallas: readonly Mesh[],
  aGrupo: Matrix4,
  vale: (v: Vector3) => boolean = () => true,
): Vector3[] {
  const fuera: Vector3[] = [];
  const v = new Vector3();
  for (const m of mallas) {
    const pos = m.geometry?.getAttribute?.("position");
    if (!pos) continue;
    m.updateWorldMatrix(true, false);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).applyMatrix4(aGrupo);
      if (vale(v)) fuera.push(v.clone());
    }
  }
  return fuera;
}

/** Las mallas que se llaman así, o que cuelgan de algo que se llama así. */
export function mallasDe(raiz: Object3D, nombre: RegExp): Mesh[] {
  const fuera: Mesh[] = [];
  raiz.traverse((o) => {
    if (!(o as Mesh).isMesh) return;
    for (let p: Object3D | null = o; p && p !== raiz.parent; p = p.parent)
      if (nombre.test(p.name)) {
        fuera.push(o as Mesh);
        return;
      }
  });
  return fuera;
}

function cajaDe(puntos: readonly Vector3[]): Box3 | null {
  if (!puntos.length) return null;
  return new Box3().setFromPoints(puntos as Vector3[]);
}

function media(puntos: readonly Vector3[], eje: "x" | "y" | "z"): number {
  let s = 0;
  for (const p of puntos) s += p[eje];
  return s / Math.max(1, puntos.length);
}

/**
 * **Dónde va el pitot en esta clase de avión**, que no lleva malla propia.
 *
 * No es un sitio cualquiera: es donde lo lleva su clase, y el punto lo enseña
 * ahí para que quien se acerque a uno de verdad lo encuentre.
 *
 * - Las avionetas de ala alta y los bimotores ligeros —la clase del 172 y la
 *   del Seneca— lo llevan **debajo del ala izquierda**, asomando por delante
 *   del borde de ataque. Uno solo.
 * - El turbohélice de pasaje y los reactores, **a los dos lados del morro**,
 *   por debajo de las ventanillas de la cabina: uno para cada piloto.
 *
 * **Y el biplano de trabajo, sin punto.** Lo lleva, como todos, pero en un
 * fumigador de su clase va donde lo puso cada taller —en un montante, en un
 * ala o en la otra— y no hay un sitio que sea «el suyo». Señalar uno a ojo
 * sería enseñar una cosa que no es; mejor ninguno.
 */
type SitioDelPitot = "bajo-el-ala" | "morro" | null;

function sitioDelPitot(a: AircraftConfig): SitioDelPitot {
  const silueta = modeloPorId(a.id)?.silueta;
  if (silueta === "biplano") return null;
  if (silueta === "ala-alta" || silueta === "bimotor-ala-baja") return "bajo-el-ala";
  return "morro";
}

/**
 * Los puntos de este avión, medidos en su modelo ya colocado.
 *
 * `raiz` es la escena del `.glb` y `grupo` el que devuelve `colocarModelo`.
 * Una pieza que el modelo no trae no tiene punto: el biplano no lleva flaps
 * y no se le inventa ninguno, y los aerofrenos solo están en los reactores.
 */
export function puntosDelAvion(
  raiz: Object3D,
  grupo: Object3D,
  a: AircraftConfig,
): PuntoDelAvion[] {
  grupo.updateWorldMatrix(true, true);
  const aGrupo = new Matrix4().copy(grupo.matrixWorld).invert();
  const izquierda = (v: Vector3) => v.x < 0;
  const fuera: PuntoDelAvion[] = [];
  const poner = (pieza: PiezaDelAvion, donde: Vector3 | null, espejo = true) => {
    if (donde && Number.isFinite(donde.x + donde.y + donde.z))
      fuera.push({ pieza, donde, espejo });
  };

  /*
   * El ala: la de arriba en el biplano, que es la que se ve primero. **Con
   * su alerón**, que ahora es una pieza aparte —ver
   * `world/superficies-de-mando.ts`—: sin él, el borde de salida de la punta
   * era la junta de la bisagra y el punto se iba un palmo hacia delante.
   */
  const ala = mallasDe(raiz, /^(ala|ala-alta|aleron-(alto-)?(izquierda|derecha))$/);
  const delAla = vertices(ala, aGrupo, izquierda);
  const caja = cajaDe(delAla);
  const punta = caja ? caja.min.x : -a.wingSpan / 2;

  /*
   * **Los alerones, en el borde de salida y hacia la punta**: la cuarta parte
   * de fuera de la semiala, que es donde los lleva todo avión —lejos del
   * fuselaje, donde un poco de fuerza da mucho giro—.
   */
  {
    const fuera = delAla.filter((v) => v.x < punta * 0.72);
    if (fuera.length)
      poner(
        "alerones",
        new Vector3(punta * 0.82, media(fuera, "y"), (cajaDe(fuera)?.max.z ?? 0) - 0.05),
      );
  }

  // La profundidad, en el borde de salida del estabilizador.
  {
    // Con la profundidad, que es una pieza aparte, como el alerón.
    const estab = vertices(
      mallasDe(raiz, /^(estabilizador|profundidad-(izquierda|derecha))$/),
      aGrupo,
      izquierda,
    );
    const c = cajaDe(estab);
    if (c) poner("profundidad", new Vector3(c.min.x * 0.55, media(estab, "y"), c.max.z - 0.05));
  }

  // El timón de dirección: el borde de atrás de la deriva, a media altura.
  {
    // Y con el timón, que también.
    const deriva = vertices(mallasDe(raiz, /^(deriva|timon-de-direccion)$/), aGrupo);
    const c = cajaDe(deriva);
    if (c) {
      const alto = c.min.y + (c.max.y - c.min.y) * 0.55;
      const cerca = deriva.filter((v) => Math.abs(v.y - alto) < (c.max.y - c.min.y) * 0.12);
      const z = cerca.length ? (cajaDe(cerca)?.max.z ?? c.max.z) : c.max.z;
      poner("timon", new Vector3(0, alto, z - 0.05), false);
    }
  }

  // Los flaps, por dentro: los que se mueven en el modelo.
  {
    const flap = vertices(mallasDe(raiz, /^flap-dentro-izquierda$/), aGrupo);
    const c = cajaDe(flap);
    if (c && a.llevaFlaps)
      poner("flaps", new Vector3((c.min.x + c.max.x) / 2, c.max.y, c.max.z - 0.05));
  }

  // Los aerofrenos, encima del ala, en el panel del medio.
  if (a.aerofrenos !== null) {
    const panel = vertices(mallasDe(raiz, /^aerofreno-3-izquierda$/), aGrupo);
    const c = cajaDe(panel);
    if (c) poner("aerofrenos", new Vector3((c.min.x + c.max.x) / 2, c.max.y, (c.min.z + c.max.z) / 2));
  }

  /*
   * **El motor**: la toma del de dentro en un reactor, y la góndola o el capó
   * detrás de la hélice en los de hélice. Se señala el motor y no la hélice
   * porque la explicación es la del motor: qué es lo que empuja.
   */
  {
    const reactor = vertices(mallasDe(raiz, /^motor(-0)?$/), aGrupo, izquierda);
    const helice = vertices(
      mallasDe(raiz, /^helice(-izquierda)?$/),
      aGrupo,
      a.motores > 1 ? izquierda : () => true,
    );
    if (reactor.length) {
      // El de más adentro: el que tiene la punta de fuera más cerca del eje.
      const c = cajaDe(reactor)!;
      const dentro = reactor.filter((v) => v.x > c.max.x - (c.max.x - c.min.x) * 0.5);
      const d = cajaDe(dentro.length ? dentro : reactor)!;
      poner("motor", new Vector3((d.min.x + d.max.x) / 2, (d.min.y + d.max.y) / 2, d.min.z + 0.05));
    } else if (helice.length) {
      const c = cajaDe(helice)!;
      // Un monomotor lo lleva en el eje: la caja de una hélice de tres palas
      // no es simétrica y su centro cae a un palmo del buje.
      const x = a.motores > 1 ? (c.min.x + c.max.x) / 2 : 0;
      poner(
        "motor",
        new Vector3(x, (c.min.y + c.max.y) / 2, c.max.z + 0.45),
        a.motores > 1,
      );
    }
  }

  // El tren: la rueda principal de la izquierda.
  {
    const rueda = vertices(
      mallasDe(raiz, /^rueda-(principal|ala)(-izquierda)?$/),
      aGrupo,
      izquierda,
    );
    const c = cajaDe(rueda);
    if (c) poner("tren", c.getCenter(new Vector3()));
  }

  // El pitot, donde lo lleva su clase. Ver `sitioDelPitot`.
  {
    const sitio = sitioDelPitot(a);
    if (sitio === "morro") {
      const cuerpo = vertices(mallasDe(raiz, /^fuselaje$/), aGrupo);
      const c = cajaDe(cuerpo);
      if (c) {
        const largo = c.max.z - c.min.z;
        const z = c.min.z + largo * 0.1;
        const corte = cuerpo.filter((v) => Math.abs(v.z - z) < largo * 0.02 && v.x < 0);
        const lado = cajaDe(corte);
        if (lado)
          poner(
            "pitot",
            new Vector3(lado.min.x, lado.min.y + (lado.max.y - lado.min.y) * 0.4, z),
          );
      }
    } else if (sitio === "bajo-el-ala") {
      const deDonde = delAla;
      const c = cajaDe(deDonde);
      if (c) {
        const x = c.min.x * 0.6;
        const tramo = deDonde.filter((v) => Math.abs(v.x - x) < 0.3);
        const t = cajaDe(tramo) ?? c;
        poner("pitot", new Vector3(x, t.min.y - 0.08, t.min.z + 0.1), false);
      }
    }
  }

  /*
   * Las luces de navegación, en la punta del ala: la roja a la izquierda y la
   * verde a la derecha. El punto va donde está la que se ve.
   */
  if (caja) {
    const tip = delAla.filter((v) => v.x < punta + 0.25);
    if (tip.length)
      poner("luces", new Vector3(punta, media(tip, "y"), media(tip, "z")));
  }

  return fuera;
}

/**
 * **Lo de dentro de la cabina**, que desde fuera no se ve.
 *
 * El panel, los relojes, los asientos, las palancas y los mandos: un cuarto de
 * las mallas de una avioneta y casi la mitad de las de un reactor, y todas
 * detrás de un parabrisas que en el modelo es opaco. Pintarlas en la tarjeta
 * serían llamadas de dibujo que no dejan ni un píxel; se esconden.
 */
export const DE_DENTRO =
  /^(alfeizar|asiento|boton-|cuerno|forro|panel|pomo|reloj-|subpanel|suelo-cabina|visera|bastidor|faldon|interruptores|marco-de-techo|mcp|montante|palanca|pantalla-|pedestal|rotulos-de-techo|tornillos)/;

/** Esconde lo de dentro. Devuelve cuántas mallas quedan a la vista. */
export function esconderLoDeDentro(raiz: Object3D): number {
  let quedan = 0;
  raiz.traverse((o) => {
    if (DE_DENTRO.test(o.name)) o.visible = false;
  });
  raiz.traverseVisible((o) => {
    if ((o as Mesh).isMesh) quedan += 1;
  });
  return quedan;
}
