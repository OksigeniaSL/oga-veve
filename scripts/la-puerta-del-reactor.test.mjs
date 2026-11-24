/**
 * **La final del JAZ 90 llega estabilizada a su puerta** (#192, H89).
 *
 * En Los Rodeos daba un rojo de cada dos: bajando 5,2–5,3 m/s de media con el
 * tope en 5,08, o en verde bajando 3,0–3,6. Eran dos cosas a la vez. El banco
 * cogía la senda en el arco cuando ya había pasado, se quedaba 28 m por encima y
 * la recogía bajando a más de mil pies por minuto casi hasta la puerta; y el
 * automático del juego se pasaba de lo que se le pedía, sin contar lo que el
 * camino tarda en seguir al morro (`loQueTardaElCamino`, con su prueba en
 * `src/flight/camino-anticipado.test.ts`).
 *
 * Aquí se vuela el banco **tal cual está escrito** desde el viento en cola, con
 * el modelo, el automático y las rachas del juego: ver `mesa-del-arco.mjs`. El
 * de antes es ese mismo texto sin coger la senda antes de que llegue.
 */
import { describe, expect, it } from "vitest";
import { elPilotoDelBanco, mesaDelArco, textoDelBanco, vuelaElArco } from "./mesa-del-arco.mjs";

const banco = textoDelBanco();
const ahora = elPilotoDelBanco(banco);
const antes = elPilotoDelBanco(banco, { antesDeH89: true });
const MIL_PIES_POR_MINUTO = (1000 * 0.3048) / 60;
const FINALES = 60;

/** Lo más alto sobre la senda y lo más que baja en el arco, sin rachas. */
function enCalma(piloto) {
  const r = vuelaElArco({ avion: "jaz-90", piloto, sinRacha: true, conTraza: true });
  return {
    alto: Math.max(...r.traza.map((x) => x.senda)),
    pico: Math.max(...r.traza.map((x) => -x.vs)),
    puerta: r.puerta,
  };
}

describe("el arco a final del JAZ 90 en el banco", () => {
  it("en aire quieto coge la senda sin pasarla de largo ni bajar a mil pies por minuto", () => {
    const r = enCalma(ahora);
    // Medido: 12 m por encima como mucho y 4,6 m/s en el peor instante.
    expect(r.alto, `${r.alto.toFixed(1)} m por encima`).toBeLessThan(14);
    expect(r.pico, `${r.pico.toFixed(2)} m/s`).toBeLessThan(0.93 * MIL_PIES_POR_MINUTO);
    expect(r.puerta.baja, `${r.puerta.baja} m/s`).toBeLessThan(3.8);
    expect(Math.abs(r.puerta.senda), `${r.puerta.senda} m`).toBeLessThan(3);
  });

  it("y sin cogerla antes se queda muy por encima: la prueba ve el fallo", () => {
    const r = enCalma(antes);
    // Medido: 27 m; y 28, bajando a 5,1 m/s, con el automático de antes.
    expect(r.alto, `${r.alto.toFixed(1)} m por encima`).toBeGreaterThan(20);
  });

  it("con las rachas de Los Rodeos, pasa la puerta estabilizado", () => {
    const r = mesaDelArco({ avion: "jaz-90", piloto: ahora }, FINALES).map((x) => x.puerta);
    expect(r.every(Boolean)).toBe(true);
    const deMas = r.filter((p) => p.baja > MIL_PIES_POR_MINUTO).length;
    // Medido: 1 de 60 (4 de 200). Antes de H89, 8 de 60 (31 de 200).
    expect(deMas, `${deMas} de ${FINALES} por encima de mil pies por minuto`).toBeLessThanOrEqual(3);
    const lejos = r.filter((p) => Math.abs(p.senda) > p.tolSenda || Math.abs(p.eje) > p.tolEje);
    expect(lejos.length, `${lejos.length} fuera de la senda o del eje`).toBe(0);
  });
});
