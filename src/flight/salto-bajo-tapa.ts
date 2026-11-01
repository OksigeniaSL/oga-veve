/**
 * **El salto bajo tapa, en cuentas**: qué estado le toca al avión a una hora
 * del vuelo largo, adónde puede saltar y cuánto se espera al mundo nuevo. Ver
 * el ADR 0023.
 *
 * Saltar es poner el avión en un estado, y el estado no es solo el sitio.
 * Todo lo que se puede decidir sin mundo, sin escena y sin dibujo está aquí,
 * con sus pruebas; `game.ts` solo lo pone en su sitio. Sale de `dondeVa`, que
 * es la pregunta del salto: lo demás —el combustible, la cabina, la hora del
 * sol, el camino en las coordenadas de un mundo— se deduce de ahí, para que
 * no haya dos cuentas de dónde está el avión.
 *
 * ## Dos relojes, y por qué el del juego no salta
 *
 * El reloj del juego —`relojDelJuego`, el de la escena y el de la agenda—
 * cuenta pasos del mundo y **no se adelanta**: todo lo que espera un rato en
 * ese reloj seguiría esperándolo, pero si viera siete horas en un fotograma
 * se dispararía todo junto al destapar. Lo que salta es la **hora del vuelo**,
 * `RelojDelVuelo`: segundos desde el despegue, de donde salen la posición, la
 * hora y el cielo.
 *
 * ## Unidades
 *
 * Las del modelo de vuelo: metros, segundos, radianes y kilos. Las coordenadas
 * van en grados, como en `ruta-larga.ts`.
 */

import { airDensity, GRAVITY, temperaturaExterior, velocidadDelSonido } from "./atmosphere";
import { altitudDeCabina } from "./cabina-presurizada";
import { loQueCabe, masaConCombustible, quemaPorSegundo, reservaEnKilos } from "./combustible";
import type { AircraftConfig } from "./aircraft";
import {
  dondeVa,
  ortodromica,
  puntoEn,
  type Fase,
  type PerfilDelVuelo,
} from "./ruta-larga";
import { dondeCae, type Sitio } from "../world/entre-aerodromos";
import { horaSolarEn } from "../world/hora";

// ── El reloj del vuelo ──────────────────────────────────────────────────

/**
 * **La hora del vuelo**, s desde el despegue: la que se adelanta de golpe en
 * un salto y, entre salto y salto, corre con el reloj del juego.
 *
 * Con el reloj del juego por fuera y no por dentro, que es el que acelera el
 * ⏩ y el que se para con la pausa: un minuto de vuelo a ocho veces es un
 * minuto en esta cuenta, y uno de pausa no es ninguno.
 */
export class RelojDelVuelo {
  private base: number;
  private enElJuego: number;

  constructor(t: number, relojDelJuego: number) {
    this.base = t;
    this.enElJuego = relojDelJuego;
  }

  /** Los segundos desde el despegue, con el reloj del juego de ahora. */
  ahora(relojDelJuego: number): number {
    return this.base + (relojDelJuego - this.enElJuego);
  }

  /** **El salto**: a partir de aquí se cuenta desde `t`. */
  saltarA(t: number, relojDelJuego: number): void {
    this.base = t;
    this.enElJuego = relojDelJuego;
  }
}

// ── Adónde se salta ─────────────────────────────────────────────────────

/**
 * **Adónde cae un salto que se pide a `pedido`**, s desde el despegue, o
 * `null` si no se puede saltar. Las dos reglas del ADR 0023:
 *
 * - **Solo cae en crucero**: ni subiendo, ni bajando, ni por debajo de los
 *   diez mil pies. Lo que se pide más allá se queda en el último minuto antes
 *   de bajar, con el margen de `ANTES_DE_BAJAR`.
 * - **No pasa nunca por encima de un momento que se vive** —el medio despertar
 *   del ecuador, el desayuno—: los dice el guion en `paradas`, y el salto se
 *   para justo antes del primero que se cruce.
 *
 * Y no salta hacia atrás, ni si ya se está pasado el crucero.
 */
export function destinoDelSalto(
  p: PerfilDelVuelo,
  desde: number,
  pedido: number,
  paradas: readonly number[] = [],
): number | null {
  const primero = p.tramos.find((x) => x.fase === "crucero");
  const ultimo = [...p.tramos].reverse().find((x) => x.fase === "crucero");
  if (!primero || !ultimo) return null;
  const inicio = primero.desde;
  const fin = ultimo.desde + ultimo.dura - ANTES_DE_BAJAR;
  if (desde > fin) return null;
  let hasta = Math.min(pedido, fin);
  for (const m of paradas) if (m > desde && m < hasta) hasta = m;
  if (hasta <= desde || hasta < inicio) return null;
  return hasta;
}

/**
 * **Lo que se deja antes de empezar a bajar**, s: un salto no cae encima del
 * punto de descenso, que Ara se despierta antes de bajar y la tripulación
 * tiene que tener tiempo de avisarlo. Es el rato que ya deja el vuelo corto,
 * `DESPIERTA_ANTES_DE_BAJAR`, con holgura para que el anuncio quepa.
 */
export const ANTES_DE_BAJAR = 120;

// ── El combustible ──────────────────────────────────────────────────────

/** Cada cuánto se cuenta lo que se quema: cinco minutos, m/s y masa apenas cambian. */
const CUENTA_DE_LA_QUEMA = 300;

/**
 * **Lo que quema el avión en un rato de ese perfil**, kilos: la resistencia
 * del avión a esa altura, velocidad y peso, por el consumo de sus motores
 * allí. Es la misma polar y el mismo consumo con los que se cuenta la reserva
 * (`quemaEsperando` en `combustible.ts`), no una cifra por hora puesta a mano,
 * y por eso el avión se va aligerando y gasta menos según avanza la noche.
 *
 * No se mide del modelo de vuelo porque no se ha volado: el rato saltado no
 * existe para él, y el modelo sencillo de los peldaños de abajo tampoco
 * tiene una resistencia que preguntarle.
 */
export function quemadoEnElVuelo(
  avion: AircraftConfig,
  p: PerfilDelVuelo,
  desde: number,
  hasta: number,
  kilosAlEmpezar: number,
): number {
  const ar = (avion.wingSpan * avion.wingSpan) / avion.wingArea;
  const k = 1 / (Math.PI * ar * avion.aero.oswald);
  let kilos = kilosAlEmpezar;
  for (let t = desde; t < hasta; t += CUENTA_DE_LA_QUEMA) {
    const rato = Math.min(CUENTA_DE_LA_QUEMA, hasta - t);
    const d = dondeVa(p, t + rato / 2);
    const altura = d.altitud;
    const v = Math.max(d.velocidad, 1);
    const peso = masaConCombustible(avion, kilos) * GRAVITY;
    const q = 0.5 * airDensity(altura) * v * v;
    const cl = peso / (q * avion.wingArea);
    const resistencia = q * avion.wingArea * (avion.aero.cd0 + k * cl * cl);
    const quema = quemaPorSegundo(avion, resistencia, {
      mach: v / velocidadDelSonido(altura),
      theta: (temperaturaExterior(altura) + 273.15) / 288.15,
    });
    kilos = Math.max(0, kilos - quema * rato);
  }
  return kilosAlEmpezar - kilos;
}

/**
 * **Lo que se carga para el vuelo entero**, kilos: lo que se quema de la
 * carrera a la toma —por el perfil—, la reserva final y el mismo tanto más
 * por lo que un despacho de verdad suma de contingencia y de alternativo, con
 * el tope de lo que cabe. Se cuenta hacia atrás porque lo quemado depende del
 * peso, que depende de lo cargado: tres vueltas ya no mueven ni un kilo.
 */
export function cargaDelVueloLargo(avion: AircraftConfig, p: PerfilDelVuelo): number {
  const cabe = loQueCabe(avion);
  const sobra = 2 * reservaEnKilos(avion);
  // Empezando por lo que cabe: lo quemado no pasa de lo cargado, y desde abajo no llegaría.
  let carga = cabe;
  for (let i = 0; i < 3; i++)
    carga = Math.min(cabe, sobra + quemadoEnElVuelo(avion, p, 0, p.enElAire, carga));
  return carga;
}

// ── El estado ───────────────────────────────────────────────────────────

/** **El estado que le toca al avión** a una hora del vuelo. Todo en SI. */
export interface EstadoDelSalto {
  /** s desde el despegue. */
  readonly t: number;
  readonly instante: Date;
  readonly fase: Fase;
  /** Lo recorrido por la ortodrómica, m. */
  readonly recorrido: number;
  readonly sitio: Sitio;
  /** Rumbo verdadero, rad. En un mundo plano sale otro: ver `enElMundo`. */
  readonly rumbo: number;
  /** m sobre el mar. */
  readonly altitud: number;
  /** m/s. Ver `dondeVa`: es la del perfil, que lleva dentro el viento de cara. */
  readonly velocidad: number;
  /** Altitud de cabina, m: la del programa de presurización a esa altitud. */
  readonly cabina: number;
  /** Kilos que quedan en los depósitos. */
  readonly combustible: number;
  /**
   * **La hora del sol en ese sitio**, de 0 a 24: es lo que entiende el cielo
   * del juego, junto con el instante y el sitio. Ver `ponerHora` en `sky.ts`.
   */
  readonly horaSolar: number;
  /**
   * Si el cartel del cinturón va encendido: en crucero, con el aire quieto, no.
   * Lo que manda después es lo de siempre —la comandante, la turbulencia y la
   * bajada—; ver `Cinturon`.
   */
  readonly cinturon: boolean;
}

/**
 * **El estado que le toca al avión a `t` segundos del despegue**, para un
 * avión con esa cabina y con lo que llevaba a una hora de antes: el depósito
 * de ahora, si ya se está volando —el de la carrera sale de
 * `cargaDelVueloLargo`—. Lo gastado es lo de ese rato, y lo de antes ya lo
 * contó quien lo voló: paso a paso con el modelo, o en otro salto.
 */
export function estadoDelSalto(
  p: PerfilDelVuelo,
  t: number,
  avion: AircraftConfig,
  deposito: { readonly en: number; readonly kilos: number },
): EstadoDelSalto {
  const d = dondeVa(p, t);
  return {
    t,
    instante: d.instante,
    fase: d.fase,
    recorrido: d.recorrido,
    sitio: d.sitio,
    rumbo: d.rumbo,
    altitud: d.altitud,
    velocidad: d.velocidad,
    cabina: altitudDeCabina(d.altitud, avion),
    combustible: Math.max(0, deposito.kilos - quemadoEnElVuelo(avion, p, deposito.en, t, deposito.kilos)),
    horaSolar: horaSolarEn(d.sitio.lon, d.instante),
    cinturon: d.fase !== "crucero",
  };
}

// ── En las coordenadas de un mundo ──────────────────────────────────────

/**
 * **Lo que se mira hacia delante para sacar el rumbo en un mundo plano**, m.
 * Un kilómetro: el avión recorre eso en cuatro segundos y el círculo máximo
 * no se aparta de la cuerda ni medio centímetro.
 */
const CUERDA_DEL_RUMBO = 1000;

/**
 * **Dónde cae un punto de la ruta en un mundo**, con el origen de ese mundo:
 * `x` al este y `z` al sur, con la misma proyección que coloca los aeródromos
 * vecinos (`dondeCae`), y el rumbo **en ese plano**.
 *
 * El rumbo no puede ser el verdadero del sitio: esa proyección estira el este
 * con el coseno de la latitud media, así que a mil kilómetros del origen el
 * rumbo del plano se aparta unas décimas de grado del de verdad, y a miles,
 * varios grados. Volando con el verdadero, el avión se saldría de su raya a
 * tantos metros por kilómetro como decimas haya. Así que se saca del propio
 * plano: la cuerda hacia el punto de un poco más allá.
 */
export function enElMundo(
  p: PerfilDelVuelo,
  origen: Sitio,
  recorrido: number,
): { readonly x: number; readonly z: number; readonly rumbo: number } {
  const aqui = dondeCae(origen, puntoEn(p.ruta, recorrido));
  const mas = dondeCae(origen, puntoEn(p.ruta, recorrido + CUERDA_DEL_RUMBO));
  const rumbo = Math.atan2(mas.x - aqui.x, -(mas.z - aqui.z));
  return { x: aqui.x, z: aqui.z, rumbo: rumbo < 0 ? rumbo + 2 * Math.PI : rumbo };
}

/** Radio con el que proyecta `dondeCae`, m. Tiene que ser el suyo para que sea su inversa. */
const R_DE_LA_PROYECCION = 6371008;

/**
 * **El sitio que hay en `x`, `z` de un mundo**: la inversa de `dondeCae`, con
 * la latitud media. Es la prueba de que un avión está donde dice la cuenta, y
 * sirve para contar la hora y el cielo desde un avión que ya voló un rato.
 */
export function sitioDelMundo(origen: Sitio, x: number, z: number): Sitio {
  const grado = Math.PI / 180;
  const lat = origen.lat + -z / R_DE_LA_PROYECCION / grado;
  const k = Math.cos(((origen.lat + lat) / 2) * grado);
  return { lat, lon: origen.lon + x / (R_DE_LA_PROYECCION * k) / grado };
}

/**
 * **Los puntos del camino que queda**, en las coordenadas de un mundo: lo que
 * se le da al seguimiento del plan y a la tripulación para que vuelen la
 * ortodrómica. Cada `paso` metros, el de ahora el primero y Pettirossi el
 * último. Los de muy lejos caen fuera del mundo, y da lo mismo: son puntos de
 * una ruta, no suelo.
 */
export function caminoEnElMundo(
  p: PerfilDelVuelo,
  origen: Sitio,
  desde: number,
  paso = 100_000,
): readonly { readonly x: number; readonly z: number; readonly recorrido: number }[] {
  const puntos = [];
  const hasta = p.ruta.distancia;
  const n = Math.max(1, Math.ceil((hasta - desde) / paso));
  for (let i = 0; i <= n; i++) {
    const recorrido = desde + ((hasta - desde) * i) / n;
    const { x, z } = dondeCae(origen, puntoEn(p.ruta, recorrido));
    puntos.push({ x, z, recorrido });
  }
  return puntos;
}

// ── El mundo del tramo ──────────────────────────────────────────────────

/** Un mundo que el vuelo largo puede poner: su identificador y dónde se monta. */
export interface MundoDelCamino {
  readonly id: string;
  readonly origen: Sitio;
}

/**
 * **El mundo que toca en ese sitio**: el de los que hay, el que esté más cerca
 * por la superficie de la Tierra, no por el plano de ninguno. Con los dos que
 * hoy hay —Canarias y el Paraguay—, el cambio cae a mitad del océano. El
 * pasillo de crucero, cuando llegue, son más mundos en esta lista.
 */
export function mundoDelTramo(
  mundos: readonly MundoDelCamino[],
  sitio: Sitio,
): MundoDelCamino | null {
  let mejor: MundoDelCamino | null = null;
  let distancia = Infinity;
  for (const m of mundos) {
    const d = ortodromica(sitio, m.origen).distancia;
    if (d < distancia) {
      distancia = d;
      mejor = m;
    }
  }
  return mejor;
}

// ── La espera ───────────────────────────────────────────────────────────

/**
 * **Lo que se espera al mundo nuevo con la pantalla tapada**, s de pared.
 *
 * Una espera entre dos sistemas sin red se queda colgada: ya hubo una roja
 * eterna. Con veinte segundos cabe la bajada de un mundo por la red del
 * colegio —el relieve son unos cientos de kilobytes y las fotos, los que tarden—
 * y Ara sigue durmiendo, que es lo que se ve. Pasado eso se destapa igual, sin
 * el mundo nuevo: el avión sigue en su sitio y el vuelo sigue, solo que sin
 * nada debajo hasta el siguiente corte.
 */
export const RED_DEL_MUNDO = 20;

/**
 * **Lo que se espera a que la pantalla tape**, s de pared: el fundido de la
 * siesta tarda menos de un segundo, y si en cinco no ha tapado es que no hay
 * pantalla que tape —un juego que se cerró, una página sin el elemento—. Sin
 * tapa no se salta nunca, así que el salto se deja.
 */
export const RED_DE_LA_TAPA = 5;

/**
 * **Lo que dura el sueño como poco**, s de pared con la pantalla tapada: el rato
 * de ver a Ara durmiendo y de empezar a soñar (`HASTA_EL_SUENO` en
 * `ui/siesta.ts`). Con un mundo que ya está, o sin mundo que cambiar, un salto
 * son unas cuentas: sin esto la noche pasaría en un parpadeo, y un parpadeo no
 * se lee como dormirse y despertar en otro sitio, que es lo que se está
 * contando.
 */
export const DURA_EL_SUENO = 3.5;

/** En qué va el salto. */
export type EstadoDeLaEspera =
  /** Pedido: se espera a que la pantalla tape del todo. */
  | "tapando"
  /** Tapado: se espera al mundo del tramo. */
  | "cargando"
  /** Se puede poner, con el mundo o por la red. */
  | "listo"
  /** Sin tapa: el salto se deja. */
  | "dejado";

/**
 * **La espera de un salto**, con el reloj de pared, que es el único que no
 * depende de lo que se está esperando: el del juego corre por pasos, y una
 * máquina que no da abasto cargando daría menos pasos.
 *
 * Sin DOM y sin promesas: lo que pasa se le cuenta en cada fotograma, y así la
 * red se puede probar sin navegador y sin esperar veinte segundos de verdad.
 */
export class EsperaDelSalto {
  private estado_: EstadoDeLaEspera = "tapando";
  private tapando = 0;
  private cargando = 0;
  private porLaRed = false;

  get estado(): EstadoDeLaEspera {
    return this.estado_;
  }

  /** Si se destapa sin el mundo, porque saltó la red. */
  get saltoLaRed(): boolean {
    return this.porLaRed;
  }

  /** Lo que lleva esperando al mundo, s de pared. Para el banco. */
  get esperando(): number {
    return this.cargando;
  }

  /** Un fotograma, con los segundos de pared que han pasado. */
  paso(real: number, tapa: boolean, llegoElMundo: boolean): EstadoDeLaEspera {
    if (this.estado_ === "tapando") {
      this.tapando += real;
      if (tapa) this.estado_ = "cargando";
      else if (this.tapando > RED_DE_LA_TAPA) this.estado_ = "dejado";
    }
    if (this.estado_ === "cargando") {
      this.cargando += real;
      // Si la pantalla dejó de tapar a media espera, se suelta: sin tapa no se salta.
      if (!tapa) this.estado_ = "dejado";
      else if (llegoElMundo) {
        if (this.cargando >= DURA_EL_SUENO) this.estado_ = "listo";
      } else if (this.cargando >= RED_DEL_MUNDO) {
        this.porLaRed = true;
        this.estado_ = "listo";
      }
    }
    return this.estado_;
  }
}
