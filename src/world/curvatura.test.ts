/**
 * La curva de la Tierra en el dibujo: las cuentas, el parche y las mallas.
 *
 * Lo que se veía —el sol cortado por una raya recta por encima de la costa
 * de Tenerife, y debajo una franja del color del cielo— no se puede ver en
 * una prueba: hace falta tarjeta gráfica. Lo que sí se puede clavar es todo
 * lo que lo produce: la cuenta del horizonte, que el trozo de three.js que
 * proyecta vértices lleva la caída y la lleva en el sitio justo, y que las
 * mallas que se curvan tienen triángulos lo bastante pequeños para que la
 * curva no se note entre vértice y vértice. Ver `curvatura.ts`.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  BufferGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  ShaderChunk,
  ShaderLib,
  Vector3,
} from "three";
import {
  ANCLA_DE_LA_PROYECCION,
  anguloAparente,
  bajadaDelHorizonte,
  CAIDA_POR_METRO_CUADRADO,
  caida,
  curvaturaEncendida,
  discoDeAgua,
  distanciaAlHorizonte,
  factorDeCurvatura,
  instalarCurvatura,
  LADO_SIN_CURVA,
  partirLoLargo,
  RADIO_DE_LA_TIERRA,
  TROZO_DE_CURVATURA,
} from "./curvatura";
import { GLSL_DEL_CIELO, horizonteDesde } from "./sky";

const GRADOS = 180 / Math.PI;
const trozos = ShaderChunk as unknown as Record<string, string>;

/** Un programa de serie con sus `#include` resueltos, como lo hace three. */
function resuelto(texto: string): string {
  return texto.replace(/^[ \t]*#include +<([\w\d./]+)>/gm, (_, nombre: string) => {
    const trozo = trozos[nombre];
    if (trozo === undefined) throw new Error(`sin trozo ${nombre}`);
    return resuelto(trozo);
  });
}

afterEach(() => {
  // Cada prueba deja la curva como la encuentra el juego al arrancar.
  instalarCurvatura(true);
});

describe("las cuentas de la Tierra redonda", () => {
  it("lo lejano cae d²/2R: ocho centímetros a un kilómetro, 785 m a cien", () => {
    expect(caida(1000)).toBeCloseTo(0.0785, 4);
    expect(caida(100_000)).toBeCloseTo(784.8, 1);
    expect(CAIDA_POR_METRO_CUADRADO).toBeCloseTo(1 / (2 * RADIO_DE_LA_TIERRA), 15);
    // Y a cien metros del avión, menos de un milímetro: por eso la física
    // plana y el dibujo curvo no se pelean donde se toca el suelo.
    expect(caida(100)).toBeLessThan(0.001);
  });

  it("desde ocho mil pies el horizonte baja 1,6° y está a 176 km", () => {
    expect(bajadaDelHorizonte(2440) * GRADOS).toBeCloseTo(1.586, 2);
    expect(distanciaAlHorizonte(2440) / 1000).toBeCloseTo(176.3, 0);
    // Desde trescientos metros, medio grado y sesenta y dos kilómetros.
    expect(bajadaDelHorizonte(300) * GRADOS).toBeCloseTo(0.556, 2);
    expect(distanciaAlHorizonte(300) / 1000).toBeCloseTo(61.8, 0);
    // A ras de agua, nada: el horizonte en la horizontal.
    expect(bajadaDelHorizonte(0)).toBe(0);
  });

  it("y el horizonte es el punto del mar que se ve más alto", () => {
    /*
     * La cúpula parte cielo y mar en −δ. Eso solo cuadra con el agua curvada
     * si ningún punto del mar asoma por encima: el mar más alto que se ve
     * tiene que estar justo a la distancia del horizonte y justo en −δ.
     */
    const h = 2440;
    const dh = distanciaAlHorizonte(h);
    let masAlto = -Infinity;
    let donde = 0;
    for (let d = 1000; d < 500_000; d += 500) {
      const a = anguloAparente(h, 0, d);
      if (a > masAlto) {
        masAlto = a;
        donde = d;
      }
    }
    expect(Math.abs(donde - dh)).toBeLessThan(1000);
    expect(masAlto).toBeCloseTo(-bajadaDelHorizonte(h), 5);
  });

  it("desde trescientos metros se ve el Teide, y la costa de Tenerife no", () => {
    /*
     * Es lo que se ve de verdad desde la costa oeste de Gran Canaria: el
     * volcán sobre el mar y la isla sin orilla, porque a cien kilómetros el
     * mar tapa los primeros ochocientos metros. En el mundo plano la costa
     * se veía entera y el sol se ponía por encima de ella.
     */
    const ojo = 300;
    const horizonte = -bajadaDelHorizonte(ojo);
    expect(anguloAparente(ojo, 0, 100_000)).toBeLessThan(horizonte);
    expect(anguloAparente(ojo, 3718, 128_000)).toBeGreaterThan(horizonte);
    // Y a ocho mil pies el horizonte se va a 176 km: la costa de enfrente,
    // a sesenta o setenta, vuelve a verse — más cerca que el horizonte, así
    // que ningún mar se le pone delante, y por debajo de la línea del mar.
    expect(65_000).toBeLessThan(distanciaAlHorizonte(2440));
    expect(anguloAparente(2440, 0, 65_000)).toBeLessThan(-bajadaDelHorizonte(2440));
  });
});

describe("el parche del trozo que proyecta los vértices", () => {
  it("three sigue trayendo la línea de la que se cuelga", () => {
    /*
     * Si una versión nueva de three cambia `project_vertex`, el parche no
     * entra y el mundo se queda plano sin avisar. Esto es el aviso.
     */
    instalarCurvatura(false);
    expect(ShaderChunk.project_vertex).toContain(ANCLA_DE_LA_PROYECCION);
    expect(instalarCurvatura(true)).toBe(true);
  });

  it("la caída va después de pasar a la vista y antes de proyectar", () => {
    instalarCurvatura(true);
    const p = resuelto(ShaderChunk.project_vertex);
    const ancla = p.indexOf(ANCLA_DE_LA_PROYECCION);
    const caidaAhi = p.indexOf("mvPosition.xyz -= viewMatrix[ 1 ].xyz");
    const proyecta = p.indexOf("gl_Position = projectionMatrix * mvPosition;");
    expect(ancla).toBeGreaterThanOrEqual(0);
    expect(caidaAhi).toBeGreaterThan(ancla);
    expect(proyecta).toBeGreaterThan(caidaAhi);
  });

  it("con el 1/2R de verdad escrito dentro", () => {
    instalarCurvatura(true);
    const m = /\* ([\d.]+e-\d+) \)/.exec(trozos[TROZO_DE_CURVATURA]!);
    expect(m).not.toBeNull();
    expect(Number(m![1]) / CAIDA_POR_METRO_CUADRADO).toBeCloseTo(1, 7);
  });

  it("solo con cámara en perspectiva, y se puede quitar a un material", () => {
    const t = trozos[TROZO_DE_CURVATURA]!;
    expect(t).toContain("isPerspectiveMatrix( projectionMatrix )");
    expect(t).toContain("#ifndef SIN_CURVATURA");
  });

  it("y la heredan todos los materiales de serie que usa el juego", () => {
    instalarCurvatura(true);
    for (const cual of ["basic", "lambert", "phong", "standard", "physical", "points", "depth", "dashed"] as const) {
      const v = resuelto(ShaderLib[cual].vertexShader);
      expect(v, cual).toContain("dot( desdeElOjo.xz, desdeElOjo.xz )");
    }
  });

  it("apagada, el trozo queda vacío y la cúpula y el agua en plano", () => {
    expect(instalarCurvatura(false)).toBe(false);
    expect(curvaturaEncendida()).toBe(false);
    expect(trozos[TROZO_DE_CURVATURA]).toBe("");
    expect(factorDeCurvatura()).toBe(0);
    expect(resuelto(ShaderLib.lambert.vertexShader)).not.toContain("desdeElOjo");
    instalarCurvatura(true);
    expect(factorDeCurvatura()).toBe(CAIDA_POR_METRO_CUADRADO);
  });
});

describe("la cúpula y el agua, con el mismo horizonte", () => {
  it("el mar de la cúpula empieza en el horizonte que se ve, no en la horizontal", () => {
    const f = GLSL_DEL_CIELO.fragmento;
    expect(f).toContain("if (baja > pendienteDelHorizonte)");
    expect(f).not.toContain("if (dir.y < 0.0)");
    // La raíz cercana de la parábola, escrita para que sin curva sea alto/baja.
    expect(f).toContain("2.0 * alto / (baja + sqrt(");
  });

  it("y la cúpula pone el horizonte donde lo pone la cuenta", () => {
    // Lo que se le pasa cada fotograma a la cúpula y al agua es la misma
    // bajada que dicen las cuentas de arriba, y en plano no baja nada.
    for (const h of [2, 30, 300, 2440, 11_000]) {
      const { pendiente, seno } = horizonteDesde(h, CAIDA_POR_METRO_CUADRADO);
      expect(Math.atan(pendiente)).toBeCloseTo(bajadaDelHorizonte(h), 9);
      expect(Math.asin(seno)).toBeCloseTo(bajadaDelHorizonte(h), 9);
    }
    expect(horizonteDesde(2440, 0)).toEqual({ pendiente: 0, seno: 0 });
  });

  it("y el agua se curva con el mismo trozo que el resto del mundo", () => {
    const v = GLSL_DEL_CIELO.verticeDelAgua;
    expect(v).toContain(`#include <${TROZO_DE_CURVATURA}>`);
    expect(v.indexOf(`#include <${TROZO_DE_CURVATURA}>`)).toBeLessThan(
      v.indexOf("gl_Position"),
    );
    // Por `modelViewMatrix`, en doble precisión, y no por el mundo en 32 bits.
    expect(v).toContain("modelViewMatrix * vec4(position, 1.0)");
    expect(v).not.toContain("modelMatrix * vec4");
  });

  it("el sol mide lo que se ve en un teléfono: entre 1,2° y 1,6°", () => {
    const f = GLSL_DEL_CIELO.fragmento;
    const m = /smoothstep\(\s*([\d.]+) - ([\d.]+),\s*([\d.]+) \+ ([\d.]+),\s*length\(dir - normalize\(sunDirection\)\)/.exec(f);
    expect(m).not.toBeNull();
    const diametro = 2 * Number(m![1]) * GRADOS;
    expect(diametro).toBeGreaterThanOrEqual(1.2);
    expect(diametro).toBeLessThanOrEqual(1.6);
  });
});

/** El triángulo `t` de una geometría, en tres vectores. */
function triangulos(geo: BufferGeometry): Vector3[][] {
  const pos = geo.getAttribute("position");
  const idx = geo.getIndex();
  const n = (idx ? idx.count : pos.count) / 3;
  const salida: Vector3[][] = [];
  for (let t = 0; t < n; t++) {
    const v = [0, 1, 2].map((k) => {
      const i = idx ? idx.getX(3 * t + k) : 3 * t + k;
      return new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    });
    salida.push(v);
  }
  return salida;
}

const ladoMasLargo = (t: Vector3[]): number =>
  Math.max(t[0]!.distanceTo(t[1]!), t[1]!.distanceTo(t[2]!), t[2]!.distanceTo(t[0]!));

/** La normal de la cara según su sentido: hacia arriba si mira al cielo. */
const normal = (t: Vector3[]): Vector3 =>
  new Vector3().subVectors(t[1]!, t[0]!).cross(new Vector3().subVectors(t[2]!, t[0]!));

describe("el disco de agua", () => {
  const radio = 300_000;
  const disco = discoDeAgua(radio);
  const tris = triangulos(disco);

  it("llega al radio pedido y todas sus caras miran al cielo", () => {
    let lejos = 0;
    for (const t of tris) {
      expect(normal(t).y).toBeGreaterThan(0);
      for (const v of t) lejos = Math.max(lejos, Math.hypot(v.x, v.z));
    }
    expect(lejos).toBeCloseTo(radio, 0);
  });

  it("la curva no se nota entre sus vértices: un milímetro cerca, medio por ciento lejos", () => {
    /*
     * Entre vértices la tarjeta reparte en recta, y el error de repartir la
     * parábola en un triángulo de lado `s` es `s²/8R`. Cerca del ojo —el
     * disco va pegado a él— eso tiene que ser nada, o la orilla de al lado
     * respira al volar; lejos basta con que sea poco al lado de la caída.
     */
    for (const t of tris) {
      const s = ladoMasLargo(t);
      const error = (s * s) / (8 * RADIO_DE_LA_TIERRA);
      const cerca = Math.min(...t.map((v) => Math.hypot(v.x, v.z)));
      if (cerca < 1000) expect(error).toBeLessThan(0.001);
      else expect(error / caida(cerca)).toBeLessThan(0.005);
    }
  });

  it("y no pesa: menos de doce mil vértices", () => {
    expect(disco.getAttribute("position").count).toBeLessThan(12_000);
  });
});

describe("partir lo largo", () => {
  /** Una pista de tres kilómetros en dos triángulos, como las de OpenStreetMap. */
  function pista(): BufferGeometry {
    const g = new PlaneGeometry(45, 3000);
    g.rotateX(-Math.PI / 2);
    return g;
  }

  it("ningún lado pasa del tope, y así el error de la curva no llega al milímetro y medio", () => {
    const partida = partirLoLargo(pista());
    const tris = triangulos(partida);
    expect(tris.length).toBeGreaterThan(2);
    for (const t of tris) expect(ladoMasLargo(t)).toBeLessThanOrEqual(LADO_SIN_CURVA);
    expect((LADO_SIN_CURVA * LADO_SIN_CURVA) / (8 * RADIO_DE_LA_TIERRA)).toBeLessThan(0.0015);
  });

  it("sin perder ni ganar asfalto, y con las caras hacia arriba", () => {
    const tris = triangulos(partirLoLargo(pista()));
    let area = 0;
    for (const t of tris) {
      const n = normal(t);
      expect(n.y).toBeGreaterThan(0);
      area += n.length() / 2;
    }
    expect(area).toBeCloseTo(45 * 3000, 3);
  });

  it("sin grietas: cada lado de dentro lo comparten dos triángulos", () => {
    /*
     * Cada lado se parte según su largo, sin mirar de qué triángulo es: el
     * de al lado toma la misma decisión y pone el punto en el mismo sitio.
     * Si no, quedarían vértices en mitad de un lado ajeno —una grieta por la
     * que asoma lo de debajo—, y un lado de dentro aparecería una sola vez.
     */
    const tris = triangulos(partirLoLargo(pista()));
    const clave = (a: Vector3, b: Vector3): string => {
      const [p, q] = [a, b].map((v) => `${v.x},${v.z}`).sort();
      return `${p}|${q}`;
    };
    const cuenta = new Map<string, number>();
    for (const t of tris)
      for (let k = 0; k < 3; k++) {
        const c = clave(t[k]!, t[(k + 1) % 3]!);
        cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
      }
    let borde = 0;
    for (const [c, n] of cuenta) {
      expect(n).toBeLessThanOrEqual(2);
      if (n === 1) {
        const [a, b] = c.split("|").map((s) => s.split(",").map(Number)) as [number[], number[]];
        borde += Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);
        // Solo el contorno de la pista queda con un triángulo a un lado.
        const enElContorno =
          (Math.abs(Math.abs(a[0]!) - 22.5) < 1e-3 && Math.abs(a[0]! - b[0]!) < 1e-3) ||
          (Math.abs(Math.abs(a[1]!) - 1500) < 1e-3 && Math.abs(a[1]! - b[1]!) < 1e-3);
        expect(enElContorno, c).toBe(true);
      }
    }
    expect(borde).toBeCloseTo(2 * (45 + 3000), 3);
  });

  it("y lo que viaja con la posición se reparte igual: la textura sigue en su sitio", () => {
    const partida = partirLoLargo(pista());
    const pos = partida.getAttribute("position");
    const uv = partida.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      // Tumbado, u crece con x y v crece hacia el norte, que es z negativa.
      expect(uv.getX(i)).toBeCloseTo((pos.getX(i) + 22.5) / 45, 5);
      expect(uv.getY(i)).toBeCloseTo((1500 - pos.getZ(i)) / 3000, 5);
    }
  });

  it("lo que ya es pequeño se devuelve tal cual, sin copiarlo", () => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 10, 0, 0, 0, 0, -10], 3));
    expect(partirLoLargo(g)).toBe(g);
  });
});
