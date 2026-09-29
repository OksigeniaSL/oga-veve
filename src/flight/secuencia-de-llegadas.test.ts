/**
 * **Uno detrás de otro, y uno en la pista**: la fila de llegadas, en todos
 * los campos con tráfico.
 *
 * Se veía en la carta: dos o tres aviones entrando a la vez en la pista, y en
 * un aeropuerto de verdad las llegadas se dejan un hueco —tres millas como
 * poco, un par de minutos en la práctica— y el siguiente no cruza el umbral
 * hasta que el anterior ha dejado la pista. Medido antes del arreglo con la
 * frecuencia y el dibujo de Tenerife Sur, sin calles: dos llegadas en la misma
 * final a menos de tres millas en 69 de cada 100 horas, y a trescientos
 * metros la una de la otra la peor.
 *
 * Aquí se vuela cada campo con **sus calles, sus tipos y su frecuencia**, y
 * con quien juega en medio: aterriza, sale de la pista, vuelve al punto de
 * espera, despega y vuelve a final, y una de cada tres finales se va al aire.
 * Con el mismo turno de pista que usa el juego. Ver `SEPARACION_ENTRE_LLEGADAS`
 * en `world/trafico.ts`.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia, PISTA_TUYA } from "./radio";
import { TurnoDePista } from "./turno-de-pista";
import {
  crearTrafico,
  separacionPara,
  tiposDelCampo,
  type QuienJuega,
} from "../world/trafico";
import { sueloDelTrafico } from "../world/suelo-del-trafico";
import { SCENARIOS, type Scenario } from "../world/scenarios";
import { sinTorre, type Aerodrome } from "../world/aerodrome";
import { BASE_A_FINAL, type Pista } from "../world/circuito";
import { GLIDE_SLOPE } from "../world/runway-guide";
import { enEjesDePista } from "../world/rumbo";

const PASO = 0.5;
/** Lo que tarda la torre en mirarte en la raya. Ver `TORRE_TARDA` en `vuelo.ts`. */
const TORRE_TARDA = 2.2;
/** A cuánto se acerca al umbral quien juega, m/s: una avioneta en final. */
const APROXIMACION = 33;
/** Lo que se le perdona a la cuenta por el paso del reloj, s. */
const HOLGURA = 2 * PASO + 0.5;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Los campos con torre y tráfico, como los monta `ponerTrafico`. */
const CON_TRAFICO = SCENARIOS.filter((e) => {
  const aero = e.aerodrome;
  return (
    !!aero &&
    tiposDelCampo(aero.id, e.runway.length, sinTorre(aero)).length > 0
  );
});

interface Medido {
  /** Muestras con dos o más aviones encima de la pista, y la primera. */
  dosEnLaPista: number;
  dosEnLaPistaDonde: string | null;
  /** Llegadas en final con menos hueco del que les toca, y la primera. */
  sinHueco: number;
  sinHuecoDonde: string | null;
  /** Cuántas llegadas del tráfico tocaron pista. */
  aterrizajes: number;
  /** Cuántos tres sesenta de espera empezaron. */
  esperas: number;
  /** Y tus aterrizajes. */
  tuyos: number;
}

/**
 * Una hora de un campo: la frecuencia, su dibujo con las calles del campo, y
 * quien juega dando vueltas.
 */
function volar(esc: Scenario, semilla: number, segundos: number): Medido {
  const aero = esc.aerodrome as Aerodrome;
  const pista: Pista = esc.runway;
  const cota = 0;
  const ancho = aero.runways[0]?.widthM ?? 45;
  const suelo = sueloDelTrafico(aero, pista, ancho);
  const azar = dados(semilla * 7919 + 17);
  const yo = {
    fase: "en-vuelo",
    alUmbral: Infinity,
    alto: 1000,
    hasta: 30 + azar() * 300,
    finales: 0,
  };
  const enLaPistaTu = (): boolean =>
    ["aterrizado", "abandonando", "alineando", "despegando"].includes(yo.fase);
  const quienJuega = (): QuienJuega => ({
    alUmbral: yo.fase === "final" ? yo.alUmbral / APROXIMACION : null,
    enLaPista: enLaPistaTu(),
    velocidad: APROXIMACION,
  });
  const radio = new Frecuencia(dados(semilla), aero.id);
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    tierra: suelo ? () => ({ suelo, alto: () => cota }) : undefined,
    quienJuega,
  });
  let teMandanAlAire = false;
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    alUmbral: () => yo.alUmbral,
    alto: () => yo.alto,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => void (teMandanAlAire = true),
  });
  const m: Medido = {
    dosEnLaPista: 0,
    dosEnLaPistaDonde: null,
    sinHueco: 0,
    sinHuecoDonde: null,
    aterrizajes: 0,
    esperas: 0,
    tuyos: 0,
  };
  const esperando = new Set<string>();
  const tocaron = new Set<string>();
  let antes = yo.fase;
  let mirando = 0;
  for (let t = 0; t < segundos; t += PASO) {
    turno.oir(PASO, { fase: yo.fase, deDia: true, instructorHablando: false });
    if (PISTA_TUYA.has(yo.fase) && !PISTA_TUYA.has(antes)) turno.alSerTuya(yo.fase);
    if (yo.fase === "final" && antes !== "final") turno.pedirAterrizaje();
    antes = yo.fase;
    turno.paso(yo.fase);

    // ── Lo que se mide ──
    const quienes = trafico.quienes();
    const encima = quienes.filter((a) => a.enLaPista).map((a) => a.matricula);
    if (enLaPistaTu()) encima.push(`tú (${yo.fase})`);
    if (encima.length > 1) {
      m.dosEnLaPista++;
      m.dosEnLaPistaDonde ??= `${t} s: ${encima.join(", ")}`;
    }
    /*
     * El hueco, en la final: entre cada uno del tráfico que la vuela y el que
     * cruza el umbral justo antes que él —otro del tráfico, o tú—.
     */
    const fila = trafico
      .secuencia()
      .map((s) => ({ ...s, tuyo: false }))
      .concat(
        yo.fase === "final"
          ? [
              {
                matricula: "tú",
                alUmbral: yo.alUmbral / APROXIMACION,
                velocidad: APROXIMACION,
                esperandoTurno: false,
                enFinal: true,
                tuyo: true,
              },
            ]
          : [],
      )
      .sort((a, b) => a.alUmbral - b.alUmbral);
    for (let i = 1; i < fila.length; i++) {
      const b = fila[i]!;
      if (b.tuyo || !b.enFinal) continue;
      const a = fila[i - 1]!;
      const hueco = b.alUmbral - a.alUmbral;
      if (hueco < separacionPara(b.velocidad) - HOLGURA) {
        m.sinHueco++;
        m.sinHuecoDonde ??= `${t} s: ${b.matricula} a ${hueco.toFixed(0)} s de ${a.matricula}`;
      }
    }
    for (const a of quienes) {
      if (a.esperandoTurno && !esperando.has(a.matricula)) m.esperas++;
      if (a.esperandoTurno) esperando.add(a.matricula);
      else esperando.delete(a.matricula);
    }
    for (const s of fila) if (!s.tuyo && s.alUmbral < 0) tocaron.add(s.matricula);

    // ── Quien juega ──
    if (yo.fase === "en-vuelo" && t > yo.hasta) {
      yo.fase = "final";
      yo.alUmbral = BASE_A_FINAL;
      yo.alto = BASE_A_FINAL * Math.tan(GLIDE_SLOPE);
      teMandanAlAire = false;
      yo.finales++;
    } else if (yo.fase === "final") {
      yo.alUmbral -= APROXIMACION * PASO;
      yo.alto = Math.max(0, yo.alUmbral * Math.tan(GLIDE_SLOPE));
      const frustra = yo.finales % 3 === 0 && yo.alto < 60;
      if (teMandanAlAire || frustra) {
        yo.fase = "en-vuelo";
        yo.alUmbral = Infinity;
        yo.alto = 1000;
        yo.hasta = t + 150 + azar() * 150;
        yo.finales++;
      } else if (yo.alUmbral <= 0) {
        yo.fase = "aterrizado";
        yo.hasta = t + 20;
        m.tuyos++;
      }
    } else if (yo.fase === "aterrizado" && t > yo.hasta) {
      yo.fase = "abandonando";
      yo.hasta = t + 15;
    } else if (yo.fase === "abandonando" && t > yo.hasta) {
      yo.fase = "a-plataforma";
      yo.hasta = t + 20 + azar() * 60;
    } else if (yo.fase === "a-plataforma" && t > yo.hasta) {
      yo.fase = "esperando";
      mirando = 0;
    } else if (yo.fase === "esperando") {
      mirando = turno.pistaDeOtros ? 0 : mirando + PASO;
      if (mirando > TORRE_TARDA) yo.fase = "alineando";
      yo.hasta = t + 10;
    } else if (yo.fase === "alineando" && t > yo.hasta) {
      yo.fase = "despegando";
      yo.hasta = t + 25;
    } else if (yo.fase === "despegando" && t > yo.hasta) {
      yo.fase = "en-vuelo";
      yo.hasta = t + 120 + azar() * 200;
    }
  }
  // Los del tráfico que llegaron a tocar: lo que cuenta es que la fila anda.
  m.aterrizajes = tocaron.size;
  trafico.dispose();
  return m;
}

describe("uno detrás de otro, y uno en la pista, en cada campo", () => {
  it("hay campos que mirar, con calles", () => {
    expect(CON_TRAFICO.length).toBeGreaterThan(12);
    expect(
      CON_TRAFICO.filter((e) =>
        sueloDelTrafico(
          e.aerodrome as Aerodrome,
          e.runway,
          (e.aerodrome as Aerodrome).runways[0]?.widthM ?? 45,
        ),
      ).length,
    ).toBeGreaterThan(10);
  });

  for (const esc of CON_TRAFICO) {
    it(`${esc.id}: nunca dos en la pista, ni dos en final sin su hueco`, () => {
      const mal: string[] = [];
      let aterrizajes = 0;
      let tuyos = 0;
      for (let semilla = 1; semilla <= 8; semilla++) {
        const m = volar(esc, semilla, 2400);
        if (m.dosEnLaPista)
          mal.push(`semilla ${semilla}, dos en la pista ${m.dosEnLaPista} muestras: ${m.dosEnLaPistaDonde}`);
        if (m.sinHueco)
          mal.push(`semilla ${semilla}, sin hueco ${m.sinHueco} muestras: ${m.sinHuecoDonde}`);
        aterrizajes += m.aterrizajes;
        tuyos += m.tuyos;
      }
      expect(mal.slice(0, 4)).toEqual([]);
      // Y la fila anda: aterrizan ellos y aterrizas tú.
      expect(aterrizajes).toBeGreaterThan(4);
      expect(tuyos).toBeGreaterThan(8);
    });
  }
});

describe("y con muchas horas en el campo más revuelto", () => {
  /*
   * El instrumento tiene que poder ver el caso: en Tenerife Sur, con
   * reactores y turbohélices, sin fila coincidían dos en final casi cada
   * hora. Aquí se cuenta que la fila de verdad trabaja —hay esperas— y que
   * con ella no coinciden nunca.
   */
  it("en Tenerife Sur hay esperas, y nunca dos en final a menos de tres millas", () => {
    const esc = SCENARIOS.find((e) => e.id === "tenerife-sur")!;
    let esperas = 0;
    let cerca = 0;
    let dondeCerca: string | null = null;
    for (let semilla = 1; semilla <= 30; semilla++) {
      const m = volar(esc, semilla, 1800);
      esperas += m.esperas;
      cerca += m.sinHueco;
      dondeCerca ??= m.sinHuecoDonde;
    }
    expect(dondeCerca).toBeNull();
    expect(cerca).toBe(0);
    expect(esperas).toBeGreaterThan(5);
  });
});

/*
 * Y la distancia, que es lo que se ve en la carta: dos que vuelan la misma
 * final hacia la pista, a menos de tres millas el uno del otro. Se mide con
 * los sitios dibujados, sin la cuenta de la fila.
 */
describe("y en la carta, dos en la misma final nunca a menos de tres millas", () => {
  it("con los campos de Canarias, que son los de reactores", () => {
    const mal: string[] = [];
    for (const esc of CON_TRAFICO.filter((e) => e.aerodrome?.id.startsWith("GC"))) {
      for (let semilla = 1; semilla <= 4; semilla++) {
        const aero = esc.aerodrome as Aerodrome;
        const pista = esc.runway;
        const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
        const radio = new Frecuencia(dados(semilla), aero.id);
        const trafico = crearTrafico(pista, 0, "ala-alta", "izquierda", 1, undefined, {
          tipos: tiposDelCampo(aero.id, pista.length),
          tierra: suelo ? () => ({ suelo, alto: () => 0 }) : undefined,
        });
        const turno = new TurnoDePista({
          radio,
          boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
          trafico: () => trafico,
          torre: () => true,
          privado: () => false,
          alUmbral: () => Infinity,
          alto: () => 1000,
          decirAOtro: () => null,
          autorizarte: () => {},
          mandarteAlAire: () => {},
        });
        for (let t = 0; t < 2400; t += PASO) {
          turno.oir(PASO, { fase: "en-vuelo", deDia: true, instructorHablando: false });
          const enFinal = trafico
            .quienes()
            .filter((a) => {
              if (!a.llegando || a.y < 5) return false;
              const e = enEjesDePista(a.x, a.z, pista.x, pista.z, pista.heading);
              return Math.abs(e.across) < 60 && e.along < -pista.length / 2;
            })
            .map((a) => ({
              a,
              along: enEjesDePista(a.x, a.z, pista.x, pista.z, pista.heading).along,
            }))
            .sort((p, q) => q.along - p.along);
          for (let i = 1; i < enFinal.length; i++) {
            const d = enFinal[i - 1]!.along - enFinal[i]!.along;
            if (d < 3 * 1852)
              mal.push(
                `${esc.id} semilla ${semilla}, ${t} s: ${enFinal[i]!.a.matricula} a ${Math.round(d)} m de ${enFinal[i - 1]!.a.matricula}`,
              );
          }
        }
        trafico.dispose();
      }
    }
    expect(mal.slice(0, 4)).toEqual([]);
  });
});
