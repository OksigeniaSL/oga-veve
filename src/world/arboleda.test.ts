/**
 * **Los árboles se tocan** (H35b): la forma que se toca es la que se dibuja,
 * cada árbol plantado se apunta, lo que se perdona crece con el peldaño, y
 * preguntar no cuesta nada por fotograma.
 */

import { describe, expect, it } from "vitest";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import { Arboleda } from "./arboleda";
import { createVegetation, filaDeArboles } from "./vegetation";
import { SCENARIOS } from "./scenarios";
import { holguraDeLaCopa, ROZAR_LA_COPA } from "../flight/percance";
import { dibujoDePercance } from "../ui/percances";
import { ES_PY as es } from "../i18n/es-PY";
import { EN as en } from "../i18n/en";

describe("el monte de la pista corta", () => {
  const fila = (): Arboleda => {
    const a = new Arboleda();
    filaDeArboles([{ x: 100, y: 250, z: -40 }], 15, a);
    return a;
  };

  it("la copa del de en medio llega justo a los quince metros, y ahí se toca", () => {
    const a = fila();
    expect(a.cuantos).toBe(1);
    expect(a.toca(100, 250 + 14.9, -40)).toBe(true);
    expect(a.toca(100, 250 + 15.1, -40)).toBe(false);
    // Al lado de la copa, a su altura, no hay nada.
    expect(a.toca(100 + 12, 250 + 8, -40)).toBe(false);
  });

  it("el tronco se toca, y no encoge con la holgura", () => {
    const a = fila();
    expect(a.toca(100, 250 + 0.5, -40, 2)).toBe(true);
  });

  it("con la holgura del peldaño, las hojas de arriba se rozan sin tocar", () => {
    const a = fila();
    expect(a.toca(100, 250 + 13.5, -40, holguraDeLaCopa(1))).toBe(false);
    expect(a.toca(100, 250 + 12.5, -40, holguraDeLaCopa(1))).toBe(true);
    expect(a.toca(100, 250 + 13.5, -40, holguraDeLaCopa(0))).toBe(true);
  });
});

describe("una copa pequeña no se queda sin copa", () => {
  it("con los dos metros de holgura, el corazón de un naranjo de la granja se sigue tocando", () => {
    const a = new Arboleda();
    // La bola del naranjo de `granja.ts`, a escala uno.
    a.plantar(0, 100, 0, 1, 0, { copa: { tipo: "elipsoide", radio: 1.7, semialto: 1.5, centro: 2.3 }, tronco: { radio: 0.17, alto: 1.1 } });
    expect(a.toca(0, 102.3, 0, holguraDeLaCopa(1))).toBe(true);
    // Y lo de fuera, sí se perdona.
    expect(a.toca(0, 103.6, 0, holguraDeLaCopa(1))).toBe(false);
    expect(a.toca(0, 103.6, 0, 0)).toBe(true);
  });
});

describe("lo que se perdona de la copa, por peldaño", () => {
  it("nada sin ayudas, dos metros con la tolerancia entera, y en medio, a proporción", () => {
    expect(holguraDeLaCopa(0)).toBe(0);
    expect(holguraDeLaCopa(0.4)).toBeCloseTo(0.8);
    expect(holguraDeLaCopa(1)).toBe(ROZAR_LA_COPA);
    expect(holguraDeLaCopa(3)).toBe(ROZAR_LA_COPA);
  });
});

describe("cada árbol de la vegetación se apunta, con la forma que se dibuja", () => {
  const escenario = SCENARIOS.find((e) => e.id === "yvytu-rape") ?? SCENARIOS[0]!;
  const cota = Math.max(escenario.waterLevel + 40, escenario.reliefHeight * 0.22);
  const arboleda = new Arboleda();
  const grupo = createVegetation(escenario, () => cota, undefined, undefined, arboleda);
  const copas: { malla: InstancedMesh; vertices: Vector3[] }[] = [];
  grupo.traverse((o) => {
    if (!(o instanceof InstancedMesh)) return;
    // La copa es la que no es un cilindro: el octaedro tiene seis vértices distintos.
    if (o.geometry.type !== "OctahedronGeometry") return;
    const pos = o.geometry.getAttribute("position");
    const vistos = new Map<string, Vector3>();
    for (let i = 0; i < pos.count; i++) {
      const v = new Vector3().fromBufferAttribute(pos, i);
      vistos.set(v.toArray().map((n) => n.toFixed(3)).join(","), v);
    }
    copas.push({ malla: o, vertices: [...vistos.values()] });
  });

  it("tantos apuntados como dibujados", () => {
    const dibujados = copas.reduce((n, c) => n + c.malla.count, 0);
    expect(dibujados).toBeGreaterThan(100);
    expect(arboleda.cuantos).toBe(dibujados);
  });

  it("las seis puntas de cada copa: justo por dentro se tocan, justo por fuera no", () => {
    const m = new Matrix4();
    let mirados = 0;
    for (const { malla, vertices } of copas) {
      const centro = new Vector3();
      for (const v of vertices) centro.add(v);
      centro.divideScalar(vertices.length);
      for (let i = 0; i < malla.count; i += 37) {
        malla.getMatrixAt(i, m);
        const c = centro.clone().applyMatrix4(m);
        for (const v of vertices) {
          const punta = v.clone().applyMatrix4(m);
          const dentro = c.clone().lerp(punta, 0.97);
          expect(arboleda.toca(dentro.x, dentro.y, dentro.z)).toBe(true);
          const fuera = c.clone().lerp(punta, 1.06);
          // Por fuera puede haber otro árbol pegado: solo se mira el de arriba, que no lo tiene.
          if (v.y > centro.y + 0.1) expect(arboleda.toca(fuera.x, fuera.y, fuera.z)).toBe(false);
          mirados++;
        }
      }
    }
    expect(mirados).toBeGreaterThan(100);
  });
});

/*
 * **Lo que cuesta por fotograma.** La regla 6 de `AGENTS.md` es medir antes
 * de añadir. El juego pregunta, en cada paso y con el avión moviéndose, por
 * las ruedas a lo largo del camino —uno a cuatro puntos a velocidades de
 * avioneta— y por las dos puntas del ala: unas seis preguntas. Aquí se hacen
 * cien mil con la vegetación entera del escenario y el avión a la altura de
 * las copas, que es el caso caro: en vuelo, por encima de lo más alto de la
 * celda, la pregunta se va a la primera comparación.
 */
describe("lo que cuesta", () => {
  it("cien mil preguntas a la altura de las copas, en la vegetación entera", () => {
    const escenario = SCENARIOS.find((e) => e.id === "yvytu-rape") ?? SCENARIOS[0]!;
    const cota = Math.max(escenario.waterLevel + 40, escenario.reliefHeight * 0.22);
    const arboleda = new Arboleda();
    const t0 = performance.now();
    createVegetation(escenario, () => cota, undefined, undefined, arboleda);
    const montar = performance.now() - t0;
    let x = 1;
    const azar = (): number => {
      x = (x * 16807) % 2147483647;
      return x / 2147483647;
    };
    const N = 100000;
    const puntos = new Float64Array(N * 3);
    for (let i = 0; i < N; i++) {
      puntos[i * 3] = (azar() - 0.5) * escenario.size * 0.98;
      puntos[i * 3 + 1] = cota + azar() * 20;
      puntos[i * 3 + 2] = (azar() - 0.5) * escenario.size * 0.98;
    }
    let tocados = 0;
    // Una vuelta para calentar, y la que cuenta.
    for (let i = 0; i < N; i++) if (arboleda.toca(puntos[i * 3]!, puntos[i * 3 + 1]!, puntos[i * 3 + 2]!, 0)) tocados++;
    tocados = 0;
    const t1 = performance.now();
    for (let i = 0; i < N; i++) if (arboleda.toca(puntos[i * 3]!, puntos[i * 3 + 1]!, puntos[i * 3 + 2]!, 0)) tocados++;
    const porPregunta = ((performance.now() - t1) * 1000) / N;
    console.log(
      `arboleda: ${arboleda.cuantos} árboles, montada en ${montar.toFixed(0)} ms con la vegetación; ` +
        `${porPregunta.toFixed(3)} µs por pregunta a la altura de las copas (${tocados} tocados de ${N})`,
    );
    expect(arboleda.cuantos).toBeGreaterThan(1000);
    // Seis preguntas por paso tienen que quedarse muy por debajo de un 1 % de los 16,7 ms de un fotograma.
    expect(porPregunta * 6).toBeLessThan(20);
  });
});

describe("el percance, con su dibujo y su frase", () => {
  it("arbol", () => {
    const dibujo = dibujoDePercance("arbol");
    expect(dibujo).toContain("<svg");
    expect(dibujo).not.toBe(dibujoDePercance("fuera"));
    expect(dibujo).not.toBe(dibujoDePercance("edificio"));
    expect(es["percance.arbol"]).toBeTruthy();
    expect(en["percance.arbol"]).toBeTruthy();
  });
});
