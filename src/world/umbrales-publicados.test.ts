/**
 * **Cada umbral desplazado, contra su AIP** (punto 214), y el número de la
 * pista de La Palma (punto 202).
 *
 * El fichero de La Palma traía cero en las dos cabeceras y el AIP publica
 * cincuenta y dos y ciento cuarenta y dos metros; el de Fuerteventura, los
 * pies de OurAirports pasados a metros. Nada lo vigilaba: el dato se leía con
 * cuidado de punta a punta —ver `umbral-desplazado.test.ts`— pero nadie
 * miraba si era el bueno. Aquí se mira campo por campo contra la tabla de
 * `umbrales-publicados.ts`, que lleva su fuente.
 */

import { describe, expect, it } from "vitest";
import { InstancedMesh } from "three";
import { COLOR_DE_PISTA, colorVisto, createAerodrome, lucesDePista } from "./aerodrome";
import type { Aerodrome, LuzDePista } from "./aerodrome";
import { crearAproximacion } from "./aproximacion";
import { conViento, LA_PALMA, LANZAROTE, PILAR, SCENARIOS } from "./scenarios";
import { cabeceraEnUso } from "./terrain";
import { TIEMPO_DE_CASA } from "./meteo";
import { UMBRALES, umbralPublicado } from "./umbrales-publicados";
import {
  hastaElFinDeToma,
  hastaElUmbralDeToma,
  paraAterrizarDe,
  vistaDesdeLaOtraCabecera,
} from "./umbral-desplazado";

/** Los campos de verdad: los que tienen aeródromo extraído. */
const CAMPOS = SCENARIOS.filter((e) => e.aerodrome);

/** La pista de un escenario operando por esa cabecera, con el viento de cara. */
function porLaCabecera(esc: (typeof CAMPOS)[number], cabecera: string) {
  const base = esc.runway.heading;
  const una = conViento(esc, { ...TIEMPO_DE_CASA, vientoDe: base, vientoKt: 20 });
  const otra = conViento(esc, { ...TIEMPO_DE_CASA, vientoDe: (base + 180) % 360, vientoKt: 20 });
  for (const e of [una, otra]) if (cabeceraEnUso(e) === cabecera) return e.runway;
  return null;
}

describe("el dato de cada fichero es el del AIP", () => {
  it("todos los campos de un AIP están en la tabla, con sus dos cabeceras", () => {
    for (const esc of CAMPOS) {
      const aero = esc.aerodrome!;
      // Yvytu Rape es la pista de la granja: no sale en ningún AIP.
      if (aero.privado) continue;
      for (const pista of aero.runways) {
        for (const nombre of Object.keys(pista.thresholds)) {
          expect(umbralPublicado(aero.id, nombre), `${aero.id} ${nombre}`).not.toBeNull();
        }
      }
    }
  });

  it("y el desplazado del fichero es el publicado, al medio metro", () => {
    let mirados = 0;
    for (const esc of CAMPOS) {
      const aero = esc.aerodrome!;
      for (const pista of aero.runways)
        for (const [nombre, u] of Object.entries(pista.thresholds)) {
          if (!u) continue;
          const publicado = umbralPublicado(aero.id, nombre);
          const esperado = publicado?.desplazado ?? 0;
          expect(u.displacedM ?? 0, `${aero.id} ${nombre}`).toBeCloseTo(esperado, 0);
          mirados++;
        }
    }
    expect(mirados).toBeGreaterThan(30);
  });

  it("los tres que se corrigieron: La Palma, Fuerteventura y Lanzarote", () => {
    expect(UMBRALES.GCLA!["18"]!.desplazado).toBe(52);
    expect(UMBRALES.GCLA!["36"]!.desplazado).toBe(142);
    expect(UMBRALES.GCFV!["01"]!.desplazado).toBe(1000);
    expect(UMBRALES.GCFV!["19"]!.desplazado).toBe(466);
    expect(UMBRALES.GCRR!["03"]!.desplazado).toBe(90);
  });
});

describe("la distancia de aterrizaje del juego es la LDA publicada", () => {
  /*
   * La geometría sale de OpenStreetMap y de OurAirports, y el largo de una
   * pista dibujada no cae al metro con el publicado: en Pilar los umbrales del
   * AIP quedan a 1.447 m uno de otro y la LDA publicada es de 1.440. Treinta
   * metros o el dos por ciento, lo que sea más; lo que esto caza son los cien
   * de La Palma.
   */
  const perdon = (lda: number) => Math.max(30, lda * 0.02);

  for (const esc of CAMPOS) {
    const aero = esc.aerodrome!;
    if (aero.privado) continue;
    const pista = aero.runways[0]!;
    for (const nombre of Object.keys(pista.thresholds)) {
      it(`${aero.id} por la ${nombre}`, () => {
        const p = porLaCabecera(esc, nombre);
        if (!p) return;
        const lda = umbralPublicado(aero.id, nombre)!.lda;
        expect(Math.abs(paraAterrizarDe(p) - lda)).toBeLessThan(perdon(lda));
      });
    }
  }

  it("y vista desde la otra punta, la de la otra cabecera", () => {
    const p36 = porLaCabecera(LA_PALMA, "36")!;
    const p18 = vistaDesdeLaOtraCabecera(p36);
    expect(paraAterrizarDe(p18)).toBeCloseTo(paraAterrizarDe(porLaCabecera(LA_PALMA, "18")!), 0);
  });
});

describe("La Palma: la pista entera del AIP", () => {
  const p36 = porLaCabecera(LA_PALMA, "36")!;
  const p18 = porLaCabecera(LA_PALMA, "18")!;

  it("de punta a punta, los 2.258 m de asfalto: 52 + 2.058 + 142", () => {
    expect(p36.length).toBeGreaterThan(2250);
    expect(p36.length).toBeLessThan(2262);
    // Seis metros de más: las coordenadas del AIP van a la centésima de
    // segundo, y entre las cuatro suman eso.
    expect(Math.abs(paraAterrizarDe(p36) - 2058)).toBeLessThan(10);
    expect(Math.abs(paraAterrizarDe(p18) - 2058)).toBeLessThan(10);
  });

  it("y cada cabecera acaba en el umbral de la otra: lo de detrás no es pista para parar", () => {
    // Por la 36, la pista para aterrizar acaba 52 m antes de la punta norte.
    expect(p36.length / 2 - hastaElFinDeToma(p36)).toBeCloseTo(52, 0);
    expect(p18.length / 2 - hastaElFinDeToma(p18)).toBeCloseTo(142, 0);
    // Y empieza en su umbral desplazado.
    expect(p36.length / 2 - hastaElUmbralDeToma(p36)).toBeCloseTo(142, 0);
  });

  /*
   * **El 202: el número es el del AIP.** Se preguntó si «RW36» estaba mal,
   * con la idea de que la pista corría a 007/187 verdaderos. No: el AIP en
   * vigor (AD 2-GCLA, AIRAC 09/26, 2.12) publica 179,01° GEO / 183° MAG para
   * la 18 y 359,01° GEO / 003° MAG para la 36, con 4° W de declinación
   * (2.2). El número sale del magnético redondeado a la decena: 183 → 18,
   * 003 → 36. Y es el que va pintado en la foto del IGN.
   */
  it("y el número es el del AIP: 359° verdaderos, 003° magnéticos, la 36", () => {
    expect(p36.heading).toBeCloseTo(359.01, 0);
    expect(p18.heading).toBeCloseTo(179.01, 0);
    expect(LA_PALMA.magneticVariation).toBe(4);
    const magnetico = (p36.heading + LA_PALMA.magneticVariation) % 360;
    expect(magnetico).toBeCloseTo(3, 0);
    const designador = Math.round(magnetico / 10) || 36;
    expect(designador).toBe(36);
    expect(Object.keys(LA_PALMA.aerodrome!.runways[0]!.thresholds).sort()).toEqual(["18", "36"]);
  });

  it("los PAPI, donde los dice su MEHT: a algo más de trescientos metros del umbral", () => {
    /*
     * 2.14: 3° y MEHT de 17,64 m en la 36 y 18,15 m en la 18. A tres grados,
     * diecisiete metros y medio sobre el umbral son 335 m hasta las luces; con
     * la pendiente de la pista, algo menos por la 36, que baja hacia el norte,
     * y algo más por la 18. Medidos en la ortofoto: 327 y 316.
     */
    const pista = LA_PALMA.aerodrome!.runways[0]!;
    const ayudas = LA_PALMA.aerodrome!.visualAids ?? [];
    for (const cabecera of ["36", "18"]) {
      const ap = crearAproximacion(pista, cabecera, () => 0, ayudas)!;
      expect(ap.papiAdentro, cabecera).toBeGreaterThan(290);
      expect(ap.papiAdentro, cabecera).toBeLessThan(360);
    }
  });
});

/*
 * **Pilar, la pista nueva del AIP.** La AMDT AIRAC 02/2026 (en vigor desde el
 * 1 de octubre de 2026) la publica de 1.500 × 18 m con el umbral de la 02
 * desplazado sesenta metros, TORA de 1.500 y LDA de 1.440 por las dos
 * cabeceras. El juego seguía con la de la enmienda anterior: 1.200 m entre
 * umbrales, y cero desplazado. Se miró al leer el AIP en vigor de la DINAC,
 * que el 5 de octubre no se pudo bajar.
 */
describe("Pilar: la pista de la AMDT AIRAC 02/2026", () => {
  const p02 = porLaCabecera(PILAR, "02")!;
  const p20 = porLaCabecera(PILAR, "20")!;

  it("de punta a punta, los 1.500 m de hormigón", () => {
    // Siete metros de más: los dos umbrales del AIP van a la centésima de
    // segundo, y quedan a 1.447 m en vez de 1.440.
    expect(Math.abs(p02.length - 1500)).toBeLessThan(10);
  });

  it("por la 02 se aterriza desde los sesenta metros, y por la 20 se acaba en el umbral 02", () => {
    expect(p02.length / 2 - hastaElUmbralDeToma(p02)).toBeCloseTo(60, 0);
    expect(Math.abs(paraAterrizarDe(p02) - 1440)).toBeLessThan(10);
    expect(p20.length / 2 - hastaElFinDeToma(p20)).toBeCloseTo(60, 0);
    expect(Math.abs(paraAterrizarDe(p20) - 1440)).toBeLessThan(10);
  });

  it("y las cotas de los umbrales, las de la enmienda: 187 y 186 ft", () => {
    const u = PILAR.aerodrome!.runways[0]!.thresholds;
    expect(u["02"]!.elevM).toBeCloseTo(56.89, 2);
    expect(u["20"]!.elevM).toBeCloseTo(56.77, 2);
  });
});

describe("las luces de la pista acaban donde acaba la pista para aterrizar", () => {
  const aero = LA_PALMA.aerodrome as Aerodrome;
  const pista = aero.runways[0]!;
  const luces: readonly LuzDePista[] = lucesDePista(pista, () => 0, aero.id);
  const u36 = pista.thresholds["36"]!.xy!;
  const u18 = pista.thresholds["18"]!.xy!;
  const largo = Math.hypot(u18[0] - u36[0], u18[1] - u36[1]);
  const ux = (u18[0] - u36[0]) / largo;
  const uy = (u18[1] - u36[1]) / largo;
  /** Metros desde la punta sur, hacia el norte. */
  const desde36 = (l: LuzDePista) => (l.p[0] - u36[0]) * ux + (-l.p[2] - u36[1]) * uy;
  const ancho = pista.widthM ?? 45;
  const enLaFila = (l: LuzDePista) => {
    const across = -(l.p[0] - u36[0]) * uy + (-l.p[2] - u36[1]) * ux;
    return Math.abs(across) < ancho / 2;
  };
  const { verde, roja } = COLOR_DE_PISTA;

  it("aterrizando por la 36, la roja del final está en el umbral 18, no en la punta", () => {
    // Rodando hacia el norte, a mitad de pista.
    const ojo = { x: (u36[0] + u18[0]) / 2, z: -(u36[1] + u18[1]) / 2 };
    const filaNorte = luces.filter((l) => enLaFila(l) && desde36(l) > largo / 2);
    const rojas = filaNorte.filter((l) => colorVisto(l, ojo) === roja);
    expect(rojas.length).toBeGreaterThan(0);
    for (const l of rojas) expect(largo - desde36(l)).toBeCloseTo(52, -1);
  });

  it("y la misma fila, verde para quien llega por la 18", () => {
    const ojo = { x: u18[0] + ux * 3000, z: -(u18[1] + uy * 3000) };
    const verdes = luces.filter((l) => enLaFila(l) && colorVisto(l, ojo) === verde);
    expect(verdes.length).toBeGreaterThan(0);
    for (const l of verdes) expect(largo - desde36(l)).toBeCloseTo(52, -1);
  });

  it("y en el aeródromo montado también, que es el que se ve", () => {
    const grupo = createAerodrome(aero, 0, { de: 0, kt: 10 });
    let montadas: readonly LuzDePista[] = [];
    grupo.traverse((o) => {
      if (o instanceof InstancedMesh && o.name === "luces-pista")
        montadas = o.userData.luces as readonly LuzDePista[];
    });
    expect(montadas.length).toBe(luces.length);
  });

  it("y en Lanzarote, la 21 acaba en el umbral 03", () => {
    const p21 = porLaCabecera(LANZAROTE, "21")!;
    expect(p21.length / 2 - hastaElFinDeToma(p21)).toBeCloseTo(90, 0);
    const p03 = porLaCabecera(LANZAROTE, "03")!;
    expect(hastaElFinDeToma(p03)).toBeCloseTo(p03.length / 2, 3);
  });
});
