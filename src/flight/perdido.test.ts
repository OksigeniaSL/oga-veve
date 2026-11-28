/**
 * El niño que se pierde lejos o se mete mar adentro: cuándo se ha perdido,
 * cuándo se vuelve a decir y hacia dónde vira el automático al tocar la
 * flecha. Ver `flight/perdido.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  apuntaAUnCampo,
  CERCA,
  cercaDeUnCampo,
  LEJOS,
  MAR_ADENTRO,
  Perdido,
  rumboDeVuelta,
  VUELTA,
  type LoQueVeLaVuelta,
} from "./perdido";
import { mandosPara, memoriaNueva, porElLadoCorto } from "./piloto-automatico";
import { aircraftById } from "./aircraft";
import { alcanceDelCircuito, escalaDelCircuitoDe, verticesDelCircuito } from "../world/circuito";
import { scenarioById } from "../world/scenarios";

const GRADO = Math.PI / 180;

/** Volando lejos sobre tierra, con la aguja justo detrás. */
const lejosYDeEspaldas = (cambios: Partial<LoQueVeLaVuelta> = {}): LoQueVeLaVuelta => ({
  enElAire: true,
  atiende: true,
  alCampoMasCercano: LEJOS + 500,
  relativo: 180 * GRADO,
  haciaUnCampo: false,
  sobreElMar: false,
  ...cambios,
});

describe("se ha perdido", () => {
  it("lejos de todo campo y con la aguja detrás: se ha perdido, y se dice una vez", () => {
    const p = new Perdido();
    expect(p.paso(lejosYDeEspaldas())).toEqual({ perdido: true, decirlo: true });
    // El paso siguiente sigue perdido, pero ya no se dice.
    expect(p.paso(lejosYDeEspaldas())).toEqual({ perdido: true, decirlo: false });
  });

  it("con la aguja delante no está perdido, aunque esté lejos: es quien cruza a otra isla", () => {
    const p = new Perdido();
    expect(p.paso(lejosYDeEspaldas({ relativo: 20 * GRADO })).perdido).toBe(false);
    expect(p.paso(lejosYDeEspaldas({ relativo: 80 * GRADO })).perdido).toBe(false);
  });

  it("volviéndose a medio camino hacia otro campo no está perdido: renunciar es ganar", () => {
    const p = new Perdido();
    expect(p.paso(lejosYDeEspaldas({ haciaUnCampo: true })).perdido).toBe(false);
  });

  it("sobre tierra cuenta desde diez kilómetros; sobre el mar, desde cinco", () => {
    const tierra = new Perdido();
    expect(tierra.paso(lejosYDeEspaldas({ alCampoMasCercano: MAR_ADENTRO + 500 })).perdido).toBe(false);
    const mar = new Perdido();
    expect(
      mar.paso(lejosYDeEspaldas({ alCampoMasCercano: MAR_ADENTRO + 500, sobreElMar: true })),
    ).toEqual({ perdido: true, decirlo: true });
  });

  it("en tierra, o en una misión o un ejercicio, no hay nada perdido", () => {
    expect(new Perdido().paso(lejosYDeEspaldas({ enElAire: false })).perdido).toBe(false);
    expect(new Perdido().paso(lejosYDeEspaldas({ atiende: false })).perdido).toBe(false);
  });

  it("deja de estarlo con la aguja otra vez delante, y no a medio viraje", () => {
    const p = new Perdido();
    p.paso(lejosYDeEspaldas());
    // A setenta grados todavía late: así virando no se enciende y apaga.
    expect(p.paso(lejosYDeEspaldas({ relativo: 70 * GRADO })).perdido).toBe(true);
    expect(p.paso(lejosYDeEspaldas({ relativo: 30 * GRADO })).perdido).toBe(false);
  });
});

describe("el aviso no vuelve por reloj", () => {
  it("perdido una hora sin cambiar nada, se dice una sola vez", () => {
    const p = new Perdido();
    let dichas = 0;
    for (let i = 0; i < 60 * 60 * 60; i++) if (p.paso(lejosYDeEspaldas()).decirlo) dichas++;
    expect(dichas).toBe(1);
  });

  it("dando vueltas en círculo lejos de todo, no se repite a cada vuelta", () => {
    const p = new Perdido();
    let dichas = 0;
    // Un círculo de un kilómetro de radio a quince kilómetros del campo: la
    // aguja pasa por delante y por detrás en cada vuelta.
    for (let vuelta = 0; vuelta < 10; vuelta++)
      for (let a = 0; a < 360; a += 2) {
        const r = (a * Math.PI) / 180;
        dichas += p.paso(
          lejosYDeEspaldas({
            alCampoMasCercano: 15_000 + 1_000 * Math.cos(r),
            relativo: porElLadoCorto(0, r),
          }),
        ).decirlo
          ? 1
          : 0;
      }
    expect(dichas).toBe(1);
  });

  it("se vuelve a decir si se volvió de verdad hacia casa y se vuelve a perder", () => {
    const p = new Perdido();
    expect(p.paso(lejosYDeEspaldas({ alCampoMasCercano: 20_000 })).decirlo).toBe(true);
    // Se da la vuelta y vuela hacia el campo, más de `VUELTA` más cerca…
    p.paso(lejosYDeEspaldas({ alCampoMasCercano: 20_000, relativo: 0 }));
    p.paso(lejosYDeEspaldas({ alCampoMasCercano: 20_000 - VUELTA - 100, relativo: 0 }));
    // …y se vuelve a alejar: otra vez perdido, y otra vez dicho.
    expect(p.paso(lejosYDeEspaldas({ alCampoMasCercano: 20_000 - VUELTA - 100 }))).toEqual({
      perdido: true,
      decirlo: true,
    });
  });

  it("si solo se dio la vuelta un momento, sin acercarse, no se repite", () => {
    const p = new Perdido();
    p.paso(lejosYDeEspaldas({ alCampoMasCercano: 20_000 }));
    p.paso(lejosYDeEspaldas({ alCampoMasCercano: 20_000, relativo: 0 }));
    expect(p.paso(lejosYDeEspaldas({ alCampoMasCercano: 20_500 }))).toEqual({
      perdido: true,
      decirlo: false,
    });
  });

  it("volver cerca del campo, o aterrizar, lo olvida", () => {
    const cerca = new Perdido();
    cerca.paso(lejosYDeEspaldas());
    cerca.paso(lejosYDeEspaldas({ alCampoMasCercano: CERCA - 100, relativo: 0 }));
    expect(cerca.paso(lejosYDeEspaldas()).decirlo).toBe(true);
    const tierra = new Perdido();
    tierra.paso(lejosYDeEspaldas());
    tierra.paso(lejosYDeEspaldas({ enElAire: false }));
    expect(tierra.paso(lejosYDeEspaldas()).decirlo).toBe(true);
  });
});

/**
 * **Un circuito entero, tramo a tramo**, como lo vuela el banco: de la
 * cabecera por la subida, el viento cruzado, el viento en cola alargado
 * `alargado` metros, la base y la final, y otra vez a la pista, que es irse al
 * aire. Cada `PASO_DEL_CIRCUITO` metros, con el rumbo del tramo y la aguja al
 * umbral, que es a donde señala en una vuelta al campo. Todo sobre el mar: lo
 * peor que le puede tocar.
 */
const PASO_DEL_CIRCUITO = 50;
function vueltasAlCampo(
  avionId: string,
  campoId: string,
  vueltas: number,
  alargado = 0,
): { vistas: LoQueVeLaVuelta[]; suCircuito: number; lejos: number } {
  const pista = scenarioById(campoId).runway;
  // Con la senda de tres grados, que es la de estos campos.
  const escala = escalaDelCircuitoDe(aircraftById(avionId));
  const [cabecera, fin, allá, base, entrada] = verticesDelCircuito(pista, 0, "izquierda", escala);
  // La base y la entrada en final, más allá por lo que se alargue el viento en cola.
  const h = (pista.heading * Math.PI) / 180;
  const atras = (p: { x: number; z: number }) => ({ x: p.x - Math.sin(h) * alargado, z: p.z + Math.cos(h) * alargado });
  const linea = [cabecera!, fin!, allá!, atras(base!), atras(entrada!), cabecera!];
  const vistas: LoQueVeLaVuelta[] = [];
  let lejos = 0;
  for (let v = 0; v < vueltas; v++)
    for (let i = 1; i < linea.length; i++) {
      const a = linea[i - 1]!;
      const b = linea[i]!;
      const largo = Math.hypot(b.x - a.x, b.z - a.z);
      const rumbo = Math.atan2(b.x - a.x, -(b.z - a.z));
      for (let s = 0; s < largo; s += PASO_DEL_CIRCUITO) {
        const x = a.x + ((b.x - a.x) * s) / largo;
        const z = a.z + ((b.z - a.z) * s) / largo;
        const d = Math.hypot(x - pista.x, z - pista.z);
        lejos = Math.max(lejos, d);
        vistas.push({
          enElAire: true,
          atiende: true,
          alCampoMasCercano: d,
          relativo: porElLadoCorto(rumbo, rumboDeVuelta({ x, z }, cabecera!)),
          haciaUnCampo: apuntaAUnCampo({ x, z, rumbo }, [pista]),
          sobreElMar: true,
        });
      }
    }
  return { vistas, suCircuito: alcanceDelCircuito(pista, escala), lejos };
}

describe("el circuito no es perderse (H111)", () => {
  /** Las veces que se diría «nos alejamos mucho del campo» volando esto. */
  const dichas = (vistas: readonly LoQueVeLaVuelta[], suCircuito?: number): number => {
    const p = new Perdido();
    let n = 0;
    for (const v of vistas) if (p.paso(suCircuito === undefined ? v : { ...v, suCircuito }).decirlo) n++;
    return n;
  };

  it("el JAZ 110 en La Palma: tres vueltas, con la final a 4,6 km como la del banco, y ni una vez", () => {
    // La base del banco entró en final a 4,6 km del umbral: seiscientos metros más allá que la figura.
    const { vistas, suCircuito, lejos } = vueltasAlCampo("jaz-110", "la-palma", 3, 600);
    // Su circuito se va más allá de lo que era mar adentro para la avioneta…
    expect(lejos).toBeGreaterThan(MAR_ADENTRO);
    // …y contado con el de la avioneta, sonaba en cada vuelta, como en el banco.
    expect(dichas(vistas)).toBeGreaterThanOrEqual(3);
    expect(dichas(vistas, suCircuito)).toBe(0);
  });

  it("y lo mismo los demás reactores y los campos largos, en cualquier campo", () => {
    for (const avion of ["jaz-60", "jaz-90", "jaz-110", "jaz-120"])
      for (const campo of ["la-palma", "tenerife-norte", "gran-canaria", "pettirossi"]) {
        const { vistas, suCircuito } = vueltasAlCampo(avion, campo, 2, 600);
        expect(dichas(vistas, suCircuito), `${avion} en ${campo}`).toBe(0);
      }
  });

  it("pero pasado su circuito, mar adentro y de espaldas al campo, el reactor sí se ha perdido", () => {
    const { suCircuito } = vueltasAlCampo("jaz-110", "la-palma", 1);
    const p = new Perdido();
    const fuera = cercaDeUnCampo(suCircuito) + MAR_ADENTRO - CERCA;
    expect(p.paso(lejosYDeEspaldas({ alCampoMasCercano: fuera - 500, sobreElMar: true, suCircuito })).perdido).toBe(false);
    expect(p.paso(lejosYDeEspaldas({ alCampoMasCercano: fuera + 500, sobreElMar: true, suCircuito }))).toEqual({
      perdido: true,
      decirlo: true,
    });
  });

  it("la avioneta, como estaba: su circuito cabe en CERCA casi entero, y a nueve km al norte de Los Rodeos se pierde", () => {
    const { suCircuito, vistas } = vueltasAlCampo("jaz-20", "tenerife-norte", 2);
    // Con la pista más larga de las islas, lo cerca crece menos de un kilómetro.
    expect(cercaDeUnCampo(suCircuito) - CERCA).toBeLessThan(1_000);
    expect(dichas(vistas, suCircuito)).toBe(0);
    // El caso de `scripts/ver-perdido.mjs`: nueve kilómetros mar adentro, de espaldas.
    expect(
      new Perdido().paso(lejosYDeEspaldas({ alCampoMasCercano: 9_000, sobreElMar: true, suCircuito })),
    ).toEqual({ perdido: true, decirlo: true });
  });
});

describe("si el morro apunta a un campo", () => {
  const avion = { x: 0, z: 0, rumbo: 0 };
  it("un campo delante, a menos de treinta grados, cuenta", () => {
    // Al norte es −z: ver `rumboHacia`.
    expect(apuntaAUnCampo(avion, [{ x: 2_000, z: -10_000 }])).toBe(true);
  });
  it("uno de lado o detrás, no", () => {
    expect(apuntaAUnCampo(avion, [{ x: 10_000, z: 0 }, { x: 0, z: 10_000 }])).toBe(false);
  });
});

describe("un toque y el avión vira hacia el campo", () => {
  it("la ventanilla HDG lleva el rumbo hacia la aguja", () => {
    // El campo al este del avión: rumbo noventa.
    expect(rumboDeVuelta({ x: 0, z: 0 }, { x: 10_000, z: 0 })).toBeCloseTo(90 * GRADO, 6);
    // Y al sur: ciento ochenta.
    expect(Math.abs(rumboDeVuelta({ x: 0, z: 0 }, { x: 0, z: 10_000 }))).toBeCloseTo(180 * GRADO, 6);
  });

  it("y el automático, con ese rumbo, inclina el ala hacia el lado de la aguja", () => {
    const estado = {
      heading: 0,
      alabeo: 0,
      cabeceo: 0,
      altitud: 900,
      vertical: 0,
      velocidad: 55,
      gas: 0.6,
      verdadera: 57,
      ritmoDeCabeceo: 0,
    };
    // El campo a la derecha y algo detrás: vira a la derecha, por el lado corto.
    const derecha = rumboDeVuelta({ x: 0, z: 0 }, { x: 10_000, z: 4_000 });
    const memoria = memoriaNueva();
    let mandos = mandosPara(estado, { rumbo: derecha, altitud: null, velocidad: null }, 1 / 60, memoria);
    for (let i = 0; i < 60; i++)
      mandos = mandosPara(estado, { rumbo: derecha, altitud: null, velocidad: null }, 1 / 60, memoria);
    expect(mandos.aileron).toBeGreaterThan(0);
    // Y a la izquierda si queda a la izquierda.
    const izquierda = rumboDeVuelta({ x: 0, z: 0 }, { x: -10_000, z: 4_000 });
    const otra = memoriaNueva();
    for (let i = 0; i < 61; i++)
      mandos = mandosPara(estado, { rumbo: izquierda, altitud: null, velocidad: null }, 1 / 60, otra);
    expect(mandos.aileron).toBeLessThan(0);
  });
});
