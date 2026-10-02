/**
 * **Los mandos de verdad**: el mando de consola y el joystick de vuelo, leídos
 * con la Gamepad API del navegador.
 *
 * ## Por qué un reparto por aparato
 *
 * El navegador da los ejes y los botones de cualquier mando como una lista de
 * números, y solo garantiza qué es cada uno en los que declara el reparto
 * «standard» —los de consola, tipo Xbox—. Un joystick de vuelo no lo declara:
 * cada fabricante pone la palanca de gases, el giro del mango y la seta donde
 * le parece, y el navegador los numera además distinto según el sistema. Leído
 * como si fuera un mando de consola, la palanca de gases no hace nada y el
 * timón sale de un eje que no es.
 *
 * Así que aquí se mira **qué aparato es**, por su nombre —`pad.id`—, y se lee
 * con su reparto. Hoy hay dos: el de consola y el **Thrustmaster T.Flight
 * HOTAS X**, que es el que va a usar quien prueba el juego y uno de los más
 * comunes entre quienes vuelan en simulador. Cualquier otro se lee como hasta
 * ahora, con el reparto de consola.
 *
 * ## El HOTAS X, y lo que no se ha podido probar
 *
 * **Este reparto está escrito sin el aparato delante**: sale de su manual, de
 * cómo describe sus ejes por USB —un dispositivo HID normal: X e Y la
 * palanca, Rz el giro del mango, y la palanca de gases y el balancín de su
 * base en Z y en el eje «deslizador»— y de cómo los numera cada navegador.
 * Lo que puede no salir a la primera, y está hecho para que se note y se
 * arregle aquí mismo:
 *
 * - **Qué eje es la palanca de gases y cuál el balancín.** Los dos están en la
 *   base de gases y el manual no dice cuál va en Z. No se adivina: se
 *   distingue mirándolos, porque **el balancín tiene muelle** y vuelve al
 *   centro, y la palanca de gases se queda donde se deja —casi siempre atrás,
 *   al ralentí—. En cuanto uno de los dos está lejos del centro y el otro no,
 *   ése es el gas. Ver `GasDelHotas`.
 * - **Hacia dónde da más gas.** Se supone que hacia delante es −1, que es lo
 *   habitual en los joysticks por USB. Si sale al revés, es `GAS_HACIA_DELANTE`.
 * - **La numeración de los ejes.** Chrome en Windows los pone por su código
 *   HID —X 0, Y 1, Z 2, Rz 5, deslizador 6 y la seta en el 9, en un solo
 *   número—; en Linux, por el orden del núcleo —X, Y, Z, Rz, gas y la seta en
 *   dos ejes, 5 y 6—. Se distingue por cuántos ejes trae.
 *
 * ## El reparto, botón a botón
 *
 * Con el número que lleva impreso el aparato (el navegador cuenta desde 0):
 *
 * | Mando                         | Hace                                  |
 * | ----------------------------- | ------------------------------------- |
 * | Palanca, adelante y atrás     | morro abajo y arriba                  |
 * | Palanca, a los lados          | alabeo                                |
 * | Giro del mango, o el balancín | timón (pedales)                       |
 * | Palanca de gases              | gas                                   |
 * | 1, el gatillo                 | freno de ruedas, mientras se aprieta  |
 * | 2, el botón del pulgar        | aerofrenos: abrir o cerrar            |
 * | Seta, arriba y abajo          | compensador (TRIM), como en un cuerno |
 * | 5, en la base de gases        | flaps una muesca arriba               |
 * | 6, en la base de gases        | flaps una muesca abajo                |
 * | 7, en la base de gases        | tren: subir o bajar                   |
 * | 8, en la base de gases        | reversa, mientras se aprieta          |
 *
 * El freno en el gatillo es lo que hacen casi todos los simuladores con este
 * joystick, que no trae pedales; el compensador en la seta es el interruptor
 * del cuerno de cualquier avión con compensador eléctrico. Ver
 * `flight/palanca-de-teclado.ts`.
 *
 * ## Y el de consola
 *
 * El de siempre —ver `readGamepad` en `input.ts`—, con lo que le faltaba:
 * palanca izquierda alabeo y cabeceo, la derecha de lado el timón, gatillo
 * derecho gas e izquierdo freno, A freno, cruceta arriba y abajo
 * compensador, y ahora **LB y RB los flaps** —una muesca arriba y abajo—,
 * **Y el tren** y **X los aerofrenos**.
 */

/** Lo que se lee de un mando: lo mínimo de `Gamepad`, para poder probarlo. */
export interface MandoLeible {
  readonly id: string;
  readonly mapping: string;
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
}

/** Lo que dice un mando en este fotograma, ya con su reparto. */
export interface LecturaDelMando {
  /** Qué aparato es. */
  readonly aparato: "consola" | "hotas-x";
  /** −1 a 1, ya sin zona muerta. Cabeceo positivo morro arriba. */
  readonly roll: number;
  readonly pitch: number;
  readonly rudder: number;
  /** El gas, 0 a 1, si el aparato lo tiene; si no, `undefined`. */
  readonly throttle: number | undefined;
  readonly brakes: boolean;
  readonly trimArriba: boolean;
  readonly trimAbajo: boolean;
  /** Botones que se pulsan: flaps una muesca arriba y abajo, tren, aerofrenos. */
  readonly flapsArriba: boolean;
  readonly flapsAbajo: boolean;
  readonly tren: boolean;
  readonly aerofrenos: boolean;
  readonly reversa: boolean;
}

/** La zona muerta de las palancas de consola, que tiemblan. */
export const ZONA_MUERTA = 0.12;
/** Y la del joystick, que es más fino: con la de consola se perdía precisión. */
export const ZONA_MUERTA_DEL_JOYSTICK = 0.04;
/** Y la del giro del mango, que con la mano en la palanca se tuerce sin querer. */
export const ZONA_MUERTA_DEL_GIRO = 0.15;

/**
 * Hacia dónde da gas la palanca del HOTAS X: −1 si a fondo hacia delante lee
 * −1, que es lo habitual. **Sin probar con el aparato**: si sale al revés,
 * aquí se cambia el signo.
 */
export const GAS_HACIA_DELANTE = -1;

/** Si este mando es un Thrustmaster T.Flight HOTAS X. */
export function esHotasX(id: string): boolean {
  // Por el nombre, que es como lo enseñan Chrome y Firefox, o por el
  // fabricante y el modelo USB: 044f es Thrustmaster y b108 este joystick.
  return /t\.?\s*flight\s*hotas\s*x/i.test(id) || /044f.{0,12}b108/i.test(id);
}

export function aplicarZonaMuerta(v: number, zona: number): number {
  if (!Number.isFinite(v) || Math.abs(v) < zona) return 0;
  return Math.sign(v) * Math.min(1, (Math.abs(v) - zona) / (1 - zona));
}

const boton = (m: MandoLeible, i: number): boolean => m.buttons[i]?.pressed ?? false;
const eje = (m: MandoLeible, i: number): number => m.axes[i] ?? 0;

/**
 * **Cuál de los dos ejes de la base es la palanca de gases**: el que se queda
 * lejos del centro mientras el otro está en él. Ver la cabecera.
 *
 * Con memoria: una vez visto, ya no cambia mientras el mando siga puesto.
 */
export class GasDelHotas {
  private cual: 0 | 1 | null = null;

  /** Dados los dos candidatos, devuelve cuál es el gas: 0 el primero (Z). */
  elegir(z: number, deslizador: number): 0 | 1 {
    if (this.cual !== null) return this.cual;
    const lejos = 0.3;
    const centro = 0.08;
    if (Math.abs(z) > lejos && Math.abs(deslizador) < centro) this.cual = 0;
    else if (Math.abs(deslizador) > lejos && Math.abs(z) < centro) this.cual = 1;
    // Mientras no se sepa, Z, que es donde lo pone el manual de casi todos.
    return this.cual ?? 0;
  }

  olvidar(): void {
    this.cual = null;
  }
}

/** La seta en un solo eje, como la da Chrome en Windows: ocho direcciones. */
function setaEnUnEje(v: number): { arriba: boolean; abajo: boolean } {
  if (!Number.isFinite(v) || v > 1.05) return { arriba: false, abajo: false };
  // −1 arriba, y de ahí en séptimos de vuelta en el sentido del reloj.
  const i = ((Math.round(((v + 1) * 7) / 2) % 8) + 8) % 8;
  return { arriba: i === 7 || i === 0 || i === 1, abajo: i >= 3 && i <= 5 };
}

/** Lee un mando con el reparto de su aparato. */
export function leerMando(m: MandoLeible, gas: GasDelHotas = new GasDelHotas()): LecturaDelMando {
  if (esHotasX(m.id)) return leerHotasX(m, gas);
  return leerConsola(m);
}

function leerConsola(m: MandoLeible): LecturaDelMando {
  const z = (i: number): number => aplicarZonaMuerta(eje(m, i), ZONA_MUERTA);
  // Gatillos como motor: derecho acelera, izquierdo frena. Es la disposición
  // que espera cualquiera que haya jugado a algo de coches.
  const derecho = m.buttons[7]?.value ?? 0;
  const izquierdo = m.buttons[6]?.value ?? 0;
  return {
    aparato: "consola",
    roll: z(0),
    pitch: -z(1),
    rudder: z(2),
    throttle: derecho > 0.02 ? derecho : undefined,
    brakes: izquierdo > 0.4 || boton(m, 0),
    // La cruceta, arriba y abajo: el interruptor del compensador. Son los
    // botones 12 y 13 del reparto estándar de cualquier mando.
    trimArriba: boton(m, 12),
    trimAbajo: boton(m, 13),
    flapsArriba: boton(m, 4),
    flapsAbajo: boton(m, 5),
    tren: boton(m, 3),
    aerofrenos: boton(m, 2),
    reversa: false,
  };
}

function leerHotasX(m: MandoLeible, gas: GasDelHotas): LecturaDelMando {
  // Chrome en Windows numera por código HID (diez ejes); Linux, por orden.
  const porCodigo = m.axes.length >= 9;
  const iz = 2;
  const iGiro = porCodigo ? 5 : 3;
  const iDeslizador = porCodigo ? 6 : 4;
  const cual = gas.elegir(eje(m, iz), eje(m, iDeslizador));
  const palancaDeGas = cual === 0 ? eje(m, iz) : eje(m, iDeslizador);
  const balancin = cual === 0 ? eje(m, iDeslizador) : eje(m, iz);
  // El timón: el giro del mango o el balancín, el que se mueva más.
  const giro = aplicarZonaMuerta(eje(m, iGiro), ZONA_MUERTA_DEL_GIRO);
  const otro = aplicarZonaMuerta(balancin, ZONA_MUERTA_DEL_GIRO);
  const seta = porCodigo
    ? setaEnUnEje(eje(m, 9))
    : { arriba: eje(m, 6) < -0.5, abajo: eje(m, 6) > 0.5 };
  const z = (i: number): number => aplicarZonaMuerta(eje(m, i), ZONA_MUERTA_DEL_JOYSTICK);
  return {
    aparato: "hotas-x",
    roll: z(0),
    pitch: -z(1),
    rudder: Math.abs(giro) >= Math.abs(otro) ? giro : otro,
    throttle: Math.max(0, Math.min(1, (1 + GAS_HACIA_DELANTE * palancaDeGas) / 2)),
    brakes: boton(m, 0),
    trimArriba: seta.arriba,
    trimAbajo: seta.abajo,
    aerofrenos: boton(m, 1),
    flapsArriba: boton(m, 4),
    flapsAbajo: boton(m, 5),
    tren: boton(m, 6),
    reversa: boton(m, 7),
  };
}
