/**
 * **Cada avión despega y aterriza en la distancia de su manual**, y la cuenta
 * del hangar dice lo mismo que el avión que se vuela. Ver el ADR 0027.
 *
 * Tres cosas que no estaban atadas y que derivaban cada una por su lado:
 *
 * - **Lo que pide el hangar** (`pistaQueNecesita`), que decide en qué campo se
 *   ofrece cada avión.
 * - **Lo que hace el avión** en el modelo de coeficientes, el de verdad, con sus
 *   fuerzas: aquí se le suelta en una pista y se le despega con un piloto de una
 *   línea, y se le posa y se le frena a fondo.
 * - **Lo que dice el manual de su tipo**, a la masa de la ficha.
 *
 * El 13-11-2026 el 747 pedía 2.361 m para despegar donde Boeing da unos 1.710
 * a su peso, porque llevaba la Vr de su peso máximo; y el Seneca frenaba en
 * 309 m donde su manual da 421. Esto es lo que lo habría dicho.
 *
 * ## Cómo se escala
 *
 * Cada manual da su cifra a una masa, y la ficha pesa otra: la distancia de
 * despegue va con el cuadrado de la masa —la Vr al cuadrado va con ella, y la
 * aceleración con su inversa— y la de aterrizaje, con la masa. Es la misma
 * cuenta que `distancia-de-aterrizaje.test.ts`.
 *
 * ## Contra qué
 *
 * - **Avionetas**, la distancia sin margen hasta y desde los cincuenta pies:
 *   - JAZ 20 con el Cessna 172S a 2.550 lb: 1.630 ft para despegar y 1.335 para
 *     aterrizar (manual de vuelo, sección 5).
 *   - JAZ 40 con el Piper Seneca II a 4.570 lb: 1.240 y 2.110 ft (tabla
 *     comparativa de la Grumman Owners and Pilots Association, aya.org).
 * - **JAZ 60 con el Beech 1900D**, de la categoría de cercanías (14 CFR 23
 *   hasta la enmienda 34), que publica las dos cosas de manera distinta:
 *   - **para despegar, su longitud de campo**, ya con sus márgenes: 3.811 ft
 *     a sus 17.120 lb, nivel del mar y día estándar (*Plane & Pilot*,
 *     «Beechcraft 1900», 3.813; y 3.740 a las 16.950 lb del primero,
 *     *Business & Commercial Aviation*, diciembre de 1991, que escaladas con
 *     el cuadrado de la masa dan lo mismo). Es la equilibrada: la que deja
 *     abortar o seguir con un motor parado, y como en los bimotores de
 *     línea, es un techo;
 *   - **para aterrizar, la distancia sin margen** desde los cincuenta pies:
 *     2.790 ft (*Plane & Pilot*) a su máximo al aterrizar, 16.765 lb (FSF,
 *     *Accident Prevention*, mayo de 2004). Los 4.667 ft de pista que se le
 *     publican son esos partidos por 0,6.
 * - **Reactores**, la pista que publica el fabricante, que ya lleva los
 *   márgenes de su norma, contra la que pide el hangar con los mismos:
 *   - JAZ 120 con el 747-100 a 564.000 lb: unos 5.600 ft para despegar y 6.150
 *     para aterrizar (Boeing, D6-58326, 3.3.1 y 3.4.2); 1.890 m para aterrizar
 *     a su máximo al aterrizar, que es la masa de la ficha (Jenkinson, Simpkin
 *     y Rhodes, *Civil Jet Aircraft Design*, 1999, fichero A).
 *   - JAZ 110 con el 787-9 a 192.776 kg: 1.800 y 1.800 m (Boeing, D6-58333,
 *     3.3.9 y 3.4.3).
 *   - JAZ 90 con el Embraer 170: 1.151 m para despegar con el pasaje lleno en
 *     un vuelo de quinientas millas, más pesado que la ficha, y 1.228 para
 *     aterrizar a sus 32.800 kg (hoja de especificaciones del E170).
 *
 * **En los bimotores de línea, el despegue publicado es un techo y no una
 * cifra**: su longitud de campo la manda casi siempre el despegue con un motor
 * parado, que este juego no cuenta, y la de todos los motores por 1,15 sale por
 * debajo. En el cuatrimotor manda la de todos los motores, y se compara de
 * frente.
 *
 * - **JAZ 50 con el DHC-6 Twin Otter de la Serie 400**, que está en el taller
 *   (ver `RESERVADOS`): 454 m para despegar con los márgenes de la SFAR 23 y
 *   460 para aterrizar sin ellos (Viking, 2018). Su despegue se mira contra la
 *   de todos los motores por 1,15, y su parada aparte.
 *
 * El JAZ 25, el fumigador, no tiene tipo con el que medirlo. El JAZ 60 era un
 * tipo mezclado —el ala y el peso del Twin Otter con la frenada del 1900D— y
 * no se comparaba; desde el 13-11-2026 es un 1900D (ver el ADR 0027).
 *
 * ## Lo que salió al escribirlo
 *
 * ```
 *            despegar (m)                 aterrizar (m)
 *            hangar  volado  manual       hangar  manual
 *   jaz-20     406     469     449          407     387   sin margen
 *   jaz-40     536     672     352          633     620   sin margen
 *   jaz-50     447     468     564          453     427   con / sin
 *   jaz-60   1.001     996  ≤1.025          815     816   con / sin
 *   jaz-90   1.022   1.192  ≤1.151        1.206   1.123   con margen
 *   jaz-110  1.826   1.783  ≤1.800        1.762   1.800   con margen
 *   jaz-120  1.869   1.792   1.710        1.816   1.875   con margen
 * ```
 *
 * «Volado», en los reactores y en el 1900D, es la distancia hasta los treinta
 * y cinco pies por 1,15; el hangar pide además la de abortar desde su V1 si es
 * más larga, que en el JAZ 90, el 110 y el 120 lo es
 * (`acelerarYPararDeSuNorma`); en el JAZ 60 las dos salen a tres metros. El JAZ 60 despega con margen —su longitud de
 * campo— y aterriza sin él, que es como publica cada cosa. La toma
 * volada frena lo mismo que la cuenta, al uno por ciento, y el aire de la toma
 * es el de su clase en los dos.
 *
 * En el JAZ 50 el hangar pide la de abortar desde su V1, 447 m, por debajo de
 * los 564 de la suya en su manual; su despegue con todos los motores por 1,15
 * da 389 contra los 379 del manual, y volado, sin márgenes y hasta los
 * cincuenta pies, 468 contra 338 de la cuenta (ver abajo).
 *
 * El volado del 110 y del 120 es el de la cola de su fabricante (H7b): eran
 * 1.625 y 1.841 con los 8,5° y 8,6° de antes, sin fuente. Y el de todos, con el
 * avión girando sobre sus ruedas principales al rotar (H7c): el 110 y el 120
 * eran 1.615 y 1.800 girando sobre el centro de gravedad. La fila del 110 es
 * la de la Vr de su tipo (H10b): con la de la regla pedía 1.544 y volaba 1.612.
 *
 * Lo que queda fuera de su banda, dicho y no escondido, avión por avión (ver la
 * enmienda H7b del ADR 0027):
 *
 * - **El Seneca rueda demasiado para despegar**: 320 m hasta la Vr donde el
 *   suyo rueda unos 247 a esta masa. No es la proporción —ésa ya es la suya, la
 *   de `deRodarADespegar` de su ficha— ni la Vr: para rodar 247 m con su
 *   empuje tendría que rotar a unos 58 nudos, por debajo de su pérdida con los
 *   flaps de despegue, 62. Le falta empuje en la carrera: rodar 247 m hasta 72
 *   nudos pide una aceleración media de 2,8 m/s². Con la recta de empuje de
 *   la hélice de paso fijo llevaba 1,8 y rodaba 376 m; con la de su hélice de
 *   paso variable (enmienda H37a) el empuje casi no cae rodando y rueda 320.
 *   Lo que queda ya no es la ley de la hélice sino su empuje parado, 5 kN,
 *   elegido por la subida y sin fuente. Se comprueba que no empeore.
 * - **El JAZ 120 ya despega volando en lo que dice la cuenta**, al 5 %: con la
 *   cola de Boeing sus ruedas dejan la pista a 9,8°, donde el suyo se va a
 *   10,1°.
 * - **El JAZ 110 ya despega volando en lo que dice la cuenta**, al 1,7 %, con
 *   la Vr de su tipo: 172 nudos a 253.400 kg con los flaps a cinco (AAIB,
 *   *Bulletin* 11/2020, VH-ZND), 150 a la masa de la ficha. Con la regla de 1,1
 *   veces la pérdida rotaba a 138, necesitaba 11,6° para sostenerse y su cola
 *   le deja 9,7: volaba un 11 % más. Ahora se va a 7,7°, y el de verdad a
 *   6–7,5°; lo que queda es la primera muesca de flaps del modelo, que
 *   sustenta poco (Jenkinson da al 747-100 un CL máximo de despegue de 2,03, y
 *   el modelo, 1,73). Enmienda H10b.
 * - **El JAZ 90**, un 19 % más largo volando, y no por la cola: con la de su
 *   dibujo, 14,2° donde eran 9°, se sigue yendo del suelo a 8,1° (a 7,8° con
 *   la Vr de 129 nudos de la enmienda H20e, y con ella el hangar le pide
 *   1.022 m y vuela 1.192, donde eran 1.124 y 1.264). **Ni por el
 *   avión volado** (traza de la enmienda H20b): de la Vr a los treinta y cinco
 *   pies tarda 5,8 s, como el 787 —5,7— y el 747 —6,2—. Lo que se queda corta
 *   es la cuenta: la proporción de su clase, 2.500 / 1.800, es la del 747 a su
 *   peso máximo, y cuenta ese tramo como una parte de la carrera. El E170 de la
 *   ficha lleva 0,43 de empuje por peso, donde los dos anchos llevan 0,33 y
 *   0,34, así que rueda poco para lo deprisa que va, y esa parte le da 262 m:
 *   unos 3,5 s a su velocidad, que no los vuela ningún reactor. Contar ese tramo
 *   como un tiempo le pedía 1.264 m con la Vr de antes, por encima de los 1.151
 *   de Embraer con más masa: falta además una cifra de Embraer de su carrera o
 *   de su despegue con todos los motores, y sin ella no se toca.
 * - **Los dos de fuselaje ancho aterrizan un 3 y un 2 % más corto que su
 *   manual**, con los segundos entre tocar y frenar del todo que cuenta la
 *   distancia certificada: uno hasta el primer dispositivo de frenada y otro
 *   por cada uno que siga (FAA, AC 91-79A Chg 2, figura 1, p. 6), dos en un
 *   reactor —los frenos de tierra y el freno—. Ver `segundosHastaFrenar`. Sin
 *   ellos salían un 12 % cortos: el 747 pedía 1.652 m y ahora 1.816, el 787
 *   1.591 y ahora 1.762 (enmienda H20e). No era la Vref —la del 787-9 es la de
 *   la FAA, y la del 747-100, la de Jenkinson, 141 nudos, la acortaría— ni el
 *   freno: llegar a su cifra con la rodadura pedía un pie a fondo por debajo
 *   del autofreno MED.
 * - **El JAZ 90 aterriza un 7 % largo**, con la Vref de la FAA —124 nudos a
 *   73.413 lb, 117,7 a la masa de la ficha— y esos dos segundos. A su máximo al
 *   aterrizar pide 1.266 m donde Embraer da 1.228: cerrarlo pediría frenar con
 *   0,53, más del medio g de `frenada.test.ts`, y frena con 0,49, lo más que
 *   deja esa regla. A la masa de la ficha pide 1.206, y la cifra de Embraer
 *   escalada con la masa da 1.123: lo demás es el aire y los dos segundos, que
 *   no bajan con la masa como la rodadura. Antes llevaba 132 nudos sin fuente y
 *   aterrizaba un 11 % largo (enmienda H20e).
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, MEDIDOS, esDeChorro, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
import { alturaSobreLasRuedas, palancaParaRodar } from "./apoyo";
import {
  acelerarYPararDeSuNorma,
  carreraHastaVr,
  distanciaDeAterrizaje,
  distanciaDeDespegue,
  enPlaneoDesdeElUmbral,
  parteDeLaLda,
  pistaQueNecesita,
  rodaduraDeFrenada,
  segundosHastaFrenar,
  velocidadDeToma,
  margenDeSuClase,
  pistaNecesariaHoy,
  despegueVolado,
} from "./carrera";
import { aireDelParte, airDensity } from "./atmosphere";
import { VR_SOBRE_LA_PERDIDA, perdidaCon } from "./velocidades-de-despegue";
import { flapsDeDespegue } from "./flaps";

const PIE = 0.3048;
const LIBRA = 0.45359237;
const DT = 1 / 120;
const GRADO = Math.PI / 180;

function avion(id: string): AircraftConfig {
  return MEDIDOS.find((a) => a.id === id)!;
}

/**
 * **Despega el avión en el modelo de coeficientes** y dice dónde rota, dónde se
 * va del suelo y dónde pasa la altura de su norma: cincuenta pies una avioneta
 * (CS 23), treinta y cinco un avión de transporte (CS 25.113).
 *
 * El piloto hace lo de un manual: todo el gas, los flaps de despegue, a la Vr un
 * tirón firme hacia una actitud que crece a tres grados por segundo, y en el
 * aire la actitud que sostiene 1,2 veces la pérdida con esos flaps —una de
 * subir con todos los motores, cerca de la V2 de los de transporte
 * (`conUnMotor`) y de la velocidad de los cincuenta pies de las avionetas—,
 * sin pasar de veinte grados.
 *
 * **Y sabe que el suelo pica** (H56b): a lo que pide para seguir esa actitud
 * suma la palanca que pide el picado del suelo, `palancaDelSuelo`, como el
 * banco en la recogida desde H56. Es lo que hace quien rota de verdad: si el
 * morro no sube al ritmo de siempre, tira más hasta que sube. Sin eso, esta
 * mano —que solo corrige por lo que le falta de actitud— se queda atrás lo que
 * pica el suelo partido por su ganancia, y el 747 se iba del suelo a 9,7° en
 * vez de 10,1° y pasaba los 35 pies 19 m más allá. Con ella, la flota entera
 * vuela al metro lo de antes del picado: sostenido, el picado no alarga el
 * despegue, y por eso la cuenta del hangar no tiene nada que saber de él
 * (enmienda H56b del ADR 0027).
 */
function despegar(
  a: AircraftConfig,
  /**
   * La temperatura del día, °C, en un campo al nivel del mar. La Vr y la de
   * subir son indicadas: con aire fino se rota y se sube a más verdadera.
   */
  temperatura = 15,
): {
  readonly hastaVr: number;
  readonly hastaIrse: number;
  readonly hastaLaAltura: number;
  /** La actitud con la que se va del suelo, rad. */
  readonly actitudAlIrse: number;
  /** La densidad del aire del día, kg/m³. */
  readonly densidad: number;
} {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  const aire = aireDelParte(temperatura, 0);
  m.ponerAire(aire);
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
  const densidad = airDensity(0, aire);
  const raiz = Math.sqrt(densidad / 1.225);
  const vr = a.rotationSpeed / raiz;
  const altura = (esDeChorro(a) ? 35 : 50) * PIE;
  const subirA = Math.max(perdidaCon(a, flapsDeDespegue(a)) * 1.2, a.rotationSpeed * 1.05) / raiz;
  let x = 0;
  let hastaVr = 0;
  let hastaIrse = Infinity;
  let actitudAlIrse = NaN;
  let rotando = false;
  let actitud = 0;
  const antes = new Vector3();
  const s = m.state;
  for (let k = 0; k < Math.round(200 / DT); k++) {
    antes.copy(s.position);
    const v = s.airspeed;
    if (v >= vr) rotando = true;
    const cabeceo = s.alpha + Math.atan2(s.verticalSpeed, Math.max(1, s.groundSpeed));
    // Antes de la Vr, la palanca suelta; el de rueda de cola, levantando la
    // cola según corre. Ver `palancaParaRodar`.
    let elevator = palancaParaRodar(a, v * raiz, cabeceo, s.pitchRate);
    if (rotando) {
      if (s.onGround) actitud = Math.min(actitud + 3 * GRADO * DT, 20 * GRADO);
      else {
        const ritmo = Math.max(-3, Math.min(3, v - subirA)) * GRADO;
        actitud = Math.max(0, Math.min(20 * GRADO, actitud + ritmo * DT));
      }
      elevator = Math.max(
        -1,
        Math.min(1, (actitud - cabeceo) * 12 - s.pitchRate * 1.5 + m.palancaDelSuelo()),
      );
    }
    m.step(DT, {
      ...neutralControls(),
      engineOn: true,
      throttle: 1,
      flaps: flapsDeDespegue(a),
      elevator,
    });
    const paso = Math.hypot(s.position.x - antes.x, s.position.z - antes.z);
    x += paso;
    if (v < vr) hastaVr += paso;
    /*
     * Se va del suelo cuando las ruedas principales lo dejan, y no cuando se
     * apaga `onGround`: eso es un palmo más arriba —ver `PEGADO_AL_SUELO`—, y
     * con el piloto rotando a tres grados por segundo, ese palmo es más de un
     * grado de actitud en el 747. Con el apoyo en el centro de gravedad
     * (antes de H7c) las dos cosas pasaban con las ruedas aún dentro de la
     * pista. Ver `flight/apoyo.ts`.
     */
    const ruedas =
      s.position.y -
      alturaSobreLasRuedas(a, Math.asin(new Vector3(0, 0, -1).applyQuaternion(s.orientation).y));
    if (!Number.isFinite(hastaIrse) && ruedas > 0.01) {
      hastaIrse = x;
      actitudAlIrse = cabeceo;
    }
    if (s.position.y - a.gearHeight >= altura) {
      return { hastaVr, hastaIrse, hastaLaAltura: x, actitudAlIrse, densidad };
    }
  }
  return { hastaVr, hastaIrse, hastaLaAltura: Infinity, actitudAlIrse, densidad };
}

/** Posa el avión a su velocidad de toma y lo frena como su manual, m. */
function frenar(a: AircraftConfig): number {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  const desde = velocidadDeToma(a);
  m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: desde });
  const s = m.state;
  s.onGround = true;
  s.position.y = a.gearHeight;
  m.setOnRunway(true);
  const mandos = {
    ...neutralControls(),
    throttle: 0,
    flaps: 1,
    brakes: 1,
    frenosDeTierra: a.frenosDeTierra ? 1 : 0,
  };
  let metros = 0;
  let segundos = 0;
  while (Math.hypot(s.velocity.x, s.velocity.z) > 0.5 && segundos < 240) {
    const antes = s.position.clone();
    // El de rueda de cola baja la cola según frena, como la cuenta.
    const cabeceo = Math.asin(new Vector3(0, 0, -1).applyQuaternion(s.orientation).y);
    m.step(1 / 60, { ...mandos, elevator: palancaParaRodar(a, s.airspeed, cabeceo, s.pitchRate) });
    metros += Math.hypot(s.position.x - antes.x, s.position.z - antes.z);
    segundos += 1 / 60;
  }
  return metros;
}

/** Lo que se le pide a cada uno, ya escalado a la masa de su ficha. */
interface DelManual {
  /** Sin margen, hasta la altura de su norma; o la pista publicada. */
  readonly despegar: number;
  readonly aterrizar: number;
  /** Si las cifras son de pista, con los márgenes, o de distancia, sin ellos. */
  readonly conMargen: boolean;
  /**
   * Si la de aterrizar va de otra manera que la de despegar: el 1900D publica
   * la pista para despegar y la distancia sin margen para aterrizar.
   */
  readonly aterrizajeConMargen?: boolean;
  /** Si el despegue publicado es solo un techo: ver la cabecera. */
  readonly despegueEsTecho: boolean;
}

function escalado(
  a: AircraftConfig,
  despegar: { metros: number; kilos: number },
  aterrizar: { metros: number; kilos: number },
  conMargen: boolean,
  despegueEsTecho = false,
): DelManual {
  return {
    despegar: despegar.metros * (a.mass / despegar.kilos) ** 2,
    aterrizar: aterrizar.metros * (a.mass / aterrizar.kilos),
    conMargen,
    despegueEsTecho,
  };
}

const MANUALES: Readonly<Record<string, (a: AircraftConfig) => DelManual>> = {
  "jaz-20": (a) =>
    escalado(
      a,
      { metros: 1630 * PIE, kilos: 2550 * LIBRA },
      { metros: 1335 * PIE, kilos: 2550 * LIBRA },
      false,
    ),
  "jaz-40": (a) =>
    escalado(
      a,
      { metros: 1240 * PIE, kilos: 4570 * LIBRA },
      { metros: 2110 * PIE, kilos: 4570 * LIBRA },
      false,
    ),
  // El despegue de Embraer es con el pasaje lleno a quinientas millas: más
  // pesado que la ficha, así que no se escala, y es un techo.
  "jaz-60": (a) => ({
    ...escalado(
      a,
      { metros: 3811 * PIE, kilos: 17120 * LIBRA },
      { metros: 2790 * PIE, kilos: 16765 * LIBRA },
      true,
      true,
    ),
    aterrizajeConMargen: false,
  }),
  /*
   * El Twin Otter publica su despegue y su toma sin márgenes: 454 m hasta los
   * cincuenta pies con los dos motores y 460 m desde ellos, con frenos de rueda
   * (Viking, *Twin Otter Series 400 Technical Specifications*, 2018), a su peso
   * máximo al despegar y al aterrizar. **Los 454 no llevan el 1,15** (H58): son
   * la «all engine operating takeoff distance» de la SFAR 23, § 5 d, «the
   * horizontal distance required to takeoff and climb to a height of 50 feet
   * above the takeoff surface» (hoy, el apéndice A de la 14 CFR 135). Se leía
   * como una longitud de campo con su margen, y la cuenta llevaba los 454
   * partidos por 1,15: 338 m donde su manual da 379.
   */
  "jaz-50": (a) =>
    escalado(a, { metros: 454, kilos: 5670 }, { metros: 460, kilos: 5579 }, false),
  "jaz-90": (a) =>
    escalado(a, { metros: 1151, kilos: a.mass }, { metros: 1228, kilos: 32800 }, true, true),
  "jaz-110": (a) =>
    escalado(a, { metros: 1800, kilos: 192776 }, { metros: 1800, kilos: 192776 }, true, true),
  "jaz-120": (a) =>
    escalado(
      a,
      { metros: 5600 * PIE, kilos: 564000 * LIBRA },
      { metros: 6150 * PIE, kilos: 564000 * LIBRA },
      true,
    ),
};

/** Lo que pide el hangar, con o sin margen según lo que dé el manual. */
function delHangar(a: AircraftConfig, conMargen: boolean): { despegar: number; aterrizar: number } {
  if (conMargen) return pistaQueNecesita(a);
  return { despegar: distanciaDeDespegue(a), aterrizar: distanciaDeAterrizaje(a) };
}

describe("el despegue y la toma de cada avión, contra su manual", () => {
  for (const [id, manualDe] of Object.entries(MANUALES)) {
    const a = avion(id);
    const manual = manualDe(a);
    const hangar = {
      despegar: delHangar(a, manual.conMargen).despegar,
      aterrizar: delHangar(a, manual.aterrizajeConMargen ?? manual.conMargen).aterrizar,
    };

    /*
     * La toma, con un diez por ciento a cada lado en la cuenta del hangar: las
     * cifras de los reactores son lecturas de una gráfica y las de las
     * avionetas, de un manual que mide a su manera. Los dos de fuselaje ancho
     * tenían un listón aparte, hasta un 14 % por debajo, mientras les faltaban
     * los segundos de la AC 91-79A; con ellos ya caben en el de todos
     * (enmienda H20e).
     */
    it(`${id} aterriza en lo que dice su manual`, () => {
      const r = hangar.aterrizar / manual.aterrizar;
      const dicho = `${id}: el hangar pide ${Math.round(hangar.aterrizar)} m y el manual ${Math.round(manual.aterrizar)}`;
      expect(r, dicho).toBeGreaterThan(0.9);
      expect(r, dicho).toBeLessThan(1.12);
    });

    it.skipIf(id === "jaz-40")(`${id} despega en lo que dice su manual`, () => {
      const r = hangar.despegar / manual.despegar;
      const dicho = `${id}: el hangar pide ${Math.round(hangar.despegar)} m y el manual ${Math.round(manual.despegar)}`;
      // Un techo en los bimotores de línea; de frente en los demás. El techo,
      // con un 3 % de lectura de gráfica: el 787 con la Vr de su tipo pide
      // 1.826 m donde la de Boeing da 1.800 (enmienda H10b).
      expect(r, dicho).toBeGreaterThan(manual.despegueEsTecho ? 0.75 : 0.88);
      expect(r, dicho).toBeLessThan(manual.despegueEsTecho ? 1.03 : 1.12);
    });
  }

  /*
   * **El Twin Otter publica además su parada desde la V1**, 675 m (Viking,
   * 2018), y se mira aparte: la de su cuenta, 449 m, se queda por debajo de los
   * 564 de su manual a la masa de la ficha. No es su frenada, que es la que
   * para en su toma, ni el tiempo de decidir: la cuenta lleva los dos segundos
   * de la norma de los de transporte (CS 25.109), y la SFAR 23 no pide ninguno
   * en su § 5 c (H58). Lo que la alarga en su manual no se ha leído. Se fija
   * que no se aleje más.
   */
  it("la parada del jaz-50 desde la V1 se queda por debajo de la de su manual, sin alejarse más", () => {
    const a = avion("jaz-50");
    const suya = 675 * (a.mass / 5670) ** 2;
    const r = acelerarYPararDeSuNorma(a) / suya;
    expect(r).toBeGreaterThan(0.75);
    expect(r).toBeLessThan(1);
  });

  it("el Seneca no despega peor que hoy, aunque todavía rueda de más", () => {
    // Ver la cabecera: 376 m hasta la Vr donde el suyo rueda unos 247, y no es
    // la Vr sino el empuje en la carrera. Hasta que la hélice tenga su modelo,
    // se fija que no se aleje más.
    const a = avion("jaz-40");
    const r = distanciaDeDespegue(a) / MANUALES["jaz-40"]!(a).despegar;
    expect(r).toBeLessThan(1.55);
  });
});

describe("la cuenta del hangar y el avión que se vuela dicen lo mismo", () => {
  for (const a of MEDIDOS) {
    if (a.helicoptero) continue;

    /*
     * La rodadura hasta la Vr: las mismas fuerzas por dos caminos. Al cuatro por
     * ciento, como en `prestaciones.test.ts`.
     */
    it(`${a.id} rueda hasta la Vr lo que dice la cuenta`, () => {
      const { hastaVr } = despegar(a);
      const r = hastaVr / carreraHastaVr(a);
      expect(r, `${a.id}: volado ${Math.round(hastaVr)} m, cuenta ${Math.round(carreraHastaVr(a))}`).toBeGreaterThan(0.93);
      expect(r).toBeLessThan(1.07);
    });

    /*
     * Hasta la altura de su norma. Al cinco por ciento los que tienen la cola
     * de su fabricante y se van del suelo a su actitud: el JAZ 120 (H7b) y el
     * JAZ 110 con la Vr de su tipo (H10b). Los demás, más ancho y torcido hacia
     * arriba: se van del suelo más tarde que la cuenta (ver la cabecera), y eso
     * no puede pasar de una quinta parte.
     *
     * **El JAZ 50**, como los demás desde H58: con la proporción de su manual,
     * que no lleva margen, la cuenta dice 388 m y vuela 460, 1,19 (con la de
     * antes, 338, vuela 1,36 y tenía su propio tope de 1,45). Su manual da 379.
     * Rueda hasta la Vr lo que la cuenta —213 m contra 208—; lo que se
     * alarga es lo de después. Rota a 73 nudos, 1,16 veces su pérdida con los
     * flaps de despegue, y a esa velocidad necesita casi nueve grados para
     * volar: con el tirón de tres grados por segundo de este piloto se va del
     * suelo a 84 nudos y pasa los cincuenta pies a 90, donde el suyo pasa a 76.
     * La cuenta del hangar sí da lo de su manual (ver arriba); lo que falta es
     * su actitud en el suelo y el calado de su ala, que no se han leído.
     *
     * Sin el biplano. Ya rueda como uno de rueda de cola —este piloto le
     * levanta la cola según corre, `palancaParaRodar`— y rueda hasta la Vr lo
     * que la cuenta; pero de la Vr a los cincuenta pies vuela unos 220 m donde
     * la proporción de su tipo, la del Ag Cat, da 125. **No es el aire**: de
     * irse del suelo a los cincuenta pies vuela 140 m, lo que rueda hasta la
     * Vr, donde su manual da 0,9 veces la carrera. Son los 84 m y 3 s **entre
     * la Vr y el despegue**: llega a la Vr con la cola arriba y a nivel
     * —`actitudEnTierra` la sube del todo al 85 % de la Vr— y este piloto rota
     * desde ahí a tres grados por segundo, como en un triciclo, hasta los 7,5°
     * con los que se va, a 1,21 veces la Vr. Su manual cuenta la carrera hasta
     * irse del suelo, sin ese tramo. Lo que falta es su actitud de despegue con
     * la cola arriba, o cómo se va del suelo, que su manual no da (enmienda
     * H20b).
     */
    it.skipIf(a.id === "jaz-25")(`${a.id} despega volando en lo que dice la cuenta`, () => {
      const { hastaIrse, hastaLaAltura } = despegar(a);
      expect(hastaIrse).toBeLessThan(hastaLaAltura);
      const r = hastaLaAltura / distanciaDeDespegue(a);
      const dicho = `${a.id}: volado ${Math.round(hastaLaAltura)} m, cuenta ${Math.round(distanciaDeDespegue(a))}`;
      const cerrado = a.id === "jaz-120" || a.id === "jaz-110";
      /*
       * El JAZ 40, hasta un 32 %: con la hélice de paso variable (H37a) rueda
       * hasta la Vr 323 m, donde rodaba 376, y la cuenta toma lo de después
       * como una proporción fija de la carrera —la de su manual, 1.240 entre
       * 870—. Volando, lo de después no se acorta en esa proporción: de la Vr
       * a los cincuenta pies eran 296 m y son 270. Volado 593 m contra 456 de
       * la cuenta, y su manual pide 352; con la recta eran 672 contra 536.
       */
      const ancho = a.id === "jaz-40" ? 1.32 : 1.2;
      expect(r, dicho).toBeGreaterThan(cerrado ? 0.95 : 0.9);
      expect(r, dicho).toBeLessThan(cerrado ? 1.05 : ancho);
    });

    /* Y la frenada: la misma cuenta de `frenada.ts` por dos caminos. */
    it(`${a.id} frena volando lo que dice la cuenta`, () => {
      const r = frenar(a) / rodaduraDeFrenada(a);
      expect(r).toBeGreaterThan(0.97);
      expect(r).toBeLessThan(1.03);
    });
  }
});

/*
 * **La pista que pide el hangar, con su margen, por encima de lo que vuela el
 * avión del juego**, en los ocho (H58). El margen existe para que el avión
 * despegue de sobra, y no justo: el biplano y el Twin Otter pedían con margen
 * 340 y 449 m y volaban 350 y 460 hasta la altura de su norma, porque la
 * cuenta era solo la de su manual y el modelo vuela más (ver `despegueVolado`).
 *
 * Con el margen de su clase sobre lo volado y no solo sobre 1: el hangar
 * pide la mayor de la distancia de su manual y la volada, por su margen, y
 * eso tiene que quedar al menos a un 10 % por encima. En el día de tablas y en
 * uno de treinta y cinco grados.
 */
describe("la pista que pide el hangar, con su margen, cubre lo que vuela el avión", () => {
  for (const a of MEDIDOS) {
    if (a.helicoptero) continue;
    for (const temperatura of [15, 35]) {
      it(`${a.id} pide con margen más de lo que vuela a ${temperatura} °C`, () => {
        const volado = despegar(a, temperatura);
        const pide = pistaNecesariaHoy(a, {
          densidad: volado.densidad,
          vientoDeFrente: 0,
          superficie: "asfalto",
        });
        const r = pide / volado.hastaLaAltura;
        const dicho = `${a.id} a ${temperatura} °C: pide ${Math.round(pide)} m y vuela ${Math.round(volado.hastaLaAltura)}`;
        expect(r, dicho).toBeGreaterThan(1.1);
      });
    }

    /*
     * Y la cuenta que lo vuela dice lo que vuela el modelo, al cinco por
     * ciento: de 0,96 a 1,03 al escribirlo. Se queda algo corta en los que
     * tardan en irse del suelo porque no lleva lo que tarda el morro en
     * responder.
     */
    it(`${a.id}: lo que vuela la cuenta es lo que vuela el modelo`, () => {
      const volado = despegar(a).hastaLaAltura;
      const r = despegueVolado(a) / volado;
      const dicho = `${a.id}: la cuenta vuela ${Math.round(despegueVolado(a))} m y el modelo ${Math.round(volado)}`;
      expect(r, dicho).toBeGreaterThan(0.95);
      expect(r, dicho).toBeLessThan(1.05);
    });
  }
});

/*
 * **La Vr de su tipo donde se publica, escalada con la raíz de la masa; donde
 * no, la regla** de 1,1 veces la pérdida con los flaps de despegue (enmienda
 * H10b):
 *
 * - **JAZ 110**: 172 nudos a 253.400 kg con los flaps a cinco (AAIB, *Bulletin*
 *   11/2020, VH-ZND). La regla le daba 138 a su peso, doce menos.
 * - **JAZ 120**: 164 nudos a 708.002 lb con los flaps a diez (NTSB, AAR-72-17,
 *   Pan Am 845, un 747-121). Aquí la regla dice lo mismo al uno por ciento.
 * - **JAZ 90**: sin cifra de Embraer, la regla.
 */
const VR_PUBLICADA: Readonly<Record<string, { nudos: number; kilos: number }>> = {
  "jaz-110": { nudos: 172, kilos: 253400 },
  "jaz-120": { nudos: 164, kilos: 708002 * LIBRA },
};

describe("la Vr de los reactores es la de su peso", () => {
  for (const a of AIRCRAFT.filter(esDeChorro)) {
    const publicada = VR_PUBLICADA[a.id];
    it(`${a.id} rota a la Vr de su tipo, o a 1,1 veces su pérdida con los flaps de despegue`, () => {
      if (publicada) {
        const suya = publicada.nudos * 0.514444 * Math.sqrt(a.mass / publicada.kilos);
        expect(a.rotationSpeed / suya).toBeCloseTo(1, 1);
      } else {
        expect(a.rotationSpeed / perdidaCon(a, flapsDeDespegue(a))).toBeCloseTo(VR_SOBRE_LA_PERDIDA, 1);
      }
      // Y la decisión, antes de rotar.
      expect(a.decisionSpeed).toBeLessThan(a.rotationSpeed);
    });
  }

  it("el 787 se va del suelo a la actitud del suyo, por debajo de su cola", () => {
    // «A normal lift off pitch angle is between 6° and 7.5°» (el mismo
    // boletín), con un grado de lectura a cada lado. Con el efecto suelo se va
    // a 6,8°, dentro de la del suyo; sin él se iba a 7,7° (nota H29c del ADR
    // 0002).
    const a = avion("jaz-110");
    const { actitudAlIrse } = despegar(a);
    expect(actitudAlIrse / GRADO).toBeGreaterThan(5);
    expect(actitudAlIrse / GRADO).toBeLessThan(8.5);
    expect(actitudAlIrse).toBeLessThan(a.maxGroundPitch);
  });
});

/*
 * **La cola toca donde dice su fabricante** (H7b). Es lo que decide a qué
 * actitud puede irse del suelo un avión de línea: con la cola de 8,6° sin
 * fuente, el 747 no llegaba a la actitud a la que se va del suelo el de verdad
 * y esperaba a correr un 12 % más que su Vr.
 *
 * - **JAZ 120**: 12,5° con los flaps a diez y a veinte, y se va del suelo a
 *   10,1° con los de diez (D. Carbaugh, «Tail Strikes: Prevention», *AERO*
 *   QTR_01 2007, figura 1, 747-400, que tiene el fuselaje y el tren del -100).
 * - **JAZ 110**: 9,7° con las ruedas en la pista y las patas extendidas (AAIB,
 *   *Bulletin* 11/2020, VH-ZND, un 787-9, citando al fabricante).
 *
 * El JAZ 90 no está: no se ha encontrado la cifra de Embraer para el E170, y
 * lleva la de su dibujo, 14,2° (enmienda H10b), como los otros tres que no la
 * tienen de su fabricante. Esos los comprueba `apoyo.test.ts` contra el dibujo.
 */
describe("la cola de cada reactor toca donde dice su fabricante", () => {
  const COLA: Readonly<Record<string, number>> = { "jaz-120": 12.5, "jaz-110": 9.7 };

  for (const [id, grados] of Object.entries(COLA)) {
    it(`${id} toca la cola a ${grados}°`, () => {
      expect(avion(id).maxGroundPitch / GRADO).toBeCloseTo(grados, 1);
    });
  }

  it("el 747 se va del suelo a la actitud de Boeing, sin tocar la cola", () => {
    // 10,1° con los flaps de despegue, un grado arriba o abajo. Esos 10,1° son
    // de un avión con efecto suelo, como el modelo desde la nota H29c del ADR
    // 0002: con él y la muesca de despegue en recta con la palanca se iba a
    // 8,4°. Con la de su ficha, que sube poco la recta, y los Krueger que
    // alargan la pérdida, a 10,06° (nota H29e).
    const a = avion("jaz-120");
    const { actitudAlIrse } = despegar(a);
    expect(actitudAlIrse / GRADO).toBeGreaterThan(9.1);
    expect(actitudAlIrse / GRADO).toBeLessThan(11.1);
    expect(actitudAlIrse).toBeLessThan(a.maxGroundPitch);
  });
});

/*
 * **La Vref de la FAA**, escalada con la raíz de la masa: la de la base de
 * datos de características de aeronaves (*Aircraft Characteristics Data*,
 * octubre de 2024), la velocidad de aproximación de cada tipo a su masa
 * máxima al aterrizar (enmienda H20e).
 *
 * - **JAZ 90**: 124 nudos a 73.413 lb, fila E170.
 * - **JAZ 110**: 144 nudos a 425.000 lb, fila B789.
 *
 * El 747 no está: la fila de la FAA es la del -400, B744 —157 nudos a 630.000
 * lb—, con otra ala que el -100 de la ficha.
 */
const VREF_DE_LA_FAA: Readonly<Record<string, { nudos: number; libras: number }>> = {
  "jaz-90": { nudos: 124, libras: 73413 },
  "jaz-110": { nudos: 144, libras: 425000 },
};

describe("la Vref de los reactores es la de la FAA", () => {
  for (const [id, faa] of Object.entries(VREF_DE_LA_FAA)) {
    it(`${id} cruza el umbral a la Vref de su tipo, a la masa de su ficha`, () => {
      const a = avion(id);
      const suya = faa.nudos * 0.514444 * Math.sqrt(a.mass / (faa.libras * LIBRA));
      expect(a.approachSpeed / suya).toBeCloseTo(1, 2);
    });
  }

  it("y el E170 sigue siendo de categoría C, que se cuenta a su máximo al aterrizar", () => {
    // De 121 a 140 nudos (OACI, PANS-OPS); la de la ficha, 117,7, sería B.
    const a = avion("jaz-90");
    const aSuMaximo = (a.approachSpeed / 0.514444) * Math.sqrt((73413 * LIBRA) / a.mass);
    expect(aSuMaximo).toBeGreaterThanOrEqual(121);
    expect(aSuMaximo).toBeLessThan(141);
  });
});

/*
 * **Los segundos entre tocar y frenar del todo** de la AC 91-79A, figura 1:
 * dos en el reactor, que frena con los frenos de tierra y el freno; ninguno
 * en los demás, que publican su toma con el aire de su manual (enmienda H20e).
 */
describe("la toma de un reactor cuenta los segundos hasta frenar del todo", () => {
  it("dos en los reactores y ninguno en los demás", () => {
    for (const a of MEDIDOS) {
      if (a.helicoptero) continue;
      expect(segundosHastaFrenar(a), a.id).toBe(esDeChorro(a) ? 2 : 0);
    }
  });

  it("y alargan la toma lo que se rueda en ellos, sin frenar", () => {
    for (const a of MEDIDOS.filter(esDeChorro)) {
      const sinEllos = enPlaneoDesdeElUmbral(a) + rodaduraDeFrenada(a);
      const extra = distanciaDeAterrizaje(a) - sinEllos;
      // Dos segundos a la velocidad de toma, menos lo que se frena en ellos,
      // y menos lo que la rodadura ya no tiene que frenar desde ahí.
      expect(extra, a.id).toBeGreaterThan(velocidadDeToma(a) * 1.0);
      expect(extra, a.id).toBeLessThan(velocidadDeToma(a) * 2);
    }
  });
});

/*
 * El aire de la toma es el de la clase y no del avión; el margen, el de su
 * norma. Se dejan a la vista para que la tabla de arriba se pueda rehacer.
 */
describe("lo que entra en la cuenta", () => {
  it("el aire de la toma y los márgenes son los de su clase", () => {
    for (const a of MEDIDOS) {
      if (a.helicoptero) continue;
      expect(enPlaneoDesdeElUmbral(a)).toBeGreaterThan(200);
      expect(parteDeLaLda(a).parte).toBeGreaterThan(0.5);
      expect(margenDeSuClase(a).factor).toBeGreaterThan(1.1);
    }
  });
});
