/**
 * Que el plan de tierra se mude con el avión.
 *
 * Contado jugando al llegar a otra isla: «así se ve el aeropuerto: no hay
 * coche, no sé la ruta a mi hangar». El campo de destino estaba entero —su
 * pista, sus calles, su plataforma— y lo que faltaba era el plan: el grafo de
 * rodaje seguía siendo el de casa, a sesenta kilómetros, y de un grafo que no
 * está debajo no sale ninguna raya verde.
 *
 * Aquí se comprueba el cambio sin volar: antes de mudarse, el puesto del que
 * se sale está en casa; después, en el otro campo. Y el vuelo —las fases— no
 * se toca, porque se despega una vez y se aterriza una vez.
 */

import { describe, expect, it } from "vitest";
import gcts from "../../data/aerodromes/gcts.aero.json";
import gcgm from "../../data/aerodromes/gcgm.aero.json";
import gcla from "../../data/aerodromes/gcla.aero.json";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { ARAI, PYKASU } from "../flight/aircraft";
import { carreraHastaVr } from "../flight/carrera";
import { delante } from "./rumbo";
import type { Aerodrome } from "./aerodrome";

const SUR = gcts as unknown as Aerodrome;
const GOMERA = gcgm as unknown as Aerodrome;

/** Lo que hay de Tenerife Sur a La Gomera, redondeado. */
const DX = 31_000;
const DZ = 18_000;

/** La pista de un aeródromo, en coordenadas de mundo. */
function pistaDe(
  aero: Aerodrome,
): { x: number; z: number; heading: number; width: number; length: number } {
  const r = aero.runways[0]!;
  const a = r.centerline[0]!;
  const b = r.centerline[r.centerline.length - 1]!;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return {
    x: (a[0] + b[0]) / 2,
    z: -(a[1] + b[1]) / 2,
    heading: (Math.atan2(dx, dy) * 180) / Math.PI,
    width: r.widthM ?? 45,
    length: Math.hypot(dx, dy),
  };
}

const plano = (): number => 0;

/** La Palma: dos kilómetros escasos y un punto de espera a media pista. */
const laPalma = (): Aerodrome => gcla as unknown as Aerodrome;

describe("mudarse de aeropuerto sin cambiar de vuelo", () => {
  const gomeraAlli = desplazarAerodromo(GOMERA, DX, DZ);

  it("antes de mudarse, el puesto está en casa", () => {
    const plan = new PlanDeVuelo(SUR, pistaDe(SUR), plano, PYKASU);
    const puesto = plan.arranque();
    expect(puesto).not.toBeNull();
    expect(Math.hypot(puesto![0], puesto![1])).toBeLessThan(4000);
  });

  it("y después, en el campo de llegada", () => {
    const plan = new PlanDeVuelo(SUR, pistaDe(SUR), plano, PYKASU);
    plan.reiniciar();
    plan.mudarseA(gomeraAlli, pistaDe(gomeraAlli));
    const puesto = plan.arranque();
    expect(puesto).not.toBeNull();
    // A menos de cuatro kilómetros del otro campo, y a más de veinte de casa.
    expect(Math.hypot(puesto![0] - DX, puesto![1] - DZ)).toBeLessThan(4000);
    expect(Math.hypot(puesto![0], puesto![1])).toBeGreaterThan(20_000);
  });

  it("y la raya se apaga al mudarse: la que había era de otro campo", () => {
    /*
     * Dejar puesta la ruta anterior es peor que no tener ninguna: es una raya
     * verde que sale del avión y se va al horizonte. La de aquí la traza el
     * cambio de fase al tomar tierra.
     */
    const plan = new PlanDeVuelo(SUR, pistaDe(SUR), plano, PYKASU);
    plan.reiniciar();
    expect(plan.rutaVisible().length).toBeGreaterThan(1);
    plan.mudarseA(gomeraAlli, pistaDe(gomeraAlli));
    expect(plan.rutaVisible().length).toBe(0);
  });

  it("**y la raya nueva va por el campo nuevo**", () => {
    /*
     * Éste es el que importa: el puesto se puede acertar por casualidad
     * —sale de la lista de estacionamientos— pero **la ruta la traza el
     * grafo**, y un grafo que se quedara siendo el de casa no da ninguna. Sin
     * esta comprobación, olvidarse de reconstruirlo pasa desapercibido.
     */
    const plan = new PlanDeVuelo(SUR, pistaDe(SUR), plano, PYKASU);
    plan.mudarseA(gomeraAlli, pistaDe(gomeraAlli));
    expect(plan.reiniciar()).toBe(true);
    const raya = plan.rutaVisible();
    expect(raya.length).toBeGreaterThan(1);
    for (const [x, z] of raya) {
      expect(Math.hypot(x - DX, z - DZ)).toBeLessThan(4000);
    }
  });

  it("y mudarse al mismo sitio no hace nada", () => {
    // Se llama una vez por fotograma: si no fuera idempotente, borraría la
    // raya sesenta veces por segundo.
    const plan = new PlanDeVuelo(SUR, pistaDe(SUR), plano, PYKASU);
    plan.reiniciar();
    const veces = plan.vecesQueSePusoLaRuta;
    plan.mudarseA(SUR, pistaDe(SUR));
    expect(plan.vecesQueSePusoLaRuta).toBe(veces);
    expect(plan.rutaVisible().length).toBeGreaterThan(1);
  });
});

/*
 * ── Y la pista que queda por delante ──────────────────────────────────────
 *
 * El punto de espera se elige por lo corto que sea el rodaje hasta él, y los
 * **publicados** entraban en el sorteo sin que nadie mirara cuánta pista
 * dejan por delante. Como el más cercano al puesto suele estar a media
 * pista, ganaba ése: el reactor regional salía de La Palma —2.119 m— desde
 * la mitad.
 *
 * «¿Qué sentido tiene darme poca pista para salir? Motor a fondo a mitad de
 * pista, a ver si no nos caemos al mar.»
 */
describe("de dónde se entra a la pista", () => {
  const gcla = laPalma();
  const pista = pistaDe(gcla);

  /**
   * Lo que queda de pista por delante desde un punto, en metros.
   *
   * En coordenadas del plan, donde la y es la z cambiada de signo, y con el
   * «delante» del juego —`delante()` devuelve [sen h, −cos h]—. Escrito con
   * el signo al revés decía que el punto de espera bueno era el malo, que es
   * la regla de medir comiéndose la prueba.
   */
  function porDelante(p: readonly [number, number]): number {
    const [fx, fz] = delante(pista.heading);
    const media = pista.length / 2;
    const finX = pista.x + fx * media;
    const finY = -(pista.z + fz * media);
    return (finX - p[0]) * fx + (finY - p[1]) * -fz;
  }

  it("el reactor coge el punto de espera que más pista deja, no el más cómodo", () => {
    /*
     * La Palma tiene cinco puntos de espera publicados y **ninguno en el
     * umbral**: el mejor deja 1,6 km de los 2,1 que mide la pista. Lo que
     * este arreglo garantiza no es la pista entera —eso lo termina el
     * recorrido de vuelta por la pista, ver `dondeSeGira`— sino que de los
     * cinco se coja el que más deja, y no el que pilla más cerca del puesto,
     * que es lo que hacía.
     */
    const plan = new PlanDeVuelo(gcla, pista, plano, ARAI);
    plan.reiniciar();
    // El final de la raya verde **es** el punto de espera: ahí se para.
    const ruta = plan.rutaCruda();
    const espera = ruta[ruta.length - 1];
    expect(espera).toBeDefined();
    const elMejor = Math.max(
      ...gcla.holdingPositions.map((h) => porDelante(h.xy)),
    );
    expect(porDelante(espera!)).toBeCloseTo(elMejor, -2);
    // Y el peor, que es el que se cogía, deja setecientos metros menos.
    const elPeor = Math.min(
      ...gcla.holdingPositions.map((h) => porDelante(h.xy)),
    );
    expect(elMejor - elPeor).toBeGreaterThan(400);
  });

  it("y la avioneta sí puede entrar por donde le pille", () => {
    /*
     * No es una excepción: es lo que hace todos los días una avioneta que
     * aparca a mitad de campo, y tiene nombre —salida por intersección—. La
     * regla no es «todos a la cabecera», es «con sitio de sobra por delante».
     */
    const plan = new PlanDeVuelo(gcla, pista, plano, PYKASU);
    plan.reiniciar();
    const ruta = plan.rutaCruda();
    const espera = ruta[ruta.length - 1]!;
    expect(porDelante(espera)).toBeGreaterThan(carreraHastaVr(PYKASU) * 2);
  });
});
