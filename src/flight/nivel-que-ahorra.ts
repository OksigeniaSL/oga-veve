/**
 * **El nivel que ahorra**: a qué altura sale más barato un tramo.
 *
 * Enrique: «a mayor altitud, mejor desempeño, menos consumo y mayor
 * velocidad; ¿se calcula y se refleja?». Una parte ya estaba: el motor gasta
 * por el empuje que da y arriba el aire frena menos. La otra no: el plan
 * elegía el crucero **por la distancia** —que subir y bajar cupieran con un
 * tercio de ruta nivelado— y nunca miraba cuánto se quemaba. Un despachador
 * de verdad mira las dos cosas, y elige el nivel con menos combustible entre
 * los que caben.
 *
 * La cuenta es la del propio juego, con las mismas piezas que vuelan el avión:
 *
 * - **Subir cuesta**: el empuje de subida contra la resistencia, tramo a
 *   tramo, a la velocidad de la escalera. Cuanto más arriba, más tarda cada
 *   mil pies y más se quema subiendo.
 * - **El crucero se paga por milla**: lo que frena el avión nivelado a su
 *   velocidad de crucero, por el consumo específico de su motor, por lo que
 *   tarda. Arriba frena menos —el aire es fino— y se va más deprisa: cada
 *   milla sale más barata.
 * - **Bajar casi no cuesta**: un reactor baja con los motores al ralentí, a
 *   tres millas por cada mil pies, y solo empuja lo que le falte a su planeo
 *   para no salirse de la senda.
 *
 * Y de ahí sale lo que se ve en la realidad: en un salto corto no compensa
 * subir alto, porque se gasta subiendo lo que no da tiempo a ahorrar arriba;
 * en uno largo, sí. Ver `nivelQueAhorra` y su prueba.
 */

import { esDeChorro, type AircraftConfig } from "./aircraft";
import {
  AIRE_ESTANDAR,
  airDensity,
  GRAVITY,
  SEA_LEVEL_DENSITY,
  temperaturaExterior,
} from "./atmosphere";
import { empujeLleno } from "./fdm";
import { machDe, resistenciaDeOnda } from "./limites";
import { consumoEspecifico } from "./combustible";
import { velocidadQueToca, NUDO } from "./escalera-de-velocidades";
import { GAS_DE_SUBIDA } from "./gases-automaticos";

const PIE = 0.3048;
const MILLA = 1852;
/** A cuánto se baja: tres millas por cada mil pies, como el plan. */
const BAJADA_POR_METRO = (3 * MILLA) / (1000 * PIE);
/** La senda de bajada, rad: la de esas tres millas por mil pies. */
const SENDA = Math.atan(1 / BAJADA_POR_METRO);
/** Desde y hasta dónde se cuenta sobre los campos: mil quinientos pies. */
const SOBRE_EL_CAMPO = 1500 * PIE;
/** En cuántos trozos se cuenta la subida. */
const TROZOS = 24;

/** Lo que cuesta un tramo a un nivel. */
export interface CosteDelTramo {
  /** Los kilos quemados, de mil quinientos pies a mil quinientos pies. */
  readonly kilos: number;
  /** Si a ese nivel cabe: si se llega, y si subir y bajar caben en la ruta. */
  readonly cabe: boolean;
  /** Lo que se recorre subiendo y bajando, m. */
  readonly subida: number;
  readonly bajada: number;
}

/** La resistencia del avión limpio y nivelado a esa altura y velocidad, N. */
export function resistenciaNivelado(
  a: AircraftConfig,
  altura: number,
  verdadera: number,
): number {
  const rho = airDensity(altura, AIRE_ESTANDAR);
  const qS = 0.5 * rho * verdadera * verdadera * a.wingArea;
  const cl = (a.mass * GRAVITY) / Math.max(1, qS);
  const ar = (a.wingSpan * a.wingSpan) / a.wingArea;
  const cd =
    a.aero.cd0 +
    (cl * cl) / (Math.PI * ar * a.aero.oswald) +
    resistenciaDeOnda(machDe(verdadera, altura), a.mmo, a.aero.cd0);
  return qS * cd;
}

/** El consumo específico aquí, kg por newton y hora. */
function tsfcEn(a: AircraftConfig, altura: number, verdadera: number): number {
  const theta = (temperaturaExterior(altura) + 273.15) / 288.15;
  return consumoEspecifico(a, { mach: machDe(verdadera, altura), theta });
}

/** La verdadera de una indicada a esa altura, m/s. */
function verdaderaDe(kt: number, altura: number): number {
  return (kt * NUDO) / Math.sqrt(airDensity(altura) / SEA_LEVEL_DENSITY);
}

/**
 * **Lo que cuesta un tramo de `distancia` metros al `nivel` dado**, de mil
 * quinientos pies sobre el campo de salida a mil quinientos sobre el de
 * llegada. Ver la cabecera.
 */
export function costeDelTramo(
  a: AircraftConfig,
  nivel: number,
  distancia: number,
  cotaDeSalida = 0,
  cotaDeLlegada = 0,
): CosteDelTramo {
  const peso = a.mass * GRAVITY;
  const desde = cotaDeSalida + SOBRE_EL_CAMPO;
  const hasta = cotaDeLlegada + SOBRE_EL_CAMPO;
  let kilos = 0;
  let subida = 0;
  let cabe = true;
  const gas = esDeChorro(a) ? GAS_DE_SUBIDA : 1;
  if (nivel > desde) {
    const paso = (nivel - desde) / TROZOS;
    for (let i = 0; i < TROZOS; i++) {
      const h = desde + (i + 0.5) * paso;
      const kt = velocidadQueToca(a, {
        altitud: h,
        restante: null,
        bajando: false,
        enFinal: false,
        subiendo: true,
      }).kt;
      const v = verdaderaDe(kt, h);
      const empuje = gas * empujeLleno(a, airDensity(h), v);
      const ritmo = ((empuje - resistenciaNivelado(a, h, v)) * v) / peso;
      if (ritmo < 0.5) {
        cabe = false;
        break;
      }
      const t = paso / ritmo;
      subida += v * t;
      kilos += (empuje * tsfcEn(a, h, v) * t) / 3600;
    }
  }
  const bajada = Math.max(0, nivel - hasta) * BAJADA_POR_METRO;
  /*
   * Bajando, lo que le falta a su planeo para seguir la senda: casi nada en
   * un reactor, que planea más tendido que tres grados.
   */
  if (nivel > hasta) {
    const h = (nivel + hasta) / 2;
    const kt = velocidadQueToca(a, {
      altitud: h,
      restante: null,
      bajando: true,
      enFinal: false,
      subiendo: false,
    }).kt;
    const v = verdaderaDe(kt, h);
    const empuje = Math.max(0, resistenciaNivelado(a, h, v) - peso * Math.sin(SENDA));
    kilos += (empuje * tsfcEn(a, h, v) * (bajada / v)) / 3600;
  }
  const nivelado = distancia - subida - bajada;
  if (nivelado < 0) cabe = false;
  const kt = velocidadQueToca(a, {
    altitud: nivel,
    restante: null,
    bajando: false,
    enFinal: false,
    subiendo: false,
  }).kt;
  const v = verdaderaDe(kt, nivel);
  kilos +=
    (resistenciaNivelado(a, nivel, v) * tsfcEn(a, nivel, v) * (Math.max(0, nivelado) / v)) /
    3600;
  return { kilos, cabe, subida, bajada };
}

/**
 * **Qué parte de la ruta se vuela nivelada como poco**: un tercio, la misma
 * que pedía la regla de antes. Sin ella, el nivel de menos kilos es casi
 * siempre el más alto al que da tiempo a subir y bajar sin un metro de
 * crucero —la cuenta es plana arriba—, y eso es un vuelo sin crucero: sin el
 * rato en que se cuenta el aire fino, se oye a la comandante y se mira por la
 * ventanilla. Ningún despachador planea así un salto, porque cualquier espera
 * en la llegada lo convierte en una bajada a destiempo.
 */
export const PARTE_NIVELADA = 1 / 3;

/**
 * **El nivel que ahorra**, m, entre los que se le ofrecen, o `null` si en
 * ninguno cabe el tramo.
 *
 * `niveles` son los legales —los del rumbo, por encima de la mínima y por
 * debajo del techo del avión—; de ellos, el de menos kilos de los que dejan
 * su tercio nivelado. A igualdad de kilos, el más bajo, que se sube antes y
 * se baja antes.
 *
 * Comprobado contra la regla que había —subir a dos millas por mil pies, bajar
 * a tres, dos tercios de la ruta para las dos cosas—: daba casi lo mismo, uno
 * o dos niveles por debajo en los reactores, porque un reactor sube bastante
 * más empinado que dos millas por mil pies. Ahora la cuenta es de kilos, que
 * es la que hace quien despacha un vuelo.
 */
export function nivelQueAhorra(
  a: AircraftConfig,
  distancia: number,
  niveles: readonly number[],
  cotaDeSalida = 0,
  cotaDeLlegada = 0,
): number | null {
  let mejor: number | null = null;
  let menos = Infinity;
  for (const n of [...niveles].sort((x, y) => x - y)) {
    const c = costeDelTramo(a, n, distancia, cotaDeSalida, cotaDeLlegada);
    if (!c.cabe || distancia - c.subida - c.bajada < distancia * PARTE_NIVELADA) continue;
    if (c.kilos < menos - 1e-6) {
      menos = c.kilos;
      mejor = n;
    }
  }
  return mejor;
}
