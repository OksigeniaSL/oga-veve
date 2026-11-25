/**
 * **La final del piloto de las emergencias cae en el eje** (H99).
 *
 * Con un motor parado en Gran Canaria, el JAZ 90 se mecía ±25 m por la final y
 * tocaba de 2 a 29 m del eje, según la vez. Era la mano: un alerón por radián
 * que falta es en la avioneta un ala en ocho décimas y en el reactor un ala en
 * tres segundos, lo que tarda una racha en volver a ladearlo.
 *
 * Aquí se vuela el banco **tal cual está escrito**, con el modelo, las ayudas y
 * las rachas del juego y el viento de allí: ver `mesa-de-la-final.mjs`. El de
 * antes es ese mismo texto con la mano floja y la mirada fija.
 */
import { describe, expect, it } from "vitest";
import { elPiloto, textoDelBanco, vuelaLaFinal } from "./mesa-de-la-final.mjs";

const banco = textoDelBanco();
const ahora = elPiloto(banco);

/** El de antes de H99: la mano de 1,6, el rumbo a 1,4 y la mirada a ochocientos metros. */
function elDeAntes() {
  const cambios = [
    ["laMano(s.airspeed) - s.rollRate * 0.3, -0.8, 0.8", "1.6 - s.rollRate * 0.3, -0.6, 0.6"],
    ["const GANANCIA_DEL_RUMBO = 2.5", "const GANANCIA_DEL_RUMBO = 1.4"],
    ["SEGUNDOS_DE_MIRADA * Math.hypot(s.velocity.x, s.velocity.z),\n            Math.min(2500, u * 0.6)", "800,\n            Math.min(2500, u * 0.6)"],
  ];
  return elPiloto(
    cambios.reduce((t, [a, b]) => {
      if (!t.includes(a)) throw new Error(`el banco ya no dice «${a}»`);
      return t.replace(a, b);
    }, banco),
  );
}

/** Lo que se aparta del eje al tocar, en cada final. Sin tocar, o fuera de la pista, mil. */
const alTocar = (p, finales) =>
  Array.from({ length: finales }, (_, k) => {
    const r = vuelaLaFinal({ motor: k % 2, ...p, semilla: k + 1 });
    return r.toco && r.toco.a > -50 && !r.roto ? Math.abs(r.toco.c) : 1000;
  });

describe("la final del piloto de las emergencias", () => {
  it("el JAZ 90 con un motor toca a menos de cinco metros del eje", () => {
    // Medido: 1,1 m de media y 3,2 el peor de 48.
    const r = alTocar({ avion: "jaz-90", piloto: ahora }, 16);
    expect(Math.max(...r), r.map((x) => x.toFixed(1)).join(" ")).toBeLessThan(5);
  });

  it("y con la mano de antes no: la mesa ve el fallo", () => {
    // Medido: 12 m de media y 33 de 48 por encima de cinco.
    const r = alTocar({ avion: "jaz-90", piloto: elDeAntes() }, 16);
    expect(r.filter((x) => x > 5).length, r.map((x) => x.toFixed(1)).join(" ")).toBeGreaterThan(6);
  });

  // Los demás que usan este piloto, y los grandes: nadie empeora.
  it.each([
    ["jaz-20", { motor: null }],
    ["jaz-40", {}],
    ["jaz-40", { motor: null, modo: "morro" }],
    ["jaz-50", {}],
    ["jaz-60", {}],
    ["jaz-90", { motor: null }],
    ["jaz-90", { viento: 12, vientoDe: 60 }],
    ["jaz-110", {}],
    ["jaz-120", {}],
  ])("%s %o, en el eje", (avion, mas) => {
    const r = alTocar({ avion, piloto: ahora, ...mas }, 8);
    expect(Math.max(...r), r.map((x) => x.toFixed(1)).join(" ")).toBeLessThan(7);
  });
});
