/**
 * **Las cámaras de la escena de pasaje**: el avión visto por fuera en los
 * momentos que se cuentan, y el fundido para ir y volver de la ventanilla.
 *
 * Enrique, al probar el primer vuelo de pasaje de Ara: «está todo el tiempo
 * la vista de ventanilla, eso lo hace aburrido; estaría bien que a veces se
 * muestren vistas externas: el avión cuando gira, en momentos de rodaje o en
 * algunos momentos cruciales, un giro alrededor, una vista del ala». Qué plano
 * toca y cuándo lo decide la escena —ver `Plano` en `flight/inicio-pasaje.ts`—;
 * esto pone la cámara.
 *
 * ## Sin marear
 *
 * - **Pocos y con sentido**: se ve por fuera lo que se está contando, y se
 *   vuelve a la ventanilla.
 * - **Sin cortes bruscos**: de dentro a fuera y de fuera a dentro, un fundido
 *   corto —medio segundo hasta tapar, medio para destapar—, y el cambio de
 *   cámara cae con el velo puesto. Ver `FundidoDePlano`.
 * - **Cámaras quietas o que se mueven despacio**: desde el borde de la pista,
 *   una cámara clavada en el suelo que sigue al avión con la mirada, como la
 *   de quien mira despegar aviones; rodando, una que va a su lado; en el
 *   giro, una detrás que no se inclina con el avión, para que se vea cuánto
 *   se inclina él; la vuelta alrededor, una vuelta entera en cuarenta y cinco
 *   segundos; y el ala, desde encima del fuselaje, quieta respecto al avión.
 * - **Con movimiento reducido**, la vuelta no da vueltas: se queda en su
 *   primer sitio.
 *
 * El avión se describe en los ejes del juego —ver `cameras/tipos.ts`—: `x` a
 * la derecha del avión, `y` arriba y `z` hacia la cola.
 */

import { MathUtils, Quaternion, Vector3, type PerspectiveCamera } from "three";
import type { FlightState } from "../flight/model";
import { esDeFuera, type Plano } from "../flight/inicio-pasaje";
import { FOV_DEL_PAISAJE, tomaDelPaisaje, type Punto } from "../world/se-ve-desde-el-pasaje";

/**
 * **El fundido de un corte**, s de pared: lo que tarda el velo en tapar y en
 * destapar. Cabe en el silencio que guarda la escena en cada corte —ver
 * `CORTE_DE_PLANO`—, así que el cambio de cámara cae sin nadie hablando.
 */
export const FUNDIDO_DE_PLANO = { tapa: 0.45, destapa: 0.55 } as const;

/** Lo que se ve en un paso: el plano que se pinta y cuánto tapa el velo, 0 a 1. */
export interface PasoDelFundido {
  readonly plano: Plano;
  readonly velo: number;
  /** Si en este paso se ha cambiado de cámara: la de fuera empieza su toma. */
  readonly cambio: boolean;
}

/** Suave al empezar y al acabar. */
const suave = (x: number): number => {
  const t = MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * **El fundido entre planos**, por el reloj de pared: lo que se ve sigue a lo
 * que pide la escena, y si el cambio es un corte —de dentro a fuera, de fuera
 * a dentro o de un sitio de fuera a otro—, con el velo: tapa, cambia y
 * destapa. Asomarse al cristal no es un corte: lo hace la cámara de pasaje,
 * moviendo la cabeza.
 */
export class FundidoDePlano {
  private visto: Plano = "ventanilla";
  private pedido: Plano = "ventanilla";
  /**
   * **Qué toma se pidió**, que no es solo el plano: la del paisaje con otro
   * sitio al fondo es otra toma, con su corte. Sin decir, el plano.
   */
  private toma = "ventanilla";
  /** Cuándo empezó a tapar el corte en curso, o `null` sin corte. */
  private desde: number | null = null;
  private cambiadoEn: number | null = null;

  /** El plano que se pinta ahora. */
  get plano(): Plano {
    return this.visto;
  }

  paso(pedido: Plano, ahora: number, toma: string = pedido): PasoDelFundido {
    if (toma !== this.toma) {
      this.toma = toma;
      this.pedido = pedido;
      if (!esDeFuera(pedido) && !esDeFuera(this.visto)) {
        // Asomarse o volver al asiento: sin velo.
        this.visto = pedido;
        this.desde = null;
        this.cambiadoEn = null;
        return { plano: this.visto, velo: 0, cambio: true };
      }
      // Un corte: si ya destapaba otro, se vuelve a tapar desde donde iba.
      const velo = this.velo(ahora);
      this.desde = ahora - velo * FUNDIDO_DE_PLANO.tapa;
      this.cambiadoEn = null;
    }
    let cambio = false;
    if (this.desde !== null && this.cambiadoEn === null && ahora - this.desde >= FUNDIDO_DE_PLANO.tapa) {
      cambio = true;
      this.visto = this.pedido;
      this.cambiadoEn = ahora;
    }
    const velo = this.velo(ahora);
    if (this.cambiadoEn !== null && ahora - this.cambiadoEn >= FUNDIDO_DE_PLANO.destapa) {
      this.desde = null;
      this.cambiadoEn = null;
    }
    return { plano: this.visto, velo, cambio };
  }

  private velo(ahora: number): number {
    if (this.desde === null) return 0;
    if (this.cambiadoEn === null) return suave((ahora - this.desde) / FUNDIDO_DE_PLANO.tapa);
    return 1 - suave((ahora - this.cambiadoEn) / FUNDIDO_DE_PLANO.destapa);
  }
}

/** Lo que la cámara de fuera necesita del mundo. */
export interface ContextoDeLaEscena {
  /** La cota del terreno, m. */
  readonly suelo: (x: number, z: number) => number;
  /** Lo que mide el avión de morro a cola, m: el encuadre. */
  readonly largo: number;
  readonly movimientoReducido: boolean;
  /** **El sitio que se enseña al fondo** en la toma del paisaje. Ver `tomaDelPaisaje`. */
  readonly paisaje?: Punto | null;
  /**
   * **El señalero**: dónde está y hacia dónde mira, que es por donde llega el
   * avión. Ver `world/senalero.ts`.
   */
  readonly senalero?: { readonly x: number; readonly y: number; readonly z: number; readonly mira: { readonly x: number; readonly z: number } } | null;
}

/**
 * **El tren desde abajo**, en los ejes del avión —`x` a la derecha, `y`
 * arriba, `z` hacia la cola—, en largos del avión: la cámara debajo y un poco
 * por delante del morro, del lado de Ara, mirando hacia arriba a la panza,
 * entre la pata de morro y las de debajo del ala. Se ven las tres bajar y
 * quedarse trabadas. Va con el avión, como la del ala: así se ve lo que hace
 * el tren y no cómo se mueve el avión.
 */
const DESDE_ABAJO = { camara: [-0.2, -0.24, -0.55], mira: [0, -0.05, 0.02] } as const;

/** El ángulo de las tomas que siguen al avión, grados: algo más cerrado que el de detrás. */
const FOV_DE_LA_TOMA = 50;

/**
 * **La vuelta alrededor**, s por vuelta: despacio, que es un paseo y no un
 * mareo; en la de crucero se ve casi entera.
 */
const UNA_VUELTA = 46;

const ARRIBA = new Vector3(0, 1, 0);

/**
 * **La cámara de fuera de la escena**. `empezar` se llama en el corte, con el
 * velo puesto: ahí se elige el sitio —el de la orilla de la pista se clava en
 * el suelo— y la cámara salta a él sin que se vea. Después, `update` en cada
 * fotograma.
 */
export class CamaraDeLaEscena {
  private toma: Plano = "fuera-rodando";
  private reloj = 0;
  private readonly fijo = new Vector3();
  /** Adonde mira una toma clavada que no sigue al avión: la del señalero. */
  private readonly miraFija = new Vector3();
  private conSenalero = false;
  private readonly posicion = new Vector3();
  private readonly mira = new Vector3();
  private readonly deseada = new Vector3();
  private readonly objetivo = new Vector3();
  private readonly delante = new Vector3();
  private readonly izquierda = new Vector3();
  private readonly aux = new Vector3();
  private readonly giro = new Quaternion();
  private recien = true;
  private angulo = FOV_DE_LA_TOMA;

  /** El ángulo de la vista que pide esta toma, grados. */
  get fov(): number {
    return this.angulo;
  }

  /** Lo que se está mirando: la toma de ahora. Para el banco. */
  get tomaDeAhora(): Plano {
    return this.toma;
  }

  /** Empieza una toma, con el velo puesto. */
  empezar(toma: Plano, state: FlightState, ctx: ContextoDeLaEscena): void {
    this.toma = toma;
    this.conSenalero = false;
    this.reloj = 0;
    this.recien = true;
    this.ejes(state);
    const p = state.position;
    if (toma === "fuera-despegue") {
      /*
       * **Desde la orilla de la pista**, un poco por delante de donde empieza
       * la carrera: el avión llega corriendo, pasa y se levanta. Setenta
       * metros al lado del eje, fuera del asfalto, y a la altura de los ojos
       * de quien está de pie en una loma.
       */
      this.fijo.copy(p).addScaledVector(this.delante, 720).addScaledVector(this.izquierda, 75);
      this.fijo.y = Math.max(ctx.suelo(this.fijo.x, this.fijo.z), p.y - 2) + 3;
    } else if (toma === "fuera-senalero" && ctx.senalero) {
      /*
       * **El señalero, desde el suelo**: detrás de él y a un lado, a la altura
       * de quien está de pie en la plataforma, mirando por encima de su hombro
       * hacia donde llega el avión. Se le ven los bastones y los brazos, y el
       * avión que viene hacia él y se para donde dice.
       */
      const s = ctx.senalero;
      const mx = s.mira.x;
      const mz = s.mira.z;
      // A su izquierda según mira: el avión llega por delante de él.
      const ix = mz;
      const iz = -mx;
      this.fijo.set(s.x - mx * 9 + ix * 6, 0, s.z - mz * 9 + iz * 6);
      this.fijo.y = ctx.suelo(this.fijo.x, this.fijo.z) + 2.6;
      this.miraFija.set(s.x + mx * 22, s.y + 2.2, s.z + mz * 22);
      this.conSenalero = true;
    } else if (toma === "fuera-raqueta") {
      /*
       * **La vuelta en la punta de la pista**, desde un lado y en alto: detrás
       * de donde empieza a girar y a su izquierda, a la altura de un tejado,
       * clavada. Se ve el giro entero en el ensanche del final, y el avión
       * que echa a andar de vuelta por la pista y pasa por delante.
       */
      this.fijo.copy(p).addScaledVector(this.delante, -95).addScaledVector(this.izquierda, 70);
      this.fijo.y = Math.max(ctx.suelo(this.fijo.x, this.fijo.z), p.y - 2) + 18;
    } else if (toma === "fuera-pista") {
      /*
       * **Y al aterrizar, desde la orilla de la pista**, pasada la zona de
       * toma: donde la senda de tres grados llega al suelo y seiscientos metros
       * más allá. El avión baja hacia la cámara, toca y pasa frenando. No al
       * lado de la zona de toma, que ahí están las luces del PAPI y la primera
       * captura salió con cuatro soles delante.
       */
      const altura = Math.max(0, state.heightAboveGround);
      const hastaTocar = altura / Math.tan(3 * MathUtils.DEG2RAD);
      this.fijo
        .copy(p)
        .addScaledVector(this.delante, hastaTocar + 650)
        .addScaledVector(this.izquierda, 95);
      this.fijo.y = ctx.suelo(this.fijo.x, this.fijo.z) + 3;
    }
  }

  /** Hacia dónde va el avión, sin cabeceo ni alabeo: delante y a su izquierda, en el suelo. */
  private ejes(state: FlightState): void {
    this.delante.set(0, 0, -1).applyQuaternion(state.orientation);
    this.delante.y = 0;
    if (this.delante.lengthSq() < 1e-6) this.delante.set(0, 0, -1);
    this.delante.normalize();
    this.izquierda.crossVectors(ARRIBA, this.delante).normalize();
  }

  update(camera: PerspectiveCamera, state: FlightState, dt: number, ctx: ContextoDeLaEscena): void {
    this.reloj += dt;
    this.ejes(state);
    const p = state.position;
    const largo = Math.max(10, ctx.largo);
    let suaviza = 2.2;
    this.objetivo.copy(p);
    switch (this.toma) {
      case "fuera-paisaje": {
        /*
         * **El paisaje que se nombra, con el avión delante**: detrás según se
         * mira hacia él, un poco a un lado y por encima. La misma cuenta dice
         * si se ve —ver `tomaDelPaisaje`—, así que lo que se comprueba es lo
         * que se pinta.
         */
        const sitio = ctx.paisaje;
        if (sitio) {
          const t = tomaDelPaisaje({ position: p, orientation: state.orientation, largo: ctx.largo }, sitio);
          this.deseada.copy(t.camara);
          this.objetivo.copy(t.mira);
        } else {
          this.deseada.copy(p).addScaledVector(this.delante, -largo * 2.5);
          this.deseada.y += largo * 0.5;
        }
        this.angulo = FOV_DEL_PAISAJE;
        suaviza = Infinity;
        break;
      }
      case "fuera-tren": {
        this.giro.copy(state.orientation);
        const [cx, cy, cz] = DESDE_ABAJO.camara;
        const [mx, my, mz] = DESDE_ABAJO.mira;
        this.deseada.set(cx * largo, cy * largo, cz * largo).applyQuaternion(this.giro).add(p);
        this.objetivo.set(mx * largo, my * largo, mz * largo).applyQuaternion(this.giro).add(p);
        this.angulo = 58;
        suaviza = Infinity;
        break;
      }
      case "fuera-senalero":
        if (this.conSenalero) {
          // Clavada en el suelo, mirando hacia donde llega el avión.
          this.deseada.copy(this.fijo);
          this.objetivo.copy(this.miraFija);
          this.angulo = 52;
          suaviza = Infinity;
          break;
        }
        // Sin señalero a la vista, a su lado, como rodando.
        this.deseada
          .copy(p)
          .addScaledVector(this.delante, largo * 0.9)
          .addScaledVector(this.izquierda, largo * 0.65);
        this.deseada.y += largo * 0.16;
        this.angulo = FOV_DE_LA_TOMA;
        suaviza = 1.6;
        break;
      case "fuera-despegue":
      case "fuera-pista": {
        // Clavada en el suelo, siguiendo al avión con la mirada, y acercándolo.
        this.deseada.copy(this.fijo);
        this.objetivo.y += 1;
        suaviza = Infinity;
        const lejos = this.fijo.distanceTo(p);
        this.angulo = MathUtils.clamp(2 * Math.atan((largo * 1.4) / Math.max(1, lejos)) * MathUtils.RAD2DEG, 7, 55);
        break;
      }
      case "fuera-raqueta": {
        // Clavada, siguiendo al avión, y más abierta: que se vea la pista y el ensanche alrededor.
        this.deseada.copy(this.fijo);
        this.objetivo.y += 1;
        suaviza = Infinity;
        const lejos = this.fijo.distanceTo(p);
        this.angulo = MathUtils.clamp(2 * Math.atan((largo * 2.6) / Math.max(1, lejos)) * MathUtils.RAD2DEG, 18, 60);
        break;
      }
      case "fuera-rodando":
        // A su lado y por delante, como el coche que lo acompaña por la calle de rodaje.
        this.deseada
          .copy(p)
          .addScaledVector(this.delante, largo * 0.9)
          .addScaledVector(this.izquierda, largo * 0.65);
        this.deseada.y += largo * 0.16;
        this.objetivo.addScaledVector(this.delante, -largo * 0.1);
        this.angulo = FOV_DE_LA_TOMA;
        suaviza = 1.6;
        break;
      case "fuera-giro":
        // Detrás y algo arriba, sin inclinarse: se ve cuánto se inclina el avión.
        this.deseada.copy(p).addScaledVector(this.delante, -largo * 1.9);
        this.deseada.y += largo * 0.32;
        this.angulo = FOV_DE_LA_TOMA;
        suaviza = 1.8;
        break;
      case "fuera-vuelta": {
        // Una vuelta entera alrededor, empezando por el lado de Ara y por delante.
        const a = 1.15 + (ctx.movimientoReducido ? 0 : (this.reloj / UNA_VUELTA) * Math.PI * 2);
        const r = largo * 1.45;
        this.deseada
          .copy(p)
          .addScaledVector(this.delante, Math.cos(a) * r)
          .addScaledVector(this.izquierda, Math.sin(a) * r);
        this.deseada.y += largo * 0.22;
        this.angulo = FOV_DE_LA_TOMA;
        suaviza = 3;
        break;
      }
      case "fuera-ala":
      default: {
        /*
         * **El ala, desde encima del fuselaje**, por detrás de ella y del lado
         * de Ara, quieta respecto al avión: el ala entera, el motor debajo y
         * los flaps cuando salen. Va con el avión, que es como se mira desde
         * una ventanilla.
         */
        this.giro.copy(state.orientation);
        this.deseada.set(-2.4, 3.1, 9.5).applyQuaternion(this.giro).add(p);
        this.objetivo.set(-8.5, -0.6, 0.4).applyQuaternion(this.giro).add(p);
        this.angulo = 56;
        suaviza = Infinity;
        break;
      }
    }
    if (this.recien || suaviza === Infinity) {
      this.posicion.copy(this.deseada);
      this.mira.copy(this.objetivo);
      this.recien = false;
    } else {
      const k = 1 - Math.exp(-dt * suaviza);
      this.posicion.lerp(this.deseada, k);
      this.mira.lerp(this.objetivo, Math.min(1, k * 2));
    }
    // Nunca bajo tierra, ni rozándola.
    const minimo = ctx.suelo(this.posicion.x, this.posicion.z) + 1.5;
    if (this.posicion.y < minimo) this.posicion.y = minimo;
    camera.position.copy(this.posicion);
    if (this.toma === "fuera-ala" || this.toma === "fuera-tren") {
      // Con el «arriba» del avión: la cámara va pegada a él.
      this.aux.set(0, 1, 0).applyQuaternion(state.orientation);
      camera.up.copy(this.aux);
    } else camera.up.set(0, 1, 0);
    camera.lookAt(this.mira);
    camera.up.set(0, 1, 0);
  }
}
