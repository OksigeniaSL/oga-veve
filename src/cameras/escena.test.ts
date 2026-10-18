/**
 * Las cámaras de la escena de pasaje: que el corte caiga con el velo puesto,
 * que asomarse no sea un corte, y que la cámara de fuera mire al avión sin
 * meterse bajo tierra. Ver `cameras/escena.ts`.
 */
import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import type { FlightState } from "../flight/model";
import type { Plano } from "../flight/inicio-pasaje";
import { CORTE_DE_PLANO } from "../flight/inicio-pasaje";
import { CamaraDeLaEscena, FUNDIDO_DE_PLANO, FundidoDePlano } from "./escena";

describe("el fundido entre planos", () => {
  it("un corte tapa, cambia con el velo puesto y destapa", () => {
    const f = new FundidoDePlano();
    let t = 0;
    const pasos: { t: number; plano: Plano; velo: number; cambio: boolean }[] = [];
    for (; t < 2; t += 1 / 60) pasos.push({ t, ...f.paso("fuera-vuelta", t) });
    const cambio = pasos.find((p) => p.cambio)!;
    expect(cambio).toBeTruthy();
    expect(cambio.plano).toBe("fuera-vuelta");
    // Cambia tapado del todo, y antes se veía la ventanilla.
    expect(cambio.velo).toBeGreaterThan(0.97);
    expect(pasos.filter((p) => p.t < cambio.t).every((p) => p.plano === "ventanilla")).toBe(true);
    // Y al final, destapado.
    expect(pasos[pasos.length - 1]!.velo).toBe(0);
    // El velo sube y baja sin saltos.
    for (let i = 1; i < pasos.length; i++) expect(Math.abs(pasos[i]!.velo - pasos[i - 1]!.velo)).toBeLessThan(0.08);
  });

  it("y cabe en el silencio que guarda la escena en cada corte", () => {
    expect(FUNDIDO_DE_PLANO.tapa).toBeLessThan(CORTE_DE_PLANO);
  });

  it("asomarse al cristal no es un corte: sin velo", () => {
    const f = new FundidoDePlano();
    const p = f.paso("asomado-motor", 0);
    expect(p.plano).toBe("asomado-motor");
    expect(p.velo).toBe(0);
    expect(f.paso("ventanilla", 1).velo).toBe(0);
  });

  it("si llega otro corte mientras destapa, vuelve a tapar desde donde iba", () => {
    const f = new FundidoDePlano();
    let t = 0;
    for (; t < 0.6; t += 1 / 60) f.paso("fuera-giro", t);
    const antes = f.paso("fuera-giro", t).velo;
    const ahora = f.paso("ventanilla", t + 1 / 60).velo;
    expect(Math.abs(ahora - antes)).toBeLessThan(0.08);
  });
});

/** Un avión volando hacia el norte, a mil metros, nivelado. */
function avion(y = 1000): FlightState {
  return {
    position: new Vector3(0, y, 0),
    orientation: new Quaternion(),
    heightAboveGround: y,
  } as unknown as FlightState;
}

const SUELO = { suelo: () => 0, largo: 36, movimientoReducido: false };

describe("la cámara de fuera de la escena", () => {
  const tomas: Plano[] = ["fuera-rodando", "fuera-despegue", "fuera-giro", "fuera-vuelta", "fuera-ala", "fuera-pista"];
  for (const toma of tomas) {
    it(`${toma}: mira al avión y no se mete bajo tierra`, () => {
      const camara = new PerspectiveCamera(50, 16 / 9, 0.1, 50000);
      const c = new CamaraDeLaEscena();
      const s = avion(toma === "fuera-despegue" ? 1 : 300);
      c.empezar(toma, s, SUELO);
      for (let i = 0; i < 30; i++) c.update(camara, s, 1 / 30, SUELO);
      expect(camara.position.y).toBeGreaterThan(1.4);
      // El avión, delante de la cámara.
      const haciaElAvion = s.position.clone().sub(camara.position).normalize();
      const mira = new Vector3(0, 0, -1).applyQuaternion(camara.quaternion);
      expect(mira.dot(haciaElAvion)).toBeGreaterThan(0.6);
      expect(c.fov).toBeGreaterThan(5);
      expect(c.fov).toBeLessThan(70);
    });
  }

  it("la vuelta da la vuelta, y con movimiento reducido se queda quieta", () => {
    const camara = new PerspectiveCamera();
    const s = avion();
    const c = new CamaraDeLaEscena();
    c.empezar("fuera-vuelta", s, SUELO);
    c.update(camara, s, 1 / 30, SUELO);
    const antes = camara.position.clone();
    for (let i = 0; i < 300; i++) c.update(camara, s, 1 / 30, SUELO);
    expect(camara.position.distanceTo(antes)).toBeGreaterThan(20);
    const quieta = new CamaraDeLaEscena();
    const reducido = { ...SUELO, movimientoReducido: true };
    quieta.empezar("fuera-vuelta", s, reducido);
    quieta.update(camara, s, 1 / 30, reducido);
    const a = camara.position.clone();
    for (let i = 0; i < 300; i++) quieta.update(camara, s, 1 / 30, reducido);
    expect(camara.position.distanceTo(a)).toBeLessThan(0.01);
  });

  it("desde la orilla de la pista, la cámara se queda clavada y el avión pasa", () => {
    const camara = new PerspectiveCamera();
    const c = new CamaraDeLaEscena();
    const s = avion(1);
    c.empezar("fuera-despegue", s, SUELO);
    c.update(camara, s, 1 / 30, SUELO);
    const sitio = camara.position.clone();
    // El avión corre hacia el norte (−z) setecientos metros.
    s.position.z = -700;
    c.update(camara, s, 1 / 30, SUELO);
    expect(camara.position.distanceTo(sitio)).toBeLessThan(0.01);
    // Y está a un lado de la pista, no en medio: setenta y cinco metros.
    expect(Math.abs(sitio.x)).toBeGreaterThan(60);
  });
});
