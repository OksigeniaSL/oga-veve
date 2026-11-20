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
 * - **Subir cuesta**: lo que se empuja para subir al ritmo al que se sube
 *   —el de línea, sin pasar de lo que da el gas de subida: ver
 *   `ritmoDeSubida`—, tramo a tramo, a la velocidad de la escalera. Cuanto
 *   más arriba, más se recorre por cada mil pies y más se quema subiendo.
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

import { esDeChorro, masaDe, type AircraftConfig } from "./aircraft";
import {
  AIRE_ESTANDAR,
  airDensity,
  GRAVITY,
  SEA_LEVEL_DENSITY,
  temperaturaExterior,
  type Aire,
} from "./atmosphere";
import { empujeLleno } from "./fdm";
import { machDe, resistenciaDeOnda } from "./limites";
import { quemaPorSegundo } from "./combustible";
import { velocidadQueToca, NUDO } from "./escalera-de-velocidades";
import { GAS_DE_SUBIDA } from "./gases-automaticos";
import { CAPTURA, NIVELADO, ritmoDeLinea } from "./subida-de-linea";

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
  const cl = (masaDe(a) * GRAVITY) / Math.max(1, qS);
  const ar = (a.wingSpan * a.wingSpan) / a.wingArea;
  const cd =
    a.aero.cd0 +
    (cl * cl) / (Math.PI * ar * a.aero.oswald) +
    resistenciaDeOnda(machDe(verdadera, altura), a.mmo, a.aero.cd0);
  return qS * cd;
}

/**
 * **Lo que se quema aquí dando ese empuje**, kg/s: la misma cuenta que en
 * vuelo (`quemaPorSegundo`), que en un avión de hélice va por la potencia.
 */
function quemaEn(a: AircraftConfig, empuje: number, altura: number, verdadera: number): number {
  const theta = (temperaturaExterior(altura) + 273.15) / 288.15;
  return quemaPorSegundo(a, empuje, {
    mach: machDe(verdadera, altura),
    theta,
    sigma: airDensity(altura, AIRE_ESTANDAR) / SEA_LEVEL_DENSITY,
  });
}

/** La verdadera de una indicada a esa altura, m/s. */
function verdaderaDe(kt: number, altura: number, aire?: Aire): number {
  return (kt * NUDO) / Math.sqrt(airDensity(altura, aire) / SEA_LEVEL_DENSITY);
}

/** La verdadera que pide la escalera subiendo a esa altura, m/s. Ver `velocidadQueToca`. */
function verdaderaSubiendo(a: AircraftConfig, altura: number, aire?: Aire): number {
  const kt = velocidadQueToca(a, {
    altitud: altura,
    restante: null,
    bajando: false,
    enFinal: false,
    subiendo: true,
    ...(aire ? { aire } : {}),
  }).kt;
  return verdaderaDe(kt, altura, aire);
}

/**
 * **Lo que sobra para subir con el gas de subida**, m/s: el empuje menos la
 * resistencia, por la velocidad, entre el peso. Es el techo del ritmo.
 */
function ritmoQueDa(a: AircraftConfig, altura: number, verdadera: number): number {
  const gas = esDeChorro(a) ? GAS_DE_SUBIDA : 1;
  const empuje = gas * empujeLleno(a, airDensity(altura), verdadera);
  return ((empuje - resistenciaNivelado(a, altura, verdadera)) * verdadera) / (masaDe(a) * GRAVITY);
}

/**
 * **El ritmo al que se sube aquí**, m/s: el de línea —ver `subida-de-linea.ts`—,
 * que es lo que vuela la tripulación, y nunca más de lo que da el avión con
 * el gas de subida. Un reactor va al de línea con gas de sobra; una avioneta,
 * a lo que le da el motor.
 */
export function ritmoDeSubida(a: AircraftConfig, altura: number, verdadera: number): number {
  return Math.min(ritmoDeLinea(altura), ritmoQueDa(a, altura, verdadera));
}

/** Cada cuántos metros de altura se cuenta la subida. */
const PASO_DE_SUBIDA = 150;
/** El ritmo más bajo con el que se cuenta, m/s: por debajo, el avión no llega. */
const RITMO_MINIMO = 0.5;

/**
 * **La subida del plan**, de `desde` a `hasta`: lo que se recorre por el aire
 * al pasar por cada altitud y lo que se tarda.
 */
export interface SubidaDelPlan {
  /** Las altitudes, m, de `desde` a `hasta`, crecientes. */
  readonly altitudes: readonly number[];
  /** Lo recorrido por el aire al llegar a cada una, m. */
  readonly recorridos: readonly number[];
  /** Lo que se tarda en llegar a cada una, s. */
  readonly segundos: readonly number[];
  /** Si el avión llega: por encima de su techo no sube. */
  readonly llega: boolean;
}

/**
 * **La subida como se vuela**, para el plan: a la velocidad que pide la
 * escalera subiendo —250 nudos de aguja abajo, la indicada del tipo y su Mach
 * arriba—, pasada a verdadera con el aire de cada altura, y al ritmo de
 * `ritmoDeSubida`. Y al final la captura, como la vuela la tripulación: lo que
 * falta partido por `CAPTURA` hasta quedar a `NIVELADO`, que es cuando empieza
 * el crucero.
 *
 * Era una constante, dos millas por cada mil pies, y un reactor que sube a 280
 * nudos de aguja a quince mil pies lleva unos 350 de verdadera: a 2.360 pies
 * por minuto son dos millas y media por cada mil. En un salto corto el plan
 * ponía el nivel donde el avión no llegaba, y el punto de descenso caía antes
 * (enmienda H38h del ADR 0019).
 */
export function subidaDelPlan(
  a: AircraftConfig,
  desde: number,
  hasta: number,
  aire?: Aire,
): SubidaDelPlan {
  const altitudes = [desde];
  const recorridos = [0];
  const segundos = [0];
  if (hasta <= desde) return { altitudes, recorridos, segundos, llega: true };
  let llega = true;
  const arriba = verdaderaSubiendo(a, hasta, aire);
  const captura = Math.min(hasta - desde, Math.max(RITMO_MINIMO, ritmoDeSubida(a, hasta, arriba)) * CAPTURA);
  const recta = hasta - captura;
  const n = Math.max(0, Math.ceil((recta - desde) / PASO_DE_SUBIDA));
  let d = 0;
  let t = 0;
  for (let i = 0; i < n; i++) {
    const h0 = desde + ((recta - desde) * i) / n;
    const h1 = desde + ((recta - desde) * (i + 1)) / n;
    const h = (h0 + h1) / 2;
    const v = verdaderaSubiendo(a, h, aire);
    let ritmo = ritmoDeSubida(a, h, v);
    if (ritmo < RITMO_MINIMO) {
      llega = false;
      ritmo = RITMO_MINIMO;
    }
    const dt = (h1 - h0) / ritmo;
    t += dt;
    d += v * dt;
    altitudes.push(h1);
    recorridos.push(d);
    segundos.push(t);
  }
  if (captura > NIVELADO) {
    const dt = CAPTURA * Math.log(captura / NIVELADO);
    t += dt;
    d += arriba * dt;
  }
  if (recta < hasta) {
    altitudes.push(hasta);
    recorridos.push(d);
    segundos.push(t);
  }
  return { altitudes, recorridos, segundos, llega };
}

/** **Lo que se recorre subiendo** de `desde` a `hasta`, m. Ver `subidaDelPlan`. */
export function distanciaDeSubida(a: AircraftConfig, desde: number, hasta: number, aire?: Aire): number {
  return subidaDelPlan(a, desde, hasta, aire).recorridos.at(-1) ?? 0;
}

/**
 * **Lo que queda por recorrer subiendo desde `altitud`** hasta arriba, m: lo
 * de `subidaDelPlan` contado ya, sin volverlo a contar. Por debajo de donde
 * empezó, todo.
 */
export function quedaDeLaSubida(s: SubidaDelPlan, altitud: number): number {
  const { altitudes: h, recorridos: d } = s;
  const total = d.at(-1)!;
  if (altitud <= h[0]!) return total;
  for (let i = 1; i < h.length; i++) {
    if (altitud <= h[i]!) {
      const tramo = h[i]! - h[i - 1]!;
      const f = tramo > 0 ? (altitud - h[i - 1]!) / tramo : 1;
      return total - (d[i - 1]! + f * (d[i]! - d[i - 1]!));
    }
  }
  return 0;
}

/**
 * **A qué altitud va la subida a `recorrido` metros de donde empezó**, m:
 * la inversa de `subidaDelPlan`, interpolada. Pasado el final, la de arriba.
 */
export function altitudDeLaSubida(s: SubidaDelPlan, recorrido: number): number {
  const { altitudes: h, recorridos: d } = s;
  if (recorrido <= 0) return h[0]!;
  for (let i = 1; i < d.length; i++) {
    if (recorrido <= d[i]!) {
      const tramo = d[i]! - d[i - 1]!;
      const f = tramo > 0 ? (recorrido - d[i - 1]!) / tramo : 1;
      return h[i - 1]! + f * (h[i]! - h[i - 1]!);
    }
  }
  return h.at(-1)!;
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
  const peso = masaDe(a) * GRAVITY;
  const desde = cotaDeSalida + SOBRE_EL_CAMPO;
  const hasta = cotaDeLlegada + SOBRE_EL_CAMPO;
  let kilos = 0;
  let subida = 0;
  let cabe = true;
  /*
   * **Subiendo, como se sube**: al ritmo de `ritmoDeSubida`, que en un
   * reactor es el de línea y no lo que daría con todo el gas de subida. Era
   * esto último, unos cinco mil pies por minuto en el JAZ 90, y el nivel que
   * salía de aquí dejaba un tercio de ruta nivelado que no se volaba nunca:
   * el avión sube a la mitad de ese ritmo. El empuje es el que pide ese ritmo,
   * y el recorrido, el de `subidaDelPlan`, con su captura.
   */
  if (nivel > desde) {
    const paso = (nivel - desde) / TROZOS;
    for (let i = 0; i < TROZOS; i++) {
      const h = desde + (i + 0.5) * paso;
      const v = verdaderaSubiendo(a, h);
      const ritmo = ritmoDeSubida(a, h, v);
      if (ritmo < RITMO_MINIMO) {
        cabe = false;
        break;
      }
      const empuje = resistenciaNivelado(a, h, v) + (peso * ritmo) / v;
      kilos += quemaEn(a, empuje, h, v) * (paso / ritmo);
    }
    subida = distanciaDeSubida(a, desde, nivel);
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
    kilos += quemaEn(a, empuje, h, v) * (bajada / v);
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
  kilos += quemaEn(a, resistenciaNivelado(a, nivel, v), nivel, v) * (Math.max(0, nivelado) / v);
  return { kilos, cabe, subida, bajada };
}

/**
 * **Lo que se deja para bajar, como mucho**: la mitad de la ruta, a tres
 * millas por cada mil pies hasta el campo de llegada. Es la regla práctica de
 * quien despacha un salto corto —no subir más de lo que deja bajar la mitad de
 * la distancia—, y la otra mitad es para subir y para el crucero. Sin ella, el
 * nivel de menos kilos es casi siempre el más alto al que da tiempo a subir y
 * bajar —la cuenta es plana arriba—, y eso es un vuelo sin crucero.
 *
 * Era «un tercio de la ruta nivelado», contado con la subida de todo el gas de
 * subida: unos cinco mil pies por minuto en el JAZ 90, una milla por cada mil
 * pies. Con esa subida, dos tercios para subir a una y bajar a tres son la
 * mitad para bajar: la misma regla, escrita sin la subida que nadie vuela. Con
 * la que se vuela, el tercio bajaba de Los Rodeos a La Palma a FL150, y la
 * tercera escena del modo inicio se quedaba sin la siesta de la subida y sin
 * el kit en la parte alta de la bajada (enmienda H38h del ADR 0019).
 */
export const MITAD_PARA_BAJAR = 1 / 2;

/**
 * **El crucero que tiene que quedar, como poco**, s: un minuto nivelado entre
 * el T/C y el T/D del plan, contados como los cuenta el plan —la subida de
 * `subidaDelPlan` y la bajada de su perfil—. Es lo que dura el crucero de un
 * salto entre islas, y lo que necesita la tercera escena del modo inicio para
 * lo suyo: el «ya estamos arriba», el servicio y el baño con la luz apagada,
 * treinta y cinco segundos sin margen.
 *
 * La mitad se cuenta como la cuenta un despachador —tres millas por cada mil
 * pies hasta el campo—, y el punto de descenso del plan cae antes: frena a
 * 250 nudos nivelado a diez mil quinientos pies y acaba en el punto de final.
 * Así que la mitad no basta para saber que queda crucero; esto sí, porque
 * cuenta lo mismo que el plan.
 */
export const CRUCERO_MINIMO = 60;

/** La verdadera del crucero a ese nivel, m/s: la de la escalera nivelado. */
function verdaderaEnCrucero(a: AircraftConfig, nivel: number): number {
  const kt = velocidadQueToca(a, {
    altitud: nivel,
    restante: null,
    bajando: false,
    enFinal: false,
    subiendo: false,
  }).kt;
  return verdaderaDe(kt, nivel);
}

/**
 * **El nivel que ahorra**, m, entre los que se le ofrecen, o `null` si en
 * ninguno cabe el tramo.
 *
 * `niveles` son los legales —los del rumbo, por encima de la mínima y por
 * debajo del techo del avión—; de ellos, el de menos kilos de los que dejan
 * la mitad de la ruta para bajar —ver `MITAD_PARA_BAJAR`— y su minuto de
 * crucero entre el T/C y el T/D del plan —ver `CRUCERO_MINIMO`—. A igualdad de kilos, el más bajo, que se
 * sube antes y se baja antes.
 *
 * `bajadaDelPlan` es lo que el plan cuenta de bajada desde ese nivel hasta el
 * umbral, m: la de su perfil, con sus tramos para frenar y la aproximación
 * —ver `perfilDeLaBajada`—. Sin ella, tres millas por cada mil pies hasta mil
 * quinientos sobre el campo.
 *
 * Comprobado contra la regla que había —subir a dos millas por mil pies, bajar
 * a tres, dos tercios de la ruta para las dos cosas—: con la subida que se
 * vuela da casi lo mismo, porque arriba un reactor de línea sube a unas dos
 * millas y media por cada mil pies y abajo a menos de dos. Ahora la cuenta es
 * de kilos, que es la que hace quien despacha un vuelo.
 */
export function nivelQueAhorra(
  a: AircraftConfig,
  distancia: number,
  niveles: readonly number[],
  cotaDeSalida = 0,
  cotaDeLlegada = 0,
  bajadaDelPlan?: (nivel: number) => number,
): number | null {
  let mejor: number | null = null;
  let menos = Infinity;
  for (const n of [...niveles].sort((x, y) => x - y)) {
    const c = costeDelTramo(a, n, distancia, cotaDeSalida, cotaDeLlegada);
    if (!c.cabe) continue;
    if (Math.max(0, n - cotaDeLlegada) * BAJADA_POR_METRO > distancia * MITAD_PARA_BAJAR) continue;
    const bajada = bajadaDelPlan ? bajadaDelPlan(n) : c.bajada;
    const nivelado = distancia - distanciaDeSubida(a, cotaDeSalida, n) - bajada;
    if (nivelado < CRUCERO_MINIMO * verdaderaEnCrucero(a, n)) continue;
    if (c.kilos < menos - 1e-6) {
      menos = c.kilos;
      mejor = n;
    }
  }
  return mejor;
}
