/**
 * El cielo, y la única cuenta suya que se puede comprobar sin tarjeta
 * gráfica: **desde dónde se mide la dirección**.
 *
 * El degradado, el halo y el disco del sol salen todos de un vector: hacia
 * dónde mira este trozo de cielo. Si ese vector está mal, todo lo demás está
 * mal y **se ve** — pero no se ve en una prueba, se ve volando, que es como
 * se vio:
 *
 * > «El sol, literalmente, debajo del horizonte, tiene gracia.»
 *
 * Y tenía gracia. La cúpula **viaja con la cámara** —`updateSky` le copia la
 * posición cada fotograma, que es lo que impide salirse de ella por mucho que
 * se suba— y el vértice le pasaba al fragmento su posición **en el mundo**.
 * Normalizada, eso es la dirección desde el origen del escenario, no desde el
 * ojo. Medido con el juego abierto, nada más empezar una aproximación:
 *
 *     tenerife-sur    cúpula r=16.000 m · a 4.919 m del origen → 17,1° de error
 *     la-palma        cúpula r=16.000 m · a 4.448 m del origen → 15,5°
 *     gran-canaria    cúpula r=20.000 m · a 4.899 m del origen → 13,8°
 *     pettirossi      cúpula r=22.000 m · a 5.062 m del origen → 13,0°
 *
 * Trece grados largos, y creciendo según uno se aleja del centro. Con eso, un
 * sol a tres grados sobre el horizonte se pinta muy por debajo de él.
 *
 * Un shader no se ejecuta aquí: no hay contexto de GL y montar uno sería
 * traerse medio navegador. Pero las tres averías de este cielo eran **de
 * texto** —una palabra de más, un sumando de más y un `mix` donde iba un
 * `+=`— así que el texto es exactamente lo que hay que clavar. Ver
 * `GLSL_DEL_CIELO`.
 */

import { describe, expect, it } from "vitest";
import { Color, Group, Object3D, Vector3 } from "three";
import {
  brumaALaAltura,
  conElSol,
  cortesDeLasNubes,
  GAJOS_DEL_CIELO,
  GLSL_DEL_CIELO,
  laminaDeNubes,
  SOL_RASANTE,
  updateSky,
  type SkyRig,
} from "./sky";
import { caida } from "./curvatura";

/**
 * Un aparejo de mentira con lo justo que mira `updateSky`.
 *
 * `createSky` no se puede llamar desde aquí: pinta la textura de las nubes en
 * un lienzo y en una prueba no hay documento. Lo que se comprueba —que la
 * cúpula se pega a la cámara— solo necesita el grupo y el nombre.
 */
function aparejoDeMentira(): { rig: SkyRig; cupula: Object3D } {
  const group = new Group();
  const cupula = new Object3D();
  cupula.name = "cielo";
  group.add(cupula);
  return { rig: { group } as unknown as SkyRig, cupula };
}

describe("la cúpula del cielo", () => {
  it("va donde va la cámara, que es lo que obliga a todo lo demás", () => {
    const { rig, cupula } = aparejoDeMentira();
    const ojo = new Vector3(5000, 420, -3000);
    updateSky(rig, ojo);
    expect(cupula.position.toArray()).toEqual(ojo.toArray());
  });

  it("y por eso la dirección sale del vértice, no de su sitio en el mundo", () => {
    /*
     * La esfera es de radio uno: su vértice **es** la dirección. En cuanto
     * aparece `modelMatrix` aquí, lo que le llega al fragmento es «dónde está
     * este trozo de cielo en el mapa», que con la cúpula pegada a la cámara
     * son los trece grados de error de la cabecera.
     */
    expect(GLSL_DEL_CIELO.vertice).toContain("vDireccion = position;");
    expect(GLSL_DEL_CIELO.vertice).not.toContain("modelMatrix");
  });

  it("y no se le suma ningún desplazamiento a esa dirección", () => {
    /*
     * Había un `offset` de 0,12 sumado antes de normalizar. Sobre una esfera
     * de dieciséis mil metros no hacía nada —llevaba meses siendo un cero— y
     * sobre una de radio uno levanta el cielo unos siete grados, o sea
     * **pinta el sol siete grados más abajo de donde está**: la misma avería
     * otra vez, por la puerta de atrás.
     */
    expect(GLSL_DEL_CIELO.fragmento).toContain("normalize(vDireccion)");
    expect(GLSL_DEL_CIELO.fragmento).not.toContain("offset");
  });

  it("y tiene gajos de sobra para que no se vea el aspa", () => {
    /*
     * La dirección se interpola linealmente por la cara del triángulo. Con
     * 24×16 gajos —quince grados de ancho por once de alto— eso no es una
     * dirección: es una aproximación que se separa varios grados por el medio
     * de cada cara, y con el degradado ya centrado eso se lee como un aspa.
     */
    expect(360 / GAJOS_DEL_CIELO.ancho).toBeLessThanOrEqual(6);
    expect(180 / GAJOS_DEL_CIELO.alto).toBeLessThanOrEqual(4);
  });
});

describe("el sol", () => {
  it("suma sobre su halo en vez de borrarlo", () => {
    /*
     * Era `mix(sky, sunColour, disc)`: en el punto exacto del sol se tiraba
     * el resplandor que la línea anterior acababa de sumar y se ponía el
     * color del sol a secas. Como el halo aporta casi el doble de ese mismo
     * color, el disco salía **más oscuro que lo que lo rodea** — un agujero
     * pardo en mitad del cielo naranja. El sol es la fuente: es lo más claro
     * del cielo, o no es el sol.
     */
    const f = GLSL_DEL_CIELO.fragmento;
    expect(f).toContain("vec3 sol = min(cielo + luz, vec3(1.0));");
    expect(f).toContain("sky = conElSol(sky, disc, rasante);");
    expect(f).not.toContain("mix(sky, sunColour, disc)");
    /*
     * Y tampoco hacia un color fijo. Fue la segunda vez: para enrojecerlo
     * pegado al horizonte, el disco tiraba hacia un naranja escrito a mano
     * con el disco de factor, y como el resplandor de alrededor ya tenía el
     * rojo a tope, salía con entre la mitad y tres cuartos de la luminancia
     * del cielo de al lado. El mismo hueco, por otra puerta.
     */
    expect(f).not.toMatch(/sky = mix\(sky, vec3\(/);
  });

  /** La luminancia de un color lineal ya recortado a lo que da la pantalla. */
  const luma = (c: readonly number[]): number =>
    Math.min(c[0]!, 1) * 0.2126 +
    Math.min(c[1]!, 1) * 0.7152 +
    Math.min(c[2]!, 1) * 0.0722;
  const lineal = (hex: number): [number, number, number] => {
    const c = new Color(hex);
    return [c.r, c.g, c.b];
  };

  it("y pegado al horizonte sigue siendo lo más claro del cielo", () => {
    /*
     * La regla, comprobada en números y no en el texto: con cualquier cielo
     * detrás —el azul del mediodía, el dorado del ocaso con el rojo pasado
     * de lo que da la pantalla, el malva del crepúsculo— y con el sol de
     * cualquier hora, el disco no baja de su cielo en ningún canal y sale al
     * menos `masClaro` veces más claro, hasta donde la pantalla deja.
     *
     * Se comprueba la gemela en TypeScript de la cuenta del fragmento; que
     * las dos llevan los mismos números lo mira la prueba siguiente.
     */
    const cielos: [number, number, number][] = [
      [0.25, 0.45, 0.9], // mediodía
      [1.25, 0.67, 0.19], // el resplandor del ocaso, con el rojo pasado
      [1.0, 0.45, 0.12],
      [0.62, 0.36, 0.42], // malva
      [0.2, 0.1, 0.05], // crepúsculo
      [0.9, 0.9, 0.92], // bruma casi blanca
    ];
    const soles = [0xfff4e2, 0xffd9a0, 0xff8c3a, 0xa86a52].map(lineal);
    for (const cielo of cielos)
      for (const sol of soles)
        for (let r = 0; r <= 1.0001; r += 0.125) {
          const con = conElSol(cielo, sol, 1, r);
          for (let i = 0; i < 3; i++)
            expect(Math.min(con[i]!, 1)).toBeGreaterThanOrEqual(
              Math.min(cielo[i]!, 1) - 1e-9,
            );
          const quiere = Math.min(luma(cielo) * SOL_RASANTE.masClaro, 0.98);
          expect(luma(con)).toBeGreaterThanOrEqual(quiere - 1e-6);
        }
  });

  it("y se enrojece al ponerse, donde el cielo deja verlo", () => {
    // Con un cielo oscuro detrás no hace falta el suelo, y lo que queda es
    // la luz que pasa el aire: más roja cuanto más rasante.
    const cielo: [number, number, number] = [0.02, 0.02, 0.04];
    const sol = lineal(0xfff4e2);
    const alto = conElSol(cielo, sol, 1, 0);
    const rasante = conElSol(cielo, sol, 1, 1);
    expect(rasante[1]! / rasante[0]!).toBeLessThan(alto[1]! / alto[0]!);
    expect(rasante[2]! / rasante[0]!).toBeLessThan(alto[2]! / alto[0]!);
    expect(luma(rasante)).toBeLessThan(luma(alto));
  });

  it("y el fragmento y su gemela llevan los mismos números", () => {
    const f = GLSL_DEL_CIELO.fragmento;
    const v3 = (c: readonly number[]): string =>
      `vec3(${c.map((x) => x.toFixed(4)).join(", ")})`;
    expect(f).toContain(v3(SOL_RASANTE.paso));
    expect(f).toContain(v3(SOL_RASANTE.quemadoAlto));
    expect(f).toContain(v3(SOL_RASANTE.quemadoRasante));
    expect(f).toContain(v3(SOL_RASANTE.blanco));
    expect(f).toContain(SOL_RASANTE.velo.toFixed(4));
    expect(f).toContain(SOL_RASANTE.masClaro.toFixed(4));
  });

  it("y el halo se abre cuanto más bajo está, que es lo que da la hora", () => {
    // La pareja de potencias del mismo coseno: cerrada para el disco, abierta
    // para el resplandor. Si alguna vez se quedan iguales, no hay atardecer.
    expect(GLSL_DEL_CIELO.fragmento).toContain("mix(60.0, 5.0, haloFuerza)");
  });
});

describe("por debajo del horizonte", () => {
  it("la cúpula pinta mar, y el sol no asoma", () => {
    /*
     * Desde altura el agua se acaba antes del horizonte, y la franja de
     * cúpula que queda entre medias se veía: «el sol apareciendo por debajo
     * del horizonte». Ahí va el mar, con su niebla, y el disco solo se
     * dibuja en la rama del cielo.
     *
     * Y el horizonte es el de la Tierra redonda, por debajo de la
     * horizontal: con él en cero, el sol se cortaba en una raya recta por
     * encima del horizonte que se veía. Ver `curvatura.test.ts`.
     */
    const f = GLSL_DEL_CIELO.fragmento;
    expect(f).toContain("if (baja > pendienteDelHorizonte)");
    expect(f).toContain("marEn(dir)");
    expect(f.indexOf("sky = conElSol(sky, disc, rasante);")).toBeGreaterThan(
      f.indexOf("} else {"),
    );
  });

  it("y el agua usa la misma cuenta y la misma bruma, para no dejar costura", () => {
    expect(GLSL_DEL_CIELO.agua).toContain("marEn(v)");
    expect(GLSL_DEL_CIELO.agua).toContain("nieblaEn(v)");
    expect(GLSL_DEL_CIELO.fragmento).toContain("nieblaEn(dir)");
  });

  it("el cielo sale a pantalla en sRGB, como todo lo demás", () => {
    /*
     * La cúpula pintaba el color lineal como si fuera sRGB: más oscuro y
     * más saturado de lo escrito, y al ocaso un granate en todo el cielo.
     * El paso tiene que estar en la rama del cielo —la del mar ya lo tenía—
     * y el reflejo del cielo en el agua no puede deshacerlo otra vez.
     */
    const f = GLSL_DEL_CIELO.fragmento;
    const cielo = f.slice(f.indexOf("} else {"));
    expect(cielo).toContain("sRGBTransferOETF(vec4(sky, 1.0))");
    expect(f).not.toContain("sRGBTransferEOTF(vec4(cieloEn");
  });
});

describe("la bruma se queda abajo", () => {
  it("en el suelo, entera", () => {
    expect(brumaALaAltura(0)).toBe(1);
    expect(brumaALaAltura(300)).toBe(1);
  });

  it("a ocho mil pies queda poco más de un tercio, y por encima no baja más", () => {
    expect(brumaALaAltura(2440)).toBeGreaterThan(0.33);
    expect(brumaALaAltura(2440)).toBeLessThan(0.42);
    expect(brumaALaAltura(3000)).toBeCloseTo(0.3);
    expect(brumaALaAltura(11000)).toBeCloseTo(0.3);
  });

  it("y nunca sube al subir", () => {
    let antes = 2;
    for (let h = 0; h <= 5000; h += 100) {
      const b = brumaALaAltura(h);
      expect(b).toBeLessThanOrEqual(antes);
      antes = b;
    }
  });
});

describe("el agua sobre la tierra", () => {
  it("no se pinta, y sin tirar el fragmento", () => {
    /*
     * Donde el mapa dice tierra el agua no pinta nada: si no, de lejos se
     * turnaba con el llano que le queda a pocos metros por encima y lo
     * cruzaba de rayas. Y lo hace saliendo transparente, no con `discard`:
     * con él la tarjeta deja de descartar por profundidad antes de pintar y
     * el agua tapada por la isla se pinta entera. Medido, casi dos
     * milisegundos por cuadro sobre el mar de Gran Canaria.
     */
    const a = GLSL_DEL_CIELO.agua;
    expect(a).toContain("if (hayTierra(cameraPosition.xz + vRayo.xz, length(vRayo)))");
    expect(a).not.toMatch(/\bdiscard\s*;/);
    // Una lectura por fragmento, filtrada por la tarjeta, y sin bucles.
    expect(a.match(/textureLod\(/g)?.length).toBe(1);
    expect(a).not.toContain("texelFetch");
    expect(a).not.toMatch(/\bfor \(/);
  });
});

describe("la capa de nubes", () => {
  /*
   * Cinco capas de ochenta kilómetros, transparentes y una encima de otra.
   * Con la curva de la Tierra no pueden ir de dos triángulos —bajaban
   * enteras lo que bajan las esquinas—, y en una rejilla fina las aristas
   * encarecían el cuadro un milisegundo. Ver `cortesDeLasNubes`.
   */
  const lado = 80_000;
  const repite = 12;
  const geo = laminaDeNubes(lado, repite);
  const pos = geo.getAttribute("position");
  const idx = geo.getIndex()!;

  /** Lo que baja de más la capa en un punto, con el ojo en `ojo`. */
  function errores(ojo: [number, number]): { cerca: number; angulo: number } {
    let cerca = 0;
    let angulo = 0;
    const cae = (x: number, z: number): number =>
      caida(Math.hypot(x - ojo[0], z - ojo[1]));
    for (let t = 0; t < idx.count; t += 3) {
      const v = [0, 1, 2].map((k) => idx.getX(t + k));
      const xs = v.map((i) => pos.getX(i));
      const zs = v.map((i) => pos.getZ(i));
      const cs = v.map((_, k) => cae(xs[k]!, zs[k]!));
      for (let a = 0; a <= 12; a++)
        for (let b = 0; a + b <= 12; b++) {
          const w = [a / 12, b / 12, 1 - (a + b) / 12];
          const x = w[0]! * xs[0]! + w[1]! * xs[1]! + w[2]! * xs[2]!;
          const z = w[0]! * zs[0]! + w[1]! * zs[1]! + w[2]! * zs[2]!;
          const repartida = w[0]! * cs[0]! + w[1]! * cs[1]! + w[2]! * cs[2]!;
          const error = repartida - cae(x, z);
          const d = Math.hypot(x - ojo[0], z - ojo[1]);
          if (d < 2000) cerca = Math.max(cerca, error);
          else if (d < (lado / 2) * 0.92) angulo = Math.max(angulo, error / d);
        }
    }
    return { cerca, angulo: (angulo * 180) / Math.PI };
  }

  it("va en cinco por cinco cuadros, no en una rejilla fina", () => {
    expect(idx.count / 3).toBe(50);
    expect(cortesDeLasNubes(lado, repite)[0]).toBeCloseTo(lado / repite / 2, 6);
  });

  it("y con el ojo donde pueda estar, no se hunde ni un píxel", () => {
    /*
     * El banco sigue a la cámara a saltos de un paso del dibujo, así que el
     * ojo está siempre a menos de medio paso de su centro. Debajo, menos de
     * dos metros y medio con las capas a setenta; de lejos, menos de una
     * décima de grado, que es menos de un píxel.
     */
    const medio = lado / repite / 2;
    for (const ojo of [
      [0, 0],
      [medio, 0],
      [medio, medio],
      [-medio * 0.6, medio * 0.9],
    ] as [number, number][]) {
      const { cerca, angulo } = errores(ojo);
      expect(cerca).toBeLessThan(2.5);
      expect(angulo).toBeLessThan(0.1);
    }
  });

  it("y el dibujo no se entera de dónde van las rayas", () => {
    const uv = geo.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      expect(uv.getX(i)).toBeCloseTo(pos.getX(i) / lado + 0.5, 6);
      // Tumbado: la v del plano de serie va hacia el norte, que es −z.
      expect(uv.getY(i)).toBeCloseTo(0.5 - pos.getZ(i) / lado, 6);
    }
  });
});
