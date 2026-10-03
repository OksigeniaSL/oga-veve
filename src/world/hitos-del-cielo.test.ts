/**
 * Lo que se señala del cielo: la Cruz del Sur desde Paraguay y la Polar
 * desde Canarias, cuando se ven y por el lado por el que se ven.
 */

import { describe, expect, it } from "vitest";
import { cieloDe, instanteDeLaHora } from "./cielo-de-noche";
import { estrellasQueSeSenalan } from "./hitos-del-cielo";
import { laCapaTapa, queSeVe } from "./hitos";
import { queLucesSeLeVen } from "./luces-del-trafico";

const ASUNCION = { lat: -25.2637, lon: -57.5759 };
const TENERIFE_NORTE = { lat: 28.482752, lon: -16.341707 };
const NOMBRES = { cruzDelSur: "Cruz del Sur", polar: "Estrella Polar" };
const OJO = { x: 0, y: 3000, z: 0 };

function cielo(sitio: { lat: number; lon: number }, dia: string, hora: number) {
  const t = instanteDeLaHora(new Date(`${dia}T12:00:00Z`), hora, sitio.lon);
  return cieloDe(t, sitio.lat, sitio.lon);
}

describe("la Polar, desde Tenerife", () => {
  const c = cielo(TENERIFE_NORTE, "2026-10-03", 21);
  const hitos = estrellasQueSeSenalan(c, 0.9, OJO, NOMBRES);

  it("se señala, y la Cruz no, que desde aquí no sube", () => {
    expect(hitos.map((h) => h.clase)).toEqual(["polar"]);
  });

  it("con su altura, que es la latitud", () => {
    expect(Math.abs(hitos[0]!.altura! - TENERIFE_NORTE.lat)).toBeLessThan(1);
  });

  it("y puesta donde se la ve: al norte y a esa altura", () => {
    const h = hitos[0]!;
    const rumbo = (Math.atan2(h.x - OJO.x, -(h.z - OJO.z)) * 180) / Math.PI;
    expect(Math.abs(rumbo)).toBeLessThan(2);
    const d = Math.hypot(h.x - OJO.x, h.z - OJO.z);
    const sube = (Math.atan2(h.ele! - OJO.y, d) * 180) / Math.PI;
    expect(sube).toBeCloseTo(h.altura!, 6);
  });

  it("y volando al este, se ve por la izquierda", () => {
    const m = queSeVe(hitos, { x: OJO.x, z: OJO.z, rumbo: 90, y: OJO.y });
    expect(m?.hito.clase).toBe("polar");
    expect(m?.lado).toBe("izquierda");
  });

  it("pero bajo un cielo cubierto, no", () => {
    // Una capa cerrada entre el avión y la estrella la tapa.
    const capa = { base: 3500, techo: 3800, tapadura: 1 };
    const h = hitos[0]!;
    expect(laCapaTapa(OJO, { x: h.x, y: h.ele!, z: h.z }, capa)).toBe(true);
    expect(queSeVe(hitos, { ...OJO, rumbo: 90 }, new Set(), null, capa)).toBeNull();
  });
});

describe("la Cruz del Sur, desde Asunción", () => {
  it("en una noche de otoño, alta sobre el sur", () => {
    const c = cielo(ASUNCION, "2027-05-20", 21);
    const hitos = estrellasQueSeSenalan(c, 0.9, OJO, NOMBRES);
    expect(hitos.map((h) => h.clase)).toEqual(["cruz-del-sur"]);
    const h = hitos[0]!;
    const rumbo = (((Math.atan2(h.x, -h.z) * 180) / Math.PI) + 360) % 360;
    // Hacia el sur, de un lado o del otro del meridiano.
    expect(Math.abs(rumbo - 180)).toBeLessThan(45);
  });

  it("y en una de octubre, a las nueve, no: está rozando el horizonte", () => {
    const c = cielo(ASUNCION, "2026-10-15", 21);
    expect(estrellasQueSeSenalan(c, 0.9, OJO, NOMBRES)).toEqual([]);
  });

  it("pero sí de madrugada, alta por el sudeste", () => {
    const c = cielo(ASUNCION, "2026-10-15", 5);
    const hitos = estrellasQueSeSenalan(c, 0.9, OJO, NOMBRES);
    expect(hitos.map((h) => h.clase)).toEqual(["cruz-del-sur"]);
  });

  it("y la Polar nunca: está bajo el horizonte", () => {
    for (const hora of [20, 22, 0, 2, 4]) {
      const c = cielo(ASUNCION, "2026-10-03", hora);
      expect(
        estrellasQueSeSenalan(c, 1, OJO, NOMBRES).some((h) => h.clase === "polar"),
      ).toBe(false);
    }
  });
});

describe("y nada si no se ven", () => {
  it("de día, o en el crepúsculo, o sin cielo", () => {
    const c = cielo(TENERIFE_NORTE, "2026-10-03", 21);
    expect(estrellasQueSeSenalan(c, 0.2, OJO, NOMBRES)).toEqual([]);
    expect(estrellasQueSeSenalan(null, 1, OJO, NOMBRES)).toEqual([]);
  });
});

describe("las luces de otro avión, desde donde se le mira", () => {
  /*
   * Tú en el origen mirando al norte; el otro, un kilómetro delante. El
   * norte es la Z negativa y el este la X positiva.
   */
  const YO = { x: 0, z: 0 };
  const delante = (rumbo: number) => ({ x: 0, z: -1000, rumbo });

  it("viniendo hacia ti: la roja y la verde, con la verde a tu izquierda", () => {
    expect(queLucesSeLeVen(delante(180), YO)).toBe("de-frente");
    // Su ala derecha —la de la verde— yendo al sur cae al oeste: tu izquierda.
    const h = Math.PI;
    const derecha = { x: Math.cos(h), z: Math.sin(h) };
    expect(derecha.x).toBeLessThan(0);
  });

  it("alejándose: solo la blanca", () => {
    expect(queLucesSeLeVen(delante(0), YO)).toBe("se-aleja");
  });

  it("cruzando hacia el oeste —tu izquierda—: le ves la roja", () => {
    expect(queLucesSeLeVen(delante(270), YO)).toBe("cruza-izquierda");
  });

  it("y hacia el este —tu derecha—: la verde", () => {
    expect(queLucesSeLeVen(delante(90), YO)).toBe("cruza-derecha");
  });

  it("y de frente aunque no venga justo por tu línea", () => {
    // Viene hacia ti con seis grados de rumbo de diferencia.
    expect(queLucesSeLeVen(delante(174), YO)).toBe("de-frente");
  });
});
