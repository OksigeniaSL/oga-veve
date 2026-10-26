/**
 * **La turbulencia de este vuelo**: dónde está, cuánta, y si se sabe antes.
 *
 * Enrique: «la turbulencia que anuncia Jazlyn no existe». Siempre la anunciaba
 * en el mismo sitio, al poco de despegar, y luego el vuelo era «una balsa de
 * aceite». No era mentira del todo: lo que sacudía era la capa de abajo —el
 * viento rozando el suelo y la térmica de la tarde, ver `turbulencia.ts`—, que
 * se cruza siempre en la subida, y que el anuncio confundía con la turbulencia
 * del camino. Y la del camino no existía: por encima de la capa de abajo el
 * modelo no tenía nada.
 *
 * Esto es la del camino: las zonas que se cruzan y lo que se dice de ellas.
 * **Cuántas hay, dónde, cuánto duran y con qué fuerza** lo decide el guion de
 * cada vuelo, con lo real del sitio, la época y la hora y el tope de cada
 * peldaño: ver `guion-de-turbulencia.ts`.
 *
 * Y en las dos maneras de llegar que tiene de verdad:
 *
 * - **prevista**: la da el parte, la pinta el radar o la avisa otro avión que
 *   pasó antes. Se anuncia antes, se enciende el cartel y llega.
 * - **sin avisar**: la de aire claro, que no sale en el radar. Primero los
 *   baches, en seguida el cartel y el anuncio.
 *
 * Se sitúa **por lo volado desde el despegue**, no por coordenadas: quien
 * aprende a volar no sigue la ruta al metro, y una zona puesta en el mapa
 * que no se cruza no enseña nada. Lo volado es el camino de cada uno.
 *
 * Unidades SI: metros, segundos y σ_w en m/s, como `turbulencia.ts`.
 */

import { SACUDE, YA_NO_SACUDE } from "./cinturon";

/** Lo fuerte que es, como se dice en un parte: grados uno, dos y tres. */
export type Intensidad = "ligera" | "moderada" | "fuerte";

/** Cómo llega: ver la cabecera. */
export type ComoLlega = "prevista" | "sin-avisar" | "tormenta";

/**
 * **De dónde se sabe la que se sabe**: el parte del tiempo, el radar —las
 * tormentas se ven en él— o el aviso por radio de otro avión que pasó antes,
 * el PIREP. Los tres pasan de verdad y los tres se anuncian distinto: el del
 * PIREP lo cuentan antes la radio y quien la oye. Ver `fuenteDe`.
 */
export type Fuente = "parte" | "radar" | "pirep";

export interface Zona {
  /** Desde cuántos metros volados desde el despegue. */
  readonly desde: number;
  /** Y hasta cuántos. */
  readonly hasta: number;
  readonly intensidad: Intensidad;
  readonly como: ComoLlega;
  /**
   * La capa en la que está, m sobre el mar, o `null` si está a todas las
   * alturas. La de aire claro es una capa —por eso pedir otro nivel arregla—;
   * la del frente o la tormenta, no.
   */
  readonly capa: { readonly de: number; readonly a: number } | null;
  /**
   * De dónde se sabe, si se sabe. Sin el dato —las zonas que pide un banco—,
   * la de siempre: el parte, o el radar con tormenta. Ver `fuenteDe`.
   */
  readonly fuente?: Fuente;
}

/**
 * De dónde se sabe esta zona: la suya si la trae; si no, el radar con
 * tormenta y el parte en las demás. La de aire claro no se sabe: `null`.
 */
export function fuenteDe(z: Zona): Fuente | null {
  if (z.como === "sin-avisar") return null;
  return z.fuente ?? (z.como === "tormenta" ? "radar" : "parte");
}

/**
 * **Cuánto sacude cada grado**, σ_w en m/s, contra los niveles de
 * `nivelDe` en `turbulencia.ts`: la ligera enciende el cartel —por encima de
 * `SACUDE`— y se queda en la mitad suave de la suya; la moderada, en medio de la suya; la
 * fuerte, al empezar la severa. Lo que se siente y lo que se anuncia cuentan lo
 * mismo.
 */
export const SACUDE_CADA: Readonly<Record<Intensidad, number>> = {
  /*
   * Siete décimas: por encima de lo que enciende el cartel y en la mitad baja
   * de la ligera, la de los baches pequeños. Eran nueve y media, casi en la
   * moderada: en el JAZ 60 eso eran sacudidas de un tercio de g, y la ligera
   * es un temblor.
   */
  ligera: 0.7,
  moderada: 1.5,
  fuerte: 2,
};

/** Lo que dura el borde de una zona, m: ni se entra ni se sale de golpe. */
const BORDE = 1500;

/** Por debajo de esto, sobre el suelo, manda la capa de abajo, m. */
const POR_ENCIMA_DE = 300;

/**
 * **Cuánto sacude la turbulencia del camino aquí**, σ_w en m/s: la de la zona
 * en la que se esté, con sus bordes suaves y su capa.
 */
export function sacudeEnElCamino(
  zonas: readonly Zona[],
  volado: number,
  altura: number,
  sobreElSuelo: number,
): number {
  if (sobreElSuelo < POR_ENCIMA_DE) return 0;
  let sigma = 0;
  for (const z of zonas) {
    if (volado < z.desde - BORDE || volado > z.hasta + BORDE) continue;
    const dentro =
      volado < z.desde
        ? 1 - (z.desde - volado) / BORDE
        : volado > z.hasta
          ? 1 - (volado - z.hasta) / BORDE
          : 1;
    const enLaCapa = !z.capa
      ? 1
      : altura < z.capa.de
        ? Math.max(0, 1 - (z.capa.de - altura) / 200)
        : altura > z.capa.a
          ? Math.max(0, 1 - (altura - z.capa.a) / 200)
          : 1;
    sigma = Math.max(sigma, SACUDE_CADA[z.intensidad] * dentro * enLaCapa);
  }
  return sigma;
}

/**
 * Cuánto antes se anuncia la que se sabe, s: minuto y medio. Lo bastante para
 * que la tripulación se siente y el pasaje se abroche, y lo bastante poco para
 * que llegue cuando se dijo.
 */
export const AVISA_ANTES = 90;

/**
 * Y cuánto se deja sacudir la que no se sabe antes de anunciarla, s: cuatro.
 * Primero los baches, en seguida el cartel y el anuncio.
 */
export const PRIMERO_LOS_BACHES = 4;

/** Lo que el anuncio mira del vuelo en cada paso. */
export interface MomentoDelCamino {
  readonly enElAire: boolean;
  /** Velocidad sobre el suelo, m/s. */
  readonly velocidad: number;
  /** Cuánto se mueve el aire aquí, todo junto: el σ de `cuantoSeMueve`. */
  readonly movimiento: number;
  /**
   * Si se puede anunciar: en vuelo, fuera de la final y sin una emergencia.
   * En la final no habla nadie que no sea del aterrizaje.
   */
  readonly sePuedeAnunciar: boolean;
  /**
   * Si el pasaje iba suelto —el cartel apagado por el anuncio de crucero—:
   * la de aire claro se anuncia cuando pilla a la gente suelta; con el
   * cartel puesto de antes, ya están sentados y abrochados. Ver
   * `Cinturon.pasajeSuelto`.
   */
  readonly pasajeSuelto: boolean;
}

/** Lo que hay que hacer, si hay algo. */
export type SucesoDelCamino =
  | {
      readonly que: "anunciar";
      readonly como: ComoLlega;
      readonly intensidad: Intensidad;
      /** Cuántas van en este vuelo, empezando por uno. */
      readonly vez: number;
      /** De dónde se sabe, o `null` la de aire claro. Ver `fuenteDe`. */
      readonly fuente: Fuente | null;
    }
  | { readonly que: "paso" };

/**
 * **El anuncio, atado a la turbulencia de verdad.** Lleva lo volado, sabe qué
 * zona viene y cuál se está cruzando, y dice cuándo anunciar y cuándo ha
 * pasado. No habla: lo dice quien lo usa, con su voz.
 */
export class TurbulenciaDelVuelo {
  private zonas: readonly Zona[] = [];
  private volado = 0;
  private readonly avisadas = new Set<Zona>();
  /** Lo que se lleva sacudiendo sin anunciar, s. */
  private sinAnunciar = 0;
  /** Si esta racha de baches ya se anunció: se rearma cuando el aire se calma. */
  private rachaAnunciada = false;
  /** Si hay una anunciada por pasar todavía. */
  private porPasar = false;
  private veces = 0;
  /**
   * Lo que pasó, con lo volado de su vuelo: para los bancos. De toda la
   * sesión y no del vuelo, que el banco lo lee después de volver a arrancar
   * en el otro campo.
   */
  readonly sucesos: { volado: number; suceso: SucesoDelCamino }[] = [];

  /** Vuelo nuevo, con su turbulencia. */
  empezar(zonas: readonly Zona[]): void {
    this.zonas = zonas;
    this.volado = 0;
    this.avisadas.clear();
    this.sinAnunciar = 0;
    this.rachaAnunciada = false;
    this.porPasar = false;
    this.veces = 0;
  }

  /** Si hay una anunciada que todavía no ha pasado. */
  get porPasarTodavia(): boolean {
    return this.porPasar;
  }

  /** Las zonas de este vuelo. Para los bancos y el juego. */
  get deEsteVuelo(): readonly Zona[] {
    return this.zonas;
  }

  /** La zona que se está cruzando ahora, bordes incluidos, o `null`. */
  get zonaDeAhora(): Zona | null {
    return this.zonaAqui();
  }

  /** Lo volado desde el despegue, m. */
  get loVolado(): number {
    return this.volado;
  }

  /** Cuánto sacude aquí lo del camino. Ver `sacudeEnElCamino`. */
  sacude(altura: number, sobreElSuelo: number): number {
    return sacudeEnElCamino(this.zonas, this.volado, altura, sobreElSuelo);
  }

  paso(dt: number, m: MomentoDelCamino): SucesoDelCamino | null {
    const suceso = this.pasoSinApuntar(dt, m);
    if (suceso) this.sucesos.push({ volado: this.volado, suceso });
    return suceso;
  }

  private pasoSinApuntar(dt: number, m: MomentoDelCamino): SucesoDelCamino | null {
    if (!m.enElAire) return null;
    this.volado += Math.max(0, m.velocidad) * dt;
    /*
     * La racha se mide siempre, se pueda anunciar o no: el aire que ya se
     * movía al salir de la final no es una racha nueva.
     */
    if (m.movimiento >= SACUDE) this.sinAnunciar += dt;
    else if (m.movimiento < YA_NO_SACUDE) {
      this.sinAnunciar = 0;
      this.rachaAnunciada = false;
    }
    if (!m.sePuedeAnunciar) return null;

    // **La que se sabe, antes de llegar.**
    for (const z of this.zonas) {
      if (z.como === "sin-avisar" || this.avisadas.has(z)) continue;
      if (this.volado > z.hasta) continue;
      const falta = (z.desde - this.volado) / Math.max(1, m.velocidad);
      if (falta > AVISA_ANTES) continue;
      this.avisadas.add(z);
      this.porPasar = true;
      // Lo que ya se anunció no se vuelve a anunciar como racha nueva.
      this.rachaAnunciada = true;
      return {
        que: "anunciar",
        como: z.como,
        intensidad: z.intensidad,
        vez: ++this.veces,
        fuente: fuenteDe(z),
      };
    }

    // **La que no se sabe**: primero los baches, en seguida el anuncio.
    const aqui = this.zonaAqui();
    // La que ya se anunció antes de llegar es la misma racha: no se repite.
    if (aqui && this.avisadas.has(aqui)) this.rachaAnunciada = true;
    if (
      !this.rachaAnunciada &&
      m.pasajeSuelto &&
      this.sinAnunciar >= PRIMERO_LOS_BACHES
    ) {
      this.rachaAnunciada = true;
      this.porPasar = true;
      if (aqui) this.avisadas.add(aqui);
      return {
        que: "anunciar",
        como: "sin-avisar",
        intensidad: aqui?.intensidad ?? (m.movimiento >= SACUDE_CADA.moderada ? "moderada" : "ligera"),
        vez: ++this.veces,
        fuente: null,
      };
    }

    /*
     * **Y cuando ha pasado**: el aire calmado, fuera de toda zona y sin otra
     * anunciada a la vuelta de la esquina.
     */
    if (
      this.porPasar &&
      m.movimiento < YA_NO_SACUDE &&
      !aqui &&
      !this.vieneOtra(m.velocidad)
    ) {
      this.porPasar = false;
      return { que: "paso" };
    }
    return null;
  }

  /** La zona que se está cruzando, bordes incluidos. */
  private zonaAqui(): Zona | null {
    return (
      this.zonas.find((z) => this.volado >= z.desde - BORDE && this.volado <= z.hasta + BORDE) ??
      null
    );
  }

  /** Si viene otra zona en menos de lo que se avisa antes. */
  private vieneOtra(velocidad: number): boolean {
    return this.zonas.some(
      (z) =>
        z.desde > this.volado &&
        (z.desde - this.volado) / Math.max(1, velocidad) <= AVISA_ANTES,
    );
  }
}
