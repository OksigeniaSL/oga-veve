/**
 * **«Tripulación, sentados para el despegue» cabe en su ventana, también en
 * Taguató** — jugando a tiempo real.
 *
 * Al juntar las voces y el radar, el banco de Los Rodeos con el JAZ 90 y
 * Taguató dio «no sonaron: comandante.despegue», y se leyó como una cola
 * parada: de la autorización a «rotate» no se oía nada nuevo en once
 * segundos. No estaba parada. Con las duraciones de las grabaciones, la boca
 * habló sin parar: la torre en castellano —seis segundos— y detrás su
 * fraseología con el viento —diez y medio—, y todo lo que esperaba detrás
 * —la instructora con sus fases, Jazlyn— se cayó al llegar el V1.
 *
 * Lo que pasaba es que el banco corría el despegue a ×2: las fases van con el
 * reloj del juego y la voz con el de pared, así que de la verde al V1 había
 * diecinueve segundos de pared para dieciocho de torre. Esto reproduce esa
 * ventana con la boca y la megafonía de verdad y las duraciones grabadas, a
 * los dos relojes. Ver `relojPara` en `scripts/verificar-vuelo-entero.mjs`.
 */
import { describe, expect, it } from "vitest";
import { anunciaLaFase, Boca, type Hablar } from "./boca";
import { Megafonia, seLePasoElMomento } from "./megafonia";
import { esDeLaMegafonia } from "./turnos";
import { GUION, type Fase } from "../flight/vuelo";

/** Lo que dura cada frase grabada, ms: de los manifiestos de `data/voces`. */
const DURA = {
  verde: 6179,
  clearedTakeoff: 10512,
  despegue: 1830,
  // Las fases de la instructora, por lo largo.
  fase: 2400,
} as const;

/**
 * Las fases medidas en el banco, en segundos de juego desde la verde: se
 * entra en la pista a los 17,6 y el V1 llega a los 38.
 */
function faseA(s: number): Fase {
  if (s < 17.6) return "autorizado";
  if (s < 22) return "alineando";
  if (s < 38) return "despegando";
  if (s < 41) return "comprometido";
  return "en-vuelo";
}

/** La verde en Taguató, con el reloj del juego a `veces`. Devuelve lo que sonó. */
function laVerde(veces: number): string[] {
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
  let comandanteHablando = false;
  const frase =
    (que: string, ms: number): Hablar =>
    (listo) => {
      sono.push(que);
      if (que === "comandante.despegue") comandanteHablando = true;
      esperar(ms, () => {
        if (que === "comandante.despegue") comandanteHablando = false;
        listo();
      });
    };

  // Lo del puesto y el rodaje ya se dijo.
  const megafonia = new Megafonia();
  const conPasaje = {
    conPasaje: true,
    conTripulacion: true,
    sobreElCampo: 0,
    vertical: 0,
    desdeLoMasAlto: 0,
  };
  for (const fase of ["estacionado", "rodando"] as const)
    for (let t = 0; t < 10; t += 0.5) megafonia.paso(0.5, { fase, ...conPasaje });

  // La verde: la lámpara en castellano, su fraseología y la instructora.
  boca.pedir("mando", frase("torre.verde", DURA.verde), "torre.canario.verde@yo");
  boca.pedir(
    "mando",
    frase("torre.clearedTakeoff", DURA.clearedTakeoff),
    "torre.canario.clearedTakeoff@yo",
  );
  let fase: Fase = "autorizado";
  boca.pedir("normal", frase(GUION[fase].clave, DURA.fase), GUION[fase].clave);

  const PASO = 50;
  for (let pared = PASO; pared <= 30000; pared += PASO) {
    avanzar(pared);
    const ahoraFase = faseA((pared / 1000) * veces);
    if (ahoraFase !== fase) {
      fase = ahoraFase;
      const clave = GUION[fase].clave;
      boca.retirar((c) => anunciaLaFase(c) && c !== clave);
      boca.pedir("normal", frase(clave, DURA.fase), clave);
    }
    boca.retirar((c) => seLePasoElMomento(c, fase));
    const anuncio = megafonia.paso((PASO / 1000) * veces, {
      fase,
      ...conPasaje,
      megafoniaHablando:
        comandanteHablando || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
    });
    if (anuncio)
      boca.pedir("baja", frase(anuncio, DURA.despegue), anuncio);
  }
  return sono;
}

describe("la megafonía del despegue en Taguató", () => {
  it("a tiempo real, Jazlyn suena detrás de la torre y antes del V1", () => {
    const sono = laVerde(1);
    expect(sono.slice(0, 2)).toEqual(["torre.verde", "torre.clearedTakeoff"]);
    expect(sono).toContain("comandante.despegue");
    // Y en su ventana: antes de que la instructora cante el V1.
    expect(sono.indexOf("comandante.despegue")).toBeLessThan(
      sono.indexOf(GUION.comprometido.clave) < 0
        ? Infinity
        : sono.indexOf(GUION.comprometido.clave),
    );
  });

  it("a ×2, la ventana es la mitad y detrás de la torre no cabe nadie", () => {
    const sono = laVerde(2);
    expect(sono).not.toContain("comandante.despegue");
    // Ni la fase de autorizado: lo que se medía era el reloj, no la cola.
    expect(sono).not.toContain(GUION.autorizado.clave);
  });
});
