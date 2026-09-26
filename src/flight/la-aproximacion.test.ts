/**
 * La aproximación mira el campo al que se viene, y no el de casa.
 *
 * Se construía con el escenario y el terreno de casa y los copiaba, así que en
 * el aeropuerto de llegada el embudo de final, la altura sobre la pista y el
 * umbral eran los de Gando a ciento trece kilómetros: no se cantaban los
 * mínimos, la torre no mandaba nunca irse al aire y el PAPI no se explicaba.
 * El momento de decidir desaparecía justo en el campo que no se conoce.
 *
 * Aquí se vuela esa misma final —la 12 de Los Rodeos llegando de Gran
 * Canaria— sin navegador: un estado de vuelo puesto a mano y el campo de allí.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { LaAproximacion, type CampoDeLaAproximacion } from "./la-aproximacion";
import type { FlightState } from "./model";
import { PYKASU } from "./aircraft";
import { Reparto } from "../hechos";
import type { Vaca } from "../world/vaca";
import { crearCircuito } from "../world/circuito";
import { GRAN_CANARIA, TENERIFE_NORTE } from "../world/scenarios";
import { dondeCae } from "../world/entre-aerodromos";
import { desplazarAerodromo } from "../world/aerodromo-desplazado";
import {
  campoDeCasa,
  campoVecino,
  distanciaAlUmbral,
  enLaPistaDe,
  umbralEnUso,
  type CampoEnElMundo,
} from "../world/campo-del-vuelo";

const donde = dondeCae(
  GRAN_CANARIA.aerodrome!.origin,
  TENERIFE_NORTE.aerodrome!.origin,
);
const LOS_RODEOS = campoVecino(
  TENERIFE_NORTE,
  donde,
  desplazarAerodromo(TENERIFE_NORTE.aerodrome!, donde.x, donde.z),
);
const GANDO = campoDeCasa(GRAN_CANARIA);

/** Una cota de pista cualquiera: lo que importa es que sea la de allí. */
const COTA = 630;

/** Un avión en la final de un campo, a `d` metros y `alto` sobre su pista. */
function enFinal(
  campo: CampoEnElMundo,
  d: number,
  alto: number,
  vertical = -3,
): FlightState {
  const [ux, uz] = umbralEnUso(campo);
  const h = (campo.pista.heading * Math.PI) / 180;
  return {
    position: new Vector3(ux - Math.sin(h) * d, COTA + alto, uz + Math.cos(h) * d),
    heading: h,
    airspeed: PYKASU.approachSpeed,
    verticalSpeed: vertical,
    onGround: false,
  } as unknown as FlightState;
}

/** Lo que ve la aproximación de un campo, con el avión donde esté. */
function visto(
  campo: CampoEnElMundo,
  s: FlightState,
  senda: number | null = null,
): CampoDeLaAproximacion {
  return {
    pista: campo.pista,
    cota: COTA,
    alUmbral: distanciaAlUmbral(campo, s.position.x, s.position.z),
    senda:
      senda === null ? null : enLaPistaDe(campo, campo.pista.length * 0.5 - senda),
  };
}

function montar(campo: () => CampoDeLaAproximacion): {
  aproximacion: LaAproximacion;
  dicho: string[];
} {
  const hechos = new Reparto();
  const dicho: string[] = [];
  hechos.on("minimos", () => dicho.push("minimos"));
  hechos.on("mandaronIrseAlAire", (d) => dicho.push(`frustrar:${d.porque}`));
  hechos.on("papi", (d) => dicho.push(`papi:${d.blancas}`));
  const vaca = { quitar: () => {} } as unknown as Vaca;
  const aproximacion = new LaAproximacion({
    avion: () => PYKASU,
    hechos,
    vaca,
    campoDeAhora: campo,
  });
  return { aproximacion, dicho };
}

function paso(a: LaAproximacion, s: FlightState): void {
  a.paso({
    estado: s,
    acercandose: true,
    circuito: null,
    faseDeAhora: "final",
    techoDeNubes: null,
    terrenoDicho: null,
    vueloTerminado: false,
  });
}

describe("la aproximación en el campo de llegada", () => {
  it("canta los mínimos en la final de allí", () => {
    let s = enFinal(LOS_RODEOS, 1500, 80);
    const { aproximacion, dicho } = montar(() => visto(LOS_RODEOS, s));
    aproximacion.ordenes = "nunca";
    paso(aproximacion, s);
    s = enFinal(LOS_RODEOS, 1100, 59);
    paso(aproximacion, s);
    expect(dicho).toContain("minimos");
  });

  it("y no, si se le pregunta por la pista de casa, que es lo que hacía", () => {
    let s = enFinal(LOS_RODEOS, 1500, 80);
    const { aproximacion, dicho } = montar(() => visto(GANDO, s));
    aproximacion.ordenes = "nunca";
    paso(aproximacion, s);
    s = enFinal(LOS_RODEOS, 1100, 59);
    paso(aproximacion, s);
    expect(dicho).not.toContain("minimos");
  });

  it("la torre de allí también manda irse al aire", () => {
    const s = enFinal(LOS_RODEOS, 2000, 110);
    const { aproximacion, dicho } = montar(() => visto(LOS_RODEOS, s));
    aproximacion.ordenes = "siempre";
    paso(aproximacion, s);
    expect(dicho).toContain("frustrar:pistaOcupada");
    expect(aproximacion.mandanFrustrar).toBe(true);
  });

  it("y el PAPI de allí se explica, contado desde sus luces", () => {
    // Muy bajo para la senda: cuatro rojas.
    const s = enFinal(LOS_RODEOS, 1500, 25);
    const { aproximacion, dicho } = montar(() => visto(LOS_RODEOS, s, 300));
    aproximacion.ordenes = "nunca";
    paso(aproximacion, s);
    expect(dicho).toContain("papi:0");
  });

  it("donde no hay PAPI, se calla", () => {
    const s = enFinal(LOS_RODEOS, 1500, 25);
    const { aproximacion, dicho } = montar(() => visto(LOS_RODEOS, s, null));
    aproximacion.ordenes = "nunca";
    paso(aproximacion, s);
    expect(dicho.some((d) => d.startsWith("papi"))).toBe(false);
  });

  it("y el campo se pregunta en cada paso, no se guarda", () => {
    // Empieza creyéndose en casa y a mitad de camino pasa a ser Los Rodeos:
    // lo que decide tiene que salir del campo de ese paso.
    let s = enFinal(LOS_RODEOS, 1500, 80);
    let campo: CampoEnElMundo = GANDO;
    const { aproximacion, dicho } = montar(() => visto(campo, s));
    aproximacion.ordenes = "nunca";
    paso(aproximacion, s);
    campo = LOS_RODEOS;
    s = enFinal(LOS_RODEOS, 1100, 59);
    paso(aproximacion, s);
    expect(dicho).toContain("minimos");
  });
});

describe("el circuito no se canta en la final recta de allí", () => {
  /*
   * Llegando de Gran Canaria a Los Rodeos se viene recto a la 12 desde lejos.
   * Con la fase parpadeando entre «final» y «en vuelo» se cantó «girá otra
   * vez y empezá a bajar» con el avión alineado, porque el tramo se decidía
   * mirando solo la fase. El dibujo del circuito ya estaba apagado: venir por
   * el embudo es venir a aterrizar.
   */
  const circuito = crearCircuito(LOS_RODEOS.pista, COTA);

  function tramos(fase: string, mandan: boolean): string[] {
    const s = enFinal(LOS_RODEOS, 3000, 160, 0);
    const hechos = new Reparto();
    const dicho: string[] = [];
    hechos.on("tramoDeCircuito", (d) => dicho.push(d.tramo));
    const a = new LaAproximacion({
      avion: () => PYKASU,
      hechos,
      vaca: { quitar: () => {} } as unknown as Vaca,
      campoDeAhora: () => visto(LOS_RODEOS, s),
    });
    a.ordenes = "nunca";
    if (mandan) {
      // La torre la mandó aquí mismo, con la pista ocupada.
      a.mandanFrustrar = true;
      a.porqueMandaron = "pistaOcupada";
      a.altoAlMandar = 160;
    }
    a.paso({
      estado: s,
      acercandose: true,
      circuito,
      faseDeAhora: fase,
      techoDeNubes: null,
      terrenoDicho: null,
      vueloTerminado: false,
    });
    return dicho;
  }

  it("el sitio es de un tramo: si no, esto no probaría nada", () => {
    const s = enFinal(LOS_RODEOS, 3000, 160, 0);
    expect(circuito.tramoEn(s.position.x, s.position.z)).not.toBeNull();
  });

  it("alineado y por el embudo no se canta, diga lo que diga la fase", () => {
    expect(tramos("en-vuelo", false)).toEqual([]);
    expect(tramos("final", false)).toEqual([]);
  });

  it("pero con la orden de irse al aire, sí: es el camino de vuelta", () => {
    expect(tramos("en-vuelo", true).length).toBe(1);
  });
});

describe("el circuito, solo si se vuelve a este campo", () => {
  /** Un avión en el tramo de viento en cola de Gando, a la altura del circuito. */
  function enElCircuito(): { s: FlightState; circuito: ReturnType<typeof crearCircuito> } {
    const circuito = crearCircuito(GANDO.pista, COTA);
    const [a, b] = [circuito.vertices[2]!, circuito.vertices[3]!];
    const s = {
      position: new Vector3((a.x + b.x) / 2, COTA + 250, (a.z + b.z) / 2),
      heading: 0,
      airspeed: PYKASU.cruiseSpeed,
      verticalSpeed: 0,
      onGround: false,
    } as unknown as FlightState;
    return { s, circuito };
  }

  function volar(haciaOtroCampo: boolean): { visible: boolean; tramos: string[] } {
    const { s, circuito } = enElCircuito();
    const hechos = new Reparto();
    const tramos: string[] = [];
    hechos.on("tramoDeCircuito", (d) => tramos.push(d.tramo));
    const a = new LaAproximacion({
      avion: () => PYKASU,
      hechos,
      vaca: { quitar: () => {} } as unknown as Vaca,
      campoDeAhora: () => visto(GANDO, s),
    });
    a.paso({
      estado: s,
      acercandose: false,
      circuito,
      faseDeAhora: "en-vuelo",
      techoDeNubes: null,
      terrenoDicho: null,
      vueloTerminado: false,
      haciaOtroCampo,
    });
    return { visible: circuito.grupo.visible, tramos };
  }

  it("volviendo a casa se dibuja y se canta el tramo", () => {
    const r = volar(false);
    expect(r.visible).toBe(true);
    expect(r.tramos.length).toBe(1);
  });

  it("y yendo a otra isla, ni se dibuja ni se canta", () => {
    const r = volar(true);
    expect(r.visible).toBe(false);
    expect(r.tramos).toEqual([]);
  });
});
