/**
 * **La ventanilla ALT del automático, y el avisador que la vigila.**
 *
 * Contado jugando: «no sé a qué altitud debo volar, ¿me lo dicen los
 * instrumentos? ¿La carta?». El plan tenía su crucero —ver `cruceroDelPlan`
 * en `ruta.ts`— y lo usaba para el punto de descenso, pero no lo enseñaba en
 * ningún sitio: lo decía una vez la comandante, y ya. Y el automático, al
 * engancharlo, se quedaba en la altura de ese instante, así que subir a
 * donde tocaba era cosa de hacerlo a mano. Y luego: «si la comandante dice
 * que vamos a ir a diez mil pies y yo subo hasta doce mil, bajar me costó».
 *
 * En un avión de verdad esto tiene un sitio, y es el que se enseña aquí: **la
 * ventanilla de altitud del panel del automático**. Es un número que se gira
 * con una rueda; se pone ahí la altura que da el control, el automático sube
 * o baja hasta ella y se queda, y una caja del avión —el avisador de
 * altitud— pita al acercarse y al desviarse. Lo que se quiere, en magenta; lo
 * que se tiene, en blanco.
 *
 * ## Quién la lleva
 *
 * La llevan el turbohélice y los dos reactores: un panel de automático con
 * preselector de altitud es de serie en cualquier avión de pasaje de turbina.
 * Las avionetas del juego llevan relojes redondos y no tienen dónde ponerla,
 * y **lo que el avión no lleva no se inventa**: ahí el automático sigue
 * sosteniendo la altura que llevaba al engancharlo, que es lo que hace un
 * automático sin preselector. Ver `llevaVentanillaDeAltitud`.
 *
 * ## El avisador, con los números de Boeing
 *
 * - **Acercándose**: a novecientos pies de la seleccionada suena un tono y se
 *   resalta la ventanilla, hasta que quedan trescientos. Es el «ya casi»: el
 *   momento de mirar que el avión va a nivelar donde tiene que nivelar.
 * - **Desviándose**: ya en ella, si el avión se aparta más de trescientos pies,
 *   tono otra vez y la ventanilla en ámbar. Es el «te estás yendo».
 *
 * Son los del avisador de altitud del 737 y del 747 (FCOM, *Flight
 * Instruments — Altitude Alerting*). Y se rearman **con la ventanilla**, que
 * es lo que cambia de verdad: una altura nueva es un aviso nuevo; el reloj no
 * rearma nada. Ver la memoria del proyecto sobre los avisos.
 *
 * Sin three.js ni DOM: se comprueba sin volar.
 */

import type { AircraftConfig } from "./aircraft";

/** Un pie, en metros. */
export const PIE = 0.3048;

/**
 * Lo que mueve un toque de la rueda, en pies: **mil**, al siguiente millar.
 *
 * Es el modo de mil pies de la rueda de altitud de un FCU de Airbus, que va de
 * millar en millar redondeando: de 4300, un toque arriba son 5000 y uno abajo
 * 4000. Las alturas que da un control son millares —y los niveles también—, y
 * con toques de cien pies pasar de seis mil a once mil eran cincuenta.
 */
export const PASO_DE_LA_RUEDA = 1000;

/** Si este avión lleva ventanilla de altitud en su panel. Ver la cabecera. */
export function llevaVentanillaDeAltitud(a: Pick<AircraftConfig, "sound">): boolean {
  return a.sound.engine === "turboprop" || a.sound.engine === "turbofan";
}

/**
 * Hasta dónde gira la ventanilla, en pies: la altura de crucero del avión.
 *
 * El panel de un avión de verdad deja poner cincuenta mil pies; lo que no deja
 * es llegar. Aquí el automático sostiene la altura con el morro y la velocidad
 * con el gas, y pedirle una altura que el avión no alcanza es pedirle que
 * pierda velocidad hasta la pérdida. Así que la rueda para donde para el avión.
 */
export function topeDeLaVentanilla(a: Pick<AircraftConfig, "alturaDeCrucero">): number {
  return Math.floor(a.alturaDeCrucero / PIE / PASO_DE_LA_RUEDA) * PASO_DE_LA_RUEDA;
}

/**
 * La ventanilla girada `pasos` toques, en pies: al millar siguiente en el
 * sentido del giro, sin pasar de cero ni del tope.
 */
export function girarLaVentanilla(pies: number, pasos: number, tope: number): number {
  let v = pies;
  const n = Math.abs(Math.trunc(pasos));
  for (let i = 0; i < n; i++) {
    v =
      pasos > 0
        ? Math.floor(v / PASO_DE_LA_RUEDA + 1e-6) * PASO_DE_LA_RUEDA + PASO_DE_LA_RUEDA
        : Math.ceil(v / PASO_DE_LA_RUEDA - 1e-6) * PASO_DE_LA_RUEDA - PASO_DE_LA_RUEDA;
  }
  return Math.max(0, Math.min(tope, v));
}

/** A qué altura, en pies redondos de cien, se deja la ventanilla puesta en `metros`. */
export function aLaVentanilla(metros: number): number {
  return Math.round(metros / PIE / 100) * 100;
}

/** A cuántos pies de la seleccionada avisa acercándose. */
export const AVISA_AL_ACERCARSE = 900;
/** Y a cuántos se da por llegada, y por desviada una vez en ella. */
export const SE_DESVIA = 300;
/**
 * Lo que tiene que volver para dejar de estar desviada, en pies: doscientos.
 *
 * Sin este hueco, un avión que baila en los trescientos por un bache pitaría
 * cada vez que la aguja cruza la raya. Entrar y salir por el mismo número es
 * lo que hace temblar un aviso.
 */
export const VUELVE_A_SU_SITIO = 200;

/** Lo que dice el avisador: nada, «ya casi» o «te estás yendo». */
export type Alerta = "nada" | "cerca" | "fuera";

/** Lo que devuelve un paso del avisador. */
export interface PasoDelAvisador {
  readonly alerta: Alerta;
  /** Si suena el tono **ahora**: al entrar en «cerca» o en «fuera». */
  readonly tono: boolean;
}

/**
 * **El avisador de altitud**, como la caja de un avión de línea.
 *
 * Se le da en cada paso la altitud que marca el altímetro y la de la
 * ventanilla —`null` si no hay ninguna, o en tierra—, y dice qué enseña y si
 * suena. El tono suena **una vez** al entrar en cada estado, y lo de acercarse,
 * una vez por ventanilla: si el avión se aleja y vuelve, ya se sabía.
 */
export class AvisadorDeAltitud {
  private seleccion: number | null = null;
  private enElla = false;
  private yaDijoCerca = false;
  private estado: Alerta = "nada";

  paso(pies: number, seleccion: number | null): PasoDelAvisador {
    if (seleccion !== this.seleccion) {
      this.seleccion = seleccion;
      this.enElla = false;
      this.yaDijoCerca = false;
      this.estado = "nada";
    }
    if (seleccion === null) return { alerta: "nada", tono: false };
    const lejos = Math.abs(pies - seleccion);
    if (this.estado === "fuera") {
      if (lejos > VUELVE_A_SU_SITIO) return { alerta: "fuera", tono: false };
      this.estado = "nada";
      return { alerta: "nada", tono: false };
    }
    if (lejos <= SE_DESVIA) {
      this.enElla = true;
      this.estado = "nada";
      return { alerta: "nada", tono: false };
    }
    if (this.enElla) {
      this.estado = "fuera";
      return { alerta: "fuera", tono: true };
    }
    if (lejos <= AVISA_AL_ACERCARSE) {
      const tono = !this.yaDijoCerca;
      this.yaDijoCerca = true;
      this.estado = "cerca";
      return { alerta: "cerca", tono };
    }
    this.estado = "nada";
    return { alerta: "nada", tono: false };
  }
}
