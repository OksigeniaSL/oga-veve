/**
 * **El tráfico aterriza, o se va al aire subiendo**: en los campos altos y en
 * los bajos, con el relieve de verdad.
 *
 * Lo pidió una tarde en el punto de espera de Los Rodeos, con la roja: «se ve
 * un avión entrando en el radar y en el cielo, pero no aterriza: va en línea
 * de pista, estabilizado, pero sigue volando. Eso no es natural. Y no es una
 * frustrada: es que el juego no supo hacerlo aterrizar, sino que casi».
 *
 * Medido antes de arreglarlo, eran dos cosas a la vez:
 *
 * - **Se iba al aire con la pista libre.** Con quien juega esperando en la
 *   roja y la instructora callada, 28 de las 42 frustradas del tráfico eran
 *   con la pista libre y nadie con ella: su permiso no encontraba hueco en la
 *   frecuencia entre la final y la decisión. Con la instructora hablando un
 *   tercio del rato, 54 de 62.
 * - **Y su frustrada no parecía una frustrada**: una recta de la altura de
 *   decisión hasta el final de la subida del circuito, siete kilómetros más
 *   allá. Un cuatro por ciento, que cruzaba el umbral a cien metros y el
 *   final de la pista a doscientos y pico.
 *
 * Ver `subidaHasta` en `trafico.ts` y `autorizarAlLlegar` en
 * `flight/radio.ts`.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia, GUIONES, type Guion } from "../flight/radio";
import { TurnoDePista, type DibujoDelTurno } from "../flight/turno-de-pista";
import { ALTURA_DE_DECISION } from "../flight/minimos";
import {
  crearTrafico,
  porElCamino,
  tiposDelCampo,
  trazar,
  type Caminos,
  type Sitio,
  type TipoDeTrafico,
} from "./trafico";
import { escalaDeCircuito, formaDelCircuito, manoPublicada, type Pista } from "./circuito";
import { relieveDe } from "./relieve-en-disco";
import { SCENARIOS, type Scenario } from "./scenarios";
import { cabeceraEnUso } from "./terrain";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { desplazadoDe } from "./umbral-desplazado";

/**
 * Los campos: Los Rodeos a seiscientos treinta metros, La Gomera a
 * doscientos, Guaraní a doscientos cincuenta, y los de la costa.
 */
const CAMPOS = [
  "tenerife-norte",
  "la-gomera",
  "guarani",
  "gran-canaria",
  "tenerife-sur",
  "pettirossi",
];

/**
 * **La zona de toma**, m desde el umbral de aterrizar: los primeros
 * novecientos metros, que es lo que pinta la señal de zona de toma en una
 * pista de precisión larga (OACI, Anexo 14, 5.2.6).
 */
const ZONA_DE_TOMA = 900;

/**
 * Lo que tiene que haber subido sobre la pista al cruzar el umbral quien se
 * fue al aire en la decisión, m. Con la pendiente de antes eran cien.
 */
const SOBRE_EL_UMBRAL = 140;

/**
 * Lo que se le deja sobre el relieve a un avión con las ruedas en la pista,
 * m: el metro y medio de su origen sobre las ruedas, y el relieve en disco,
 * que no es el asfalto aplanado del juego.
 */
const EN_EL_SUELO = 3;

interface Montado {
  readonly esc: Scenario;
  readonly pista: Pista;
  readonly cota: number;
  readonly suelo: (x: number, z: number) => number;
  readonly caminos: (tipo: TipoDeTrafico) => Caminos;
}

function montar(id: string): Montado {
  const esc = SCENARIOS.find((e) => e.id === id)!;
  const aero = esc.aerodrome!;
  const rel = relieveDe([id], aero.origin);
  const cota = aero.elevationM ?? 0;
  const suelo = (x: number, z: number) => rel(x, z) ?? cota;
  const pista = esc.runway;
  const calles = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  return {
    esc,
    pista,
    cota,
    suelo,
    caminos(tipo) {
      const escala = escalaDeCircuito(tipo.aproximacion);
      const forma = formaDelCircuito(
        pista,
        cota,
        suelo,
        escala,
        manoPublicada(esc, cabeceraEnUso(esc), escala),
      );
      return trazar(
        pista,
        cota,
        forma.mano,
        escala,
        forma.altura,
        calles ? { suelo: calles, alto: suelo, tipo } : null,
        tipo.subeAlAire,
      )!;
    },
  };
}

/** Cuánto lleva recorrido de la pista desde el umbral de aterrizar, m. */
function desdeElUmbral(pista: Pista, p: Sitio): number {
  const h = (pista.heading * Math.PI) / 180;
  const ux = pista.x - (Math.sin(h) * pista.length) / 2;
  const uz = pista.z + (Math.cos(h) * pista.length) / 2;
  return (p.x - ux) * Math.sin(h) - (p.z - uz) * Math.cos(h) - desplazadoDe(pista);
}

describe("el que aterriza toca en la zona de toma y frena, en los campos altos y bajos", () => {
  for (const id of CAMPOS) {
    const m = montar(id);
    for (const tipo of new Set(tiposDelCampo(m.esc.aerodrome!.id, m.pista.length))) {
      it(`${id}, ${tipo.id}`, () => {
        const c = m.caminos(tipo);
        // Toca: a la altura de las ruedas, dentro de la zona de toma.
        const toma = porElCamino(c.llegada, c.toca)!.sitio;
        expect(toma.y - m.suelo(toma.x, toma.z)).toBeLessThan(EN_EL_SUELO);
        const donde = desdeElUmbral(m.pista, toma);
        expect(donde).toBeGreaterThan(0);
        expect(donde).toBeLessThan(ZONA_DE_TOMA);
        // Y de ahí a la boca de la salida va por el suelo, sin volver a subir.
        for (let r = c.toca; r < (c.enTierra?.boca ?? c.toca); r += 20) {
          const p = porElCamino(c.llegada, r)!.sitio;
          // Con un metro más: el camino va recto entre sus puntos y el
          // relieve en disco tiene sus baches donde el juego pone asfalto.
          expect(p.y - m.suelo(p.x, p.z), `${r} m`).toBeLessThan(EN_EL_SUELO + 1);
        }
      });
    }
  }

  it("y dibujado: con permiso toca, frena y sale de la pista", () => {
    const m = montar("tenerife-norte");
    const tipos = tiposDelCampo(m.esc.aerodrome!.id, m.pista.length);
    const calles = sueloDelTrafico(
      m.esc.aerodrome!,
      m.pista,
      m.esc.aerodrome!.runways[0]?.widthM ?? 45,
    );
    const t = crearTrafico(m.pista, m.cota, "ala-alta", "izquierda", 1, undefined, {
      tipos,
      forma: (escala) =>
        formaDelCircuito(
          m.pista,
          m.cota,
          m.suelo,
          escala,
          manoPublicada(m.esc, cabeceraEnUso(m.esc), escala),
        ),
      tierra: () => (calles ? { suelo: calles, alto: m.suelo } : null),
    });
    t.anuncia("EC-ABC", "otro.final", true);
    let bajo = Infinity;
    let rapido = 0;
    let alFinal = Infinity;
    for (let s = 0; s < 400; s += 0.25) {
      const antes = t.quienes()[0];
      t.paso(0.25);
      const a = t.quienes()[0];
      if (!a || !antes) break;
      bajo = Math.min(bajo, a.y - m.suelo(a.x, a.z));
      const v = Math.hypot(a.x - antes.x, a.z - antes.z) / 0.25;
      if (a.y - m.suelo(a.x, a.z) < EN_EL_SUELO) {
        rapido = Math.max(rapido, v);
        alFinal = v;
      }
    }
    expect(bajo).toBeLessThan(EN_EL_SUELO);
    // Toca a velocidad de vuelo y acaba rodando.
    expect(rapido).toBeGreaterThan(30);
    expect(alFinal).toBeLessThan(15);
    t.dispose();
  });
});

describe("el que se va al aire en la decisión, sube", () => {
  for (const id of CAMPOS) {
    const m = montar(id);
    for (const tipo of new Set(tiposDelCampo(m.esc.aerodrome!.id, m.pista.length))) {
      it(`${id}, ${tipo.id}`, () => {
        const c = m.caminos(tipo);
        const decision = porElCamino(c.sinPermiso, c.decide)!.sitio;
        expect(decision.y - m.cota).toBeCloseTo(ALTURA_DE_DECISION, 0);
        const circuito = Math.max(...c.sinPermiso.map((p) => p.y));
        let sobreElUmbral = NaN;
        let arriba = NaN;
        for (let r = c.decide; r < c.decide + 20_000; r += 10) {
          const p = porElCamino(c.sinPermiso, r)!.sitio;
          const along = desdeElUmbral(m.pista, p);
          if (Number.isNaN(sobreElUmbral) && along >= 0) sobreElUmbral = p.y - m.cota;
          if (p.y >= circuito - 0.5) {
            arriba = along;
            break;
          }
        }
        expect(sobreElUmbral).toBeGreaterThan(SOBRE_EL_UMBRAL);
        // Y está a la altura del circuito antes del final de la pista y un
        // kilómetro: ahí ya se le ve subido.
        expect(arriba).toBeLessThan(m.pista.length + 1000);
      });
    }
  }
});

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Si a ese avión su guion le pide irse al aire ahora: la frustrada que quiere la torre. */
function frustradaDelGuion(radio: Frecuencia, matricula: string): boolean {
  const a = (
    radio as unknown as {
      aviones: { indicativo: { matricula: string }; guion: Guion; paso: number }[];
    }
  ).aviones.find((x) => x.indicativo.matricula === matricula);
  if (!a) return false;
  const pasos = GUIONES[a.guion];
  for (let i = a.paso; i < pasos.length; i++) {
    const clave = pasos[i]!.clave;
    if (clave === "torre.goAround") return true;
    if (clave !== "otro.enCola" && clave !== "otro.final") return false;
  }
  return false;
}

describe("con quien juega en la roja, el que llega con la pista libre aterriza", () => {
  /*
   * El ciclo de `pista-compartida.test.ts`: rodar a la cabecera y esperar en
   * la roja, con la frecuencia, su dibujo y el turno de pista del juego.
   * Medido antes: 28 de 42 frustradas con la pista libre (instructora
   * callada), 54 de 62 (hablando un tercio del rato).
   */
  for (const habla of [0, 0.3]) {
    it(`con la instructora hablando ${Math.round(habla * 100)} % del rato`, () => {
      const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 3000 };
      let aterrizan = 0;
      const libres: string[] = [];
      for (let semilla = 1; semilla <= 60; semilla++) {
        const radio = new Frecuencia(dados(semilla), "GCXO");
        const trafico = crearTrafico(PISTA, 600, "ala-alta");
        const idos: string[] = [];
        const dibujo: DibujoDelTurno = {
          anuncia: (m, clave, puede) => trafico.anuncia(m, clave, puede),
          paso(dt, alLlegar) {
            const x = trafico.paso(dt, alLlegar);
            idos.push(...x);
            return x;
          },
          todaviaNo: (m, clave) => trafico.todaviaNo(m, clave),
          enFinal: (m) => trafico.enFinal(m),
          ocupanLaPista: () => trafico.ocupanLaPista(),
          dibujado: (m) => trafico.dibujado(m),
        };
        const turno = new TurnoDePista({
          radio,
          boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
          trafico: () => dibujo,
          torre: () => true,
          privado: () => false,
          alUmbral: () => Infinity,
          alto: () => 0,
          decirAOtro: () => null,
          autorizarte: () => {},
          mandarteAlAire: () => {},
        });
        const azar = dados(semilla * 31);
        const rodar = 20 + azar() * 900;
        let hablando = false;
        const tocados = new Set<string>();
        for (let t = 0; t < rodar + 400; t += 0.5) {
          if (azar() < 0.05) hablando = azar() < habla;
          const fase = t < rodar ? "rodando" : "esperando";
          const antes = idos.length;
          /*
           * Antes del paso: el guion se mira como estaba al llegar a la
           * decisión, que es cuando se decide.
           */
          const queria = new Map(
            trafico.quienes().map((q) => [q.matricula, frustradaDelGuion(radio, q.matricula)]),
          );
          turno.oir(0.5, { fase, deDia: true, instructorHablando: hablando });
          for (const q of trafico.porDentro())
            if (q.camino === "llegada" && q.toca !== null && q.recorrido >= q.toca && !tocados.has(q.matricula)) {
              tocados.add(q.matricula);
              aterrizan++;
            }
          for (const m of idos.slice(antes)) {
            const ocupada = trafico.ocupanLaPista().some((x) => x !== m);
            const laTiene = radio.conLaPista.some((x) => x.matricula !== m);
            if (!ocupada && !laTiene && !queria.get(m)) libres.push(`${semilla}: ${m} a ${t} s`);
          }
        }
        trafico.dispose();
      }
      expect(aterrizan).toBeGreaterThan(80);
      expect(libres).toEqual([]);
    });
  }
});
