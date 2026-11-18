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
import { DE_LA_LLAMADA_A_LA_VOZ } from "./tonos-de-cabina";
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

  let llamada: { anuncio: string; sono: number | null } | null = null;
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
    /*
     * Y con su llamada delante, como en el juego —ver `atenderALasLlamadas`—:
     * el tono en un silencio y la voz al acabar, con el reloj del juego.
     */
    const juego = (pared / 1000) * veces;
    if (llamada?.sono === null && !boca.ocupada) llamada.sono = juego;
    else if (llamada && llamada.sono !== null && juego - llamada.sono >= DE_LA_LLAMADA_A_LA_VOZ) {
      boca.pedir("baja", frase(llamada.anuncio, DURA.despegue), llamada.anuncio);
      llamada = null;
    }
    const anuncio = megafonia.paso((PASO / 1000) * veces, {
      fase,
      ...conPasaje,
      megafoniaHablando:
        comandanteHablando || llamada !== null || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
    });
    if (anuncio) llamada = { anuncio, sono: null };
  }
  return sono;
}

/**
 * **La verde con la intersección delante y la llamada de la tripulación**,
 * como se midió en H29i: Los Rodeos con el JAZ 90 en Taguató, sin que la
 * torre preguntara en la roja. Detrás de la verde y de su fraseología van la
 * oferta de la intersección y la TORA, cuatro frases de la torre seguidas, y
 * «sentados para el despegue» lleva delante su llamada: el tono suena en el
 * primer silencio y la voz pide turno al acabar. Las duraciones, del volcado
 * de voces del banco; las fases, de su recorrido. Devuelve lo que sonó.
 */
function laVerdeConLaInterseccion(): string[] {
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
      if (que.startsWith("comandante.")) comandanteHablando = true;
      esperar(ms, () => {
        if (que.startsWith("comandante.")) comandanteHablando = false;
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
  for (const fase of ["estacionado", "rodando"] as const)
    for (let t = 0; t < 10; t += 0.5) megafonia.paso(0.5, { fase, ...conPasaje });

  // Medido: de la verde a la carrera, 34 s; y el V1, a los 52.
  const faseA = (s: number): Fase =>
    s < 22 ? "autorizado" : s < 34 ? "alineando" : s < 52 ? "despegando" : s < 55 ? "comprometido" : "en-vuelo";

  boca.pedir("mando", frase("torre.verde", DURA.verde), "torre.canario.verde@yo");
  boca.pedir("mando", frase("torre.clearedTakeoff", DURA.clearedTakeoff), "torre.canario.clearedTakeoff@yo");
  let fase: Fase = "autorizado";
  boca.pedir("normal", frase(GUION[fase].clave, DURA.fase), GUION[fase].clave);
  // Por dónde se sale, con la verde: la oferta ya, y la TORA dos frases de radio después.
  boca.pedir("normal", frase("vuelo.desdeLaInterseccion", 3000), "vuelo.desdeLaInterseccion");
  boca.pedir("mando", frase("torre.ofreceInterseccion", 7400), "torre.canario.ofreceInterseccion@yo");
  esperar(8000, () => boca.pedir("mando", frase("torre.tora", 9200), "torre.canario.tora@yo"));

  /** La llamada que espera su silencio, y cuándo sonó. */
  let llamada: { anuncio: string; sono: number | null } | null = null;
  const PASO = 50;
  for (let pared = PASO; pared <= 60000; pared += PASO) {
    avanzar(pared);
    const ahoraFase = faseA(pared / 1000);
    if (ahoraFase !== fase) {
      fase = ahoraFase;
      const clave = GUION[fase].clave;
      boca.retirar((c) => anunciaLaFase(c) && c !== clave);
      boca.pedir("normal", frase(clave, DURA.fase), clave);
    }
    boca.retirar((c) => seLePasoElMomento(c, fase));
    // Como `atenderALasLlamadas`: el tono en un silencio, y la voz al acabar.
    if (llamada?.sono === null && !boca.ocupada) {
      sono.push(`llamada:${llamada.anuncio}`);
      llamada.sono = ahora;
    } else if (llamada && llamada.sono !== null && ahora - llamada.sono >= DE_LA_LLAMADA_A_LA_VOZ * 1000) {
      boca.pedir("baja", frase(llamada.anuncio, DURA.despegue), llamada.anuncio);
      llamada = null;
    }
    const anuncio = megafonia.paso(PASO / 1000, {
      fase,
      ...conPasaje,
      megafoniaHablando:
        comandanteHablando || llamada !== null || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
    });
    if (anuncio) llamada = { anuncio, sono: null };
  }
  return sono;
}

/**
 * **La roja y la verde en Los Rodeos con el JAZ 90**, como quedan desde H29j:
 * la roja con su porqué, ochenta segundos callados en los que la torre
 * pregunta por la intersección —ver `comoSeSaldraDesdeAqui` en
 * `world/plan-de-vuelo.ts`—, y la verde con su fraseología, sin la fase de
 * autorizado de la instructora, que la lámpara acaba de decir —ver
 * `laVerdeLaDiceLaTorre` en `game.ts`—. Las fases de la verde, las medidas en
 * `laVerdeConLaInterseccion`; la llamada, como `atenderALasLlamadas`.
 * Devuelve lo que sonó y lo que se cayó.
 */
function laRojaYLaVerde(): { sono: string[]; caidas: string[] } {
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
      if (que.startsWith("comandante.")) comandanteHablando = true;
      esperar(ms, () => {
        if (que.startsWith("comandante.")) comandanteHablando = false;
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
  for (const fase of ["estacionado", "rodando"] as const)
    for (let t = 0; t < 10; t += 0.5) megafonia.paso(0.5, { fase, ...conPasaje });

  // La roja: la lámpara, su porqué en fraseología y la fase de la instructora.
  boca.pedir("mando", frase("torre.roja", 5800), "torre.canario.roja@yo");
  boca.pedir("mando", frase("torre.holdShortDeparting", 5600), "torre.canario.holdShortDeparting@yo");
  boca.pedir("normal", frase(GUION.esperando.clave, DURA.fase), GUION.esperando.clave);
  let porDondeSeSalePorDecir = true;

  // La verde a los 83 s, como en el vuelo a tiempo real de H29i.
  const VERDE = 83;
  const faseA = (s: number): Fase =>
    s < VERDE
      ? "esperando"
      : s < VERDE + 22
        ? "autorizado"
        : s < VERDE + 34
          ? "alineando"
          : s < VERDE + 52
            ? "despegando"
            : s < VERDE + 55
              ? "comprometido"
              : "en-vuelo";
  let fase: Fase = "esperando";
  let llamada: { anuncio: string; sono: number | null } | null = null;
  const PASO = 50;
  for (let pared = PASO; pared <= (VERDE + 60) * 1000; pared += PASO) {
    avanzar(pared);
    /*
     * Como `avanzarPlan`: en la roja y con la frecuencia callada, por dónde
     * se sale —la instructora y la oferta ya, y la TORA dos frases de radio
     * después, como `contarPorDondeSeSale`—.
     */
    if (porDondeSeSalePorDecir && fase === "esperando" && boca.libre) {
      porDondeSeSalePorDecir = false;
      boca.pedir("normal", frase("vuelo.desdeLaInterseccion", 3000), "vuelo.desdeLaInterseccion");
      boca.pedir("mando", frase("torre.ofreceInterseccion", 7400), "torre.canario.ofreceInterseccion@yo");
      esperar(8000, () => boca.pedir("mando", frase("torre.tora", 9200), "torre.canario.tora@yo"));
    }
    const ahoraFase = faseA(pared / 1000);
    if (ahoraFase !== fase) {
      fase = ahoraFase;
      const clave = GUION[fase].clave;
      boca.retirar((c) => anunciaLaFase(c) && c !== clave);
      if (fase === "autorizado") {
        // La lámpara y su fraseología; la instructora calla.
        boca.pedir("mando", frase("torre.verde", DURA.verde), "torre.canario.verde@yo");
        boca.pedir("mando", frase("torre.clearedTakeoff", DURA.clearedTakeoff), "torre.canario.clearedTakeoff@yo");
      } else boca.pedir("normal", frase(clave, DURA.fase), clave);
    }
    boca.retirar((c) => seLePasoElMomento(c, fase));
    if (llamada?.sono === null && !boca.ocupada) {
      sono.push(`llamada:${llamada.anuncio}`);
      llamada.sono = ahora;
    } else if (llamada && llamada.sono !== null && ahora - llamada.sono >= DE_LA_LLAMADA_A_LA_VOZ * 1000) {
      boca.pedir("baja", frase(llamada.anuncio, DURA.despegue), llamada.anuncio);
      llamada = null;
    }
    const anuncio = megafonia.paso(PASO / 1000, {
      fase,
      ...conPasaje,
      megafoniaHablando:
        comandanteHablando || llamada !== null || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
    });
    if (anuncio) llamada = { anuncio, sono: null };
  }
  return { sono, caidas: [...boca.descartadas] };
}

describe("la megafonía del despegue en Taguató", () => {
  it("con la intersección por delante, la voz va detrás de su llamada y antes del V1 (H29i)", () => {
    const sono = laVerdeConLaInterseccion();
    const llamada = sono.indexOf("llamada:comandante.despegue");
    const voz = sono.indexOf("comandante.despegue");
    expect(llamada).toBeGreaterThanOrEqual(0);
    expect(voz).toBeGreaterThan(llamada);
    // Detrás de su llamada, como mucho lo que ya sonaba: la voz es lo siguiente.
    expect(voz - llamada).toBeLessThanOrEqual(2);
    expect(voz).toBeLessThan(sono.indexOf(GUION.comprometido.clave));
    // Y la torre dice todo lo suyo igual.
    for (const t of ["torre.verde", "torre.clearedTakeoff", "torre.ofreceInterseccion", "torre.tora"])
      expect(sono).toContain(t);
  });

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

  /*
   * Antes de H29i esto decía que a ×2 Jazlyn no cabía detrás de la torre. Con
   * la voz que va detrás de su llamada como lo siguiente que suena, cabe
   * también ahí: el tono entra en el silencio entre la lámpara y su
   * fraseología, y la voz no espera a nadie más. Lo que sigue sin caber es lo
   * que mide el reloj apretado: la fase de autorizado de la instructora.
   */
  it("a ×2, la ventana es la mitad: Jazlyn cabe detrás de su llamada, y la fase de autorizado no", () => {
    const sono = laVerde(2);
    expect(sono).toContain("comandante.despegue");
    const v1 = sono.indexOf(GUION.comprometido.clave);
    expect(sono.indexOf("comandante.despegue")).toBeLessThan(v1 < 0 ? Infinity : v1);
    // Ni la fase de autorizado: lo que se medía era el reloj, no la cola.
    expect(sono).not.toContain(GUION.autorizado.clave);
  });

  /*
   * **Y lo que pasa ahora en Los Rodeos con el JAZ 90 (H29j)**: la torre
   * pregunta por la intersección en la roja, en cuanto calla la frecuencia,
   * y en la verde la instructora no repite lo que acaba de decir la lámpara.
   * En los cuatro vuelos medidos antes se caían «desdeLaInterseccion»,
   * «autorizado» y «alineando»; aquí no se cae nada.
   */
  it("con la intersección contada en la roja, del despegue no se cae nada", () => {
    const { sono, caidas } = laRojaYLaVerde();
    const verde = sono.indexOf("torre.verde");
    for (const c of ["vuelo.desdeLaInterseccion", "torre.ofreceInterseccion", "torre.tora"]) {
      expect(sono, c).toContain(c);
      expect(sono.indexOf(c), c).toBeLessThan(verde);
    }
    for (const c of ["torre.clearedTakeoff", "comandante.despegue"]) expect(sono, c).toContain(c);
    for (const f of ["alineando", "despegando", "comprometido"] as const)
      expect(sono, f).toContain(GUION[f].clave);
    expect(sono).not.toContain(GUION.autorizado.clave);
    expect(caidas).toEqual([]);
  });
});
