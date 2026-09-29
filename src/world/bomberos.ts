/**
 * **Los bomberos del aeropuerto**, esperando junto a la pista.
 *
 * Es lo que cambia en tierra cuando se declara una emergencia, y lo que se
 * tiene que ver: la torre avisa al servicio de salvamento y extinción de
 * incendios —el SEI, el que está en todo aeródromo con tráfico de pasaje— y
 * sus camiones salen a esperar junto a la pista, a la altura de donde se va a
 * tocar. Y después de un despegue abortado a mucha velocidad vienen a mirar
 * los frenos, que han quedado muy calientes.
 *
 * **Esperando, sin drama.** Parados, apartados de la pista, con la luz del
 * techo girando despacio: ni sirenas, ni carreras, ni humo. Un camión de
 * bomberos quieto al lado de la pista no es un accidente: es un aeropuerto
 * haciendo su trabajo, y así se tiene que ver.
 *
 * El dibujo es el de un camión de pista de seis ruedas —los de verdad miden
 * unos doce metros y van pintados de rojo o de amarillo verdoso—, hecho con
 * cajas: dos camiones son nueve llamadas de dibujo, compartiendo materiales,
 * y solo cuando están puestos.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from "three";
import { giroDelModelo } from "./rumbo";

/** El rojo de los camiones de pista. */
const ROJO = 0xc3272b;
/** Y la franja blanca del costado, que es lo que se ve de lejos. */
const BLANCO = 0xeeeeea;
const OSCURO = 0x23262c;
/**
 * La luz del techo: azul, que es la de los vehículos de emergencia en España
 * y la que llevan también los de Paraguay.
 */
const AZUL = 0x2f7bff;

/** Cuánto mide un camión, m: largo, ancho y alto de la caja. */
const LARGO = 11;
const ANCHO = 2.9;
const ALTO = 3.1;

/** Cuántos camiones salen. Dos: los que se ven esperando en cualquier aeropuerto. */
export const CUANTOS = 2;

/** Dónde poner un camión: el suelo que pisa y hacia dónde mira. */
export interface Puesto {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Rumbo al que mira el morro, radianes. */
  readonly rumbo: number;
}

/**
 * **Dónde esperan**, junto a una pista: a un lado, fuera del asfalto y mirando
 * hacia ella, a la altura de donde se va a tocar. `umbral` es el punto donde
 * empieza la pista por la que se viene, `rumbo` el de aterrizar, en grados,
 * y `ancho` el de la pista.
 *
 * Setecientos metros pista adentro —o un tercio de la pista, si es corta—,
 * que es la zona donde un avión se para, y sesenta metros más allá del borde:
 * lejos de las alas y a mano. Entre ellos, cuarenta.
 */
export function juntoALaPista(
  umbral: { readonly x: number; readonly z: number },
  rumboGrados: number,
  largo: number,
  ancho: number,
  suelo: (x: number, z: number) => number,
): readonly Puesto[] {
  const h = (rumboGrados * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  // A la derecha de quien aterriza.
  const tx = Math.cos(h);
  const tz = Math.sin(h);
  const dentro = Math.min(700, largo * 0.35);
  const lado = ancho / 2 + 60;
  return Array.from({ length: CUANTOS }, (_, i) => {
    const x = umbral.x + fx * (dentro + i * 40) + tx * lado;
    const z = umbral.z + fz * (dentro + i * 40) + tz * lado;
    // Mirando hacia la pista: el rumbo de aterrizar menos noventa grados.
    return { x, y: suelo(x, z), z, rumbo: h - Math.PI / 2 };
  });
}

/**
 * Y **junto a un avión parado** en la pista, tras un despegue abortado: por
 * delante y a un lado, mirándolo. Van a mirar los frenos.
 */
export function juntoAlAvion(
  avion: { readonly x: number; readonly z: number; readonly rumbo: number },
  suelo: (x: number, z: number) => number,
): readonly Puesto[] {
  const h = avion.rumbo;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const tx = Math.cos(h);
  const tz = Math.sin(h);
  return Array.from({ length: CUANTOS }, (_, i) => {
    const x = avion.x + fx * (70 + i * 30) + tx * (45 + i * 8);
    const z = avion.z + fz * (70 + i * 30) + tz * (45 + i * 8);
    return {
      x,
      y: suelo(x, z),
      z,
      rumbo: Math.atan2(avion.x - x, -(avion.z - z)),
    };
  });
}

/** Los camiones, con su luz: se ponen, se quitan y la luz gira. */
export class Bomberos {
  readonly grupo = new Group();
  private readonly camiones: Group[] = [];
  private readonly luz = new MeshBasicMaterial({ color: AZUL });
  private readonly ruedas: InstancedMesh;
  private reloj = 0;

  constructor() {
    this.grupo.name = "bomberos";
    this.grupo.visible = false;
    const rojo = new MeshLambertMaterial({ color: ROJO });
    const blanco = new MeshLambertMaterial({ color: BLANCO });
    const oscuro = new MeshLambertMaterial({ color: OSCURO });
    const caja = new BoxGeometry(ANCHO, ALTO, LARGO * 0.72);
    const cabina = new BoxGeometry(ANCHO, ALTO * 0.82, LARGO * 0.26);
    const cristal = new BoxGeometry(ANCHO * 1.01, ALTO * 0.3, LARGO * 0.05);
    const franja = new BoxGeometry(ANCHO * 1.02, ALTO * 0.16, LARGO * 0.7);
    const barra = new BoxGeometry(ANCHO * 0.7, 0.28, 0.6);
    for (let i = 0; i < CUANTOS; i++) {
      const camion = new Group();
      const cuerpo = new Mesh(caja, rojo);
      // El morro mira a −Z, como todos los modelos del juego.
      cuerpo.position.set(0, 0.9 + ALTO / 2, LARGO * 0.14);
      const cab = new Mesh(cabina, rojo);
      cab.position.set(0, 0.9 + (ALTO * 0.82) / 2, -LARGO * 0.36);
      const parabrisas = new Mesh(cristal, oscuro);
      parabrisas.position.set(0, 0.9 + ALTO * 0.62, -LARGO * 0.49);
      const raya = new Mesh(franja, blanco);
      raya.position.set(0, 0.9 + ALTO * 0.45, LARGO * 0.14);
      const faro = new Mesh(barra, this.luz);
      faro.position.set(0, 0.9 + ALTO * 0.82 + 0.14, -LARGO * 0.36);
      camion.add(cuerpo, cab, parabrisas, raya, faro);
      this.camiones.push(camion);
      this.grupo.add(camion);
    }
    // Seis ruedas por camión, todas en un solo dibujo.
    const rueda = new CylinderGeometry(0.62, 0.62, 0.5, 14);
    rueda.rotateZ(Math.PI / 2);
    this.ruedas = new InstancedMesh(rueda, oscuro, CUANTOS * 6);
    this.ruedas.frustumCulled = false;
    this.grupo.add(this.ruedas);
  }

  /** Si están puestos. */
  get puestos(): boolean {
    return this.grupo.visible;
  }

  /** Los camiones, en estos sitios. */
  poner(puestos: readonly Puesto[]): void {
    const m = new Matrix4();
    const q = new Quaternion();
    const eje = new Vector3(0, 1, 0);
    const uno = new Vector3(1, 1, 1);
    const donde = new Vector3();
    puestos.slice(0, CUANTOS).forEach((p, i) => {
      const camion = this.camiones[i]!;
      camion.position.set(p.x, p.y, p.z);
      camion.rotation.set(0, giroDelModelo(p.rumbo), 0);
      camion.updateMatrixWorld(true);
      // Las ruedas de este camión, a los lados, en tres ejes.
      for (let k = 0; k < 6; k++) {
        const lado = k % 2 === 0 ? -1 : 1;
        const eje3 = [-LARGO * 0.36, LARGO * 0.08, LARGO * 0.34][Math.floor(k / 2)]!;
        donde.set(lado * (ANCHO / 2), 0.62, eje3).applyMatrix4(camion.matrixWorld);
        q.setFromAxisAngle(eje, giroDelModelo(p.rumbo));
        m.compose(donde, q, uno);
        this.ruedas.setMatrixAt(i * 6 + k, m);
      }
    });
    this.ruedas.instanceMatrix.needsUpdate = true;
    this.grupo.visible = true;
  }

  quitar(): void {
    this.grupo.visible = false;
  }

  /**
   * La luz del techo, **girando despacio**: una vuelta por segundo, que es la
   * de una baliza rotativa. Se enciende y se apaga en vez de destellar, que
   * un destello rápido es de alarma y esto es de espera.
   */
  paso(dt: number): void {
    if (!this.grupo.visible) return;
    this.reloj = (this.reloj + dt) % 1;
    this.luz.color.setHex(this.reloj < 0.5 ? AZUL : 0x10204a);
  }
}
