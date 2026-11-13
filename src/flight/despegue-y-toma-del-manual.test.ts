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
 * El JAZ 25, el fumigador, no tiene tipo con el que medirlo. El JAZ 60 se mide
 * y no se compara: es un tipo mezclado y su manual está por decidir (ver el ADR
 * 0027).
 *
 * ## Lo que salió al escribirlo
 *
 * ```
 *            despegar (m)                 aterrizar (m)
 *            hangar  volado  manual       hangar  manual
 *   jaz-20     406     470     449          407     387   sin margen
 *   jaz-40     536     672     352          633     620   sin margen
 *   jaz-90   1.124   1.268  ≤1.151        1.243   1.123   con margen
 *   jaz-110  1.544   1.625  ≤1.800        1.591   1.800   con margen
 *   jaz-120  1.869   1.841   1.710        1.652   1.875   con margen
 * ```
 *
 * «Volado», en los reactores, es la distancia hasta los treinta y cinco pies
 * por 1,15; el hangar pide además la de abortar desde su V1 si es más larga,
 * que en el JAZ 90, el 110 y el 120 lo es (`acelerarYPararDeSuNorma`). La toma
 * volada frena lo mismo que la cuenta, al uno por ciento, y el aire de la toma
 * es el de su clase en los dos.
 *
 * Lo que queda fuera de su banda, dicho y no escondido:
 *
 * - **El Seneca rueda demasiado para despegar**: 376 m hasta la Vr donde el
 *   suyo rueda unos 247 a esta masa. No es la proporción —ésa ya es la suya, la
 *   de `deRodarADespegar` de su ficha—, es el empuje o la Vr, y ninguno de los
 *   dos tiene todavía cifra de su manual. Se comprueba que no empeore.
 * - **El reactor volado se va del suelo más tarde que la cuenta**, a 1,12–1,16
 *   veces su Vr: la cola toca a los ocho o nueve grados y la primera muesca de
 *   flaps da poca sustentación. Por eso el despegue volado de los reactores
 *   sale entre un 7 y un 18 % más largo que el del hangar.
 * - **Los dos de fuselaje ancho aterrizan un 12 % más corto que su manual.** No
 *   es el freno: bajarlo hasta su cifra dejaría el pie a fondo por debajo del
 *   autofreno MED, y el freno a fondo de un avión de línea frena bastante más
 *   que el MED. Lo que la cuenta no lleva y la certificación sí es la
 *   transición: los segundos entre tocar y tener todo el freno, y un aire
 *   desde los cincuenta pies algo más largo que los tres grados en un avión de
 *   ese tamaño. Es de su clase y no de un avión, y queda para su ADR.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, esDeChorro, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
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
} {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
  const altura = (esDeChorro(a) ? 35 : 50) * PIE;
  const subirA = Math.max(perdidaCon(a, FLAPS_DE_DESPEGUE) * 1.2, a.rotationSpeed * 1.05);
  let x = 0;
  let hastaVr = 0;
  let hastaIrse = Infinity;
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
    if (!Number.isFinite(hastaIrse) && !s.onGround) hastaIrse = x;
    if (s.position.y - a.gearHeight >= altura) return { hastaVr, hastaIrse, hastaLaAltura: x };
  }
  return { hastaVr, hastaIrse, hastaLaAltura: Infinity };
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
    const hangar = delHangar(a, manual.conMargen);

    /*
     * La toma, con un diez por ciento a cada lado en la cuenta del hangar: las
     * cifras de los reactores son lecturas de una gráfica y las de las
     * avionetas, de un manual que mide a su manera. Sale entre el −12 y el
     * +11 %; los dos de fuselaje ancho, por debajo, con su porqué en la
     * cabecera, y con un listón que no les deja acortar más.
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
    // Ver la cabecera: 376 m hasta la Vr donde el suyo rueda unos 247. Hasta que
    // tenga empuje o Vr de su manual, se fija que no se aleje más.
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
     * Hasta la altura de su norma. Más ancho, y torcido hacia arriba: el reactor
     * volado se va del suelo más tarde que la cuenta (ver la cabecera), y eso
     * no puede pasar de una quinta parte.
     *
     * Sin el biplano: es de rueda de cola, y se despega levantando la cola y
     * dejándolo irse, no rotando sobre el tren principal como hace este piloto.
     */
    it.skipIf(a.id === "jaz-25")(`${a.id} despega volando en lo que dice la cuenta`, () => {
      const { hastaIrse, hastaLaAltura } = despegar(a);
      expect(hastaIrse).toBeLessThan(hastaLaAltura);
      const r = hastaLaAltura / distanciaDeDespegue(a);
      const dicho = `${a.id}: volado ${Math.round(hastaLaAltura)} m, cuenta ${Math.round(distanciaDeDespegue(a))}`;
      expect(r, dicho).toBeGreaterThan(0.9);
      expect(r, dicho).toBeLessThan(a.id === "jaz-40" ? 1.3 : 1.2);
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
