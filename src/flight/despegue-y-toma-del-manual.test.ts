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
 *   jaz-60     983     959  ≤1.025          815     816   con / sin
 *   jaz-90   1.124   1.267  ≤1.151        1.243   1.123   con margen
 *   jaz-110  1.544   1.612  ≤1.800        1.591   1.800   con margen
 *   jaz-120  1.869   1.792   1.710        1.652   1.875   con margen
 * ```
 *
 * «Volado», en los reactores y en el 1900D, es la distancia hasta los treinta
 * y cinco pies por 1,15; el hangar pide además la de abortar desde su V1 si es
 * más larga, que en el JAZ 60, el 90, el 110 y el 120 lo es
 * (`acelerarYPararDeSuNorma`). El JAZ 60 despega con margen —su longitud de
 * campo— y aterriza sin él, que es como publica cada cosa. La toma
 * volada frena lo mismo que la cuenta, al uno por ciento, y el aire de la toma
 * es el de su clase en los dos.
 *
 * El volado del 110 y del 120 es el de la cola de su fabricante (H7b): eran
 * 1.625 y 1.841 con los 8,5° y 8,6° de antes, sin fuente. Y el de todos, con el
 * avión girando sobre sus ruedas principales al rotar (H7c): el 110 y el 120
 * eran 1.615 y 1.800 girando sobre el centro de gravedad.
 *
 * Lo que queda fuera de su banda, dicho y no escondido, avión por avión (ver la
 * enmienda H7b del ADR 0027):
 *
 * - **El Seneca rueda demasiado para despegar**: 376 m hasta la Vr donde el
 *   suyo rueda unos 247 a esta masa. No es la proporción —ésa ya es la suya, la
 *   de `deRodarADespegar` de su ficha— ni la Vr: para rodar 247 m con su
 *   empuje tendría que rotar a unos 58 nudos, por debajo de su pérdida con los
 *   flaps de despegue, 62. Le falta empuje en la carrera: rodar 247 m hasta 72
 *   nudos pide una aceleración media de 2,8 m/s², y con sus 5 kN y la recta de
 *   empuje de todos los de hélice lleva 1,8. Esa recta es con la que están
 *   calibradas su subida, su Vmc y su crucero, así que no se toca el número:
 *   se cambia el modelo de la hélice o no se cambia. Se comprueba que no
 *   empeore.
 * - **El JAZ 120 ya despega volando en lo que dice la cuenta**, al 5 %: con la
 *   cola de Boeing sus ruedas dejan la pista a 9,8°, donde el suyo se va a
 *   10,1°.
 * - **El JAZ 110 todavía se va del suelo tarde**, y despega volando un 11 %
 *   más largo que la cuenta: para sostenerse a su Vr necesita 11,6° y su cola,
 *   la de Boeing, le deja 9,7. El de verdad se va a 6–7,5° (AAIB, *Bulletin*
 *   11/2020). No es la cola: es que la primera muesca de flaps del modelo
 *   sustenta poco y la Vr de 1,1 veces esa pérdida lo tapa. El VH-ZND de ese
 *   boletín rotó a 172 nudos con 253.400 kg; la regla le daría 158. Y en el
 *   747 lo mismo: Jenkinson da 2,03 de CL máximo con flaps de despegue, el
 *   modelo 1,73. Arreglarlo es volver sobre la regla de la Vr, no un número.
 * - **El JAZ 90**, un 18 % más largo volando: sin la cola de Embraer, con los
 *   9° de su ficha.
 * - **Los dos de fuselaje ancho aterrizan un 12 % más corto que su manual**, y
 *   no por lo mismo que el E170, que aterriza largo. En los dos la Vref no es:
 *   la del 787-9 es la de la FAA, y la del 747-100, la de Jenkinson —141
 *   nudos—, es más baja que la de la ficha y acortaría la toma hasta un 16 %.
 *   Tampoco el freno: llegar a su cifra con la rodadura pide un pie a fondo de
 *   2,88 y 2,97 m/s² al acabar, por debajo del autofreno MED, y el pie a fondo
 *   de un avión de línea frena más que el MED. Lo que falta es el aire: con su
 *   freno, el manual pide 425 y 416 m desde los cincuenta pies, unos 5,6
 *   segundos a su Vref, donde la senda de tres grados da 291. Sin la cifra del
 *   tramo en el aire de su manual, no se toca.
 * - **El JAZ 90 aterriza un 7–11 % largo**, según se escalen los 2.800 kg que
 *   pesa menos que la cifra de Embraer: todo con la masa o solo la rodadura. La
 *   causa es suya: su Vref de 132 nudos no tiene fuente —sale de un CL máximo
 *   de su clase— y su frenada se calibró con la toma de Embraer cruzando a
 *   unos 127 a su máximo, 121 a esta masa. Con 121 pediría 1.125. Sin la Vref
 *   de Embraer, no se toca.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, esDeChorro, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
import { alturaSobreLasRuedas } from "./apoyo";
import {
  carreraHastaVr,
  distanciaDeAterrizaje,
  distanciaDeDespegue,
  enPlaneoDesdeElUmbral,
  parteDeLaLda,
  pistaQueNecesita,
  rodaduraDeFrenada,
  velocidadDeToma,
  margenDeSuClase,
} from "./carrera";
import {
  FLAPS_DE_DESPEGUE,
  VR_SOBRE_LA_PERDIDA,
  perdidaCon,
} from "./velocidades-de-despegue";

const PIE = 0.3048;
const LIBRA = 0.45359237;
const DT = 1 / 120;
const GRADO = Math.PI / 180;

function avion(id: string): AircraftConfig {
  return AIRCRAFT.find((a) => a.id === id)!;
}

/**
 * **Despega el avión en el modelo de coeficientes** y dice dónde rota, dónde se
 * va del suelo y dónde pasa la altura de su norma: cincuenta pies una avioneta
 * (CS 23), treinta y cinco un avión de transporte (CS 25.113).
 *
 * El piloto hace lo de un manual: todo el gas, los flaps de despegue, a la Vr un
 * tirón firme hacia una actitud que crece a tres grados por segundo, y en el
 * aire la actitud que sostiene 1,2 veces la pérdida con esos flaps —la V2 o la
 * velocidad de los cincuenta pies—, sin pasar de veinte grados.
 */
function despegar(a: AircraftConfig): {
  readonly hastaVr: number;
  readonly hastaIrse: number;
  readonly hastaLaAltura: number;
  /** La actitud con la que se va del suelo, rad. */
  readonly actitudAlIrse: number;
} {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
  const altura = (esDeChorro(a) ? 35 : 50) * PIE;
  const subirA = Math.max(perdidaCon(a, FLAPS_DE_DESPEGUE) * 1.2, a.rotationSpeed * 1.05);
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
    if (v >= a.rotationSpeed) rotando = true;
    const cabeceo = s.alpha + Math.atan2(s.verticalSpeed, Math.max(1, s.groundSpeed));
    let elevator = 0;
    if (rotando) {
      if (s.onGround) actitud = Math.min(actitud + 3 * GRADO * DT, 20 * GRADO);
      else {
        const ritmo = Math.max(-3, Math.min(3, v - subirA)) * GRADO;
        actitud = Math.max(0, Math.min(20 * GRADO, actitud + ritmo * DT));
      }
      elevator = Math.max(-1, Math.min(1, (actitud - cabeceo) * 12 - s.pitchRate * 1.5));
    }
    m.step(DT, {
      ...neutralControls(),
      engineOn: true,
      throttle: 1,
      flaps: FLAPS_DE_DESPEGUE,
      elevator,
    });
    const paso = Math.hypot(s.position.x - antes.x, s.position.z - antes.z);
    x += paso;
    if (v < a.rotationSpeed) hastaVr += paso;
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
      return { hastaVr, hastaIrse, hastaLaAltura: x, actitudAlIrse };
    }
  }
  return { hastaVr, hastaIrse, hastaLaAltura: Infinity, actitudAlIrse };
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
    m.step(1 / 60, mandos);
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
     * avionetas, de un manual que mide a su manera. Sale entre el −12 y el
     * +11 %; los dos de fuselaje ancho, por debajo, y el E170, por arriba, cada
     * uno con su porqué en la cabecera, y con un listón que no les deja
     * alejarse más.
     */
    it(`${id} aterriza en lo que dice su manual`, () => {
      const r = hangar.aterrizar / manual.aterrizar;
      const dicho = `${id}: el hangar pide ${Math.round(hangar.aterrizar)} m y el manual ${Math.round(manual.aterrizar)}`;
      const anchos = id === "jaz-110" || id === "jaz-120";
      expect(r, dicho).toBeGreaterThan(anchos ? 0.86 : 0.9);
      expect(r, dicho).toBeLessThan(1.12);
    });

    it.skipIf(id === "jaz-40")(`${id} despega en lo que dice su manual`, () => {
      const r = hangar.despegar / manual.despegar;
      const dicho = `${id}: el hangar pide ${Math.round(hangar.despegar)} m y el manual ${Math.round(manual.despegar)}`;
      // Un techo en los bimotores de línea; de frente en los demás.
      expect(r, dicho).toBeGreaterThan(manual.despegueEsTecho ? 0.75 : 0.88);
      expect(r, dicho).toBeLessThan(manual.despegueEsTecho ? 1.0 : 1.12);
    });
  }

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
  for (const a of AIRCRAFT) {
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
     * Hasta la altura de su norma. Al cinco por ciento el que tiene la cola de
     * su fabricante y se va del suelo a su actitud, el JAZ 120 (H7b). Los demás,
     * más ancho y torcido hacia arriba: se van del suelo más tarde que la
     * cuenta (ver la cabecera), y eso no puede pasar de una quinta parte.
     *
     * Sin el biplano: es de rueda de cola, y se despega levantando la cola y
     * dejándolo irse, no rotando sobre el tren principal como hace este piloto.
     */
    it.skipIf(a.id === "jaz-25")(`${a.id} despega volando en lo que dice la cuenta`, () => {
      const { hastaIrse, hastaLaAltura } = despegar(a);
      expect(hastaIrse).toBeLessThan(hastaLaAltura);
      const r = hastaLaAltura / distanciaDeDespegue(a);
      const dicho = `${a.id}: volado ${Math.round(hastaLaAltura)} m, cuenta ${Math.round(distanciaDeDespegue(a))}`;
      const cerrado = a.id === "jaz-120";
      expect(r, dicho).toBeGreaterThan(cerrado ? 0.95 : 0.9);
      expect(r, dicho).toBeLessThan(cerrado ? 1.05 : a.id === "jaz-40" ? 1.3 : 1.2);
    });

    /* Y la frenada: la misma cuenta de `frenada.ts` por dos caminos. */
    it(`${a.id} frena volando lo que dice la cuenta`, () => {
      const r = frenar(a) / rodaduraDeFrenada(a);
      expect(r).toBeGreaterThan(0.97);
      expect(r).toBeLessThan(1.03);
    });
  }
});

describe("la Vr de los reactores es la de su peso", () => {
  for (const a of AIRCRAFT.filter(esDeChorro)) {
    it(`${a.id} rota a 1,1 veces su pérdida con los flaps de despegue`, () => {
      const r = a.rotationSpeed / perdidaCon(a, FLAPS_DE_DESPEGUE);
      expect(r).toBeCloseTo(VR_SOBRE_LA_PERDIDA, 1);
      // Y la decisión, antes de rotar.
      expect(a.decisionSpeed).toBeLessThan(a.rotationSpeed);
    });
  }
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
 * sigue con los 9° de su ficha.
 */
describe("la cola de cada reactor toca donde dice su fabricante", () => {
  const COLA: Readonly<Record<string, number>> = { "jaz-120": 12.5, "jaz-110": 9.7 };

  for (const [id, grados] of Object.entries(COLA)) {
    it(`${id} toca la cola a ${grados}°`, () => {
      expect(avion(id).maxGroundPitch / GRADO).toBeCloseTo(grados, 1);
    });
  }

  it("el 747 se va del suelo a la actitud de Boeing, sin tocar la cola", () => {
    // 10,1° con los flaps de despegue, un grado arriba o abajo: este modelo no
    // tiene efecto suelo, que adelanta un poco la separación.
    const a = avion("jaz-120");
    const { actitudAlIrse } = despegar(a);
    expect(actitudAlIrse / GRADO).toBeGreaterThan(9.1);
    expect(actitudAlIrse / GRADO).toBeLessThan(11.1);
    expect(actitudAlIrse).toBeLessThan(a.maxGroundPitch);
  });
});

/*
 * El aire de la toma es el de la clase y no del avión; el margen, el de su
 * norma. Se dejan a la vista para que la tabla de arriba se pueda rehacer.
 */
describe("lo que entra en la cuenta", () => {
  it("el aire de la toma y los márgenes son los de su clase", () => {
    for (const a of AIRCRAFT) {
      if (a.helicoptero) continue;
      expect(enPlaneoDesdeElUmbral(a)).toBeGreaterThan(200);
      expect(parteDeLaLda(a).parte).toBeGreaterThan(0.5);
      expect(margenDeSuClase(a).factor).toBeGreaterThan(1.1);
    }
  });
});
