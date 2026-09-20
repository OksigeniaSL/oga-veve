/**
 * La cuenta atrás de la toma.
 *
 * Lo que se comprueba no son los números —esos están en la lista— sino **las
 * tres reglas que hacen que la cuenta enseñe en vez de estorbar**: se canta
 * bajando y no subiendo, no se repite, y una caída grande no suelta cuatro
 * palabras de golpe.
 */

import { describe, expect, it } from "vitest";
import {
  AvisosDeAltura,
  ESCALONES,
  ESCALONES_EN_PIES,
} from "./avisos-de-altura";

/**
 * Irse al aire de verdad: unos segundos seguidos sin venir a posarse.
 *
 * No basta un fotograma, y eso es el arreglo: el embudo de final es una figura
 * geométrica y un avión que la roza entra y sale de ella muchas veces sin
 * dejar de aproximar. Ver `SE_FUE_DE_VERDAD`.
 */
function seVaAlAire(a: AvisosDeAltura): void {
  for (let i = 0; i < 200; i++) a.paso(400, true, false, true);
}

/**
 * Venir de arriba: un fotograma por encima del escalón más alto.
 *
 * Hace falta porque **para cantar un escalón hay que haber estado por encima
 * de ese escalón**, y una prueba que empieza a cuarenta y cinco metros no ha
 * estado por encima de cincuenta. Ver `masAltoVisto`.
 */
function vieneDeArriba(a: AvisosDeAltura, alto = 400): void {
  a.paso(alto, true, true, true);
}

/** Baja de una altura a otra de metro en metro y anota lo que se canta. */
const bajarDe = (a: AvisosDeAltura, desde: number, hasta: number): string[] => {
  const dichos: string[] = [];
  for (let h = desde; h >= hasta; h -= 1) {
    const aviso = a.paso(h, true, true, true);
    if (aviso) dichos.push(aviso.dice);
  }
  return dichos;
};

describe("los avisos de altura", () => {
  it("cantan la cuenta entera al bajar", () => {
    /*
     * Desde 120: los de por encima no se cantan porque no se ha estado ahí
     * arriba, que es justo lo que arma cada escalón. Ver `masAltoVisto`.
     */
    expect(bajarDe(new AvisosDeAltura(), 120, 0)).toEqual([
      "one hundred",
      "fifty",
      "forty",
      "thirty",
      "twenty",
      "ten",
      "five",
    ]);
  });

  it("no repiten un escalón por quedarse rondándolo", () => {
    const a = new AvisosDeAltura();
    vieneDeArriba(a);
    bajarDe(a, 60, 45);
    // Arriba y abajo alrededor de los cincuenta, sin subir lo bastante.
    const otra: string[] = [];
    for (const h of [48, 52, 47, 53, 46]) {
      const aviso = a.paso(h, true, true, true);
      if (aviso) otra.push(aviso.dice);
    }
    expect(otra).toEqual([]);
  });

  it("subir dentro de la misma toma NO los rearma", () => {
    /*
     * **Y esto cambió a propósito.** Antes bastaba con subir ocho metros por
     * encima de un escalón para volver a armarlo, y esa holgura no aguanta lo
     * que de verdad pasa volando sobre relieve: la altura sobre el suelo salta
     * con cada pliegue del terreno. Medido en La Palma —isla de barrancos, con
     * la pista sobre el mar—: «cien» seiscientas siete veces en un vuelo.
     *
     * En una toma la cuenta baja y no vuelve a subir. Rearmar es cosa de
     * empezar **otra** aproximación.
     */
    const a = new AvisosDeAltura();
    vieneDeArriba(a);
    bajarDe(a, 60, 45);
    a.paso(70, true, true, true);
    expect(a.paso(45, true, true, true)).toBe(null);
  });

  it("y lo que sí los rearma es empezar otra aproximación", () => {
    const a = new AvisosDeAltura();
    vieneDeArriba(a);
    bajarDe(a, 60, 45);
    // Se va uno al aire de verdad: la cuenta se olvida entera.
    seVaAlAire(a);
    // Y al volver arranca **desde arriba**, no por donde se quedó: la segunda
    // aproximación es una aproximación entera, no la continuación de la otra.
    expect(a.paso(45, true, true, true)?.dice).toBe("one hundred");
  });

  it("una caída de golpe no suelta cuatro palabras a la vez", () => {
    const a = new AvisosDeAltura();
    a.paso(120, true, true, true);
    // De ciento veinte a ocho en un solo fotograma: se canta uno, el más alto
    // de los que se han cruzado **y sobre los que se ha estado**.
    expect(a.paso(8, true, true, true)?.dice).toBe("one hundred");
  });

  it("rodando no se canta nada, por bajo que se vaya", () => {
    const a = new AvisosDeAltura();
    expect(a.paso(1, false, true, true)).toBeNull();
    expect(a.paso(0.5, false, true, true)).toBeNull();
  });

  it("tras tomar tierra la cuenta empieza de cero", () => {
    const a = new AvisosDeAltura();
    bajarDe(a, 120, 0);
    a.paso(0.5, false, true, true);
    expect(bajarDe(a, 120, 0).length).toBe(7);
  });

  /*
   * **El número que se canta es el que marca el instrumento.** En los tres
   * peldaños métricos, metros; en el que vuela en pies, pies — y ahí «fifty»
   * vuelve a querer decir lo que quiere decir en cualquier avión del mundo.
   */
  it("en pies, «fifty» son quince metros y no cincuenta", () => {
    const a = new AvisosDeAltura(ESCALONES_EN_PIES);
    a.paso(200, true, true, true);
    // A cincuenta metros todavía no ha dicho «fifty»: está a 164 pies.
    expect(bajarDe(a, 200, 50)).not.toContain("fifty");
    expect(bajarDe(a, 50, 14)).toContain("fifty");
  });

  it("cada escalón sabe decirse también en casa", () => {
    for (const e of [...ESCALONES, ...ESCALONES_EN_PIES]) {
      expect(e.encasa.length).toBeGreaterThan(2);
    }
  });
});

describe("y la cuenta atrás es de la recogida, no del terreno", () => {
  /*
   * El rearme mira la altura **sobre el suelo**, y sobrevolando un sitio de
   * barrancos esa altura salta de treinta a doscientos metros y vuelve con
   * cada pliegue: cada oscilación rearma un escalón y lo vuelve a cantar.
   * Medido en el barrido, en La Palma: «cien» **seiscientas siete veces** en
   * un solo vuelo, «cincuenta» cuatrocientas veintisiete.
   *
   * Y estos avisos no son del terreno: enseñan el ritmo de la recogida. Fuera
   * de una toma son ruido, y del que se aprende a no oír.
   */
  it("sobrevolando barrancos, ni un aviso", () => {
    const a = new AvisosDeAltura();
    let dichos = 0;
    // Veinte pliegues de terreno: de 200 m a 20 m y vuelta, volando nivelado.
    for (let i = 0; i < 20; i++) {
      for (const alto of [200, 120, 60, 20, 60, 120, 200]) {
        if (a.paso(alto, true, false, true)) dichos++;
      }
    }
    expect(dichos).toBe(0);
  });

  it("y el mismo perfil viniendo a posarse sí canta", () => {
    // Para que la prueba de arriba no pase por estar rota la máquina entera.
    const a = new AvisosDeAltura();
    const dichos: string[] = [];
    // Un descenso de verdad, metro a metro: la máquina da **un aviso por
    // fotograma** a propósito —caer diez metros de golpe no puede soltar
    // cuatro palabras a la vez— así que hace falta bajar seguido.
    for (let alto = 200; alto >= 1; alto -= 1) {
      const av = a.paso(alto, true, true, true);
      if (av) dichos.push(av.encasa);
    }
    expect(dichos).toEqual([
      "cien",
      "cincuenta",
      "cuarenta",
      "treinta",
      "veinte",
      "diez",
      "cinco",
    ]);
  });

  it("y salir de la toma olvida lo dicho, para que la siguiente empiece entera", () => {
    const a = new AvisosDeAltura();
    vieneDeArriba(a);
    expect(a.paso(90, true, true, true)?.encasa).toBe("cien");
    // Se va uno al aire de verdad: deja de ser una toma.
    seVaAlAire(a);
    // Y vuelve: la cuenta empieza de cero, no a medias.
    expect(a.paso(90, true, true, true)?.encasa).toBe("cien");
  });
});

describe("y entrar y salir del embudo no reinicia la cuenta", () => {
  /*
   * El embudo de final es una figura geométrica, y un avión que la roza entra
   * y sale de ella muchas veces en una aproximación. Borrar la cuenta en cada
   * salida la hacía empezar de nuevo en cada entrada.
   *
   * Los tres números que costó llegar aquí, en La Palma: 607 repeticiones de
   * «cien», 319 tras acotar a la toma, 509 tras quitar además el rearme por
   * altura. Ninguno era cero — señal de estar tocando el síntoma.
   */
  it("rozar el borde del embudo no repite «cien»", () => {
    const a = new AvisosDeAltura();
    let cien = 0;
    // Bajando de verdad, pero entrando y saliendo del embudo a cada paso.
    for (let alto = 120; alto >= 20; alto -= 2) {
      const dentro = alto % 4 === 0;
      const av = a.paso(alto, true, dentro, true);
      if (av?.encasa === "cien") cien++;
    }
    expect(cien).toBe(1);
  });

  it("y el terreno que sube y baja, tampoco", () => {
    const a = new AvisosDeAltura();
    let cien = 0;
    // Dentro de la toma todo el rato, con la altura sobre el suelo saltando
    // con cada barranco: 30 m sobre la pista, 130 sobre el acantilado.
    for (let i = 0; i < 50; i++) {
      const av = a.paso(i % 2 === 0 ? 30 : 130, true, true, true);
      if (av?.encasa === "cien") cien++;
    }
    expect(cien).toBe(1);
  });

  it("pero subir de verdad y volver a bajar sí empieza otra cuenta", () => {
    // Bien por encima de todos los escalones: eso es irse al aire y volver a
    // probar, y la segunda aproximación es una aproximación entera.
    const a = new AvisosDeAltura();
    vieneDeArriba(a);
    expect(a.paso(90, true, true, true)?.encasa).toBe("cien");
    seVaAlAire(a);
    expect(a.paso(90, true, true, true)?.encasa).toBe("cien");
  });
});

describe("y la carrera de despegue no es una toma", () => {
  /*
   * **El fallo de verdad, y el que costó seis intentos.**
   *
   * En la carrera el avión va rebotando por la pista: las ruedas tocan y dejan
   * de tocar, y cada contacto borra la cuenta. Al fotograma siguiente está «en
   * el aire» a dos metros y **sobre la pista**, o sea que la guarda de «esto es
   * una toma» daba verdad; y entre bote y bote el avión **baja**, o sea que la
   * de «va bajando» también. Las tres ciertas, y la cuenta entera soltándose
   * desde arriba toda la carrera.
   *
   * Lo encontró el registro de cantos con los números delante —`one hundred
   * [42 kt · 2 m]`, que son un despegue y no una recogida— y lo cierra la única
   * regla que un rebote no puede falsear: **para contar desde cien hay que
   * haber estado por encima de cien**.
   */
  /** Cien fotogramas de carrera: la rueda toca y salta, a dos metros. */
  const carrera = (a: AvisosDeAltura, bajando: boolean): number => {
    let dichos = 0;
    for (let i = 0; i < 100; i++) {
      const enElAire = i % 3 !== 0;
      if (a.paso(2, enElAire, true, bajando)) dichos++;
    }
    return dichos;
  };

  it("rebotando en el despegue no canta nada", () => {
    expect(carrera(new AvisosDeAltura(), false)).toBe(0);
  });

  it("y tampoco si el rebote va hacia abajo, que es lo que pasaba", () => {
    // El bote que baja hacía verdaderas las tres guardas anteriores a la vez.
    expect(carrera(new AvisosDeAltura(), true)).toBe(0);
  });

  it("pero el mismo perfil viniendo de arriba sí canta", () => {
    /*
     * Para que las dos de arriba no pasen por estar rota la máquina entera. Lo
     * único que cambia es de dónde se llega a esos dos metros: de la cabecera
     * de pista o de cien metros de altura.
     */
    const a = new AvisosDeAltura();
    vieneDeArriba(a);
    let dichos = 0;
    // Los mismos dos metros y el mismo vaivén, pero sin volver a tocar: esto
    // es el rebote de una toma, y el de una toma sí se canta.
    for (let i = 0; i < 100; i++) if (a.paso(2, true, true, true)) dichos++;
    expect(dichos).toBeGreaterThan(0);
  });

  it("y despegar y volver a aterrizar canta la cuenta entera", () => {
    // El vuelo de verdad, de punta a punta: carrera, subida, vuelta y toma.
    const a = new AvisosDeAltura();
    carrera(a, false);
    for (let alto = 2; alto <= 400; alto += 2) a.paso(alto, true, false, false);
    const dichos: string[] = [];
    for (let alto = 400; alto >= 1; alto -= 1) {
      const av = a.paso(alto, true, true, true);
      if (av) dichos.push(av.encasa);
    }
    expect(dichos).toEqual([
      "cien",
      "cincuenta",
      "cuarenta",
      "treinta",
      "veinte",
      "diez",
      "cinco",
    ]);
  });
});

/*
 * ── Cada escalón se arma solo cuando se ha estado por encima de él ────────
 *
 * Era una bandera contra el escalón **más alto de la lista**, y eso ataba la
 * cuenta entera al primer número: el día que la lista empezó en trescientos
 * metros en vez de en cien, un circuito a doscientos cincuenta se quedó sin
 * cantar nada. Ver `masAltoVisto`.
 */
describe("la cuenta no depende de cuál sea el escalón más alto", () => {
  it("un circuito bajo canta lo suyo aunque no pase del más alto", () => {
    const a = new AvisosDeAltura();
    // Doscientos cincuenta metros: bien por encima de cien, que es el más
    // alto de la lista métrica. Tiene que cantar la cuenta entera.
    a.paso(250, true, true, true);
    const dichos = bajarDe(a, 250, 0);
    expect(dichos).toContain("one hundred");
    expect(dichos).toContain("fifty");
    expect(dichos[dichos.length - 1]).toBe("five");
  });

  it("y uno de treinta metros no canta ni cincuenta ni cien", () => {
    const a = new AvisosDeAltura();
    a.paso(30, true, true, true);
    const dichos = bajarDe(a, 30, 0);
    expect(dichos).not.toContain("one hundred");
    expect(dichos).not.toContain("fifty");
    expect(dichos).not.toContain("forty");
    expect(dichos).toContain("twenty");
  });

  it("y la cuenta de pies lleva los cientos que hay grabados", () => {
    const cientos = ESCALONES_EN_PIES.filter((e) => e.dice.includes("hundred"));
    // Faltan cuatrocientos, trescientos y doscientos: no están grabados. Ver
    // la nota de `ESCALONES`.
    expect(cientos.map((e) => e.dice)).toEqual(["five hundred", "one hundred"]);
  });
});
