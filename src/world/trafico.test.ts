/**
 * Que el avión que se oye esté donde dice estar.
 *
 * Es la única propiedad que este módulo tiene que cumplir, y todo lo demás
 * cuelga de ella: si la radio canta «en final» y no hay nadie en final, lo que
 * se ha enseñado es que la radio miente.
 */
import { describe, expect, it } from "vitest";
import {
  ENTRE_MARCAS,
  RUEDA_A,
  VUELA_A,
  caminosDe,
  largoDelCamino,
  porElCamino,
} from "./trafico";
import { verticesDelCircuito, type Pista } from "./circuito";

const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 1800 };
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
      Math.min(m.metros + m.velocidad * ENTRE_MARCAS, m.tope ?? Infinity),
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
    const luego = porElCamino(m.camino, m.metros + m.velocidad * ENTRE_MARCAS)!;
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
    // A un pelo de la entrada en final: la marca cae ahí sin habérselo pedido.
    expect(entre(donde, v[4]!)).toBeLessThan(400);
    expect(donde.y).toBeGreaterThan(COTA + 40);
    expect(donde.y).toBeLessThan(COTA + 200);
  });

  it("y el que deja la pista lo hace por un costado, no por el eje", () => {
    const m = marcas["otro.pistaLibre"]!;
    const toma = porElCamino(m.camino, m.metros)!.sitio;
    expect(entre(toma, v[0]!)).toBeLessThan(5);
    const fuera = porElCamino(m.camino, m.metros + m.velocidad * ENTRE_MARCAS)!;
    expect(Math.abs(fuera.sitio.z - PISTA.z)).toBeGreaterThan(30);
    expect(Math.abs(fuera.sitio.y - COTA)).toBeLessThan(3);
  });

  it("y entre una llamada y la siguiente no se salta ningún trozo", () => {
    /*
     * La propiedad que sostiene el módulo: cada marca cae donde deja la
     * anterior tras un hueco de radio. Con las marcas puestas a ojo, el avión
     * daría un salto de un kilómetro a la vista de quien lo esté siguiendo.
     */
    for (const [antes, luego] of [
      ["otro.enCola", "otro.final"],
      ["otro.final", "otro.pistaLibre"],
    ] as const) {
      const a = marcas[antes]!;
      const donde = porElCamino(
        a.camino,
        a.metros + a.velocidad * ENTRE_MARCAS,
      )!;
      const salto = entre(donde.sitio, alDecir(marcas, luego).sitio);
      expect(salto, `${antes} → ${luego}`).toBeLessThan(200);
    }
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
