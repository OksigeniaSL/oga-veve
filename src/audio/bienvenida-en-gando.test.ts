/**
 * **La bienvenida de Jazlyn cabe en el rodaje de Gran Canaria** — jugando a
 * tiempo real.
 *
 * En la ronda de cierre de la tanda 6, de Gran Canaria a Los Rodeos con el
 * JAZ 90 y Taguató: «no sonaron: comandante.bienvenida». El volcado de voces
 * lo cuenta entero. La autorización de ruta ocupó la boca los primeros
 * diecisiete segundos; detrás, la instructora con su fase y el crosscheck de
 * Jazlyn, que acabó a los 23,9. La bienvenida se pidió entonces, justo cuando
 * el avión llegaba a la doble raya: la torre dijo de seguido la roja, la verde
 * y la autorización con el viento —de los 24,7 a los 50,4, en `mando`, que
 * pasa delante—, y la bienvenida, que esperaba detrás, se retiró al empezar la
 * carrera: no hay bienvenida con el avión corriendo.
 *
 * No era la cola ni la megafonía: el rodaje había durado sesenta y cuatro
 * segundos de juego, y el banco lo corría a ×3, o sea en veintiuno de pared.
 * Las fases van con el reloj del juego y las voces con el de pared. A tiempo
 * real, que es como se juega, detrás del crosscheck quedan cuarenta segundos
 * de rodaje y la bienvenida suena entera antes de la doble raya. Esto
 * reproduce ese rodaje con la boca, la megafonía y las duraciones grabadas, a
 * los dos relojes. Ver `scripts/reloj-del-banco.mjs`.
 */
import { describe, expect, it } from "vitest";
import { anunciaLaFase, Boca, type Hablar } from "./boca";
import { Megafonia, seLePasoElMomento } from "./megafonia";
import { esDeLaMegafonia } from "./turnos";
import { GUION, type Fase } from "../flight/vuelo";

/** Lo que dura cada frase grabada, ms: de los manifiestos de `data/voces`. */
const DURA = {
  nuestroAvion: 5400,
  destino: 4800,
  clearedTo: 4800,
  crosscheck: 2865,
  // La de Los Rodeos con su plan: veinte minutos a nivel ciento cincuenta.
  bienvenida: 5707 + 1826 + 1321,
  roja: 5900,
  verde: 6800,
  clearedTakeoff: 11400,
  despegue: 1830,
  fase: 1100,
} as const;

/**
 * Las fases medidas en el banco, en segundos de juego desde que empieza a
 * rodar: sesenta y cuatro de rodaje, tres en la doble raya, la verde y la
 * carrera hasta el V1.
 */
function faseA(s: number): Fase {
  if (s < 64) return "rodando";
  if (s < 67) return "esperando";
  if (s < 77.6) return "autorizado";
  if (s < 81.2) return "alineando";
  if (s < 95.8) return "despegando";
  return "comprometido";
}

/** La carrera, que el banco ya volaba a tiempo real. */
const EN_LA_CARRERA = new Set<Fase>(["autorizado", "alineando", "despegando", "comprometido"]);

/**
 * Del puesto a la carrera en Gando, con el rodaje a `veces` y la carrera a
 * uno. Devuelve lo que sonó, en orden.
 */
function elRodaje(veces: number): string[] {
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
      const suya = que.startsWith("comandante.");
      if (suya) comandanteHablando = true;
      esperar(ms, () => {
        if (suya) comandanteHablando = false;
        listo();
      });
    };

  const megafonia = new Megafonia();
  const conPasaje = {
    conPasaje: true,
    conTripulacion: true,
    sobreElCampo: 0,
    vertical: 0,
    desdeLoMasAlto: 0,
  };
  const decir = (anuncio: string | null) => {
    if (!anuncio) return;
    const ms = anuncio === "comandante.crosscheck"
      ? DURA.crosscheck
      : anuncio === "comandante.bienvenida"
        ? DURA.bienvenida
        : DURA.despegue;
    boca.pedir("baja", frase(anuncio, ms), anuncio);
  };

  // En el puesto: la autorización de ruta y, pedido detrás, el crosscheck.
  boca.pedir("normal", frase("vuelo.nuestroAvion", DURA.nuestroAvion), "vuelo.nuestroAvion");
  boca.pedir("mando", frase("torre.destino", DURA.destino), "torre.canario.destino@yo");
  boca.pedir("mando", frase("torre.clearedTo", DURA.clearedTo), "torre.canario.clearedTo@yo");
  for (let t = 0; t < 6; t += 0.5)
    decir(megafonia.paso(0.5, { fase: "estacionado", ...conPasaje }));

  let fase: Fase = "estacionado";
  let juego = 0;
  const PASO = 50;
  for (let pared = PASO; pared <= 120000 && juego < 100; pared += PASO) {
    avanzar(pared);
    const ahoraFase = faseA(juego);
    if (ahoraFase !== fase) {
      fase = ahoraFase;
      const clave = GUION[fase].clave;
      boca.retirar((c) => anunciaLaFase(c) && c !== clave);
      boca.pedir("normal", frase(clave, DURA.fase), clave);
      // La torre en la doble raya: la roja, y al darte la pista la verde y
      // la autorización con el viento, de seguido.
      if (fase === "esperando")
        boca.pedir("mando", frase("torre.roja", DURA.roja), "torre.canario.roja@yo");
      if (fase === "autorizado") {
        boca.pedir("mando", frase("torre.verde", DURA.verde), "torre.canario.verde@yo");
        boca.pedir(
          "mando",
          frase("torre.clearedTakeoff", DURA.clearedTakeoff),
          "torre.canario.clearedTakeoff@yo",
        );
      }
    }
    boca.retirar((c) => seLePasoElMomento(c, fase));
    const dt = (PASO / 1000) * (EN_LA_CARRERA.has(fase) ? 1 : veces);
    juego += dt;
    decir(
      megafonia.paso(dt, {
        fase,
        ...conPasaje,
        megafoniaHablando:
          comandanteHablando || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
      }),
    );
  }
  return sono;
}

describe("la bienvenida de Jazlyn en el rodaje de Gran Canaria", () => {
  it("a tiempo real suena entera, detrás del crosscheck y antes de la doble raya", () => {
    const sono = elRodaje(1);
    expect(sono).toContain("comandante.crosscheck");
    expect(sono).toContain("comandante.bienvenida");
    expect(sono.indexOf("comandante.bienvenida")).toBeGreaterThan(
      sono.indexOf("comandante.crosscheck"),
    );
    // Y antes que la torre en la doble raya: le sobra rodaje.
    expect(sono.indexOf("comandante.bienvenida")).toBeLessThan(sono.indexOf("torre.roja"));
    // Y «sentados para el despegue», detrás y en su ventana.
    expect(sono.indexOf("comandante.despegue")).toBeGreaterThan(
      sono.indexOf("comandante.bienvenida"),
    );
  });

  it("a ×3 el rodaje cabe en veinte segundos y la torre se lleva su hueco", () => {
    const sono = elRodaje(3);
    expect(sono).toContain("comandante.crosscheck");
    expect(sono).not.toContain("comandante.bienvenida");
    // Lo que se medía era el reloj, no la boca: la torre dijo todo lo suyo.
    expect(sono).toEqual(
      expect.arrayContaining(["torre.roja", "torre.verde", "torre.clearedTakeoff"]),
    );
  });
});
