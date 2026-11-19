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
import { pedirLaLlamada } from "./tonos-de-cabina";
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

  let llamada = false;
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
        comandanteHablando || llamada || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
    });
    /*
     * Y con su llamada delante, como en el juego —ver `atenderALasLlamadas`—:
     * el tono pide turno y la voz va al acabar. Ver `pedirLaLlamada`.
     */
    if (anuncio) {
      llamada = true;
      pedirLaLlamada(boca, {
        tono: "llamadaTripulacion",
        anuncio,
        tocar: () => sono.push(`llamada:${anuncio}`),
        laVoz: () => {
          llamada = false;
          boca.pedir("baja", frase(anuncio, DURA.despegue), anuncio);
        },
        esperar,
      });
    }
  }
  return sono;
}

/**
 * **La verde con la intersección delante y la llamada de la tripulación**,
 * como se midió en H29i: Los Rodeos con el JAZ 90 en Taguató, sin que la
 * torre preguntara en la roja. Detrás de la verde y de su fraseología iban
 * entonces la oferta de la intersección y la TORA, cuatro frases de la torre
 * seguidas, y «sentados para el despegue» lleva delante su llamada: el tono
 * pide turno y la voz va al acabar. Las duraciones, del volcado de voces del
 * banco; las fases, de su recorrido. Devuelve lo que sonó.
 *
 * Desde H29j la torre pregunta en la roja, y desde H29m rodando, antes de
 * llegar a la espera. Esto es lo que queda cuando no calló la frecuencia ni
 * rodando ni en la roja: **la torre ya no ofrece nada con la verde**, que una
 * torre no ofrece una intersección después del «cleared for take-off», y
 * autoriza desde donde se está; la instructora, que va en la cabina, sí
 * cuenta por dónde se sale. Y sin la fase de autorizado de la instructora,
 * que en Taguató la dice la lámpara: ver `laVerdeLaDiceLaTorre` en `game.ts`.
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
  // Por dónde se sale, con la verde: solo la instructora. Ver `contarPorDondeSeSale`.
  boca.pedir("normal", frase("vuelo.desdeLaInterseccion", 3000), "vuelo.desdeLaInterseccion");

  /** Si hay una llamada pedida o sonando, que es la megafonía hablando. */
  let llamada = false;
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
    const anuncio = megafonia.paso(PASO / 1000, {
      fase,
      ...conPasaje,
      megafoniaHablando:
        comandanteHablando || llamada || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
    });
    // Como `atenderALasLlamadas`: el tono pide turno, y la voz al acabar.
    if (anuncio) {
      llamada = true;
      pedirLaLlamada(boca, {
        tono: "llamadaTripulacion",
        anuncio,
        tocar: () => sono.push(`llamada:${anuncio}`),
        laVoz: () => {
          llamada = false;
          boca.pedir("baja", frase(anuncio, DURA.despegue), anuncio);
        },
        esperar,
      });
    }
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
 *
 * Desde H29m la torre pregunta antes, rodando: esto es lo que queda cuando
 * rodando no calló la frecuencia y la roja es larga. Ver `laRojaCorta`.
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
  let llamada = false;
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
        // La lámpara y su fraseología; la instructora calla: ver `laVerdeLaDiceLaTorre`.
        boca.pedir("mando", frase("torre.verde", DURA.verde), "torre.canario.verde@yo");
        boca.pedir("mando", frase("torre.clearedTakeoff", DURA.clearedTakeoff), "torre.canario.clearedTakeoff@yo");
      } else boca.pedir("normal", frase(clave, DURA.fase), clave);
    }
    boca.retirar((c) => seLePasoElMomento(c, fase));
    const anuncio = megafonia.paso(PASO / 1000, {
      fase,
      ...conPasaje,
      megafoniaHablando:
        comandanteHablando || llamada || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
    });
    if (anuncio) {
      llamada = true;
      pedirLaLlamada(boca, {
        tono: "llamadaTripulacion",
        anuncio,
        tocar: () => sono.push(`llamada:${anuncio}`),
        laVoz: () => {
          llamada = false;
          boca.pedir("baja", frase(anuncio, DURA.despegue), anuncio);
        },
        esperar,
      });
    }
  }
  return { sono, caidas: [...boca.descartadas] };
}

/**
 * **La roja corta en Los Rodeos con el JAZ 90 (H29m)**: con la pista libre la
 * verde llega a los cuatro segundos de pararse —lo que tarda la torre en
 * mirarte, `TORRE_TARDA` en `flight/vuelo.ts`—, y en ese rato no cabe
 * preguntar nada. Así que la torre pregunta rodando, a cuatrocientos metros
 * del punto de espera y en cuanto calla la frecuencia —ver
 * `CERCA_DE_LA_ESPERA` y `contarPorDondeSeSale` en `game.ts`—: la oferta, la
 * instructora pedida con ella, y la TORA dos frases de radio después. Se
 * llega a la espera a los cuarenta segundos, la roja con su «hold short» y la
 * fase, y la verde a los cuatro, que retira lo que la roja tuviera esperando
 * como hace `turno.alCambiarLaLuz`. Las fases de la verde, las medidas en
 * H29k: la carrera a los treinta y tres segundos. Devuelve lo que sonó y lo
 * que se cayó.
 */
function laRojaCorta(): { sono: string[]; caidas: string[] } {
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

  const ESPERA = 40;
  const VERDE = ESPERA + 4;
  const faseA = (s: number): Fase =>
    s < ESPERA
      ? "rodando"
      : s < VERDE
        ? "esperando"
        : s < VERDE + 22
          ? "autorizado"
          : s < VERDE + 33
            ? "alineando"
            : s < VERDE + 52
              ? "despegando"
              : s < VERDE + 55
                ? "comprometido"
                : "en-vuelo";
  let fase: Fase = "rodando";
  let preguntado = false;
  let llamada = false;
  const PASO = 50;
  for (let pared = PASO; pared <= (VERDE + 60) * 1000; pared += PASO) {
    avanzar(pared);
    /*
     * Como `avanzarPlan`: rodando, cerca de la espera y con la frecuencia
     * callada, la oferta; la instructora pedida detrás de ella, en el mismo
     * paso, y la TORA dos frases de radio después.
     */
    if (!preguntado && fase === "rodando" && pared >= 10000 && boca.libre) {
      preguntado = true;
      boca.pedir("mando", frase("torre.ofreceInterseccion", 7400), "torre.canario.ofreceInterseccion@yo");
      boca.pedir("normal", frase("vuelo.desdeLaInterseccion", 3000), "vuelo.desdeLaInterseccion");
      esperar(8000, () => boca.pedir("mando", frase("torre.tora", 9200), "torre.canario.tora@yo"));
    }
    const ahoraFase = faseA(pared / 1000);
    if (ahoraFase !== fase) {
      fase = ahoraFase;
      const clave = GUION[fase].clave;
      boca.retirar((c) => anunciaLaFase(c) && c !== clave);
      if (fase === "esperando") {
        boca.pedir("mando", frase("torre.roja", 5800), "torre.canario.roja@yo");
        boca.pedir("mando", frase("torre.holdShort", 4200), "torre.canario.holdShort@yo");
        boca.pedir("normal", frase(clave, DURA.fase), clave);
      } else if (fase === "autorizado") {
        // Lo de la roja que todavía espera ya no es verdad: ver `turno.alCambiarLaLuz`.
        boca.retirar((c) => /^torre\.canario\.(?:roja|holdShort)@/.test(c ?? ""));
        boca.pedir("mando", frase("torre.verde", DURA.verde), "torre.canario.verde@yo");
        boca.pedir("mando", frase("torre.clearedTakeoff", DURA.clearedTakeoff), "torre.canario.clearedTakeoff@yo");
      } else boca.pedir("normal", frase(clave, DURA.fase), clave);
    }
    boca.retirar((c) => seLePasoElMomento(c, fase));
    const anuncio = megafonia.paso(PASO / 1000, {
      fase,
      ...conPasaje,
      megafoniaHablando:
        comandanteHablando || llamada || boca.esperaAlguna((c) => esDeLaMegafonia(c)),
    });
    if (anuncio) {
      llamada = true;
      pedirLaLlamada(boca, {
        tono: "llamadaTripulacion",
        anuncio,
        tocar: () => sono.push(`llamada:${anuncio}`),
        laVoz: () => {
          llamada = false;
          boca.pedir("baja", frase(anuncio, DURA.despegue), anuncio);
        },
        esperar,
      });
    }
  }
  return { sono, caidas: [...boca.descartadas] };
}

describe("la megafonía del despegue en Taguató", () => {
  it("con la intersección sin acordar, la voz va detrás de su llamada y antes del V1 (H29i, H29m)", () => {
    const sono = laVerdeConLaInterseccion();
    const llamada = sono.indexOf("llamada:comandante.despegue");
    const voz = sono.indexOf("comandante.despegue");
    expect(llamada).toBeGreaterThanOrEqual(0);
    expect(voz).toBeGreaterThan(llamada);
    // Detrás de su llamada, como mucho lo que ya sonaba: la voz es lo siguiente.
    expect(voz - llamada).toBeLessThanOrEqual(2);
    expect(voz).toBeLessThan(sono.indexOf(GUION.comprometido.clave));
    // Y la torre dice todo lo suyo igual, y la llamada no se mete en medio.
    for (const t of ["torre.verde", "torre.clearedTakeoff"]) {
      expect(sono).toContain(t);
      expect(sono.indexOf(t), t).toBeLessThan(llamada);
    }
    // Y con la verde dada no ofrece la intersección (H29m).
    expect(sono).not.toContain("torre.ofreceInterseccion");
    expect(sono).not.toContain("torre.tora");
    // Y lo que cuenta la instructora de por dónde se sale no se cae de la cola.
    expect(sono).toContain("vuelo.desdeLaInterseccion");
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
   * Antes de H29i esto decía que a ×2 Jazlyn no cabía detrás de la torre, y
   * H29i lo dio por arreglado: el tono entraba en el silencio entre la
   * lámpara y su fraseología. Era el mismo fallo visto del otro lado: en ese
   * silencio la fraseología arrancaba debajo del tono (H29j). Pidiendo turno,
   * la llamada espera a la autorización entera, y a ×2 la autorización llena
   * la ventana: lo que se mide aquí es el orden. El banco ya no corre la
   * carrera a ×2 —va a tiempo real, ver `DE_LA_CARRERA` en
   * `scripts/reloj-del-banco.mjs`—, y el juego solo se acelera en desarrollo.
   */
  it("a ×2, la llamada no se mete entre la lámpara y su fraseología", () => {
    const sono = laVerde(2);
    expect(sono.slice(0, 2)).toEqual(["torre.verde", "torre.clearedTakeoff"]);
    const llamada = sono.indexOf("llamada:comandante.despegue");
    if (llamada >= 0) expect(llamada).toBeGreaterThan(sono.indexOf("torre.clearedTakeoff"));
  });

  /*
   * **Y lo que pasaba en Los Rodeos con el JAZ 90 desde H29j**, y lo que
   * queda desde H29m si rodando no calló la frecuencia: la torre pregunta por
   * la intersección en la roja larga, en cuanto calla la frecuencia,
   * y en la verde la instructora no repite lo que acaba de decir la lámpara.
   * Del despegue no se cae nada: ni la llamada ni su voz, ni lo que cuenta la
   * instructora, ni la torre.
   */
  it("con la intersección contada en la roja, del despegue no se cae nada", () => {
    const { sono, caidas } = laRojaYLaVerde();
    // En la roja, la oferta con su respuesta y lo que cuenta la instructora.
    const verde = sono.indexOf("torre.verde");
    for (const c of ["vuelo.desdeLaInterseccion", "torre.ofreceInterseccion", "torre.tora"]) {
      expect(sono, c).toContain(c);
      expect(sono.indexOf(c), c).toBeLessThan(verde);
    }
    // En la verde, la autorización entera, la llamada y su voz, y las fases.
    expect(sono.slice(verde, verde + 4)).toEqual([
      "torre.verde",
      "torre.clearedTakeoff",
      "llamada:comandante.despegue",
      "comandante.despegue",
    ]);
    for (const f of ["alineando", "despegando", "comprometido"] as const)
      expect(sono, f).toContain(GUION[f].clave);
    expect(sono).not.toContain(GUION.autorizado.clave);
    expect(caidas).toEqual([]);
  });

  /*
   * **Y con la roja corta (H29m)**, que es lo que pasa con la pista libre: la
   * torre ya preguntó rodando, y en la verde suenan la autorización entera,
   * la llamada y su voz, todo antes de la carrera, y las fases de alinearse,
   * correr y el V1. Lo único que no suena es lo de la roja que la verde dejó
   * sin verdad.
   */
  it("con la roja corta, la intersección se acordó rodando y del despegue no se cae nada", () => {
    const { sono, caidas } = laRojaCorta();
    const roja = sono.indexOf("torre.roja");
    const verde = sono.indexOf("torre.verde");
    expect(roja).toBeGreaterThanOrEqual(0);
    /*
     * Rodando, antes de la roja, la oferta y la TORA, y detrás lo que cuenta
     * la instructora: se pide con la oferta, pero la TORA va en `mando` y
     * entra en el respiro que deja la oferta al acabar. Es el intercambio
     * entero y luego su porqué, una voz detrás de otra.
     */
    expect(sono.slice(0, 3)).toEqual([
      "torre.ofreceInterseccion",
      "torre.tora",
      "vuelo.desdeLaInterseccion",
    ]);
    expect(sono.indexOf("vuelo.desdeLaInterseccion")).toBeLessThan(roja);
    // En la verde, la autorización entera, y detrás la llamada y su voz.
    expect(sono.slice(verde, verde + 2)).toEqual(["torre.verde", "torre.clearedTakeoff"]);
    const llamada = sono.indexOf("llamada:comandante.despegue");
    const voz = sono.indexOf("comandante.despegue");
    expect(llamada).toBeGreaterThan(verde);
    expect(voz).toBeGreaterThan(llamada);
    // Y «sentados para el despegue» antes de la carrera, no corriendo.
    expect(voz).toBeLessThan(sono.indexOf(GUION.despegando.clave));
    // Y después de la verde, la torre no ofrece nada.
    expect(sono.lastIndexOf("torre.ofreceInterseccion")).toBeLessThan(roja);
    expect(sono.lastIndexOf("torre.tora")).toBeLessThan(roja);
    for (const f of ["alineando", "despegando", "comprometido"] as const)
      expect(sono, f).toContain(GUION[f].clave);
    // Lo único que se cae es lo de la roja que la verde retiró.
    for (const c of caidas) expect(c).toMatch(/torre\.canario\.holdShort@|vuelo\.esperando|torre\.canario\.roja@/);
    expect(caidas.some((c) => c.includes("Interseccion") || c.includes("tora"))).toBe(false);
  });
});
