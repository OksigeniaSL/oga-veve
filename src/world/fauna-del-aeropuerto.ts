/**
 * **El servicio de control de fauna**, a la vista: la furgoneta con su
 * rotativo y, en los campos que lo tienen, el cetrero con su halcón.
 *
 * Es un trabajo de todos los días y casi nadie lo ve. Un aeropuerto grande
 * tiene gente cuya tarea es que no haya aves donde suben y bajan los aviones:
 * recorren el campo, espantan lo que se posa y, en muchos, vuelan halcones
 * —el ave pequeña no se queda donde caza una rapaz—. Lo que hace cada campo,
 * con su fuente, en `aves.ts` (`SERVICIO_DE_FAUNA`).
 *
 * **Discreto**: aparcado en la hierba, fuera de la franja de la pista, que es
 * donde se ve rodando o en la final corta y donde no estorba a nadie. No se
 * mete en la pista: eso lo hace uno de verdad con permiso de la torre y entre
 * dos aviones, y aquí sería enseñar a cruzarse con uno.
 *
 * Se monta por código y en una sola pieza por campo —una llamada de dibujo—,
 * con el color en el vértice, como la granja. El halcón es un ave más de las
 * bandadas: ver `forma: "cetreria"` en `bandadas.ts`.
 */

import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
} from "three";
import { Obra, aqui } from "./granja";
import { delante, traves } from "./rumbo";
import type { Aerodrome } from "./aerodrome";
import { enElPavimento } from "./aerodrome";

/**
 * **Cuánto se aparta del eje**, m. La franja de una pista de vuelo por
 * instrumentos llega a 140 m del eje a cada lado (OACI, Anexo 14, 3.4.3), y
 * dentro no se para nada que no sea frangible. Un poco más allá, en la hierba.
 */
const DESDE_EL_EJE = 175;
const HASTA_EL_EJE = 260;

/** Los colores: una furgoneta blanca de servicio y su rotativo ámbar. */
const BLANCO = 0xf1f1ee;
const CRISTAL = 0x2b333b;
const GOMA = 0x1b1d20;
const AMBAR = 0xffa21f;
/** El cetrero: ropa de campo, chaleco reflectante y el guante de cuero. */
const ROPA = 0x3d4a3a;
const CHALECO = 0xd6e33c;
const PIEL = 0xc99a74;
const CUERO = 0x8a5a32;

/** Dónde aparca el servicio, en el mundo, y hacia dónde mira. */
export interface SitioDelServicio {
  readonly x: number;
  readonly z: number;
  /** Rumbo de la furgoneta, grados: a lo largo de la pista. */
  readonly rumbo: number;
  /** Hacia qué lado queda la pista: +1 a la derecha de la furgoneta. */
  readonly ladoDeLaPista: 1 | -1;
}

/**
 * **Un sitio en la hierba**, junto a la pista y fuera de su franja, del lado
 * contrario a la plataforma —que es donde está el ajetreo—, sin agua, sin
 * asfalto y sin cuesta. `null` si no hay ninguno.
 */
export function sitioDelServicio(
  pista: { x: number; z: number; heading: number; length: number },
  aerodromo: Aerodrome | null,
  suelo: (x: number, z: number) => number,
  esAgua: (x: number, z: number) => boolean,
): SitioDelServicio | null {
  const [fx, fz] = delante(pista.heading);
  const [tx, tz] = traves(pista.heading);
  // De qué lado está la plataforma: se aparca en el otro.
  let lado: 1 | -1 = 1;
  const plataforma = aerodromo?.aprons[0]?.polygon;
  if (plataforma?.length) {
    let across = 0;
    for (const [x, z] of plataforma)
      across += (x - pista.x) * tx + (z - pista.z) * tz;
    lado = across > 0 ? -1 : 1;
  }
  const edificios =
    aerodromo?.buildings.map((b) => {
      let x = 0;
      let z = 0;
      for (const p of b.polygon) {
        x += p[0];
        z += p[1];
      }
      return [x / b.polygon.length, z / b.polygon.length] as const;
    }) ?? [];
  const lados: readonly (1 | -1)[] = [lado, lado === 1 ? -1 : 1];
  for (const deLado of lados)
    for (const a of [0.2, -0.2, 0.32, -0.32, 0.08, -0.08])
      for (const c of [DESDE_EL_EJE, (DESDE_EL_EJE + HASTA_EL_EJE) / 2, HASTA_EL_EJE]) {
        const along = a * pista.length;
        const x = pista.x + fx * along + tx * c * deLado;
        const z = pista.z + fz * along + tz * c * deLado;
        if (esAgua(x, z)) continue;
        if (aerodromo && enElPavimento(aerodromo, [x, z], 25)) continue;
        if (edificios.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 70)) continue;
        const h = suelo(x, z);
        const cuesta =
          Math.hypot(suelo(x + 8, z) - h, suelo(x, z + 8) - h) / 8;
        if (cuesta > 0.08) continue;
        /*
         * Mirando a lo largo de la pista, hacia el centro del campo. Su
         * derecha es el través de la pista si mira como ella, y el contrario
         * si mira al revés; la pista queda del lado opuesto a `deLado`.
         */
        const alReves = a < 0;
        return {
          x,
          z,
          rumbo: (pista.heading + (alReves ? 180 : 0)) % 360,
          ladoDeLaPista: alReves ? deLado : deLado === 1 ? -1 : 1,
        };
      }
  return null;
}

/**
 * La furgoneta: un todoterreno de caja abierta, blanco, con el rotativo en el
 * techo. Sin rótulos: quien juega no los lee y no son de nadie.
 */
function furgoneta(obra: Obra): void {
  const m = aqui(0, 0, 0);
  obra.caja(1.9, 0.75, 5.1, BLANCO, m, 0, 0.45, 0);
  obra.caja(1.8, 0.75, 1.9, BLANCO, m, 0, 1.2, -0.55);
  obra.caja(1.82, 0.5, 1.5, CRISTAL, m, 0, 1.3, -0.62);
  // La caja de atrás, abierta, con las jaulas y la pértiga.
  obra.caja(1.7, 0.35, 2.0, 0xd9dcd8, m, 0, 1.2, 1.35);
  for (const [x, z] of [
    [-0.92, -1.65],
    [0.92, -1.65],
    [-0.92, 1.55],
    [0.92, 1.55],
  ] as const) {
    const g = new CylinderGeometry(0.4, 0.4, 0.28, 10);
    g.rotateZ(Math.PI / 2);
    g.translate(x, 0.4, z);
    obra.poner(g, GOMA, m);
    g.dispose();
  }
}

/**
 * El cetrero, de pie junto a la furgoneta, con el brazo izquierdo en alto y
 * el guante: es la postura con la que se llama al halcón.
 */
function cetrero(obra: Obra, x: number, z: number): void {
  const m = aqui(x, 0, z);
  obra.caja(0.36, 0.85, 0.24, ROPA, m, 0, 0, 0);
  obra.caja(0.46, 0.66, 0.3, CHALECO, m, 0, 0.85, 0);
  const cabeza = new SphereGeometry(0.13, 8, 6);
  cabeza.translate(0, 1.66, 0);
  obra.poner(cabeza, PIEL, m);
  cabeza.dispose();
  obra.caja(0.12, 0.6, 0.12, ROPA, m, 0.3, 0.9, 0);
  // El brazo del guante, en alto y hacia delante.
  obra.caja(0.12, 0.62, 0.12, ROPA, m, -0.3, 1.3, -0.12);
  obra.caja(0.16, 0.22, 0.16, CUERO, m, -0.3, 1.9, -0.14);
}

/** Lo que se ve del servicio de fauna en un campo. */
export class FaunaDelAeropuerto {
  readonly grupo = new Group();
  private readonly rotativo: Mesh;

  constructor(
    sitio: SitioDelServicio,
    cota: number,
    conCetrero: boolean,
  ) {
    const obra = new Obra();
    furgoneta(obra);
    if (conCetrero) cetrero(obra, sitio.ladoDeLaPista * -3.2, -1.2);
    const geo = obra.fundir();
    const cuerpo = new Mesh(
      geo ?? undefined,
      new MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    );
    cuerpo.name = "fauna:furgoneta";
    /*
     * **El rotativo va sin luz**, como los bastones del señalero: es una luz
     * de verdad, y con material iluminado la que quedara de espaldas al sol de
     * la tarde se apagaría. Gira: se ve como un destello que va y viene.
     */
    this.rotativo = new Mesh(
      new CylinderGeometry(0.14, 0.16, 0.22, 8),
      new MeshBasicMaterial({ color: AMBAR }),
    );
    this.rotativo.position.set(0, 1.72, -0.55);
    this.rotativo.name = "fauna:rotativo";
    this.grupo.add(cuerpo, this.rotativo);
    this.grupo.name = "fauna-del-aeropuerto";
    this.grupo.position.set(sitio.x, cota, sitio.z);
    this.grupo.rotation.y = -(sitio.rumbo * Math.PI) / 180;
  }

  /**
   * El destello del rotativo: un giro por segundo, que es lo que da uno de
   * verdad, y un pulso de tamaño para que se vea girar desde lejos.
   */
  paso(t: number): void {
    const fase = (t % 1) * Math.PI * 2;
    this.rotativo.rotation.y = fase;
    const destello = 0.75 + 0.35 * Math.max(0, Math.cos(fase));
    this.rotativo.scale.set(destello, 1, destello);
  }

  /** Se quita del todo: se rehace al cambiar la hora o el parte. */
  soltar(): void {
    this.grupo.removeFromParent();
    this.grupo.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.geometry.dispose();
      (o.material as MeshBasicMaterial).dispose();
    });
  }
}
