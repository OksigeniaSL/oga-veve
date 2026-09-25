import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from "three";
import { diaEnLaCabina, luzDeCabina } from "./luz-de-cabina";

function cabina() {
  const raiz = new Group();
  const tablero = new MeshStandardMaterial({ color: 0x404040 });
  tablero.name = "tablero";
  const bisel = new MeshStandardMaterial({ color: 0x202020 });
  bisel.name = "bisel";
  const esfera = new MeshBasicMaterial();
  raiz.add(new Mesh(new BoxGeometry(), tablero));
  const caja = new Mesh(new BoxGeometry(), bisel);
  caja.name = "reloj-asi-caja";
  raiz.add(caja);
  const cara = new Mesh(new BoxGeometry(), esfera);
  cara.name = "reloj-asi";
  raiz.add(cara);
  return { raiz, tablero, bisel, esfera };
}

describe("la luz de dentro de la cabina", () => {
  it("es de día con el sol alto y de noche con el sol bajo el horizonte", () => {
    expect(diaEnLaCabina(0.8)).toBe(1);
    expect(diaEnLaCabina(-0.3)).toBe(0);
    // Y no de golpe: con el sol en el horizonte todavía queda luz.
    expect(diaEnLaCabina(0)).toBeGreaterThan(0);
    expect(diaEnLaCabina(0)).toBeLessThan(1);
  });

  it("de día el panel devuelve luz de su propio color, sin tinte", () => {
    const { raiz, tablero } = cabina();
    luzDeCabina(raiz)!.ponerSol(0.8);
    const e = tablero.emissive;
    expect(e.r).toBeGreaterThan(0);
    expect(e.r).toBeCloseTo(e.g, 5);
    expect(e.g).toBeCloseTo(e.b, 5);
  });

  it("de noche el panel es rojo y tenue, y lo que se lee baja de brillo", () => {
    const { raiz, tablero, esfera } = cabina();
    luzDeCabina(raiz)!.ponerSol(-0.5);
    const e = tablero.emissive;
    expect(e.r).toBeGreaterThan(e.g * 4);
    expect(e.r).toBeLessThan(0.05);
    expect(esfera.color.r).toBeLessThan(1);
  });

  it("no toca el color del bisel aunque se llame como un reloj", () => {
    const { raiz, bisel } = cabina();
    const antes = bisel.color.getHex();
    luzDeCabina(raiz)!.ponerSol(-0.5);
    expect(bisel.color.getHex()).toBe(antes);
  });

  it("un modelo sin interior no tiene luz de cabina", () => {
    expect(luzDeCabina(new Group())).toBeNull();
  });
});
