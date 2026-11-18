/**
 * **La llamada de cabina pide turno en la boca** (H29j), en vez de buscar un
 * silencio.
 *
 * La aguda y grave de la tripulación sonaba en cuanto nadie hablaba, y entre
 * dos frases de la torre siempre hay un rato en que nadie habla: los 0,8 s de
 * `SILENCIO`. El tono dura más que eso —1,55 s—, y la boca, que no sabía que
 * estaba sonando, arrancaba la frase siguiente encima. Medido en Los Rodeos
 * con el JAZ 90 en Taguató: el tono entre la verde y su «cleared for
 * take-off», y la fraseología empezando debajo de él.
 *
 * Pidiendo turno, el tono es una frase más para la boca: espera a lo que es
 * para ti —la autorización entera—, pasa delante de la instructora, y
 * mientras suena no arranca nadie. Y la voz va detrás, lo siguiente que suena.
 */
import { describe, expect, it } from "vitest";
import { Boca, SILENCIO, type Hablar } from "./boca";
import { DE_LA_LLAMADA_A_LA_VOZ, esUnaLlamada, laLlamadaDe, pedirLaLlamada } from "./tonos-de-cabina";
import { tieneSuMomento } from "./megafonia";

/** Lo que dura de verdad la aguda y grave, ms: la grave entra a los 0,55 s y dura uno. */
const SUENA_EL_TONO = 1550;

/** Una boca con su reloj de mentira y lo que sonó, con cuándo empezó y acabó. */
function conReloj() {
  let ahora = 0;
  const luego: { cuando: number; hacer: () => void }[] = [];
  const esperar = (ms: number, hacer: () => void): void => {
    luego.push({ cuando: ahora + ms, hacer });
  };
  const avanzar = (hasta: number): void => {
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
  const sono: { que: string; desde: number; hasta: number }[] = [];
  const frase =
    (que: string, ms: number): Hablar =>
    (listo) => {
      sono.push({ que, desde: ahora, hasta: ahora + ms });
      esperar(ms, listo);
    };
  const llamar = (anuncio: string, voz: number, al: { alCaer?: (porque: string) => void } = {}): void =>
    pedirLaLlamada(boca, {
      tono: "llamadaTripulacion",
      anuncio,
      tocar: () => sono.push({ que: `tono:${anuncio}`, desde: ahora, hasta: ahora + SUENA_EL_TONO }),
      laVoz: () => boca.pedir("baja", frase(anuncio, voz), anuncio),
      esperar,
      ...al,
    });
  return { boca, sono, frase, llamar, avanzar, ahora: () => ahora };
}

describe("la llamada de cabina pide turno en la boca (H29j)", () => {
  it("su clave dice de qué anuncio es, y no es la del anuncio", () => {
    expect(laLlamadaDe("comandante.despegue~4")).toBe("llamada:comandante.despegue~4");
    expect(esUnaLlamada("llamada:comandante.despegue~4")).toBe(true);
    expect(esUnaLlamada("comandante.despegue~4")).toBe(false);
    expect(esUnaLlamada(undefined)).toBe(false);
  });

  /*
   * Lo que tiene su momento espera lo que dure: «sentados para el despegue»
   * hasta el V1, detrás de la autorización entera. Lo que no, su reloj.
   */
  it("aguanta lo que su momento, si lo tiene", () => {
    expect(tieneSuMomento("comandante.despegue~4")).toBe(true);
    expect(tieneSuMomento("comandante.crosscheck")).toBe(true);
    expect(tieneSuMomento("tripulacion.canario.llegada@tripulacion.canario.bienvenidos.tenerife-norte")).toBe(true);
    expect(tieneSuMomento("comandante.aproximacion")).toBe(false);
  });

  /*
   * El caso medido: la verde en castellano sonando, su fraseología esperando
   * detrás y «sentados para el despegue» pedido en medio. El tono iba al
   * silencio entre las dos y la fraseología arrancaba debajo.
   */
  it("en la verde, el tono no suena en el silencio entre la lámpara y su fraseología", () => {
    const { boca, sono, frase, llamar, avanzar } = conReloj();
    boca.pedir("mando", frase("torre.verde", 6179), "torre.canario.verde@yo");
    boca.pedir("mando", frase("torre.clearedTakeoff", 10512), "torre.canario.clearedTakeoff@yo");
    avanzar(4000);
    llamar("comandante.despegue~4", 1830);
    avanzar(40000);
    expect(sono.map((s) => s.que)).toEqual([
      "torre.verde",
      "torre.clearedTakeoff",
      "tono:comandante.despegue~4",
      "comandante.despegue~4",
    ]);
    // Y nadie empieza mientras suena el tono: ni antes de su voz, ni encima de ella.
    const tono = sono[2]!;
    for (const s of sono)
      if (s !== tono) expect(s.hasta <= tono.desde || s.desde >= tono.hasta, s.que).toBe(true);
    // La fraseología acabó con su silencio antes de que sonara la llamada.
    expect(tono.desde).toBeGreaterThanOrEqual(sono[1]!.hasta + SILENCIO);
  });

  it("la voz es lo siguiente que suena detrás de su tono, aunque se pidiera algo mientras sonaba", () => {
    const { boca, sono, frase, llamar, avanzar } = conReloj();
    llamar("comandante.despegue~4", 1830);
    avanzar(500);
    // Durante el tono, la instructora con la fase y la torre con lo suyo.
    boca.pedir("normal", frase("vuelo.alineando", 2400), "vuelo.alineando");
    boca.pedir("mando", frase("torre.tora", 9200), "torre.canario.tora@yo");
    avanzar(30000);
    expect(sono.map((s) => s.que)).toEqual([
      "tono:comandante.despegue~4",
      "comandante.despegue~4",
      "torre.tora",
      "vuelo.alineando",
    ]);
    // Detrás del tono y de un respiro, como cualquier frase detrás de otra.
    expect(sono[1]!.desde).toBe(DE_LA_LLAMADA_A_LA_VOZ * 1000 + SILENCIO);
    expect(sono[1]!.desde).toBeGreaterThanOrEqual(sono[0]!.hasta);
  });

  /*
   * Con el peso de la megafonía no llegaba nunca: en el despegue la cola no
   * se vacía, y la instructora siempre tiene una fase esperando.
   */
  it("espera a lo que es para ti y pasa delante de lo que cuenta la instructora", () => {
    const { boca, sono, frase, llamar, avanzar } = conReloj();
    boca.pedir("mando", frase("torre.verde", 6179), "torre.canario.verde@yo");
    boca.pedir("normal", frase("vuelo.alineando", 2400), "vuelo.alineando");
    llamar("comandante.despegue~4", 1830);
    boca.pedir("mando", frase("torre.clearedTakeoff", 10512), "torre.canario.clearedTakeoff@yo");
    avanzar(40000);
    expect(sono.map((s) => s.que)).toEqual([
      "torre.verde",
      "torre.clearedTakeoff",
      "tono:comandante.despegue~4",
      "comandante.despegue~4",
      "vuelo.alineando",
    ]);
  });

  it("lo urgente sigue pasando delante, y la llamada no se barre: espera y suena después", () => {
    const { boca, sono, frase, llamar, avanzar } = conReloj();
    boca.pedir("normal", frase("vuelo.rodando", 3000), "vuelo.rodando");
    llamar("comandante.despegue~4", 1830);
    avanzar(1000);
    boca.pedir("urgente", frase("vuelo.pistaOcupada", 2000), "vuelo.pistaOcupada");
    avanzar(30000);
    expect(sono.map((s) => s.que)).toEqual([
      "vuelo.rodando",
      "vuelo.pistaOcupada",
      "tono:comandante.despegue~4",
      "comandante.despegue~4",
    ]);
  });

  it("si se le pasa el momento esperando turno, se cae con su porqué y sin voz", () => {
    const { boca, sono, frase, llamar, avanzar } = conReloj();
    const caidas: string[] = [];
    boca.pedir("mando", frase("torre.clearedTakeoff", 10512), "torre.canario.clearedTakeoff@yo");
    llamar("comandante.despegue~4", 1830, { alCaer: (porque) => caidas.push(porque) });
    avanzar(2000);
    // Lo que retira la fase al empezar la carrera, o la caducidad del juego.
    boca.retirar((c) => c === laLlamadaDe("comandante.despegue~4"));
    avanzar(30000);
    expect(caidas).toEqual(["ya no es verdad"]);
    expect(sono.map((s) => s.que)).toEqual(["torre.clearedTakeoff"]);
    expect(boca.descartadas.some((d) => d.includes("llamada:comandante.despegue~4: ya no es verdad"))).toBe(true);
  });
});
