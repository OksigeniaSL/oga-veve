/**
 * Que el Navion está bien copiado, y que la flota se le parece donde debe.
 *
 * Dos cosas distintas, y la primera es la que hace posible la segunda.
 *
 * ## Primero: que la transcripción es correcta
 *
 * Veintiuna derivadas picadas a mano de un PDF escaneado de 1969 no valen
 * nada por sí solas: un `0,0701` que se pique `0,701` no se distingue de un
 * dato bueno mirándolo. Lo que salva esto es que **el informe trae las mismas
 * derivadas en dos formas** —adimensional en las tablas X-B y X-C, dimensional
 * en las X-D y X-E— y la segunda se calcula de la primera. Así que las tablas
 * se comprueban unas con otras, y un dígito mal picado rompe la cuenta.
 *
 * Es el mismo criterio que el resto del proyecto: medir, no afirmar.
 *
 * ## Y después: que las fichas se le parecen donde la física manda
 *
 * El Navion es de ala baja y tren retráctil y el JAZ 20 de ala alta y tren
 * fijo. Lo que se compara es lo que no depende de eso, y lo que sí depende
 * queda dicho con su motivo. Ver la cabecera de `referencia.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, PYKASU } from "./aircraft";
import {
  ALARGAMIENTO,
  A_MANDO_ENTERO,
  CM_DELTA_E,
  CONDICION,
  EN_CONVENCION_DE_FICHA,
  EN_SI,
  GEOMETRIA,
  LATERAL,
  LATERAL_DIMENSIONAL,
  LONGITUDINAL,
  LONGITUDINAL_DIMENSIONAL,
  margenEstatico,
  matrizLateral,
  matrizLongitudinal,
  MODOS,
  multiplicar,
  comoPolinomio,
  pendienteDeSustentacion,
  polinomioCaracteristico,
  ritmoDeAlabeo,
} from "./referencia";

/**
 * Las derivadas dimensionales, calculadas de las adimensionales.
 *
 * Son las relaciones de siempre —Etkin, o cualquier libro de mecánica del
 * vuelo— para ejes estabilidad y vuelo nivelado, con `Ixz = 0`, que es el caso
 * de esta tabla. `S` se pasa aparte porque la errata de la superficie alar se
 * comprueba metiendo el otro número.
 */
function dimensionales(superficiePies2: number) {
  const q = CONDICION.presionDinamicaLibrasPorPie2;
  const U = CONDICION.velocidadPiesPorSegundo;
  const { cuerdaPies: c, envergaduraPies: b, masaSlugs: m } = GEOMETRIA;
  const { xx: Ix, yy: Iy, zz: Iz } = GEOMETRIA.inerciaSlugPies2;
  const qS = q * superficiePies2;
  // Los dos factores que convierten una velocidad angular en su versión
  // adimensional, que es por lo que hay que dividir al deshacerla.
  const porCuerda = c / (2 * U);
  const porEnvergadura = b / (2 * U);
  return {
    xU: (-2 * LONGITUDINAL.cd * qS) / (m * U),
    xW: ((LONGITUDINAL.cl - LONGITUDINAL.cdAlfa) * qS) / (m * U),
    zU: (-2 * LONGITUDINAL.cl * qS) / (m * U),
    zW: (-(LONGITUDINAL.clAlfa + LONGITUDINAL.cd) * qS) / (m * U),
    zDeltaE: (-LONGITUDINAL.clDeltaE * qS) / m,
    mW: (LONGITUDINAL.cmAlfa * qS * c) / (Iy * U),
    mWPunto: (LONGITUDINAL.cmAlfaPunto * porCuerda * qS * c) / (Iy * U),
    mQ: (LONGITUDINAL.cmQ * porCuerda * qS * c) / Iy,
    yV: (LATERAL.cyBeta * qS) / (m * U),
    yDeltaR: (LATERAL.cyDeltaR * qS) / (m * U),
    lBeta: (LATERAL.clBeta * qS * b) / Ix,
    lP: (LATERAL.clP * porEnvergadura * qS * b) / Ix,
    lR: (LATERAL.clR * porEnvergadura * qS * b) / Ix,
    lDeltaA: (LATERAL.clDeltaA * qS * b) / Ix,
    lDeltaR: (LATERAL.clDeltaR * qS * b) / Ix,
    nBeta: (LATERAL.cnBeta * qS * b) / Iz,
    nP: (LATERAL.cnP * porEnvergadura * qS * b) / Iz,
    nR: (LATERAL.cnR * porEnvergadura * qS * b) / Iz,
    nDeltaA: (LATERAL.cnDeltaA * qS * b) / Iz,
    nDeltaR: (LATERAL.cnDeltaR * qS * b) / Iz,
  };
}

/** Lo que dice el informe, con los nombres de arriba. */
const DICE_EL_INFORME: Record<string, number> = {
  ...LONGITUDINAL_DIMENSIONAL,
  ...LATERAL_DIMENSIONAL,
};

/** Cuánto se aparta, en tanto por ciento. */
const aparta = (calculado: number, dice: number) =>
  (Math.abs(calculado - dice) / Math.abs(dice)) * 100;

describe("el Navion de la NASA CR-96008 está bien copiado", () => {
  const calculadas = dimensionales(GEOMETRIA.superficiePies2);

  /*
   * **Veinte derivadas y ni una que se aparte medio por ciento.**
   *
   * Medido: la peor se aparta un 0,03 %, que es redondeo de la tercera cifra
   * del propio informe. Si alguien pica mal un dígito de las tablas X-B o X-C,
   * esta prueba se cae; si lo pica mal en las X-D o X-E, también.
   */
  for (const [nombre, calculado] of Object.entries(calculadas)) {
    it(`${nombre} cuadra con la tabla dimensional del informe`, () => {
      expect(aparta(calculado, DICE_EL_INFORME[nombre]!)).toBeLessThan(0.5);
    });
  }

  /*
   * **Y la superficie alar son 184 pies cuadrados, no los 180 que imprime.**
   *
   * La tabla X-A dice 180 y la figura X-1 de la página anterior dice 184. Las
   * dos no pueden ser, y no hace falta elegir a ojo: con 180 **las veinte
   * derivadas dimensionales fallan**, y todas por el mismo 2,17 %, que es
   * exactamente 184/180. Un error que sale igual en veinte sitios no es un
   * error de veinte sitios: es el número de la superficie.
   */
  it("la tabla X-A imprime 180 pies cuadrados y es una errata", () => {
    const conLa180 = dimensionales(180);
    for (const [nombre, calculado] of Object.entries(conLa180)) {
      const error = aparta(calculado, DICE_EL_INFORME[nombre]!);
      if (DICE_EL_INFORME[nombre] === 0) continue;
      expect(error).toBeGreaterThan(2);
      expect(error).toBeLessThan(2.3);
    }
  });

  /*
   * El elevador no está en la tabla de adimensionales: hay que sacarlo de la
   * dimensional. Sale −0,870 por radián, y no el −0,923 que circula por los
   * libros, que viene de otra fuente.
   */
  it("el Cmδe que falta se recupera de su forma dimensional", () => {
    expect(CM_DELTA_E).toBeCloseTo(-0.8697, 4);
  });
});

describe("las unidades y los recorridos", () => {
  it("la geometría en metros es la que es", () => {
    expect(EN_SI.superficie).toBeCloseTo(17.09, 2);
    expect(EN_SI.envergadura).toBeCloseTo(10.18, 2);
    expect(EN_SI.cuerda).toBeCloseTo(1.737, 3);
    expect(EN_SI.masa).toBeCloseTo(1247.4, 1);
    expect(EN_SI.velocidad).toBeCloseTo(53.645, 3);
    expect(ALARGAMIENTO).toBeCloseTo(6.06, 2);
  });

  /*
   * **La presión dinámica que imprime la tabla es la buena.**
   *
   * ½ρV² con los números de la propia tabla da 36,83 y la tabla dice 36,8. Es
   * una comprobación pequeña y vale para lo mismo que las de arriba: si la
   * densidad o la velocidad estuvieran mal picadas, no cuadraría.
   */
  it("la presión dinámica sale de la densidad y la velocidad", () => {
    const q =
      0.5 *
      CONDICION.densidadSlugsPorPie3 *
      CONDICION.velocidadPiesPorSegundo ** 2;
    expect(q).toBeCloseTo(CONDICION.presionDinamicaLibrasPorPie2, 1);
  });

  /*
   * **La conversión que es fácil no hacer**: de por radián a por mando
   * entero. Los recorridos son los certificados, TCDS A-782.
   */
  it("los mandos a fondo son los recorridos del certificado", () => {
    expect((A_MANDO_ENTERO.elevador * 180) / Math.PI).toBeCloseTo(30, 6);
    expect((A_MANDO_ENTERO.aleron * 180) / Math.PI).toBeCloseTo(21, 6);
    expect((A_MANDO_ENTERO.timon * 180) / Math.PI).toBeCloseTo(23, 6);
  });

  it("y los coeficientes de mando quedan en la convención de la ficha", () => {
    expect(EN_CONVENCION_DE_FICHA.cmElevator).toBeCloseTo(0.455, 3);
    expect(EN_CONVENCION_DE_FICHA.clAileron).toBeCloseTo(0.0492, 4);
    expect(EN_CONVENCION_DE_FICHA.cnRudder).toBeCloseTo(0.0288, 4);
    expect(EN_CONVENCION_DE_FICHA.cnAileron).toBeCloseTo(-0.00127, 5);
  });

  /*
   * **El Navion alabea a 72 grados por segundo** con sus recorridos
   * certificados, a su crucero. La ficha del JAZ 20 dice, al lado de
   * `clAileron`, que una ligera de escuela tiene que salir entre 60 y 80: ahí
   * está el avión de verdad, justo en medio, y con esto esa regla deja de ser
   * una opinión escrita en un comentario.
   */
  it("y el Navion alabea dentro de la regla que la ficha se pone", () => {
    const grados = ritmoDeAlabeo(
      EN_CONVENCION_DE_FICHA.clAileron,
      EN_CONVENCION_DE_FICHA.clP,
      EN_SI.velocidad,
      EN_SI.envergadura,
    );
    expect(grados).toBeGreaterThan(60);
    expect(grados).toBeLessThan(80);
    expect(grados).toBeCloseTo(72.4, 1);
  });
});

/**
 * La vara de la pendiente de sustentación, validada contra el avión de verdad.
 *
 * Antes de usar una cuenta para decir que una ficha está alta, la cuenta
 * tiene que acertar donde hay con qué comparar. Línea sustentadora con el
 * alargamiento del Navion predice 4,38 donde el informe mide 4,44.
 */
describe("la pendiente de sustentación", () => {
  it("la línea sustentadora acierta en el Navion", () => {
    const estimada = pendienteDeSustentacion(ALARGAMIENTO, 0.76);
    expect(estimada).toBeCloseTo(4.38, 2);
    expect(aparta(estimada, LONGITUDINAL.clAlfa)).toBeLessThan(2);
  });

  /*
   * **Y en el entrenador dice que está un diez por ciento alta.**
   *
   * El JAZ 20 tiene más alargamiento que el Navion —7,47 contra 6,06— así que
   * le toca más pendiente: 4,65. La ficha pone 5,1, que es un 10 % por encima
   * de lo que su propia ala puede dar.
   *
   * Se queda anotado y no se toca aquí. `clAlpha` entra en la sustentación, en
   * la resistencia inducida, en el ángulo de equilibrio y en la velocidad de
   * pérdida: bajarlo mueve el avión entero, y eso se hace midiendo el vuelo
   * completo, no cambiando un número. El listón de aquí es el 15 %, que es lo
   * que caza un ala imposible sin discutir el ajuste fino.
   */
  it("y el entrenador se queda dentro de lo que su ala puede dar", () => {
    const puede = pendienteDeSustentacion(
      (PYKASU.wingSpan * PYKASU.wingSpan) / PYKASU.wingArea,
      PYKASU.aero.oswald,
    );
    expect(puede).toBeCloseTo(4.65, 2);
    expect(aparta(PYKASU.aero.clAlpha, puede)).toBeLessThan(15);
  });
});

/**
 * La flota contra la referencia.
 *
 * Un factor de dos a cada lado. No es laxitud: es que un entrenador de ala
 * alta, un biplano fumigador y una avioneta de ala baja son aviones distintos
 * y **tienen** que salir distintos. Lo que este listón caza es lo que de
 * verdad pasa cuando alguien rellena una ficha —un signo cambiado, un cero de
 * más, un coeficiente por radián copiado tal cual de un libro— y no lo que un
 * diseñador decide.
 */
describe.each(AIRCRAFT.map((a) => [a.id, a] as const))(
  "%s contra el Navion",
  (_id, a) => {
    const dentro = (nuestro: number, suyo: number) => {
      expect(Math.sign(nuestro)).toBe(Math.sign(suyo));
      const veces = Math.abs(nuestro) / Math.abs(suyo);
      expect(veces).toBeGreaterThan(0.5);
      expect(veces).toBeLessThan(2);
    };

    it("amortigua el cabeceo como un avión", () => {
      dentro(a.aero.cmQ, EN_CONVENCION_DE_FICHA.cmQ);
    });
    it("amortigua el alabeo como un avión", () => {
      dentro(a.aero.clP, EN_CONVENCION_DE_FICHA.clP);
    });
    it("amortigua la guiñada como un avión", () => {
      dentro(a.aero.cnR, EN_CONVENCION_DE_FICHA.cnR);
    });
    it("tiene la veleta direccional de un avión", () => {
      dentro(a.aero.cnBeta, EN_CONVENCION_DE_FICHA.cnBeta);
    });
    /*
     * El efecto diedro es el sitio donde las dos configuraciones **no** tienen
     * que coincidir: un ala alta cuelga el fuselaje por debajo del ala y eso
     * es diedro efectivo de regalo, así que el JAZ 20 sale por encima del
     * Navion —0,09 contra 0,074— y está bien que salga. El listón sigue
     * cazando un signo cambiado, que es lo que lo pondría a girar solo.
     */
    it("tiene el efecto diedro de un avión, y del signo correcto", () => {
      dentro(a.aero.clBeta, EN_CONVENCION_DE_FICHA.clBeta);
    });
    it("se opone al derrape como un avión", () => {
      dentro(a.aero.cyBeta, EN_CONVENCION_DE_FICHA.cyBeta);
    });
    it("tiene la autoridad de elevador de un avión", () => {
      dentro(a.aero.cmElevator, EN_CONVENCION_DE_FICHA.cmElevator);
    });
    it("tiene la autoridad de timón de un avión", () => {
      dentro(a.aero.cnRudder, EN_CONVENCION_DE_FICHA.cnRudder);
    });

    /*
     * **El margen estático**, que es el número que dice si un avión es
     * estable y cuánto. El Navion, con el centro de gravedad al 29,5 % de la
     * cuerda, sale al 15,4 %. Una avioneta de escuela anda entre el diez y el
     * veinte, y por debajo de cinco ya no es un avión de escuela: es un avión
     * que hay que estar pilotando todo el rato.
     */
    it("es estable en cabeceo, y en la cantidad de un entrenador", () => {
      const margen = margenEstatico(a.aero.clAlpha, a.aero.cmAlpha);
      expect(margen).toBeGreaterThan(0.1);
      expect(margen).toBeLessThan(0.25);
    });
  },
);

/**
 * Y el círculo se cierra: las derivadas reproducen el avión.
 *
 * Hasta aquí se ha comprobado que los números están **bien copiados**. Esto es
 * otra cosa: que además **son un avión**. El informe imprime aparte sus modos
 * propios —el corto período, el fugoide, el balanceo holandés, la convergencia
 * de alabeo y la espiral—, que es lo que un piloto nota, y salen de resolver
 * la dinámica con esas mismas derivadas.
 *
 * Así que se monta la matriz de estado con las derivadas dimensionales, se
 * saca su polinomio característico, y se compara con el polinomio que forman
 * los modos impresos. Si cuadran, el juego entero está validado como sistema
 * dinámico y no solo como tabla.
 *
 * Se comparan los polinomios y no las raíces porque dicen lo mismo y no hay
 * que resolver una cuártica para saberlo.
 */
describe("las derivadas reproducen los modos que el informe imprime", () => {
  const casi = (a: number[], b: number[], tolerancia: number) => {
    expect(a.length).toBe(b.length);
    a.forEach((v, i) => {
      const suyo = b[i]!;
      if (Math.abs(suyo) < 1e-9) expect(Math.abs(v)).toBeLessThan(1e-9);
      else expect(aparta(v, suyo)).toBeLessThan(tolerancia);
    });
  };

  /*
   * Corto período 3,61 rad/s con 0,70 de amortiguamiento —rápido y que se
   * apaga solo— y fugoide 0,214 rad/s con 0,08 —veintinueve segundos de
   * período y casi sin amortiguar—. Ese fugoide es exactamente el que el
   * modelo sencillo de Guyrami **no** tiene, y por eso Guyrami usa otro
   * modelo en vez de amortiguar éste. Ver `tiers.ts`.
   */
  it("el corto período y el fugoide", () => {
    casi(
      polinomioCaracteristico(matrizLongitudinal()),
      multiplicar(
        comoPolinomio(MODOS.cortoPeriodo),
        comoPolinomio(MODOS.fugoide),
      ),
      0.1,
    );
  });

  it("el balanceo holandés, la convergencia de alabeo y la espiral", () => {
    casi(
      polinomioCaracteristico(matrizLateral()),
      multiplicar(
        multiplicar([1, MODOS.espiral], [1, MODOS.convergenciaDeAlabeo]),
        comoPolinomio(MODOS.balanceoHolandes),
      ),
      0.2,
    );
  });
});
