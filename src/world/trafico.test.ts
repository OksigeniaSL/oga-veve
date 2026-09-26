/**
 * Que el avión que se oye esté donde dice estar.
 *
 * Es la única propiedad que este módulo tiene que cumplir, y todo lo demás
 * cuelga de ella: si la radio canta «en final» y no hay nadie en final, lo que
 * se ha enseñado es que la radio miente.
 */
import { describe, expect, it } from "vitest";
import { giroDelModelo } from "./rumbo";
import {
  ESPERA_ENTRE_VUELOS,
  ESPERA_MAXIMA,
  ESPERA_MINIMA,
  RESPUESTA_MAXIMA,
} from "../flight/radio";
import {
  SE_VA_A_LOS,
  RUEDA_A,
  VUELA_A,
  alAireDesde,
  caminosDe,
  crearTrafico,
  largoDelCamino,
  porElCamino,
  trazar,
} from "./trafico";
import { ALTURA_DE_DECISION } from "../flight/minimos";
import { BASE_A_FINAL, verticesDelCircuito, type Pista } from "./circuito";

const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 1800 };
/** Lo que tarda de media la llamada siguiente de la frecuencia, s. */
const UNA_LLAMADA = (ESPERA_MINIMA + ESPERA_MAXIMA) / 2;
const COTA = 100;
const entre = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(b.x - a.x, b.z - a.z);
/** Dónde está el que acaba de decir `clave`, en el momento de decirlo. */
const alDecir = (marcas: ReturnType<typeof caminosDe>, clave: string) =>
  porElCamino(marcas[clave]!.camino, marcas[clave]!.metros)!;

describe("dónde está el que acaba de hablar", () => {
  const v = verticesDelCircuito(PISTA, COTA);
  const marcas = caminosDe(PISTA, COTA);

  it("las cinco llamadas de los guiones mueven a alguien", () => {
    // Menos «hold short», que es quedarse quieto y por eso no está.
    for (const clave of [
      "otro.rodando",
      "otro.buenosDias",
      "otro.enCola",
      "otro.final",
      "otro.pistaLibre",
      "torre.lineUpWait",
      "torre.clearedTakeoff",
      "torre.goAround",
    ])
      expect(marcas[clave], clave).toBeDefined();
    expect(marcas["torre.holdShort"]).toBeUndefined();
    expect(marcas["torre.verde"]).toBeUndefined();
  });

  it("el que rueda a la cabecera está en el suelo y fuera del asfalto", () => {
    const donde = alDecir(marcas, "otro.rodando");
    expect(Math.abs(donde.sitio.y - COTA)).toBeLessThan(3);
    // Apartado del eje: un avión esperando turno encima de la pista es
    // exactamente lo que la torre le está diciendo que no haga.
    expect(entre(donde.sitio, v[0]!)).toBeGreaterThan(40);
  });

  it("y al que le mandan alinearse lo oye en la espera y acaba en el eje", () => {
    const m = marcas["torre.lineUpWait"]!;
    // Se lo dicen donde está: en el punto de espera, fuera del asfalto.
    const donde = porElCamino(m.camino, m.metros)!;
    expect(entre(donde.sitio, v[0]!)).toBeGreaterThan(40);
    // Y un rato después está en el eje, todavía en el suelo, esperando turno.
    // Y un rato después está en el eje, todavía en el suelo, esperando turno:
    // el tope le impide seguir tirando del camino y despegar solo.
    const luego = porElCamino(
      m.camino,
      Math.min(m.metros + m.velocidad * UNA_LLAMADA, m.tope ?? Infinity),
    )!;
    expect(entre(luego.sitio, v[0]!)).toBeLessThan(5);
    expect(Math.abs(luego.sitio.y - COTA)).toBeLessThan(3);
    // Y por mucho que pase el tiempo, sigue ahí hasta que le autoricen.
    expect(m.tope).toBeDefined();
  });

  it("y al autorizarle a despegar arranca del umbral y acaba arriba", () => {
    const m = marcas["torre.clearedTakeoff"]!;
    expect(entre(porElCamino(m.camino, m.metros)!.sitio, v[0]!)).toBeLessThan(
      5,
    );
    const luego = porElCamino(m.camino, m.metros + m.velocidad * UNA_LLAMADA)!;
    expect(luego.sitio.y).toBeGreaterThan(COTA + 100);
  });

  it("el que anuncia viento en cola está en el viento en cola", () => {
    /*
     * Y no en su principio: se anuncia a la altura de la cabecera, que es lo
     * que hace un piloto de verdad. Aquí eso no se eligió — sale de contar dos
     * huecos de radio hacia atrás desde la toma.
     */
    const donde = alDecir(marcas, "otro.enCola").sitio;
    const desde = entre(donde, v[2]!);
    const hasta = entre(donde, v[3]!);
    expect(desde).toBeGreaterThan(100);
    expect(hasta).toBeGreaterThan(100);
    // En el tramo, no atajando por el medio del circuito.
    expect(desde + hasta).toBeLessThan(entre(v[2]!, v[3]!) * 1.02);
    // Y a la altura del circuito, que es a lo que se vuela ese tramo.
    expect(donde.y).toBeGreaterThan(COTA + 200);
  });

  it("y el que anuncia final está en final, en la senda y no en el suelo", () => {
    const donde = alDecir(marcas, "otro.final").sitio;
    /*
     * En la entrada en final, y no antes. Caía un hueco de radio antes de la
     * toma, doscientos metros antes de girar: en la base, donde gira a final
     * quien vuela el circuito del juego, y la radio lo daba por delante.
     */
    expect(entre(donde, v[4]!)).toBeLessThan(1);
    expect(donde.y).toBeGreaterThan(COTA + 40);
    expect(donde.y).toBeLessThan(COTA + 200);
  });

  it("y el que dice «pista libre» está fuera de ella, por un costado", () => {
    /*
     * Se ponía en la toma y desde ahí rodaba minuto y medio por el asfalto que
     * acababa de dejar libre. Con la torre esperando esa frase para darle la
     * pista a otro, se la daba con éste encima.
     */
    const donde = alDecir(marcas, "otro.pistaLibre").sitio;
    expect(Math.abs(donde.z - PISTA.z)).toBeGreaterThan(30);
    expect(Math.abs(donde.y - COTA)).toBeLessThan(3);
    // Y más allá del umbral: ha aterrizado y ha salido, no se ha ido al campo.
    expect(entre(donde, v[0]!)).toBeGreaterThan(PISTA.length * 0.25);
  });

  it("y entre una llamada y la siguiente no se salta ningún trozo", () => {
    /*
     * La propiedad que sostiene el módulo: donde se canta una cosa, está el
     * avión. «En final» espera a que haya girado —ver `todaviaNo`—, así que
     * lo que queda por mirar es que no llegue tarde: del viento en cola a la
     * final se tarda lo que tarda como mucho la radio en la llamada
     * siguiente, con la respuesta de la torre entre medias. Así la frase
     * siempre espera al avión y nunca lo pilla por media senda.
     */
    const cola = marcas["otro.enCola"]!;
    const final = marcas["otro.final"]!;
    expect(final.camino).toBe(cola.camino);
    expect((final.metros - cola.metros) / cola.velocidad).toBeGreaterThanOrEqual(
      ESPERA_MAXIMA + RESPUESTA_MAXIMA - 0.01,
    );
    // Y el viento en cola se canta a la altura de la pista, como de verdad.
    expect(Math.abs(alDecir(marcas, "otro.enCola").sitio.x - PISTA.x)).toBeLessThan(
      PISTA.length / 2,
    );
    /*
     * Y de «en final» a «pista libre» no hay marca que acertar: la frase
     * espera a que el avión haya salido de la pista —ver `sigueEnLaPista`—,
     * y sale al final del mismo camino por el que venía.
     */
    const f = marcas["otro.final"]!;
    const libre = marcas["otro.pistaLibre"]!;
    expect(libre.camino).toBe(f.camino);
    expect(libre.metros).toBeCloseTo(largoDelCamino(f.camino), 3);
  });

  it("el circuito por la derecha lleva el tráfico al otro lado", () => {
    const izq = alDecir(caminosDe(PISTA, COTA, "izquierda"), "otro.enCola");
    const der = alDecir(caminosDe(PISTA, COTA, "derecha"), "otro.enCola");
    expect(Math.sign(izq.sitio.z - PISTA.z)).toBe(
      -Math.sign(der.sitio.z - PISTA.z),
    );
  });

  it("y sin pista no hay caminos, en vez de un avión en el centro del mapa", () => {
    // El fallo silencioso de siempre: devolver `{0,0,0}` en vez de nada deja
    // un avión plantado en mitad del mundo.
    expect(porElCamino([], 500)).toBe(null);
  });
});

describe("y va a una velocidad de avión", () => {
  it("el tráfico del circuito vuela a velocidad de avioneta", () => {
    expect(VUELA_A).toBeGreaterThan(25);
    expect(VUELA_A).toBeLessThan(70);
    // Y por el suelo, a velocidad de rodadura: menos de treinta por hora.
    expect(RUEDA_A * 3.6).toBeLessThan(30);
  });

  it("el circuito grande de un reactor se vuela más deprisa, no más tarde", () => {
    const chico = caminosDe(PISTA, COTA, "izquierda", 1)["otro.enCola"]!;
    const grande = caminosDe(PISTA, COTA, "izquierda", 4)["otro.enCola"]!;
    expect(grande.velocidad).toBeGreaterThan(chico.velocidad * 3);
    // El hueco entre marcas crece con él: es lo que las mantiene a una
    // llamada de distancia sea cual sea el avión.
    expect(grande.metros).toBeGreaterThan(chico.metros);
  });

  it("recorre el camino sin saltos y mirando hacia donde va", () => {
    const m = caminosDe(PISTA, COTA)["otro.final"]!;
    const largo = largoDelCamino(m.camino);
    let antes = porElCamino(m.camino, 0)!;
    for (let d = largo / 60; d <= largo; d += largo / 60) {
      const ahora = porElCamino(m.camino, d)!;
      expect(entre(antes.sitio, ahora.sitio)).toBeLessThan(largo * 0.05);
      antes = ahora;
    }
    // Y al llegar al umbral mira a la pista: el rumbo del último trozo.
    const fin = porElCamino(m.camino, largoDelCamino(m.camino.slice(0, 4)))!;
    const grados = ((fin.rumbo * 180) / Math.PI + 360) % 360;
    expect(Math.abs(grados - PISTA.heading)).toBeLessThan(5);
  });
});

describe("y se va cuando deja de estar en la frecuencia", () => {
  it("el plazo cae entre el hueco más largo y el relevo", () => {
    /*
     * Las dos maneras de equivocarse, y el banco del juego encontró la
     * primera: con un plazo largo, el que terminó su vuelo sigue dibujado
     * cuando llega su relevo y se acumulan —cuatro aviones con dos en la
     * frecuencia—; con uno corto, desaparece a mitad de su propio vuelo.
     */
    expect(SE_VA_A_LOS).toBeGreaterThan(ESPERA_MAXIMA);
    expect(SE_VA_A_LOS).toBeLessThan(ESPERA_ENTRE_VUELOS);
  });
});

describe("y el avión mira hacia donde va", () => {
  /*
   * `porElCamino` devuelve un **rumbo de brújula** —`atan2(dx, -dz)`, la misma
   * cuenta que `rumboHacia`— y girar el modelo hasta ese rumbo pide el ángulo
   * contrario, porque su morro mira a −Z. Confundir los dos números es lo que
   * puso el tráfico a rodar de medio lado.
   *
   * **Y esta prueba llama a `giroDelModelo`, que es lo que usa el dibujo.** La
   * primera versión se calculaba el giro ella misma y por eso pasaba con el
   * fallo puesto y sin él: comprobaba su propia aritmética, no el código.
   */
  const mirandoA = (rumbo: number): [number, number] => {
    const t = giroDelModelo(rumbo);
    return [-Math.sin(t), -Math.cos(t)];
  };

  const casos: ReadonlyArray<readonly [string, number, number]> = [
    ["norte", 0, -1],
    ["este", 1, 0],
    ["sur", 0, 1],
    ["oeste", -1, 0],
    ["sureste", 1, 1],
  ];

  for (const [nombre, dx, dz] of casos) {
    it(`yendo al ${nombre}, el morro apunta al ${nombre}`, () => {
      const paso = porElCamino(
        [
          { x: 0, y: 0, z: 0 },
          { x: dx * 100, y: 0, z: dz * 100 },
        ],
        50,
      );
      expect(paso).not.toBeNull();
      const [mx, mz] = mirandoA(paso!.rumbo);
      const n = Math.hypot(dx, dz);
      expect(mx).toBeCloseTo(dx / n, 5);
      expect(mz).toBeCloseTo(dz / n, 5);
    });
  }
});

describe("al que mandan al aire, desde donde está", () => {
  /*
   * La torre manda al aire al que venía a aterrizar en cuanto la pista pasa a
   * ser tuya, y eso le puede pillar en cualquier punto del circuito. Con el
   * camino de siempre, que sale del umbral, un avión que estaba en el viento
   * en cola aparecía de golpe sobre la cabecera de tu pista, delante de ti.
   */
  const marcas = caminosDe(PISTA, COTA);
  const v = verticesDelCircuito(PISTA, COTA);

  it("sale de donde está y sube hacia arriba del circuito", () => {
    const aqui = alDecir(marcas, "otro.enCola").sitio;
    const m = alAireDesde(marcas["torre.goAround"]!, aqui);
    expect(entre(porElCamino(m.camino, m.metros)!.sitio, aqui)).toBeLessThan(1);
    // Y va a donde iba el de siempre: el final de la subida y la esquina.
    expect(m.camino.slice(1)).toEqual(marcas["torre.goAround"]!.camino.slice(1));
    expect(entre(m.camino[1]!, v[1]!)).toBeLessThan(1);
  });

  it("y dibujado no da el salto: sigue donde estaba al oír la orden", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-ABC", "otro.enCola");
    t.paso(20);
    const antes = t.quienes()[0]!;
    t.anuncia("EC-ABC", "torre.goAround");
    const despues = t.quienes()[0]!;
    expect(entre(antes, despues)).toBeLessThan(1);
    // Mientras que el de siempre habría aparecido en el umbral.
    expect(entre(antes, v[0]!)).toBeGreaterThan(1000);
    t.dispose();
  });
});

describe("sin permiso no se toca la pista", () => {
  /*
   * El avión dibujado volaba el circuito entero y se posaba, autorizado o no.
   * Con la pista tuya la frecuencia no autoriza a nadie, así que el que había
   * cantado viento en cola se quedaba esperando su «cleared to land» y su
   * avión bajaba igual: medido en Gando, a quinientos ochenta metros del
   * umbral y veintitrés de altura, detrás de ti.
   */
  const v = verticesDelCircuito(PISTA, COTA);
  const caminos = trazar(PISTA, COTA)!;
  /** Lo más bajo que pasa sobre el umbral o la pista, m sobre ella. */
  const loMasBajo = (t: ReturnType<typeof crearTrafico>, segundos: number) => {
    let bajo = Infinity;
    const fuera: string[] = [];
    for (let s = 0; s < segundos; s += 0.25) {
      fuera.push(...t.paso(0.25));
      const a = t.quienes()[0];
      if (!a) continue;
      // Solo cerca de la pista: del umbral en adelante, en el eje.
      const along = a.x - v[0]!.x;
      if (along > -200 && along < PISTA.length && Math.abs(a.z - PISTA.z) < 30)
        bajo = Math.min(bajo, a.y - COTA);
    }
    return { bajo, fuera };
  };

  it("la altura de decisión cae en la final, a la de los mínimos", () => {
    const d = porElCamino(caminos.llegada, caminos.decide)!.sitio;
    expect(d.y - COTA).toBeCloseTo(ALTURA_DE_DECISION, 0);
    // Y hasta ahí los dos caminos son el mismo.
    for (const m of [0, caminos.decide / 2, caminos.decide - 1]) {
      const a = porElCamino(caminos.llegada, m)!.sitio;
      const b = porElCamino(caminos.sinPermiso, m)!.sitio;
      expect(entre(a, b), `${m} m`).toBeLessThan(0.01);
      expect(Math.abs(a.y - b.y)).toBeLessThan(0.01);
    }
  });

  it("sin permiso vuela su circuito, y en la decisión se va al aire", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-ABC", "otro.enCola", false);
    const { bajo, fuera } = loMasBajo(t, 400);
    expect(bajo).toBeGreaterThan(ALTURA_DE_DECISION - 1);
    // Y lo avisa una vez, al irse: es lo que la frecuencia tiene que saber.
    expect(fuera).toEqual(["EC-ABC"]);
    t.dispose();
  });

  it("con permiso aterriza, y no avisa de nada", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-ABC", "otro.enCola", false);
    t.paso(3);
    t.anuncia("EC-ABC", "torre.clearedLand", true);
    const { bajo, fuera } = loMasBajo(t, 400);
    expect(bajo).toBeLessThan(3);
    expect(fuera).toEqual([]);
    t.dispose();
  });

  it("y el permiso le llega sin tirones, esté donde esté antes de decidir", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-ABC", "otro.final", false);
    t.paso(10);
    const antes = t.quienes()[0]!;
    t.anuncia("EC-ABC", "torre.clearedLand", true);
    expect(entre(antes, t.quienes()[0]!)).toBeLessThan(0.01);
    t.paso(0.5);
    const luego = t.quienes()[0]!;
    // Sigue hacia la pista, no se ha ido a otro sitio.
    expect(entre(antes, luego)).toBeLessThan(VUELA_A);
    expect(luego.conPermiso).toBe(true);
    t.dispose();
  });

  it("y quien aterriza sigue en la pista hasta que sale por el costado", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-ABC", "otro.final", true);
    let fuera = -1;
    for (let s = 0; s < 400 && fuera < 0; s += 0.5) {
      t.paso(0.5);
      if (!t.sigueEnLaPista("EC-ABC")) fuera = s;
    }
    // Ni se esfuma a medio camino ni sale antes de posarse.
    expect(t.quienes()).toHaveLength(1);
    expect(fuera).toBeGreaterThan(BASE_A_FINAL / VUELA_A);
    const a = t.quienes()[0]!;
    expect(Math.abs(a.z - PISTA.z)).toBeGreaterThan(30);
    expect(Math.abs(a.y - COTA)).toBeLessThan(3);
    // Y al decir «pista libre» ya está donde lo dice: no se le devuelve al asfalto.
    t.anuncia("EC-ABC", "otro.pistaLibre", false);
    expect(entre(a, t.quienes()[0]!)).toBeLessThan(0.01);
    expect(t.sigueEnLaPista("EC-ABC")).toBe(false);
    t.dispose();
  });
});

describe("«en final» se dice en final, y va delante quien se ve delante", () => {
  const caminos = trazar(PISTA, COTA)!;
  /** Lo que tarda en volar de la marca del viento en cola a la final, s. */
  const deColaAFinal =
    (caminos.entra - caminos.marcas["otro.enCola"]!.metros) / VUELA_A;

  it("la frase espera a que el avión haya girado a final", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-ABC", "otro.enCola", true);
    expect(t.todaviaNo("EC-ABC", "otro.final")).toBe(true);
    t.paso(deColaAFinal - 2);
    expect(t.todaviaNo("EC-ABC", "otro.final")).toBe(true);
    t.paso(3);
    expect(t.todaviaNo("EC-ABC", "otro.final")).toBe(false);
    // Y a quien no se ve no se le espera: está donde diga.
    expect(t.todaviaNo("EC-XYZ", "otro.final")).toBe(false);
    t.dispose();
  });

  it("y a quien ya vuela la final, decirlo tarde no lo devuelve atrás", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-ABC", "otro.enCola", true);
    t.paso(deColaAFinal + 15);
    const antes = t.quienes()[0]!;
    t.anuncia("EC-ABC", "otro.final", true);
    expect(entre(antes, t.quienes()[0]!)).toBeLessThan(0.01);
    t.dispose();
  });

  it("cuánto le queda al umbral, solo volando la final o en la pista", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-ABC", "otro.enCola", true);
    // En el viento en cola y en la base, nada: no está en final.
    expect(t.enFinal("EC-ABC")).toBeNull();
    t.paso(deColaAFinal + 1);
    const alEntrar = t.enFinal("EC-ABC")!;
    expect(alEntrar).toBeGreaterThan(1500);
    expect(alEntrar).toBeLessThan(1850);
    t.paso(10);
    expect(t.enFinal("EC-ABC")!).toBeLessThan(alEntrar - VUELA_A * 9);
    // Posado y rodando, cero: está en la pista.
    t.paso(60);
    expect(t.sigueEnLaPista("EC-ABC")).toBe(true);
    expect(t.enFinal("EC-ABC")).toBe(0);
    // Y sin permiso no aterriza: no va delante de nadie.
    const sin = crearTrafico(PISTA, COTA, "ala-alta");
    sin.anuncia("EC-ABC", "otro.enCola", false);
    sin.paso(deColaAFinal + 5);
    expect(sin.enFinal("EC-ABC")).toBeNull();
    sin.dispose();
    t.dispose();
  });
});
