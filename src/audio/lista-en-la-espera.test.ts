/**
 * **La lista de antes de despegar suena entera, y antes de la verde** (H29n).
 *
 * Medido en H29m con el banco del vuelo entero: en Guyrami con la JAZ 20,
 * «vuelo.flapsParaDespegar» caducó esperando y «vuelo.flapsDeDespeguePuestos»
 * no cupo en la cola; en Taguató se caían también las del compensador. La
 * torre miraba a los cuatro segundos de parar en el punto de espera, y en ese
 * rato decía la roja, con la verde y su fraseología detrás: lo que pedía la
 * lista esperaba turno detrás de ella y caducaba, que lo de la instructora
 * aguanta cuatro segundos.
 *
 * De verdad la lista se hace parado en el punto de espera, y solo al acabarla
 * se le dice a la torre «listo»: la autorización viene detrás. Esto monta el
 * punto de espera con la boca de verdad, las dos líneas de la lista como las
 * lee `Game.atenderALosFlapsDelDespegue` y una torre que mira como
 * `Vuelo.atenderALaTorre`, con las duraciones grabadas.
 */
import { describe, expect, it } from "vitest";
import { Boca, cuantoAguanta, type Hablar } from "./boca";
import {
  ListaDeAntesDeDespegar,
  laListaEstaLeida,
  leTocaAlCompensador,
  type AntesDeDespegar,
} from "../flight/flaps-de-despegue";
import type { Peldano } from "../flight/escalera";
import { LA_LISTA_COMO_MUCHO } from "../flight/vuelo";

/** Lo que dura cada frase grabada, ms: de los manifiestos de `data/voces`. */
const DURA: Record<string, number> = {
  "vuelo.flapsParaDespegar": 3907,
  "vuelo.flapsDeDespeguePuestos": 4107,
  "vuelo.compensadorParaDespegar": 5707,
  "vuelo.compensadorDeDespeguePuesto": 5007,
  "vuelo.esperando": 1569,
  "torre.canario.roja@yo": 5800,
  "torre.canario.verde@yo": 6179,
  "torre.canario.clearedTakeoff@yo": 10512,
  "torre.canario.holdShort@otro": 4400,
  "torre.canario.holdShort@yo": 4000,
  "torre.canario.ofreceInterseccion@yo": 7300,
  "torre.canario.tora@yo": 8900,
};

/** Quieto en la raya antes de que la torre mire, y lo que tarda: ver `vuelo.ts`. */
const ESPERA_MINIMA = 1.5;
const TORRE_TARDA = 2.2;

const LINEA: Record<"flaps" | "compensador", Record<AntesDeDespegar, string>> = {
  flaps: { pide: "vuelo.flapsParaDespegar", losPone: "vuelo.flapsDeDespeguePuestos" },
  compensador: {
    pide: "vuelo.compensadorParaDespegar",
    losPone: "vuelo.compensadorDeDespeguePuesto",
  },
};

/** Lo que dice la frecuencia mientras se espera: a los cuántos segundos de parar, quién y qué. */
type Charla = readonly (readonly [number, "normal" | "mando", string])[];

/**
 * Se para en el punto de espera con la pista libre, sin tocar nada. Con
 * `esperaALaLista`, la torre no mira hasta que la lista está leída, como
 * desde H29n —y como mucho `LA_LISTA_COMO_MUCHO`—; sin, como antes. Con
 * `charla`, lo que dice además la frecuencia. Devuelve lo que sonó y lo que
 * se cayó.
 */
function enElPuntoDeEspera(
  peldano: Peldano,
  esperaALaLista: boolean,
  charla: Charla = [],
): { sono: string[]; caidas: string[]; verdeA: number | null } {
  let ahora = 0;
  const luego: { cuando: number; hacer: () => void }[] = [];
  const esperar = (ms: number, hacer: () => void) => {
    luego.push({ cuando: ahora + ms, hacer });
  };
  const avanzar = (hasta: number) => {
    for (;;) {
      luego.sort((a, b) => a.cuando - b.cuando);
      const p = luego[0];
      if (!p || p.cuando > hasta) break;
      luego.shift();
      ahora = p.cuando;
      p.hacer();
    }
    ahora = hasta;
  };
  const boca = new Boca({ ahora: () => ahora, cancelar: () => {}, esperar });
  const sono: string[] = [];
  const frase =
    (que: string): Hablar =>
    (listo) => {
      sono.push(que);
      esperar(DURA[que] ?? 2000, listo);
    };
  const pedir = (urgencia: "normal" | "mando", clave: string) =>
    boca.pedir(urgencia, frase(clave), clave);

  const flaps = new ListaDeAntesDeDespegar();
  const compensador = new ListaDeAntesDeDespegar();
  let flapsPuestos = false;
  let compensadorPuesto = false;
  let quieto = 0;
  let mirando = 0;
  let verdeA: number | null = null;
  let roja = false;
  const porDecir = [...charla];

  const PASO = 50;
  const dt = PASO / 1000;
  // Hasta tres segundos después de la verde, rodando ya hacia la pista.
  for (let pared = PASO; pared <= 150000; pared += PASO) {
    avanzar(pared);
    if (verdeA !== null && pared / 1000 > verdeA + 3) break;
    const rodando = verdeA !== null;
    // La lista, como `atenderALosFlapsDelDespegue`: antes que la lámpara.
    const l = {
      fase: rodando ? ("autorizado" as const) : ("esperando" as const),
      enTierra: true,
      porElSuelo: rodando ? 3 : 0,
      hablando: !boca.libre || boca.ocupada,
      peldano,
      dt,
    };
    const f = flaps.paso({ ...l, puestos: flapsPuestos });
    if (f) {
      if (f === "losPone") flapsPuestos = true;
      pedir("normal", LINEA.flaps[f]);
    }
    if (leTocaAlCompensador(flaps, { conFlaps: true, flapsPuestos })) {
      const c = compensador.paso({ ...l, hablando: l.hablando || boca.ocupada, puestos: compensadorPuesto });
      if (c) {
        if (c === "losPone") compensadorPuesto = true;
        pedir("normal", LINEA.compensador[c]);
      }
    }
    const porLeer = !laListaEstaLeida(flaps, compensador, {
      conFlaps: true,
      flapsPuestos,
      conCompensador: true,
      compensadorPuesto,
      peldano,
    });
    while (porDecir[0] && porDecir[0][0] <= pared / 1000) {
      const [, urgencia, clave] = porDecir.shift()!;
      pedir(urgencia, clave);
    }
    // La lámpara en rojo al parar, y la fase de la instructora.
    if (!roja) {
      roja = true;
      pedir("mando", "torre.canario.roja@yo");
      pedir("normal", "vuelo.esperando");
    }
    // La torre, como `Vuelo.atenderALaTorre`.
    quieto += dt;
    if (esperaALaLista && porLeer && quieto < LA_LISTA_COMO_MUCHO) mirando = 0;
    else if (quieto > ESPERA_MINIMA) mirando += dt;
    if (mirando > TORRE_TARDA && verdeA === null) {
      verdeA = pared / 1000;
      // La verde retira lo de la roja: ver `luzDeTorre` en `game.ts`.
      boca.retirar((c) => c === "torre.canario.roja@yo" || c === "vuelo.esperando");
      pedir("mando", "torre.canario.verde@yo");
      pedir("mando", "torre.canario.clearedTakeoff@yo");
    }
  }
  // Y la verde con su fraseología, hasta que calle.
  avanzar(ahora + 30000);
  return { sono, caidas: [...boca.descartadas], verdeA };
}

const ABAJO: readonly Peldano[] = ["dibujo", "palabra", "cifra"];
const DE_LA_LISTA = Object.values(LINEA).flatMap((l) => Object.values(l));

describe("la lista de antes de despegar en el punto de espera", () => {
  it("como estaba, con la torre mirando a los cuatro segundos, la lista no cabía antes de la verde", () => {
    // Entrando con la verde, la instructora los pone y lo dice detrás de la torre, o se cae.
    const { sono, caidas } = enElPuntoDeEspera("cifra", false);
    const verde = sono.indexOf("torre.canario.verde@yo");
    const fuera = DE_LA_LISTA.filter(
      (k) => caidas.some((c) => c.includes(k)) || sono.indexOf(k) > verde,
    );
    expect(fuera.length).toBeGreaterThan(0);
  });

  it("las líneas de la lista no caducan: las retira el juego cuando dejan de valer", () => {
    for (const clave of DE_LA_LISTA) expect(cuantoAguanta(clave)).toBe(Infinity);
  });

  /*
   * Medido en el banco del vuelo entero, Taguató con la JAZ 20 (H29n): con
   * otro avión en la frecuencia, la torre le dijo «hold short» a él y a ti la
   * roja y tu «hold short», y luego ofreció la intersección y la TORA,
   * diecisiete segundos ella sola. Con un tope de cuarenta y cinco segundos
   * la torre soltó la verde con el compensador por leer, y su «lo puse yo» se
   * cayó detrás del «cleared for take-off».
   */
  it("con la frecuencia hablando, la lista espera a que calle y la verde sigue detrás", () => {
    const charla: Charla = [
      [0, "mando", "torre.canario.holdShort@otro"],
      [6, "mando", "torre.canario.holdShort@yo"],
      [13, "mando", "torre.canario.ofreceInterseccion@yo"],
      [13, "mando", "torre.canario.tora@yo"],
    ];
    for (const peldano of ABAJO) {
      const { sono, caidas, verdeA } = enElPuntoDeEspera(peldano, true, charla);
      expect(caidas).toEqual([]);
      const verde = sono.indexOf("torre.canario.verde@yo");
      for (const clave of DE_LA_LISTA) expect(sono.indexOf(clave)).toBeLessThan(verde);
      expect(sono.indexOf("torre.canario.tora@yo")).toBeLessThan(verde);
      expect(verdeA).toBeLessThan(LA_LISTA_COMO_MUCHO);
    }
  });

  for (const peldano of ABAJO)
    it(`en ${peldano}: la lista entera, sin caerse nada, y la verde detrás`, () => {
      const { sono, caidas, verdeA } = enElPuntoDeEspera(peldano, true);
      expect(caidas).toEqual([]);
      const verde = sono.indexOf("torre.canario.verde@yo");
      expect(verde).toBeGreaterThan(0);
      for (const clave of DE_LA_LISTA) {
        expect(sono).toContain(clave);
        expect(sono.indexOf(clave)).toBeLessThan(verde);
      }
      // Y la roja y la fase de la instructora, en su sitio.
      expect(sono.indexOf("torre.canario.roja@yo")).toBeLessThan(verde);
      expect(sono).toContain("vuelo.esperando");
      expect(sono.slice(verde)).toEqual(["torre.canario.verde@yo", "torre.canario.clearedTakeoff@yo"]);
      // Sin tocar nada, unos treinta segundos de espera: muy por debajo del tope.
      expect(verdeA).toBeLessThan(40);
    });

  it("en el de cabina, la lista se pide entera y nadie la hace por quien vuela", () => {
    const { sono, caidas } = enElPuntoDeEspera("cabina", true);
    expect(caidas).toEqual([]);
    const verde = sono.indexOf("torre.canario.verde@yo");
    expect(sono.indexOf("vuelo.flapsParaDespegar")).toBeLessThan(verde);
    expect(sono.indexOf("vuelo.compensadorParaDespegar")).toBeLessThan(verde);
    expect(sono).not.toContain("vuelo.flapsDeDespeguePuestos");
    expect(sono).not.toContain("vuelo.compensadorDeDespeguePuesto");
  });
});
