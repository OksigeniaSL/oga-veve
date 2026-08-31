/**
 * El plan de vuelo: por dónde toca ir ahora y cómo se ve.
 *
 * Junta tres cosas que por separado no sirven de nada: el grafo del aeropuerto
 * —que sabe por dónde se va—, la máquina de fases —que sabe qué toca ahora— y
 * la pintura de la ruta —que es lo único de todo esto que ve quien juega.
 *
 * **La ruta se pinta en el suelo, no se cuenta.** Una flecha en el HUD o una
 * frase con la letra de la calle no le sirven a alguien de cuatro años. Una
 * raya de color en el asfalto que va desde las ruedas hasta donde hay que
 * llegar, sí: es la misma idea que el «follow me» de los aeropuertos de verdad,
 * el coche que sale delante del avión con un cartel.
 *
 * La existencia de este fichero es a propósito: `game.ts` ya tiene ochocientas
 * líneas y todo esto es una cosa sola con vida propia. Lo que `game.ts` ve son
 * cinco métodos.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  RingGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Aerodrome, Punto } from './aerodrome';
import { aLaPolilinea } from './aerodrome';
import { construirGrafo, rodajeEntre, type Grafo, type Ruta } from './rodaje';
import { delante, enEjesDePista } from './rumbo';
import { GUION, Vuelo, type Fase, type Paso, type Situacion } from '../flight/vuelo';
import type { FlightState } from '../flight/model';

/**
 * Ancho de la raya que marca la ruta, m.
 *
 * Dos metros. Con cuatro no parecía una línea a seguir, parecía un río verde
 * de orilla a orilla de la calle: se veía perfectamente y no se entendía que
 * había que ir **encima**.
 */
const ANCHO = 2;

/**
 * Cuánto se levanta la raya sobre el **terreno**, m.
 *
 * Setenta centímetros, que parecen muchos y no lo son: el pavimento del
 * aeródromo ya sobresale treinta y cinco del terreno aplanado —ver `RESALTE`—
 * y su pintura otros veinte encima. Con los veinticuatro que tenía al
 * principio, la raya quedaba **enterrada bajo el asfalto** y no se veía
 * ninguna. Es el mismo error que enterró el pavimento entero la primera vez.
 */
const ALTURA = 0.7;

/** Verde de «por aquí». No es el amarillo de rodadura: aquello es el aeropuerto,
 *  esto es tu ruta de hoy. Confundirlos sería enseñar mal. */
const VERDE = 0x53c66b;

export interface Vista {
  readonly fase: Fase;
  readonly clave: string;
  readonly icono: string;
  readonly luzVerde: boolean;
  /** La letra de la calle por la que toca ir, si la hay. */
  readonly letra: string | null;
  /** Metros que faltan para el final del tramo actual. */
  readonly restante: number;
  /**
   * Metros del avión a la raya verde.
   *
   * Se saca aquí porque **salirse de la ruta no cambia de fase pero sí cambia
   * lo que hay que decirte**: la máquina de estados no retrocede —eso hacía que
   * el tutor se contradijera cada dos segundos— y en cambio esto sí sirve para
   * avisar de que hay que volver a la línea.
   */
  readonly fuera: boolean;
  readonly cambio: boolean;
}

/** A cuántos metros de la raya verde se considera que uno se ha salido. */
const FUERA_DE_RUTA = 30;

export class PlanDeVuelo {
  readonly grupo = new Group();
  private readonly grafo: Grafo;
  private readonly vuelo = new Vuelo();
  private ruta: Ruta | null = null;
  /** La ruta en coordenadas de mundo, que es donde vive el avión. */
  private rutaMundo: Punto[] = [];

  constructor(
    private readonly aero: Aerodrome,
    private readonly pista: { x: number; z: number; heading: number; width: number },
    private readonly cota: (x: number, z: number) => number,
  ) {
    this.grupo.name = 'plan-de-vuelo';
    this.grafo = construirGrafo(aero);
  }

  /** Dónde empieza el vuelo: el puesto de estacionamiento, si lo hay. */
  arranque(): readonly [number, number] | null {
    const puesto = this.puestoDeSalida();
    return puesto ? [puesto.xy[0], -puesto.xy[1]] : null;
  }

  /**
   * El puesto del que se sale.
   *
   * El más cercano a la terminal si la hay, y si no el primero. No se elige al
   * azar: **el sitio del que se sale tiene que ser el mismo siempre**, porque
   * quien juega se lo aprende, y un aeropuerto que te cambia el puesto cada
   * partida no se aprende nunca.
   */
  private puestoDeSalida(): { ref: string | null; xy: Punto } | null {
    const puestos = this.aero.parkingPositions;
    if (!puestos?.length) return null;
    const terminal = this.aero.buildings[0]?.polygon;
    if (!terminal?.length) return puestos[0]!;
    const centro: Punto = [
      terminal.reduce((a, p) => a + p[0], 0) / terminal.length,
      terminal.reduce((a, p) => a + p[1], 0) / terminal.length,
    ];
    return [...puestos].sort(
      (a, b) =>
        Math.hypot(a.xy[0] - centro[0], a.xy[1] - centro[1]) -
        Math.hypot(b.xy[0] - centro[0], b.xy[1] - centro[1]),
    )[0]!;
  }

  /**
   * El punto de espera por el que se sale a la pista.
   *
   * El más cercano a la cabecera de salida, que es a donde hay que ir: entrar
   * por el punto de espera del otro extremo significaría recorrer la pista
   * entera en sentido contrario, que es de las cosas que más asustan a una
   * torre.
   */
  private esperaDeSalida(): Punto | null {
    if (!this.aero.holdingPositions.length) return null;
    const [fx, fz] = delante(this.pista.heading);
    const cabecera: Punto = [
      this.pista.x - fx * 1600,
      -(this.pista.z - fz * 1600),
    ];
    return [...this.aero.holdingPositions].sort(
      (a, b) =>
        Math.hypot(a.xy[0] - cabecera[0], a.xy[1] - cabecera[1]) -
        Math.hypot(b.xy[0] - cabecera[0], b.xy[1] - cabecera[1]),
    )[0]!.xy;
  }

  /** Empieza un vuelo. Devuelve `false` si este aeródromo no da para rodar. */
  reiniciar(): boolean {
    const puesto = this.puestoDeSalida();
    const espera = this.esperaDeSalida();
    if (!puesto || !espera) {
      this.vuelo.reiniciar(true);
      this.ponerRuta(null);
      return false;
    }
    this.vuelo.reiniciar(false);
    this.ponerRuta(rodajeEntre(this.grafo, puesto.xy, espera));
    return this.ruta !== null;
  }

  /**
   * El primer punto de la ruta que no es el propio puesto.
   *
   * Sirve para orientar el avión al aparecer: mirando a por donde tiene que
   * irse. Se salta los puntos pegados al morro porque el primero de la ruta
   * suele ser el nudo de al lado del puesto, y apuntar a un metro de distancia
   * da un rumbo cualquiera.
   */
  primerPaso(): readonly [number, number] | null {
    const inicio = this.rutaMundo[0];
    if (!inicio) return null;
    for (const p of this.rutaMundo) {
      if (Math.hypot(p[0] - inicio[0], p[1] - inicio[1]) > 25) return p;
    }
    return this.rutaMundo[this.rutaMundo.length - 1] ?? null;
  }

  /**
   * ¿Toca repetir el aviso de que se ha salido de la raya?
   *
   * Con cuentagotas: cada seis segundos. Un aviso que se repite sin parar deja
   * de leerse y encima tapa los demás, que fue exactamente lo que pasó con la
   * alarma de pérdida.
   */
  private desdeElAviso = 99;

  avisarDeSalida(dt: number): boolean {
    this.desdeElAviso += dt;
    if (this.desdeElAviso < 6) return false;
    this.desdeElAviso = 0;
    return true;
  }

  /** Avanza un fotograma y dice qué hay que enseñar. */
  paso(estado: FlightState, sobreElSuelo: number, motor: boolean, dt: number): Vista {
    const s = this.situacion(estado, sobreElSuelo, motor);
    const p: Paso = this.vuelo.paso(s, dt);

    if (p.cambio) this.alCambiarDeFase(p.fase);

    return {
      fase: p.fase,
      clave: GUION[p.fase].clave,
      icono: GUION[p.fase].icono,
      luzVerde: p.luzVerde,
      letra: this.letraActual(estado),
      restante: s.restante,
      // Solo se avisa **mientras se rueda**. Antes de arrancar nadie se ha
      // salido de nada, y decírselo a quien todavía no se ha movido es ruido.
      fuera:
        (p.fase === 'rodando' || p.fase === 'a-plataforma') &&
        this.rutaMundo.length > 1 &&
        s.alaRuta > FUERA_DE_RUTA &&
        sobreElSuelo < 3,
      cambio: p.cambio,
    };
  }

  /**
   * Al pasar de fase, a veces cambia a dónde hay que ir.
   *
   * Es lo único que hace que esto sea un vuelo y no una lista de comprobación:
   * la ruta de vuelta a la plataforma no existe hasta que el avión ha
   * abandonado la pista, porque hasta entonces no se sabe por dónde va a salir.
   */
  private alCambiarDeFase(fase: Fase): void {
    if (fase === 'alineando' || fase === 'despegando') this.ponerRuta(null);
    if (fase === 'a-plataforma') {
      const puesto = this.puestoDeSalida();
      if (puesto) {
        const [x, z] = [this.ultimaPos[0], -this.ultimaPos[1]] as const;
        this.ponerRuta(rodajeEntre(this.grafo, [x, z], puesto.xy, 400));
      }
    }
  }

  private ultimaPos: Punto = [0, 0];

  private situacion(estado: FlightState, sobreElSuelo: number, motor: boolean): Situacion {
    const x = estado.position.x;
    const z = estado.position.z;
    this.ultimaPos = [x, -z];

    const { across } = enEjesDePista(x, z, this.pista.x, this.pista.z, this.pista.heading);
    const alEjeDePista = Math.abs(across);

    let alaRuta = 0;
    let restante = 0;
    if (this.rutaMundo.length > 1) {
      alaRuta = aLaPolilinea([x, z], this.rutaMundo);
      restante = this.restanteHasta([x, z]);
    }

    const rumbo = ((estado.heading * 180) / Math.PI + 360) % 360;
    let desalineado = rumbo - this.pista.heading;
    while (desalineado > 180) desalineado -= 360;
    while (desalineado < -180) desalineado += 360;

    return {
      estado,
      alaRuta,
      restante,
      alEjeDePista,
      enPista: alEjeDePista < this.pista.width / 2 + 3,
      sobreElSuelo,
      motor,
      desalineado,
    };
  }

  /** Metros de ruta que quedan desde el punto más cercano al avión. */
  private restanteHasta(p: Punto): number {
    // Primero el total, y luego cuánto se lleva recorrido hasta el punto de la
    // ruta más cercano al avión. Restar. El primer intento hizo las dos cosas
    // en la misma pasada y salió una expresión que se cancelaba sola.
    let total = 0;
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      total += Math.hypot(
        this.rutaMundo[i + 1]![0] - this.rutaMundo[i]![0],
        this.rutaMundo[i + 1]![1] - this.rutaMundo[i]![1],
      );
    }

    let mejor = Infinity;
    let recorrido = 0;
    let acumulado = 0;
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      const a = this.rutaMundo[i]!;
      const b = this.rutaMundo[i + 1]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy || 1;
      const largo = Math.sqrt(l2);
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
      const d = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
      if (d < mejor) {
        mejor = d;
        recorrido = acumulado + t * largo;
      }
      acumulado += largo;
    }
    return Math.max(0, total - recorrido);
  }

  /** La letra de la calle por la que toca ir ahora mismo. */
  private letraActual(estado: FlightState): string | null {
    if (!this.ruta || !this.ruta.tramos.length) return null;
    const p: Punto = [estado.position.x, estado.position.z];
    let mejor = Infinity;
    let letra: string | null = null;
    for (const tramo of this.ruta.tramos) {
      const mundo = tramo.puntos.map((q) => [q[0], -q[1]] as Punto);
      const d = aLaPolilinea(p, mundo);
      if (d < mejor) {
        mejor = d;
        letra = tramo.ref;
      }
    }
    return letra;
  }

  private ponerRuta(ruta: Ruta | null): void {
    this.ruta = ruta;
    this.rutaMundo = ruta ? ruta.puntos.map((p) => [p[0], -p[1]] as Punto) : [];
    this.pintar();
  }

  /** Dibuja la ruta en el suelo, y una diana donde termina. */
  private pintar(): void {
    for (const hijo of [...this.grupo.children]) {
      this.grupo.remove(hijo);
      const m = hijo as Mesh;
      m.geometry?.dispose();
      (m.material as { dispose?: () => void })?.dispose?.();
    }
    if (this.rutaMundo.length < 2) return;

    const piezas: BufferGeometry[] = [];
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      const [ax, az] = this.rutaMundo[i]!;
      const [bx, bz] = this.rutaMundo[i + 1]!;
      const largo = Math.hypot(bx - ax, bz - az);
      if (largo < 0.5) continue;
      const ux = (bx - ax) / largo;
      const uz = (bz - az) / largo;
      const px = (-uz * ANCHO) / 2;
      const pz = (ux * ANCHO) / 2;
      const esquinas: readonly [number, number][] = [
        [ax + px, az + pz],
        [bx + px, bz + pz],
        [bx - px, bz - pz],
        [ax - px, az - pz],
      ];
      const pos = new Float32Array(12);
      esquinas.forEach(([qx, qz], k) => {
        pos[k * 3] = qx;
        // La cota se muestrea en cada esquina y no una vez por tramo: sobre una
        // pista con pendiente, una raya plana se entierra por un extremo.
        pos[k * 3 + 1] = this.cota(qx, qz) + ALTURA;
        pos[k * 3 + 2] = qz;
      });
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      piezas.push(geo);
    }

    const fusionada = piezas.length ? mergeGeometries(piezas, false) : null;
    if (fusionada) {
      const malla = new Mesh(fusionada, new MeshLambertMaterial({ color: VERDE }));
      malla.name = 'ruta';
      this.grupo.add(malla);
    }

    // La diana del final: un aro, que se ve de lejos y no tapa nada.
    const fin = this.rutaMundo[this.rutaMundo.length - 1]!;
    const aro = new Mesh(
      new RingGeometry(9, 12, 32),
      new MeshBasicMaterial({ color: VERDE, transparent: true, opacity: 0.85 }),
    );
    aro.rotation.x = -Math.PI / 2;
    aro.position.set(fin[0], this.cota(fin[0], fin[1]) + ALTURA + 0.02, fin[1]);
    aro.name = 'diana';
    this.grupo.add(aro);
  }
}
