/**
 * **La cámara de la vuelta al avión**: a pie, alrededor del avión aparcado.
 *
 * La vuelta se hace andando, y la cámara anda: se pone delante de lo que toca
 * mirar, a la altura de quien está de pie —o subida al escalón, para ver la
 * boca del combustible encima del ala—, y al pasar a lo siguiente rodea el
 * avión hasta allí, despacio, como se rodea de verdad. Con el dedo se puede
 * mirar alrededor de lo que se tiene delante.
 *
 * No es una de las vistas del ciclo de la tecla C: solo existe mientras dura
 * la vuelta, y la pide el juego. Ver `ui/vuelta-al-avion.ts`.
 */

import { MathUtils, Vector3, type Object3D, type PerspectiveCamera } from "three";
import type { CosaDeLaVuelta } from "../flight/vuelta-al-avion";

/** Desde dónde se mira cada cosa, en los ejes del avión y del lado izquierdo. */
interface Mirada {
  /** Hacia dónde se aparta la cámara de la cosa: −X izquierda, −Z delante. */
  readonly x: number;
  readonly z: number;
  /** Si se mira desde arriba de la cosa: la boca del ala, la tapa del capó. */
  readonly arriba?: boolean;
  /** Cuánto más lejos que lo normal. */
  readonly lejos?: number;
}

const MIRADAS: Readonly<Record<CosaDeLaVuelta, Mirada>> = {
  pitot: { x: -0.6, z: -1 },
  sondas: { x: -1, z: -0.5 },
  superficies: { x: -0.8, z: 1, lejos: 1.3 },
  calzos: { x: -1, z: -0.35 },
  frenos: { x: -1, z: -0.35 },
  combustible: { x: -0.6, z: -1, arriba: true },
  aceite: { x: -0.5, z: -1, arriba: true },
  helice: { x: -0.3, z: -1 },
  motores: { x: -0.35, z: -1 },
  luces: { x: -0.6, z: -1 },
  puertas: { x: -1, z: 0.2 },
};

/** La altura de los ojos de quien está de pie, m. */
const DE_PIE = 1.65;

export class CamaraDeLaVuelta {
  /** Lo que se mira ahora, en los ejes del avión, ya en su lado. */
  private cosa: CosaDeLaVuelta | null = null;
  private punto = new Vector3();
  private lado = -1;
  /** Lo que se ha girado con el dedo, rad, y lo que se ha subido, m. */
  private giro = 0;
  private alzado = 0;
  private readonly posicion = new Vector3();
  private readonly mirando = new Vector3();
  private readonly deseada = new Vector3();
  private readonly objetivo = new Vector3();
  private readonly aux = new Vector3();
  private puesta = false;

  /** Empieza desde donde está la cámara ahora: así no salta. */
  empezar(camara: PerspectiveCamera, centro: Vector3): void {
    this.posicion.copy(camara.position);
    this.mirando.copy(centro);
    this.puesta = true;
    this.giro = 0;
    this.alzado = 0;
  }

  /**
   * Va a mirar esta cosa, que está en `punto` (ejes del avión) del lado
   * `lado` (−1 izquierda, +1 derecha).
   */
  ir(cosa: CosaDeLaVuelta, punto: Vector3, lado: number): void {
    this.cosa = cosa;
    this.punto.copy(punto);
    this.lado = lado;
    this.giro = 0;
    this.alzado = 0;
  }

  /** Mirar alrededor con el dedo: tantos radianes de vuelta y metros de alto. */
  mirarAlrededor(dGiro: number, dAlto: number): void {
    this.giro = MathUtils.clamp(this.giro + dGiro, -1.4, 1.4);
    this.alzado = MathUtils.clamp(this.alzado + dAlto, -1, 4);
  }

  /** De qué lado del avión está la cámara ahora: −1 izquierda, +1 derecha. */
  ladoDeLaCamara(grupo: Object3D): number {
    this.aux.copy(this.posicion);
    grupo.worldToLocal(this.aux);
    return this.aux.x >= 0 ? 1 : -1;
  }

  /**
   * Coloca la cámara este fotograma. `tamano` es lo que mide el avión;
   * `suelo`, la cota del terreno en un punto.
   */
  colocar(
    camara: PerspectiveCamera,
    grupo: Object3D,
    tamano: number,
    suelo: (x: number, z: number) => number,
    dt: number,
  ): void {
    if (!this.cosa) return;
    const m = MIRADAS[this.cosa];
    // Lo que se mira, en el mundo.
    this.objetivo.copy(this.punto);
    grupo.localToWorld(this.objetivo);
    // Hacia dónde se aparta, en los ejes del avión, con su lado y el giro del dedo.
    const lejos = MathUtils.clamp(tamano * 0.3, 3.2, 26) * (m.lejos ?? 1);
    // Las miradas van escritas del lado izquierdo; del derecho, en espejo.
    const ang = Math.atan2(-m.x * this.lado, m.z) + this.giro;
    const dx = Math.sin(ang) * lejos;
    const dz = Math.cos(ang) * lejos;
    this.aux.set(this.punto.x + dx, this.punto.y, this.punto.z + dz);
    grupo.localToWorld(this.aux);
    const cota = suelo(this.aux.x, this.aux.z);
    const alto = m.arriba
      ? Math.max(this.objetivo.y + 1.1, cota + DE_PIE)
      : Math.max(cota + DE_PIE, this.objetivo.y - lejos * 0.15);
    this.deseada.set(this.aux.x, alto + this.alzado, this.aux.z);
    if (!this.puesta) {
      this.posicion.copy(this.deseada);
      this.mirando.copy(this.objetivo);
      this.puesta = true;
    }
    // Andando: ni de golpe ni a cámara lenta.
    const k = 1 - Math.exp(-dt * 2.6);
    this.posicion.lerp(this.deseada, k);
    this.mirando.lerp(this.objetivo, k);
    const minimo = suelo(this.posicion.x, this.posicion.z) + 0.6;
    if (this.posicion.y < minimo) this.posicion.y = minimo;
    camara.position.copy(this.posicion);
    camara.lookAt(this.mirando);
  }
}
