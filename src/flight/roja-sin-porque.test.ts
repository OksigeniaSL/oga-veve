/**
 * **Una roja sin nadie a quien nombrar tiene salida** (H48).
 *
 * En la ronda de la tanda 20, el banco de despegue en Los Rodeos con el JAZ 90
 * se quedó en la doble raya con la lámpara roja y sin porqué: ni avión en la
 * pista, ni en la fila, ni estela. Una de las piezas que sujetan la roja no
 * tiene a nadie detrás: lo que le suelta la pista a otro —su «pista libre», su
 * «cleared for take-off»— esperando turno en la boca. La frecuencia ya dio la
 * pista por libre al pedirlo, y la verde espera a que suene para no dársela a
 * dos de viva voz; pero esa frase no caduca ni se cae de la cola, así que si
 * la boca no la dijera nunca, la roja sería para siempre.
 *
 * Aquí la boca no la dice nunca, y se mira que la roja dura lo que tiene que
 * durar y no más: mientras espera, la pista sigue siendo de otros; pasado
 * `LO_QUE_SUELTA_COMO_MUCHO`, se retira y es tuya.
 */
import { describe, expect, it } from "vitest";
import { sueltaLaPista, type Urgencia } from "../audio/boca";
import { Frecuencia } from "./radio";
import { LO_QUE_SUELTA_COMO_MUCHO, TurnoDePista } from "./turno-de-pista";

const PASO = 0.5;

/** Una boca con una frase que suelta la pista atascada: no suena nunca. */
function bocaAtascada(clave: string) {
  const cola: { clave: string; urgencia: Urgencia }[] = [{ clave, urgencia: "baja" }];
  return {
    cola,
    retirar(sobra: (clave: string | undefined, urgencia: Urgencia) => boolean) {
      for (let i = cola.length - 1; i >= 0; i--)
        if (sobra(cola[i]!.clave, cola[i]!.urgencia)) cola.splice(i, 1);
    },
    espera: (c: string) => cola.some((x) => x.clave === c),
    esperaAlguna: (de: (clave: string | undefined, urgencia: Urgencia) => boolean) =>
      cola.some((x) => de(x.clave, x.urgencia)),
  };
}

function enLaDobleRaya(clave: string) {
  const boca = bocaAtascada(clave);
  // Sin nadie en la frecuencia todavía: lo único que sujeta la roja es la boca.
  const radio = new Frecuencia(() => 0.5, null);
  const turno = new TurnoDePista({
    radio,
    boca,
    trafico: () => null,
    torre: () => true,
    privado: () => false,
    alUmbral: () => Infinity,
    alto: () => 0,
    enTierra: () => true,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });
  const oir = (fase: string) => turno.oir(PASO, { fase, deDia: true, instructorHablando: false });
  return { boca, radio, turno, oir };
}

describe("una roja sin nadie a quien nombrar tiene salida", () => {
  for (const clave of ["otro.pistaLibre", "torre.clearedTakeoff"]) {
    it(`con «${clave}» atascado en la boca, la roja dura como mucho ${LO_QUE_SUELTA_COMO_MUCHO} s`, () => {
      expect(sueltaLaPista(clave, "baja"), "la frase es de las que sueltan la pista").toBe(true);
      const a = enLaDobleRaya(clave);
      let roja = 0;
      let t = 0;
      for (; t < 120; t += PASO) {
        a.oir("esperando");
        if (!a.turno.pistaDeOtros) break;
        // Mientras dura, no hay a quién nombrar: es la roja que no se explica.
        expect(a.turno.porQueEsperasDe, `a los ${t} s`).toBeNull();
        expect(a.radio.pistaOcupada, `a los ${t} s`).toBe(false);
        roja = t + PASO;
      }
      // Mientras tanto la espera es de verdad: la verde no se adelanta a la frase.
      expect(roja, "la roja esperó a la frase").toBeGreaterThanOrEqual(LO_QUE_SUELTA_COMO_MUCHO - PASO);
      // Y tiene salida: la frase se retira, y no se queda para sonar detrás de tu verde.
      expect(roja, "la roja tiene salida").toBeLessThanOrEqual(LO_QUE_SUELTA_COMO_MUCHO + PASO);
      expect(a.boca.cola).toEqual([]);
    });
  }

  it("y rodando hacia la raya no se cuenta: la red es de la roja", () => {
    const a = enLaDobleRaya("otro.pistaLibre");
    for (let t = 0; t < 2 * LO_QUE_SUELTA_COMO_MUCHO; t += PASO) a.oir("rodando");
    expect(a.boca.cola.length).toBe(1);
    // Y al llegar, la cuenta empieza de cero.
    for (let t = 0; t < LO_QUE_SUELTA_COMO_MUCHO - 1; t += PASO) a.oir("esperando");
    expect(a.turno.pistaDeOtros).toBe(true);
  });
});
