/**
 * **El tractor del remolque y la persona de tierra**, dibujados: lo que se ve
 * de `remolque.ts`, que es quien decide dónde está cada uno y qué hace.
 *
 * Hechos con primitivas del motor, como el coche del sígame y el señalero: no
 * hay modelo que licenciar.
 *
 * - **El tractor es uno sin barra** (*towbarless*): un chasis bajo y ancho con
 *   una cuna detrás que abraza la rueda de morro y la levanta. Es el que
 *   empuja hoy a los aviones de línea en los aeropuertos grandes —el
 *   Goldhofer AST, el TLD TPX—: no necesita una barra para cada avión, se
 *   engancha solo y lleva la rueda bien sujeta. Con la cabina en una esquina
 *   delantera, la baliza ámbar encima y los faros. Ver el ADR 0025.
 * - **La persona**, con su chaleco, su casco blanco con cascos de oír y el
 *   cable enchufado al avión al lado de la rueda de morro. Al final quita el
 *   pasador y lo enseña en alto, con su cinta roja, y saluda con la mano.
 *
 * Lo que se conserva es el significado, no la escala, como en el señalero: se
 * tiene que leer desde la ventanilla de Ara, y de noche en Barajas. Por eso lo
 * que tiene que verse va **sin luz** —`MeshBasicMaterial`—, como los bastones y
 * las balizas: la baliza y los faros del tractor, que de verdad se encienden;
 * las bandas reflectantes del chaleco y del casco, que de verdad brillan con
 * los focos del avión; y la cinta del pasador, que se enseña alumbrada. Y la
 * persona, algo más grande que una de verdad, con la cinta más larga.
 */

import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
  type Material,
} from "three";
import type { GestoDeTierra, MedidasDelTractor, Remolque } from "./remolque";

/** El amarillo del material de plataforma, el mismo de los calzos. */
const AMARILLO = 0xf2c230;
/** Ámbar de las balizas, el del sígame. */
const AMBAR = 0xff9c2a;
/** El chaleco y la ropa, como el del señalero. */
const CHALECO = 0xd8e34a;
const ROPA = 0x2c3038;
/** Lo reflectante: plata que brilla con los focos. */
const REFLECTANTE = 0xe8eef0;
/** La cinta roja del pasador, la de *REMOVE BEFORE FLIGHT*. */
const ROJO = 0xd8232a;
const NEGRO = 0x1a1c20;

/**
 * **Cuánto más grande que una persona de verdad**: lo que se lee desde una ventanilla a
 * cuarenta metros, la misma escala que la bici de la granja.
 */
const PERSONA_MAS_GRANDE = 1.6;
/**
 * **Lo que brilla de noche lo pintado**: el chaleco de alta visibilidad, el casco y la
 * pintura del tractor devuelven la luz de los focos del avión y de la plataforma. Sin
 * esto, de noche en Barajas se veía una sombra con dos rayas.
 */
const BRILLO_DEL_CHALECO = 0x6a6e22;
const BRILLO_DEL_CASCO = 0x505050;
const BRILLO_DEL_TRACTOR = 0x4a3a10;

/** El vaivén al andar, vueltas por segundo, y el de la mano al saludar. */
const PASO = 1.6;
const SALUDO = 1.5;

/** Un brazo, colgado del hombro: gira en `x` hacia delante —la figura mira hacia −Z— y en `z` hacia el lado. */
function brazo(lado: 1 | -1, materiales: Material[]): Group {
  const hombro = new Group();
  hombro.position.set(lado * 0.27, 1.42, 0);
  const ropa = new MeshLambertMaterial({ color: ROPA });
  materiales.push(ropa);
  const miembro = new Mesh(new CapsuleGeometry(0.07, 0.48, 4, 8), ropa);
  miembro.position.y = -0.32;
  hombro.add(miembro);
  return hombro;
}

/** Una pierna, colgada de la cadera. */
function pierna(lado: 1 | -1, materiales: Material[]): Group {
  const cadera = new Group();
  cadera.position.set(lado * 0.11, 0.86, 0);
  const ropa = new MeshLambertMaterial({ color: ROPA });
  materiales.push(ropa);
  const miembro = new Mesh(new CapsuleGeometry(0.08, 0.6, 4, 8), ropa);
  miembro.position.y = -0.42;
  cadera.add(miembro);
  return cadera;
}

/**
 * **El dibujo del remolque**: el tractor, la persona, el cable y el pasador. Se
 * pone con `poner` en cada fotograma, con el remolque y la cota del suelo.
 */
export class DibujoDelRemolque {
  readonly grupo = new Group();
  private readonly tractor = new Group();
  private readonly persona = new Group();
  private readonly izq: Group;
  private readonly der: Group;
  private readonly piernaIzq: Group;
  private readonly piernaDer: Group;
  /** El pasador con su cinta, en la mano derecha. */
  private readonly pasador = new Group();
  private readonly cable: Mesh;
  private readonly baliza: MeshBasicMaterial;
  private readonly materiales: Material[] = [];
  private readonly geometrias: { dispose(): void }[] = [];
  private reloj = 0;

  constructor(medidas: MedidasDelTractor) {
    this.grupo.name = "remolque";
    this.construirElTractor(medidas);
    const m = this.materiales;
    // ── La persona, mirando hacia −Z ──
    const p = this.persona;
    p.scale.setScalar(PERSONA_MAS_GRANDE);
    const chaleco = new MeshLambertMaterial({ color: CHALECO, emissive: BRILLO_DEL_CHALECO });
    const brilla = new MeshBasicMaterial({ color: REFLECTANTE });
    const piel = new MeshLambertMaterial({ color: 0xc89070 });
    const casco = new MeshLambertMaterial({ color: 0xf4f4f0, emissive: BRILLO_DEL_CASCO });
    const negro = new MeshLambertMaterial({ color: NEGRO });
    m.push(chaleco, brilla, piel, casco, negro);
    const cuerpo = new Mesh(new CapsuleGeometry(0.2, 0.42, 4, 10), chaleco);
    cuerpo.position.y = 1.18;
    // Las dos bandas reflectantes del chaleco, que de noche es lo que se ve de una persona.
    for (const y of [1.05, 1.28]) {
      const banda = new Mesh(new CylinderGeometry(0.215, 0.215, 0.06, 12), brilla);
      banda.position.y = y;
      p.add(banda);
    }
    const cabeza = new Mesh(new SphereGeometry(0.15, 10, 8), piel);
    cabeza.position.y = 1.66;
    const cascoDeObra = new Mesh(new SphereGeometry(0.18, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), casco);
    cascoDeObra.position.y = 1.7;
    const banda = new Mesh(new CylinderGeometry(0.182, 0.182, 0.04, 12), brilla);
    banda.position.y = 1.72;
    // Los cascos de oír, con los que habla con la cabina: dos copas a los lados.
    for (const lado of [-1, 1]) {
      const copa = new Mesh(new CylinderGeometry(0.07, 0.07, 0.06, 10), negro);
      copa.rotation.z = Math.PI / 2;
      copa.position.set(lado * 0.16, 1.65, 0);
      p.add(copa);
    }
    this.izq = brazo(1, m);
    this.der = brazo(-1, m);
    this.piernaIzq = pierna(1, m);
    this.piernaDer = pierna(-1, m);
    // El pasador: una varilla con su argolla y la cinta roja colgando, más larga que la de verdad.
    const rojo = new MeshBasicMaterial({ color: ROJO });
    m.push(rojo);
    const varilla = new Mesh(new CylinderGeometry(0.02, 0.02, 0.22, 6), negro);
    const cinta = new Mesh(new BoxGeometry(0.1, 0.75, 0.02), rojo);
    cinta.position.y = -0.48;
    this.pasador.add(varilla, cinta);
    this.pasador.position.set(0, -0.66, 0);
    this.der.add(this.pasador);
    p.add(cuerpo, cabeza, cascoDeObra, banda, this.izq, this.der, this.piernaIzq, this.piernaDer);

    // ── El cable, de los cascos a la toma de al lado de la rueda de morro ──
    const cable = new MeshLambertMaterial({ color: NEGRO });
    m.push(cable);
    this.cable = new Mesh(new CylinderGeometry(0.025, 0.025, 1, 5), cable);
    this.cable.geometry.translate(0, 0.5, 0);
    this.cable.geometry.rotateX(Math.PI / 2);

    this.baliza = new MeshBasicMaterial({ color: AMBAR });
    m.push(this.baliza);
    this.grupo.add(this.tractor, this.persona, this.cable);
    this.grupo.traverse((o) => {
      if (o instanceof Mesh) this.geometrias.push(o.geometry);
    });
    // Y la baliza del techo, que se apaga y se enciende: ver `poner`.
    this.tractor.getObjectByName("baliza")?.traverse((o) => {
      if (o instanceof Mesh) o.material = this.baliza;
    });
  }

  /**
   * **El tractor**, mirando hacia −Z: un chasis bajo, la cuna detrás —dos brazos
   * a los lados de la rueda y la pala que la levanta—, la cabina en la esquina
   * delantera izquierda y las ruedas. La cuna es la parte de atrás, la que da
   * al avión.
   */
  private construirElTractor(t: MedidasDelTractor): void {
    const m = this.materiales;
    const pintura = new MeshLambertMaterial({ color: AMARILLO, emissive: BRILLO_DEL_TRACTOR });
    const negro = new MeshLambertMaterial({ color: NEGRO });
    const cristal = new MeshLambertMaterial({ color: 0x24303a });
    const faro = new MeshBasicMaterial({ color: 0xfff6dc });
    const piloto = new MeshBasicMaterial({ color: 0xc81e1e });
    m.push(pintura, negro, cristal, faro, piloto);
    const alto = t.alto * 0.55;
    const cuna = t.largo * 0.32;
    // El chasis, de la cuna para delante.
    const chasis = new Mesh(new BoxGeometry(t.ancho, alto, t.largo - cuna), pintura);
    chasis.position.set(0, 0.25 + alto / 2, -cuna / 2);
    // Los dos brazos de la cuna, a los lados de la rueda de morro.
    for (const lado of [-1, 1]) {
      const brazoDeCuna = new Mesh(new BoxGeometry(t.ancho * 0.28, alto * 0.9, cuna), pintura);
      brazoDeCuna.position.set(lado * t.ancho * 0.36, 0.25 + alto * 0.45, t.largo / 2 - cuna / 2);
      this.tractor.add(brazoDeCuna);
    }
    const pala = new Mesh(new BoxGeometry(t.ancho * 0.44, 0.12, cuna * 0.8), negro);
    pala.position.set(0, 0.18, t.largo / 2 - cuna / 2);
    // La cabina, en la esquina delantera izquierda, con su cristal.
    const cabina = new Mesh(new BoxGeometry(t.ancho * 0.32, t.alto - alto, t.largo * 0.2), pintura);
    const yCabina = 0.25 + alto + (t.alto - alto) / 2;
    cabina.position.set(-t.ancho * 0.32, yCabina, -t.largo * 0.36);
    const vidrio = new Mesh(new BoxGeometry(t.ancho * 0.3, (t.alto - alto) * 0.55, 0.04), cristal);
    vidrio.position.set(-t.ancho * 0.32, yCabina + 0.08, -t.largo * 0.46 - 0.01);
    // La baliza ámbar en el techo de la cabina, y otra en la esquina de la cuna: se ve desde cualquier lado.
    const balizas = new Group();
    balizas.name = "baliza";
    for (const [x, y, z] of [
      [-t.ancho * 0.32, 0.25 + t.alto + 0.12, -t.largo * 0.36],
      [t.ancho * 0.4, 0.25 + alto + 0.12, -t.largo * 0.4],
    ] as const) {
      const b = new Mesh(new CylinderGeometry(0.14, 0.14, 0.24, 10), pintura);
      b.position.set(x, y, z);
      balizas.add(b);
    }
    // Los faros delante, los pilotos rojos detrás.
    for (const lado of [-1, 1]) {
      const f = new Mesh(new BoxGeometry(0.34, 0.16, 0.04), faro);
      f.position.set(lado * t.ancho * 0.36, 0.25 + alto * 0.6, -t.largo / 2 - 0.02);
      const r = new Mesh(new BoxGeometry(0.22, 0.12, 0.04), piloto);
      r.position.set(lado * t.ancho * 0.45, 0.25 + alto * 0.6, t.largo / 2 + 0.02);
      this.tractor.add(f, r);
    }
    // Las ruedas, cuatro, bajas y gordas.
    for (const lado of [-1, 1])
      for (const z of [-t.largo * 0.32, t.largo * 0.18]) {
        const rueda = new Mesh(new CylinderGeometry(0.42, 0.42, 0.42, 12), negro);
        rueda.rotation.z = Math.PI / 2;
        rueda.position.set(lado * (t.ancho / 2 - 0.15), 0.42, z);
        this.tractor.add(rueda);
      }
    this.tractor.add(chasis, pala, cabina, vidrio, balizas);
  }

  /**
   * **Lo pone donde dice el remolque**: el tractor, la persona con su gesto, el
   * cable mientras va enchufado y el pasador en la mano desde que lo quita.
   * `cota` es la del asfalto, y `dt` lo que ha pasado, para los vaivenes.
   */
  poner(r: Remolque, cota: (x: number, z: number) => number, dt: number): void {
    this.reloj += dt;
    const t = r.tractor;
    this.tractor.position.set(t.x, cota(t.x, t.z), t.z);
    this.tractor.rotation.y = -t.rumbo;
    // La baliza destella una vez por segundo: encendida algo más de la mitad.
    this.baliza.color.setHex(this.reloj % 1 < 0.55 ? AMBAR : 0x3a2a14);
    const p = r.persona;
    this.persona.position.set(p.x, cota(p.x, p.z), p.z);
    this.persona.rotation.y = -p.rumbo;
    this.ponerElGesto(r.gesto);
    // El pasador se ve desde que lo ha quitado.
    this.pasador.visible = !r.conCable && r.fase !== "soltando";
    // El cable, de los cascos a la toma de al lado de la rueda de morro, mientras va enchufado.
    this.cable.visible = r.conCable;
    if (r.conCable) {
      const rueda = r.ruedaDeMorro;
      const yRueda = cota(rueda.x, rueda.z) + 1.1;
      const yCabeza = this.persona.position.y + 1.62 * PERSONA_MAS_GRANDE;
      this.cable.position.set(p.x, yCabeza, p.z);
      this.cable.lookAt(rueda.x, yRueda, rueda.z);
      this.cable.scale.set(1, 1, Math.hypot(rueda.x - p.x, yRueda - yCabeza, rueda.z - p.z));
    }
  }

  /** Los brazos y las piernas, según lo que hace. Rad: `x` positivo levanta el brazo hacia delante. */
  private ponerElGesto(g: GestoDeTierra): void {
    const r = this.reloj;
    let izq = { x: 0, z: 0.08 };
    let der = { x: 0, z: -0.08 };
    let piernas = 0;
    if (g === "anda") {
      const v = Math.sin(r * PASO * Math.PI * 2) * 0.45;
      izq = { x: v, z: 0.08 };
      der = { x: -v, z: -0.08 };
      piernas = v;
    } else if (g === "pasador") {
      // El pasador en alto, bien a la vista de la cabina: el brazo derecho estirado hacia arriba.
      der = { x: 2.9, z: -0.25 };
    } else if (g === "saludo") {
      // Y saluda con la mano, de lado a lado, con el pasador todavía en ella.
      der = { x: 2.7, z: -0.35 + Math.sin(r * SALUDO * Math.PI * 2) * 0.35 };
    }
    this.izq.rotation.set(izq.x, 0, izq.z);
    this.der.rotation.set(der.x, 0, der.z);
    // La cinta cuelga hacia abajo, levante lo que levante el brazo.
    this.pasador.rotation.set(-der.x, 0, -der.z);
    this.piernaIzq.rotation.x = piernas;
    this.piernaDer.rotation.x = -piernas;
  }

  /** Se suelta todo lo que ocupa en la tarjeta. */
  quitar(): void {
    this.grupo.removeFromParent();
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
  }
}
