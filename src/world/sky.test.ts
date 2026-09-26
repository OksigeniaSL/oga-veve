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
  AGUA_OPACA_DESDE,
  aireRasante,
  brumaALaAltura,
  cieloJuntoAlSol,
  conElSol,
  DESVANECE_DESDE,
  FRANJA_DEL_HORIZONTE,
  GAJOS_DEL_CIELO,
  GLSL_DEL_CIELO,
  haloALaAltura,
  materialDeNube,
  momentoDe,
  radioDeLasNubes,
  rasanteEn,
  SOL_RASANTE,
  updateSky,
  type SkyRig,
} from "./sky";
import {
  bajadaDelHorizonte,
  caida,
  CAIDA_POR_METRO_CUADRADO,
  distanciaAlHorizonte,
  TOLERANCIA_DE_LA_CURVA,
} from "./curvatura";

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

  it("y se pinta la última de lo opaco, en el fondo de la profundidad", () => {
    /*
     * Pintada la primera y sin mirar la profundidad, el cielo entero —con su
     * mar de debajo del horizonte— se calculaba también debajo de la cabina,
     * del avión y de las islas, que después lo tapaban. Al final de lo opaco
     * y a la profundidad del plano lejano, la tarjeta la descarta ahí sin
     * calcularla, y como está en el fondo no tapa el relieve que queda más
     * allá de su radio.
     */
    expect(GLSL_DEL_CIELO.vertice).toContain("gl_Position.z = gl_Position.w;");
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

  it("y con el cielo de verdad del ocaso se enrojece, el borde de abajo más", () => {
    /*
     * La prueba de encima usa un cielo casi negro, donde enrojecer es fácil.
     * El caso que importa es el de verdad: el sol a grado y medio sobre el
     * mar, que es como se ve a las seis desde ocho mil pies, con el cielo del
     * ocaso y su halo abierto del todo alrededor. Ahí el suelo manda —el
     * disco tiene que salir más claro que un cielo que ya tiene el rojo al
     * tope— y el disco salía del tono del cielo, con el borde de abajo más
     * blanco que el de arriba, al revés que el sol de verdad.
     */
    const altura = -0.1; // las seis y un minuto
    const m = momentoDe(altura);
    const colores = {
      horizonte: lineal(m.horizonte),
      horizonteSol: lineal(m.horizonteSol),
      cenit: lineal(m.cenit),
      sol: lineal(m.sol),
    };
    const halo = haloALaAltura(altura);
    const grado = Math.PI / 180;
    /** El disco en un trozo que está `alto` sobre el horizonte que se ve. */
    const disco = (alto: number): [number, number, number] => {
      const cielo = cieloJuntoAlSol(colores, halo, alto, 1);
      const con = conElSol(cielo, colores.sol, 1, rasanteEn(alto));
      // Nunca un hueco: más claro que su cielo, lo que pida el suelo.
      expect(luma(con)).toBeGreaterThanOrEqual(
        Math.min(luma(cielo) * SOL_RASANTE.masClaro, 0.98) - 1e-6,
      );
      return con;
    };
    const centro = 1.5 * grado;
    const radio = 0.75 * grado * 0.65;
    const abajo = disco(centro - radio);
    const arriba = disco(centro + radio);
    // El borde de abajo cruza más aire: menos verde y menos azul por rojo.
    expect(abajo[1] / abajo[0]).toBeLessThan(arriba[1] / arriba[0]);
    expect(abajo[2] / abajo[0]).toBeLessThan(arriba[2] / arriba[0]);
    // Y el disco que se pone es bastante más rojo que el mismo sol lejos
    // del horizonte, con el mismo cielo de la misma hora.
    const alto = disco(6 * grado);
    const medio = disco(centro);
    expect(medio[1] / medio[0]).toBeLessThan(0.85 * (alto[1] / alto[0]));
    // Que es lo que hace el aire con el halo: pegado al mar, el cielo de
    // alrededor del sol es más naranja que el de unos grados más arriba.
    const pegado = cieloJuntoAlSol(colores, halo, 0, 1);
    const encima = cieloJuntoAlSol(colores, halo, 4 * grado, 1);
    expect(Math.min(pegado[1], 1) / Math.min(pegado[0], 1)).toBeLessThan(
      Math.min(encima[1], 1) / Math.min(encima[0], 1),
    );
  });

  it("y el aire rasante enrojece y apaga, y lejos del horizonte no toca nada", () => {
    expect(aireRasante(rasanteEn(0.2))).toEqual([1, 1, 1]);
    const pegado = aireRasante(rasanteEn(0));
    expect(pegado[0]).toBeGreaterThan(pegado[1]);
    expect(pegado[1]).toBeGreaterThan(pegado[2]);
    expect(pegado[0]).toBeLessThan(1);
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
    expect(f).toContain(`smoothstep(0.0, ${SOL_RASANTE.ancho.toFixed(4)}, alto)`);
    // Y el halo cruza el mismo aire que el disco.
    expect(f).toContain("c += sunColour * aireRasante(rasanteEn(alto)) * pow(toSun,");
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
    expect(f).toContain("marEn(dir, dir.xz / llano * d)");
    expect(f.indexOf("sky = conElSol(sky, disc, rasante);")).toBeGreaterThan(
      f.indexOf("} else {"),
    );
  });

  it("y el agua usa la misma cuenta y la misma bruma, para no dejar costura", () => {
    expect(GLSL_DEL_CIELO.agua).toContain("marEn(v, vRayo.xz)");
    expect(GLSL_DEL_CIELO.agua).toContain("nieblaEn(v)");
    expect(GLSL_DEL_CIELO.fragmento).toContain("nieblaEn(dir)");
  });

  it("y el mar refleja con la normal de la Tierra redonda: el sol puesto en plano sigue en el agua", () => {
    /*
     * A las seis y un minuto el sol está una décima de grado por debajo de
     * la horizontal y, desde ocho mil pies, grado y medio por encima del mar.
     * Con la normal plana el agua solo refleja lo que está por encima de la
     * horizontal, y el camino del sol se apagaba con el disco entero a la
     * vista. Con la del agua de verdad —inclinada d/R, la pendiente de la
     * misma parábola que baja los vértices— hay un trecho de mar, antes del
     * horizonte, que lo refleja.
     */
    const f = GLSL_DEL_CIELO.fragmento;
    expect(f).toContain(
      "vec3 n = normalize(vec3(2.0 * curvatura * lejos.x, 1.0, 2.0 * curvatura * lejos.y));",
    );
    expect(f).toContain("cieloEn(reflect(v, n))");
    expect(f).not.toContain("smoothstep(-0.01, 0.03, s.y)");
    expect(f).toContain("float solSobreElMar = sobreElHorizonte(s);");

    const h = 2440;
    const sol = -0.1 * (Math.PI / 180);
    /** Hacia dónde sale lo que refleja el agua a `d` m, en radianes. */
    const reflejoA = (d: number, k: number): number => {
      const v = [d, -(h + d * d * k), 0];
      const lv = Math.hypot(v[0]!, v[1]!);
      const vn = [v[0]! / lv, v[1]! / lv];
      const n = [2 * k * d, 1];
      const ln = Math.hypot(n[0]!, n[1]!);
      const nn = [n[0]! / ln, n[1]! / ln];
      const vd = vn[0]! * nn[0]! + vn[1]! * nn[1]!;
      const r = [vn[0]! - 2 * vd * nn[0]!, vn[1]! - 2 * vd * nn[1]!];
      return Math.atan2(r[1]!, r[0]!);
    };
    const hasta = distanciaAlHorizonte(h);
    let curva = -Infinity;
    let plana = Infinity;
    for (let d = 1000; d < hasta; d += 500) {
      curva = Math.max(curva, -Math.abs(reflejoA(d, CAIDA_POR_METRO_CUADRADO) - sol));
      plana = Math.min(plana, reflejoA(d, 0));
    }
    // Con la curva, algún trozo de mar lo refleja a menos de una décima de
    // grado; en plano, todo lo que refleja el agua mira por encima de la
    // horizontal, y el sol está por debajo.
    expect(-curva).toBeLessThan(0.1 * (Math.PI / 180));
    expect(plana).toBeGreaterThan(0);
    // Y lo más bajo que refleja el agua es el propio horizonte: −δ.
    expect(reflejoA(hasta, CAIDA_POR_METRO_CUADRADO)).toBeCloseTo(
      -bajadaDelHorizonte(h),
      4,
    );
  });

  it("y el mar que el agua tapa del todo no se calcula, salvo junto al horizonte", () => {
    /*
     * El mar de la cúpula solo se ve más allá del disco de agua y a través
     * de la poca transparencia que el agua tiene de cerca. Donde el agua es
     * opaca del todo, calcularlo —con su reflejo y su bruma— costaba un
     * siete por ciento del cuadro para no verse.
     */
    const f = GLSL_DEL_CIELO.fragmento;
    expect(f).toContain(`lejos > ${AGUA_OPACA_DESDE.toFixed(1)}`);
    expect(f).toContain("d < 0.97 * radioDelAgua");
    expect(f).toContain(`d < ${FRANJA_DEL_HORIZONTE.toFixed(2)} * horizonte`);
    // Y la misma distancia a la que el agua deja de ser transparente.
    expect(GLSL_DEL_CIELO.agua).toContain(
      `smoothstep(1500.0, ${AGUA_OPACA_DESDE.toFixed(1)}, alOjo)`,
    );
    /*
     * Junto al horizonte lo calcula entero: el disco reparte la curva en
     * recta y su horizonte queda hasta dos diezmilésimas de radián por
     * debajo del de verdad —ver `curvatura.test.ts`—. La franja que se
     * calcula entera tiene que ser más ancha que eso a cualquier altura a la
     * que haya algo que no calcular.
     */
    for (const alto of [10, 30, 300, 2440, 11_000]) {
      const hasta = FRANJA_DEL_HORIZONTE * distanciaAlHorizonte(alto);
      if (hasta <= AGUA_OPACA_DESDE) continue;
      const bajaAhi = Math.atan((alto + caida(hasta)) / hasta);
      expect(bajaAhi - bajadaDelHorizonte(alto), `a ${alto} m`).toBeGreaterThan(
        2 * TOLERANCIA_DE_LA_CURVA,
      );
    }
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
  it("va plana, sin la curva de la Tierra", () => {
    /*
     * Con la curva no podía ir en dos triángulos —bajaba entera lo que bajan
     * las esquinas—, y partida en cuadros las aristas encarecían el cuadro.
     * Ver `materialDeNube`.
     */
    const m = materialDeNube(null, 30_000) as unknown as {
      defines?: Record<string, string>;
    };
    expect(m.defines).toHaveProperty("SIN_CURVATURA");
  });

  it("y donde la curva se notaría, ya casi no se ve", () => {
    for (const lado of [48_000, 80_000, 88_000]) {
      const radio = radioDeLasNubes(lado);
      // A mitad del desvanecido, lo que deja de caer se ve a menos de
      // 0,15°: menos de dos píxeles de una nube sin borde.
      const aMedias = (radio * (DESVANECE_DESDE + 1)) / 2;
      const grados = (Math.atan(caida(aMedias) / aMedias) * 180) / Math.PI;
      expect(grados, `banco de ${lado / 1000} km`).toBeLessThan(0.15);
    }
    // Y donde se atraviesa, nada: a dos kilómetros, treinta centímetros.
    expect(caida(2000)).toBeLessThan(0.35);
  });
});
