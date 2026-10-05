/**
 * Que el ala se doble lo que se dobla la de su tipo, que oscile como un ala y
 * que lo haga en la tarjeta y solo en las piezas que cuelgan de ella.
 */
import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderLib,
  type WebGLProgramParametersWithUniforms,
  type WebGLRenderer,
} from "three";
import { AIRCRAFT, aircraftById } from "../flight/aircraft";
import {
  estacionesDe,
  FlexionDelAla,
  flexionEscalada,
  formaDeLaViga,
  formaEnEstaciones,
  prepararElAla,
} from "./ala-que-se-dobla";

describe("cuánto se dobla", () => {
  it("con la forma de una viga: nada en la raíz, todo en la punta, y siempre subiendo", () => {
    expect(formaDeLaViga(0)).toBe(0);
    expect(formaDeLaViga(1)).toBeCloseTo(1);
    for (let s = 0.05; s <= 1; s += 0.05)
      expect(formaDeLaViga(s)).toBeGreaterThan(formaDeLaViga(s - 0.05));
  });

  /*
   * Los números de la ficha son la cuenta escalada desde el ensayo del 787, y
   * no otros puestos a ojo.
   */
  it("la ficha de cada reactor dice lo que da la cuenta desde el 787", () => {
    for (const id of ["jaz-90", "jaz-120"]) {
      const a = aircraftById(id);
      expect(a.alaQueSeDobla, id).toBeDefined();
      expect(a.alaQueSeDobla!.porG).toBeCloseTo(flexionEscalada(a.wingSpan, a.wingArea), 1);
    }
  });

  it("y los pequeños no la doblan", () => {
    for (const a of AIRCRAFT)
      if (a.id !== "jaz-90" && a.id !== "jaz-120") expect(a.alaQueSeDobla, a.id).toBeUndefined();
  });

  it("en vuelo, la punta arriba lo que da su carga; parado en tierra, como está dibujada", () => {
    const f = new FlexionDelAla(1.4, 1.1);
    for (let t = 0; t < 30; t += 1 / 60) f.paso(1 / 60, 1, false);
    expect(f.punta).toBeCloseTo(1.4, 2);
    for (let t = 0; t < 60; t += 1 / 60) f.paso(1 / 60, 0, true);
    expect(Math.abs(f.punta)).toBeLessThan(0.02);
  });

  /*
   * **Con un bache, se dobla de más y oscila**, a su frecuencia, y se calma
   * en unos segundos: el aire la frena.
   */
  it("un bache la dobla de más y la deja oscilando a su frecuencia, cada vez menos", () => {
    const f = new FlexionDelAla(1.4, 1.1);
    f.asentar(1);
    const dt = 1 / 240;
    let t = 0;
    // Medio segundo de tres décimas de g de más, como un bache moderado.
    for (; t < 0.5; t += dt) f.paso(dt, 1.3, false);
    const trazo: number[] = [];
    for (; t < 8; t += dt) {
      f.paso(dt, 1, false);
      trazo.push(f.punta - 1.4);
    }
    const pico = Math.max(...trazo.map(Math.abs));
    expect(pico).toBeGreaterThan(0.1);
    // Cruces por cero en siete segundos y medio: dos por ciclo.
    let cruces = 0;
    for (let i = 1; i < trazo.length; i++)
      if (Math.sign(trazo[i]!) !== Math.sign(trazo[i - 1]!)) cruces++;
    const hz = cruces / 2 / 7.5;
    expect(hz).toBeGreaterThan(0.95);
    expect(hz).toBeLessThan(1.25);
    // Y al final, menos de la mitad.
    const final = Math.max(...trazo.slice(-240).map(Math.abs));
    expect(final).toBeLessThan(pico / 2);
  });
});

describe("dónde se dobla", () => {
  /** Un avión de juguete con los nombres del contrato de `modelos/exterior.py`. */
  function avion() {
    const raiz = new Group();
    const chapaGris = new MeshStandardMaterial({ name: "gris" });
    const fuselaje = new Mesh(new BoxGeometry(6, 6, 60), chapaGris);
    fuselaje.name = "fuselaje";
    const ala = new Mesh(new BoxGeometry(60, 1, 8), chapaGris);
    ala.name = "ala";
    const motor = new Group();
    motor.name = "motor-0";
    const capo = new Mesh(new BoxGeometry(2, 2, 4), new MeshStandardMaterial({ name: "capo" }));
    capo.position.x = 10;
    motor.add(capo);
    const deriva = new Mesh(new BoxGeometry(1, 10, 6), chapaGris);
    deriva.name = "deriva";
    raiz.add(fuselaje, ala, motor, deriva);
    const grupo = new Group();
    grupo.add(raiz);
    return { raiz, grupo, fuselaje, ala, capo, deriva, chapaGris };
  }

  it("solo las piezas que cuelgan del ala, y el fuselaje con su gris de siempre", () => {
    const a = avion();
    const ala = prepararElAla(a.raiz, a.grupo, { porG: 1.4, hz: 1.1 });
    expect(ala).not.toBeNull();
    expect(ala!.piezas).toBe(2);
    expect(a.fuselaje.material).toBe(a.chapaGris);
    expect(a.deriva.material).toBe(a.chapaGris);
    expect(a.ala.material).not.toBe(a.chapaGris);
    // Del fuselaje a la punta.
    expect(ala!.raiz).toBeCloseTo(3);
    expect(ala!.largo).toBeCloseTo(27);
  });

  it("el sombreador sube el vértice después de ponerlo en la vista, con su propio programa", () => {
    const a = avion();
    prepararElAla(a.raiz, a.grupo, { porG: 1.4, hz: 1.1 });
    const m = a.ala.material as MeshStandardMaterial;
    const shader = {
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
      uniforms: {},
    } as unknown as WebGLProgramParametersWithUniforms;
    m.onBeforeCompile(shader, {} as WebGLRenderer);
    expect(shader.vertexShader).toContain("uniform float uPuntaDelAla;");
    const vista = shader.vertexShader.indexOf("mvPosition = modelViewMatrix * mvPosition;");
    const sube = shader.vertexShader.indexOf("uPuntaDelAla * forma");
    expect(vista).toBeGreaterThan(0);
    expect(sube).toBeGreaterThan(vista);
    expect(m.customProgramCacheKey()).toContain("ala-que-se-dobla");
    expect(shader.uniforms).toHaveProperty("uVistaAlAvion");
  });

  /*
   * **Y lo de encima de la chapa, con la chapa.** Entre dos secciones la chapa
   * es plana; un panel con vértices en medio tiene que doblarse lo mismo que
   * ella ahí, o asoma una rendija.
   */
  it("las secciones de la chapa, y la forma recta entre ellas", () => {
    // Dos secciones algo torcidas —sus vértices a pocos centímetros— y la punta.
    const xs = [0.5, 3.0, -3.04, 3.08, 10.0, -10.1, 10.02, 20, -20];
    const est = estacionesDe(xs, 2);
    expect(est[0]).toBe(2);
    expect(est).toContain(3.0);
    expect(est).toContain(3.08);
    expect(est[est.length - 1]).toBe(20);
    const formas = est.map((x) => formaDeLaViga((x - 2) / 18));
    // En una sección, la curva; en medio, la recta entre las dos.
    expect(formaEnEstaciones(10.0, est, formas)).toBeCloseTo(formaDeLaViga(8 / 18));
    const medio = (10.1 + 20) / 2;
    const recta = (formaDeLaViga(8.1 / 18) + 1) / 2;
    expect(formaEnEstaciones(-medio, est, formas)).toBeCloseTo(recta);
    expect(formaEnEstaciones(1, est, formas)).toBe(0);
    expect(formaEnEstaciones(25, est, formas)).toBeCloseTo(1);
  });

  it("y el que no la dobla, ni se toca", () => {
    const a = avion();
    expect(prepararElAla(a.raiz, a.grupo, undefined)).toBeNull();
    expect(a.ala.material).toBe(a.chapaGris);
  });
});
