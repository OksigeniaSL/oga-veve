/**
 * El umbral desplazado, de punta a punta: del dato del fichero a la senda, el
 * embudo, las luces, el circuito, el tráfico y la pintura.
 *
 * El dato estaba en los ficheros desde que se extrajeron —`displacedM`, la 01
 * de Fuerteventura a 1001 m de la punta— y no lo leía nadie: el avión del banco
 * tocaba a ciento cincuenta metros de la punta, en la zona de las flechas, y el
 * juego lo celebraba. Aquí se mide sobre lo que se construye, en metros desde
 * la punta, que es lo único que no se puede discutir.
 */

import { describe, expect, it } from "vitest";
import { InstancedMesh, Mesh } from "three";
import gcfv from "../../data/aerodromes/gcfv.aero.json";
import {
  COLOR_DE_PISTA,
  colorVisto,
  createAerodrome,
  type Aerodrome,
  type LuzDePista,
} from "./aerodrome";
import { crearAproximacion } from "./aproximacion";
import { campoDeCasa, umbralEnUso } from "./campo-del-vuelo";
import { BASE_A_FINAL, verticesDelCircuito } from "./circuito";
import {
  ENTRADA_EN_FINAL,
  enElEmbudoDeFinal,
  FIRST_RING_DISTANCE,
  RunwayGuide,
} from "./runway-guide";
import { enEjesDePista, puntoDePista } from "./rumbo";
import { conViento, FUERTEVENTURA, GRAN_CANARIA } from "./scenarios";
import { caminosDe } from "./trafico";
import {
  antesDelUmbralDeToma,
  desplazadoDe,
  hastaElUmbralDeToma,
  sobreDondeSeToca,
} from "./umbral-desplazado";

const AERO = gcfv as unknown as Aerodrome;
/** Con el viento de la 01, que es con el que se opera casi siempre. */
const POR_LA_01 = conViento(FUERTEVENTURA, {
  vientoDe: 25,
  vientoKt: 20,
} as never);
/** Y con viento del sur, por la 19. */
const POR_LA_19 = conViento(FUERTEVENTURA, {
  vientoDe: 200,
  vientoKt: 20,
} as never);

/** Metros desde la punta de la cabecera en uso, a lo largo del eje. */
function desdeLaPunta(
  pista: { x: number; z: number; heading: number; length: number },
  x: number,
  z: number,
): number {
  return enEjesDePista(x, z, pista.x, pista.z, pista.heading).along + pista.length / 2;
}

describe("el dato: dónde empieza la pista para aterrizar", () => {
  it("la 01 de Fuerteventura, a mil metros de la punta; la 19, a 460", () => {
    expect(POR_LA_01.runway.heading).toBeLessThan(10);
    expect(POR_LA_01.runway.desplazado).toBeCloseTo(1001.3, 1);
    expect(POR_LA_01.runway.desplazadoEnfrente).toBeCloseTo(460.2, 1);
    expect(POR_LA_19.runway.heading).toBeGreaterThan(170);
    expect(POR_LA_19.runway.desplazado).toBeCloseTo(460.2, 1);
    expect(POR_LA_19.runway.desplazadoEnfrente).toBeCloseTo(1001.3, 1);
  });

  it("y donde el fichero no lo trae, todo sigue como estaba", () => {
    expect(desplazadoDe(GRAN_CANARIA.runway)).toBe(0);
    expect(hastaElUmbralDeToma(GRAN_CANARIA.runway)).toBe(
      GRAN_CANARIA.runway.length / 2,
    );
  });

  it("y un dato roto no manda el umbral a la otra punta", () => {
    expect(desplazadoDe({ length: 1000, desplazado: 5000 })).toBe(500);
    expect(desplazadoDe({ length: 1000, desplazado: -30 })).toBe(0);
    expect(desplazadoDe({ length: 1000, desplazado: Number.NaN })).toBe(0);
  });
});

describe("tocar: antes o después de la barra", () => {
  const r = POR_LA_01.runway;
  const punta = -r.length / 2;

  it("en las flechas es antes del umbral; pasada la barra, no", () => {
    expect(antesDelUmbralDeToma(r, punta + 150, r.heading)).toBe(true);
    expect(antesDelUmbralDeToma(r, punta + 1000, r.heading)).toBe(true);
    expect(antesDelUmbralDeToma(r, punta + 1010, r.heading)).toBe(false);
    expect(antesDelUmbralDeToma(r, 0, r.heading)).toBe(false);
  });

  it("y quien entra por la otra punta mira el umbral de la otra punta", () => {
    const vuelta = r.heading + 180;
    // La 19 tiene 460 m desplazados, en el otro extremo.
    expect(antesDelUmbralDeToma(r, -punta - 300, vuelta)).toBe(true);
    expect(antesDelUmbralDeToma(r, -punta - 500, vuelta)).toBe(false);
    // Y las flechas de la 01 son pista de sobra para quien va hacia allá.
    expect(antesDelUmbralDeToma(r, punta + 150, vuelta)).toBe(false);
  });

  it("«ya podés tocar» sale de la barra en adelante, no sobre las flechas", () => {
    /*
     * La final baja de la revisión: a 250 m de la barra y a diez metros, el
     * aviso salía ahí mismo, el avión tocaba antes de la barra y le decían
     * «corto». Con margen, cualquier punto de las flechas puede ser «tocá».
     */
    const barra = punta + desplazadoDe(r);
    for (const antes of [1, 12, 72, 248, 278, 700])
      expect(sobreDondeSeToca(r, barra - antes, r.heading), `${antes} m`).toBe(
        false,
      );
    expect(sobreDondeSeToca(r, barra, r.heading)).toBe(true);
    expect(sobreDondeSeToca(r, barra + 150, r.heading)).toBe(true);
    // Y hasta la otra punta, no más allá.
    expect(sobreDondeSeToca(r, -punta - 1, r.heading)).toBe(true);
    expect(sobreDondeSeToca(r, -punta + 50, r.heading)).toBe(false);
  });

  it("y sin desplazado, del umbral en adelante: antes está el campo", () => {
    const gc = GRAN_CANARIA.runway;
    const umbral = -gc.length / 2;
    expect(sobreDondeSeToca(gc, umbral - 250, gc.heading)).toBe(false);
    expect(sobreDondeSeToca(gc, umbral - 1, gc.heading)).toBe(false);
    expect(sobreDondeSeToca(gc, umbral + 1, gc.heading)).toBe(true);
  });

  it("y quien entra por la 19 cuenta desde la barra de la 19", () => {
    const vuelta = r.heading + 180;
    // La 19 tiene 460 m desplazados en la otra punta.
    expect(sobreDondeSeToca(r, -punta - 300, vuelta)).toBe(false);
    expect(sobreDondeSeToca(r, -punta - 500, vuelta)).toBe(true);
  });
});

describe("la final apunta a donde se toca", () => {
  const r = POR_LA_01.runway;

  it("el umbral en uso es el de aterrizar", () => {
    const [x, z] = umbralEnUso(campoDeCasa(POR_LA_01));
    expect(desdeLaPunta(r, x, z)).toBeCloseTo(1001, -1);
  });

  it("el embudo mide hasta él, también por encima de las flechas", () => {
    const [x, z] = puntoDePista(r, hastaElUmbralDeToma(r) + 3000);
    expect(enElEmbudoDeFinal(r, x, z)).toBeCloseTo(3000, 0);
    // Doscientos metros antes de la punta quedan mil doscientos a la barra.
    const [lx, lz] = puntoDePista(r, r.length / 2 + 200);
    expect(enElEmbudoDeFinal(r, lx, lz)).toBeCloseTo(1201, -1);
    // Y el embudo acaba donde acababa, contado desde la barra.
    const [ex, ez] = puntoDePista(r, hastaElUmbralDeToma(r) + ENTRADA_EN_FINAL + 50);
    expect(enElEmbudoDeFinal(r, ex, ez)).toBeNull();
    // Y sobre las flechas **todavía** se está en final: se vuela por encima
    // de ellas hacia la barra, que es donde se toca.
    const [fx, fz] = puntoDePista(r, r.length / 2 - 300);
    expect(enElEmbudoDeFinal(r, fx, fz)).toBeCloseTo(701, -1);
    // Pasada la barra, ya no.
    const [px, pz] = puntoDePista(r, hastaElUmbralDeToma(r) - 50);
    expect(enElEmbudoDeFinal(r, px, pz)).toBeNull();
  });

  it("los aros empiezan contados desde la barra", () => {
    const guia = new RunwayGuide(POR_LA_01, 0, () => 0);
    const [x, z] = guia.dondeEmpieza!;
    expect(desdeLaPunta(r, x, z)).toBeCloseTo(1001 - FIRST_RING_DISTANCE, -1);
  });

  it("el circuito entra en final a su distancia de la barra, y despega de la punta", () => {
    const v = verticesDelCircuito(r, 0);
    const salida = v[0]!;
    const entrada = v[4]!;
    expect(desdeLaPunta(r, salida.x, salida.z)).toBeCloseTo(0, 0);
    expect(desdeLaPunta(r, entrada.x, entrada.z)).toBeCloseTo(1001 - BASE_A_FINAL, -1);
  });

  it("y el tráfico que llega se posa pasada la barra", () => {
    const marcas = caminosDe(r, 0);
    const camino = Object.values(marcas).find((m) => m.camino.length === 6)!
      .camino;
    // [lejos, esquina, entrada, umbral de aterrizar, toma, salida]
    const aterriza = camino[3]!;
    const toma = camino[4]!;
    expect(desdeLaPunta(r, aterriza.x, aterriza.z)).toBeCloseTo(1001, -1);
    expect(desdeLaPunta(r, toma.x, toma.z)).toBeGreaterThan(1001);
  });
});

describe("las luces de aproximación y el PAPI, en el umbral de aterrizar", () => {
  const pista = AERO.runways[0]!;
  const u01 = pista.thresholds["01"]!.xy!;
  const u19 = pista.thresholds["19"]!.xy!;
  const largo = Math.hypot(u19[0] - u01[0], u19[1] - u01[1]);
  const ux = (u19[0] - u01[0]) / largo;
  const uy = (u19[1] - u01[1]) / largo;
  /** Metros desde la punta de la 01, pista adentro, de un punto del mundo. */
  const desde01 = (x: number, z: number) =>
    (x - u01[0]) * ux + (-z - u01[1]) * uy;

  it("la fila de luces acaba en la barra y el PAPI está pista adentro de ella", () => {
    const ap = crearAproximacion(pista, "01", () => 0)!;
    expect(ap).not.toBeNull();
    const fila = ap.grupo.getObjectByName("luces-aproximacion") as InstancedMesh;
    const papi = ap.grupo.getObjectByName("papi") as InstancedMesh;
    const m = new Mesh().matrix;
    let masCerca = -Infinity;
    for (let i = 0; i < fila.count; i++) {
      fila.getMatrixAt(i, m);
      masCerca = Math.max(masCerca, desde01(m.elements[12]!, m.elements[14]!));
    }
    // La fila va por delante del umbral de aterrizar, hasta treinta metros.
    expect(masCerca).toBeCloseTo(1001 - 30, -1);
    papi.getMatrixAt(0, m);
    expect(desde01(m.elements[12]!, m.elements[14]!)).toBeCloseTo(1001 + 300, -1);
    // Y la senda se cuenta desde ahí: trescientos metros pasada la barra.
    expect(ap.papiAdentro).toBeCloseTo(300, 0);
  });
});

describe("la pintura: flechas, barra, y lo de aterrizar pasada la barra", () => {
  const pista = AERO.runways[0]!;
  const u01 = pista.thresholds["01"]!.xy!;
  const u19 = pista.thresholds["19"]!.xy!;
  const largo = Math.hypot(u19[0] - u01[0], u19[1] - u01[1]);
  const ux = (u19[0] - u01[0]) / largo;
  const uy = (u19[1] - u01[1]) / largo;
  const ancho = pista.widthM ?? 45;
  const ejes = (x: number, z: number) => {
    const dx = x - u01[0];
    const dy = -z - u01[1];
    return { along: dx * ux + dy * uy, across: -dx * uy + dy * ux };
  };
  const grupo = createAerodrome(AERO, 0, { de: 25, kt: 20 });
  const pintura: { along: number; across: number }[] = [];
  const numeros: { along: number }[] = [];
  let luces: readonly LuzDePista[] = [];
  grupo.traverse((o) => {
    if (o instanceof Mesh && o.name === "pintura") {
      const pos = o.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++)
        pintura.push(ejes(pos.getX(i), pos.getZ(i)));
    }
    if (o instanceof Mesh && o.name === "designador") {
      o.geometry.computeBoundingBox();
      const c = o.geometry.boundingBox!.getCenter(new Mesh().position);
      numeros.push(ejes(c.x, c.z));
    }
    if (o instanceof InstancedMesh && o.name === "luces-pista")
      luces = o.userData.luces as readonly LuzDePista[];
  });
  /** Un ojo a `m` metros por fuera de una punta, en su eje. */
  const fueraDe = (u: readonly [number, number], hacia: -1 | 1, m: number) => ({
    x: u[0] + ux * hacia * m,
    z: -(u[1] + uy * hacia * m),
  });
  /** Lo que se ve desde ahí, con su sitio a lo largo de la pista. */
  const vistoDesde = (ojo: { x: number; z: number }) =>
    luces
      .map((l) => ({ ...ejes(l.p[0], l.p[2]), color: colorVisto(l, ojo) }))
      .filter((l) => l.color !== null);
  const { verde, roja, ambar } = COLOR_DE_PISTA;

  it("la barra blanca cruza la pista donde empieza la parte en la que se toca", () => {
    const enLaBarra = pintura.filter(
      (p) => Math.abs(p.along - 1001.3) < 2.5 && Math.abs(p.across) > ancho * 0.4,
    );
    expect(enLaBarra.length).toBeGreaterThan(0);
    // Y la de la 19, a 460 de su punta.
    const enLaOtra = pintura.filter(
      (p) =>
        Math.abs(p.along - (largo - 460.2)) < 2.5 && Math.abs(p.across) > ancho * 0.4,
    );
    expect(enLaOtra.length).toBeGreaterThan(0);
  });

  it("antes de la barra, flechas por el eje y ni punto de toma ni teclas de piano", () => {
    const enElEje = pintura.filter(
      (p) => p.along > 30 && p.along < 970 && Math.abs(p.across) < 3,
    );
    expect(enElEje.length).toBeGreaterThan(0);
    // Lo que va a un lado del eje en la zona de las flechas son solo las
    // puntas de flecha junto a la barra y las líneas de borde. Con margen: la
    // pintura va sobre el eje del pavimento, que se aparta un par de metros
    // de la recta entre umbrales, y la flecha mide cuatro y medio de ancho.
    const aUnLado = pintura.filter(
      (p) =>
        p.along > 30 &&
        p.along < 950 &&
        Math.abs(p.across) > 6.5 &&
        Math.abs(p.across) < ancho / 2 - 5,
    );
    expect(aUnLado).toEqual([]);
  });

  it("el número va a cien metros de la barra, no de la punta", () => {
    const cerca01 = Math.min(...numeros.map((n) => n.along));
    const cerca19 = Math.max(...numeros.map((n) => n.along));
    expect(cerca01).toBeCloseTo(1001 + 100, -1);
    expect(cerca19).toBeCloseTo(largo - 460 - 100, -1);
  });

  /*
   * **Y las luces, leídas desde cada punta como en el AIP.** Fuerteventura
   * publica el balizamiento de borde de la 01 como «1000 m red + 1806 m white
   * + 600 m yellow» y el de la 19 como «466 m red + 2340 m white + 600 m
   * yellow»: la misma fila, vista desde cada aproximación. Se pintaban con un
   * color fijo según la cabecera en uso, y llegando por la otra se veía el
   * rojo de «aquí se acaba» delante del morro.
   */
  it("desde la final de la 01: verde en su barra, rojo antes y ámbar al fondo", () => {
    const visto = vistoDesde(fueraDe(u01, -1, 5000));
    const verdes = visto.filter((l) => l.color === verde);
    expect(verdes.length).toBeGreaterThan(0);
    for (const v of verdes) expect(v.along).toBeCloseTo(1001, -1);
    // Las de borde de la zona desplazada, rojas vistas desde la aproximación.
    const bordes = visto.filter((l) => Math.abs(l.across) > ancho / 2);
    for (const b of bordes.filter((l) => l.along < 990))
      expect(b.color, `borde a ${Math.round(b.along)} m`).toBe(roja);
    for (const b of bordes.filter((l) => l.along > largo - 590))
      expect(b.color, `borde a ${Math.round(b.along)} m`).toBe(ambar);
    // Y la fila de la punta de enfrente, roja: ahí se acaba el asfalto.
    const alFondo = visto.filter((l) => l.along > largo - 5 && Math.abs(l.across) < ancho / 2);
    expect(alFondo.length).toBeGreaterThan(0);
    for (const l of alFondo) expect(l.color).toBe(roja);
    // Y ni una roja en la punta de la 01: esa fila mira hacia dentro.
    expect(visto.filter((l) => l.along < 5 && Math.abs(l.across) < ancho / 2)).toEqual([]);
  });

  it("y desde la final de la 19, lo mismo desde su punta: sin contradicción", () => {
    const visto = vistoDesde(fueraDe(u19, 1, 5000));
    const verdes = visto.filter((l) => l.color === verde);
    expect(verdes.length).toBeGreaterThan(0);
    for (const v of verdes) expect(v.along).toBeCloseTo(largo - 460, -1);
    const bordes = visto.filter((l) => Math.abs(l.across) > ancho / 2);
    for (const b of bordes.filter((l) => l.along > largo - 450))
      expect(b.color, `borde a ${Math.round(b.along)} m`).toBe(roja);
    for (const b of bordes.filter((l) => l.along < 590))
      expect(b.color, `borde a ${Math.round(b.along)} m`).toBe(ambar);
    // Ni el verde de la 01, que mira al sur, ni ámbar a la entrada.
    expect(verdes.some((v) => v.along < largo / 2)).toBe(false);
    expect(bordes.some((b) => b.color === ambar && b.along > largo / 2)).toBe(false);
  });

  it("y rodando hacia una punta, su fila se ve roja: ahí se acaba", () => {
    // En la pista, a mitad, mirando hacia la 19: la fila del fondo es roja.
    const enMedio = { x: (u01[0] + u19[0]) / 2, z: -(u01[1] + u19[1]) / 2 };
    const visto = vistoDesde(enMedio);
    const filaNorte = visto.filter((l) => l.along > largo - 5 && Math.abs(l.across) < ancho / 2);
    const filaSur = visto.filter((l) => l.along < 5 && Math.abs(l.across) < ancho / 2);
    expect(filaNorte.length).toBeGreaterThan(0);
    expect(filaSur.length).toBeGreaterThan(0);
    for (const l of [...filaNorte, ...filaSur]) expect(l.color).toBe(roja);
  });
});
