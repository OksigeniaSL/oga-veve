/**
 * **La roja dura lo que dura de verdad**, en cada campo con torre y con el
 * tráfico que opera allí rodando por sus calles.
 *
 * «Me tiene esperando por ese avión un buen rato. ¿Me dejará salir?» Con el
 * permiso dado en el viento en cola, quien llegaba a la doble raya se comía
 * el circuito entero del otro: hasta tres minutos y medio medidos. Y después
 * de volver a empezar, un avión dibujado de la partida anterior se quedaba en
 * la hierba y la roja no se apagaba nunca.
 *
 * Una torre de verdad retiene a quien espera mientras el otro está en final y
 * hasta que deja la pista: uno o dos minutos. Aquí se monta lo mismo que en
 * el juego —la frecuencia, el dibujo con sus calles y tipos, y el turno— y se
 * cuenta cuánto dura la roja, también si a mitad de la espera se vuelve a
 * empezar.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "./radio";
import { TurnoDePista, type DibujoDelTurno } from "./turno-de-pista";
import { crearTrafico, REMONTA_A, tiposDelCampo, VIRA_A } from "../world/trafico";
import { sueloDelTrafico } from "../world/suelo-del-trafico";
import { SCENARIOS } from "../world/scenarios";
import type { Aerodrome } from "../world/aerodrome";
import { enEjesDePista } from "../world/rumbo";
import { desplazadoDe } from "../world/umbral-desplazado";

const PASO = 0.5;
/** Lo que tarda la torre en mirarte en la raya. Ver `TORRE_TARDA` en `vuelo.ts`. */
const TORRE_TARDA = 2.2;
/**
 * La roja más larga que se admite, s: dos minutos y medio largos. Es lo que tarda
 * un reactor que acaba de cantar final en bajar, frenar y dejar la pista, con
 * el hueco de la radio encima.
 *
 * **Y lo que rueda de más el que llega y tiene su salida tapada** por otro
 * que espera en la doble raya de esa misma calle: sigue hasta la siguiente,
 * como se lo diría la torre, y ocupa la pista ese trozo más. Antes pasaba por
 * encima del que esperaba —a un metro de su eje— y la roja salía más corta.
 * Ver `rehacerLaLlegada` en `world/trafico.ts`.
 *
 * Se contaban diez segundos más, medidos en Guaraní: 165 s. **Con una avioneta
 * son más**, y es lo de verdad (H104c): en Guaraní, semilla 21, llegas a tu
 * doble raya dos segundos después de que ZP-HYQ, una avioneta, cante final;
 * la autorizan a aterrizar cuando el reactor que sale delante pasa el final de
 * la pista, toca 44 s después de que llegues, y su salida —a 1.422 m de la
 * toma— la tapa un bimotor que espera en esa doble raya: sigue hasta la
 * siguiente, a 2.289 m, y deja la pista 131 s después de tocar, a 17 m/s de
 * media. 178 s de roja, y ninguno sobra: la avioneta va más despacio que el
 * reactor en la final y en la pista, y la siguiente salida le queda 867 m más
 * allá. Mientras no la deje, nadie sale: «until all preceding landing
 * aircraft are clear of the runway-in-use» (OACI, Doc 4444, 7.9.2).
 * Antes de que la salida que tiene la pista contara en el turno de los que
 * llegan, esa avioneta se iba al aire por el reactor, y no se la esperaba.
 */
const LA_MAS_LARGA = 185;

/**
 * **Y lo que remonta la pista el que aterriza delante**, donde la única salida
 * le queda por detrás de donde frena: en Ayolas, por la 02, la calle está en
 * la cabecera de aterrizar, y el reactor que frena a los 1.400 m da la vuelta
 * y vuelve por la pista hasta ella. La roja dura lo que dura eso de verdad: la
 * media vuelta casi parado, `VIRA_A`, y el remonte a veinte nudos, `REMONTA_A`
 * —«Normal taxi speed is approximately 20 knots» (Boeing, *737 Flight Crew
 * Training Manual*, Taxi Speed and Braking)—, que antes se daban a más de
 * veinte metros por segundo (H41). Con eso, en Ayolas, 222 s medidos contra
 * los 325 de la cuenta.
 *
 * La vuelta, media circunferencia de veinte metros de radio, que es la que da
 * `mediaVuelta` en `suelo-del-trafico.ts`.
 */
function loQueRemonta(esc: (typeof CON_TORRE)[number]): number {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const ancho = aero.runways[0]?.widthM ?? 45;
  const suelo = sueloDelTrafico(aero, pista, ancho);
  if (!suelo) return 0;
  const umbral = -pista.length / 2 + desplazadoDe(pista);
  let mas = 0;
  for (const t of tiposDelCampo(aero.id, pista.length)) {
    const puede = t.toca + t.frena;
    const camino = suelo.llegada(puede)?.camino ?? [];
    const enLaPista = camino
      .map((p) => enEjesDePista(p.x, p.z, pista.x, pista.z, pista.heading))
      .filter((e) => Math.abs(e.across) < ancho / 2)
      .map((e) => e.along - umbral);
    if (enLaPista.length) mas = Math.max(mas, puede - Math.min(...enLaPista));
  }
  return mas > REMONTE_DE_VERDAD ? mas / REMONTA_A + (Math.PI * 20) / VIRA_A : 0;
}

/** Lo que se deja atrás frenando sin que sea remontar, m: lo frena un poco más fuerte. */
const REMONTE_DE_VERDAD = 60;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const CON_TORRE = SCENARIOS.filter(
  (e) => e.aerodrome && !e.aerodrome.privado && e.aerodrome.taxiways.length,
);

function aeropuerto(esc: (typeof CON_TORRE)[number], semilla: number) {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const ancho = aero.runways[0]?.widthM ?? 45;
  const suelo = sueloDelTrafico(aero, pista, ancho);
  const radio = new Frecuencia(dados(semilla), aero.id);
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length),
    tierra: () => (suelo ? { suelo, alto: () => cota } : null),
  });
  const dibujo: DibujoDelTurno = {
    anuncia: (m, c, p) => trafico.anuncia(m, c, p),
    paso: (dt) => trafico.paso(dt),
    todaviaNo: (m, c) => trafico.todaviaNo(m, c),
    enFinal: (m) => trafico.enFinal(m),
  };
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => dibujo,
    torre: () => true,
    privado: () => false,
    alUmbral: () => Infinity,
    alto: () => 1000,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });
  const oir = (fase: string) =>
    turno.oir(PASO, { fase, deDia: true, instructorHablando: false });
  return { aero, radio, trafico, turno, oir };
}

/** Rueda un rato y espera en la doble raya hasta la verde; devuelve la espera. */
function esperarLaVerde(a: ReturnType<typeof aeropuerto>, rodar: number): number {
  for (let t = 0; t < rodar; t += PASO) a.oir("rodando");
  let libre = 0;
  let t = 0;
  while (libre <= TORRE_TARDA && t < 1200) {
    // En el orden del juego: habla la frecuencia y después mira la torre.
    a.oir("esperando");
    libre = a.turno.pistaDeOtros ? 0 : libre + PASO;
    t += PASO;
  }
  return t;
}

describe("la roja dura lo que dura de verdad", () => {
  for (const esc of CON_TORRE) {
    it(`${esc.id}: ninguna roja pasa de dos minutos y medio, más lo que remonte el que llega`, () => {
      const limite = LA_MAS_LARGA + loQueRemonta(esc);
      const esperas: number[] = [];
      for (let semilla = 1; semilla <= 120; semilla++) {
        const a = aeropuerto(esc, semilla);
        const azar = dados(semilla * 7919);
        esperas.push(esperarLaVerde(a, 20 + azar() * 600));
        a.trafico.dispose();
      }
      esperas.sort((x, y) => y - x);
      expect(esperas[0], `${esc.id}: ${esperas.slice(0, 5).join(", ")} (límite ${Math.round(limite)})`).toBeLessThan(
        limite,
      );
    });
  }

  it("y volviendo a empezar a media roja, la nueva no se queda encendida", () => {
    const esc = CON_TORRE.find((e) => e.id === "pettirossi")!;
    let conRoja = 0;
    for (let semilla = 1; semilla <= 120; semilla++) {
      const a = aeropuerto(esc, semilla);
      // Se rueda hasta que alguien ocupe la pista: ahí se vuelve a empezar.
      for (let t = 0; t < 1500 && !a.turno.pistaDeOtros; t += PASO)
        a.oir("rodando");
      if (!a.turno.pistaDeOtros) {
        a.trafico.dispose();
        continue;
      }
      conRoja++;
      for (let t = 0; t < 10; t += PASO) a.oir("esperando");
      // Volver a empezar, como `resetFlight`: frecuencia y dibujo de cero.
      const antes = new Set(a.radio.matriculas);
      a.turno.reiniciar(a.aero.id);
      a.trafico.vaciar();
      // Del vuelo anterior no queda nadie: ni dibujado ni en la frecuencia.
      expect(a.trafico.quienes(), `semilla ${semilla}`).toEqual([]);
      for (const m of a.radio.matriculas)
        expect(antes.has(m), `semilla ${semilla}`).toBe(false);
      // Y la roja nueva, si la hay, dura lo suyo.
      const espera = esperarLaVerde(a, 0);
      expect(espera, `semilla ${semilla}`).toBeLessThan(LA_MAS_LARGA);
      a.trafico.dispose();
    }
    expect(conRoja).toBeGreaterThan(10);
  });
});
