/**
 * El primer capítulo: el esqueleto de sus turnos, su camino de salida y su tiempo. El vuelo
 * de verdad lo vuela `scripts/verificar-inicio-4.mjs`, con `OGA_CAPITULO=1`.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { RECETAS } from "../ui/ilustraciones-recetas";
import { dondeCae } from "../world/entre-aerodromos";
import { conSuAerodromo, MADRID_BARAJAS, SALIDA_DE_BARAJAS } from "../world/scenarios";
import { leerElCapituloPedido, pedirElCapitulo } from "./capitulo-pedido";
import type { Linea } from "./conversacion";
import {
  caminoDeLaSalida,
  GUION_NOCHE_DE_MADRID,
  LUCES_DE_MADRID,
  SE_APAGA_EL_CINTURON,
  tiempoDeLaNocheDeMadrid,
} from "./guion-noche-de-madrid";
import { DIEZ_MIL_PIES, MotorDelPasaje, type LecturaDelPasaje, type SitioDelPaisaje, type VistaDelSitio } from "./motor-del-pasaje";
import { horarioDelDia, perfilDelVuelo } from "./ruta-larga";
import type { TramoDeLinea } from "./vuelo-de-linea";
import { vientoDeCasa } from "../world/meteo";

/** Node, que las pruebas corren en él: el proyecto no lleva sus tipos. Como en `ui/ilustraciones.test.ts`. */
const { readFileSync } = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string, cod: string): string };

const INVIERNO = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
const GRADO = Math.PI / 180;
/** El rumbo de `a` a `b` en el mundo, grados: x al este, z al sur. */
const rumbo = (a: { x: number; z: number }, b: { x: number; z: number }): number =>
  ((Math.atan2(b.x - a.x, -(b.z - a.z)) / GRADO) + 360) % 360;

describe("el guion del primer capítulo", () => {
  const lasFrases = (): readonly Linea[] => GUION_NOCHE_DE_MADRID.momentos.flatMap((m) => [...m.lineas]);

  it("lleva las anclas del vuelo, en su orden, y acaba en el final", () => {
    const ids = GUION_NOCHE_DE_MADRID.momentos.map((m) => m.id);
    const anclas = ["puertas", "motores", "despegue", "arriba", "fin"] as const;
    const donde = anclas.map((a) => ids.indexOf(a));
    expect(donde.every((i) => i >= 0)).toBe(true);
    expect([...donde].sort((a, b) => a - b)).toEqual(donde);
    expect(ids.at(-1)).toBe("fin");
    const de = (id: string) => GUION_NOCHE_DE_MADRID.momentos.find((m) => m.id === id)!.lineas.map((l) => l.clave);
    // Los toboganes dan el arranque, «sentados para el despegue» la pista y el anuncio de siempre apaga el cartel.
    expect(de("puertas")).toContain("comandante.crosscheck");
    expect(de("despegue")).toContain("comandante.despegue");
    expect(de("arriba")).toEqual(["comandante.largo.cinturon"]);
    // Y no el de crucero: aquí se sigue subiendo.
    expect(ES_PY["comandante.largo.cinturon"]).toMatch(/subiendo/);
  });

  it("la bienvenida de la comandante va con las puertas cerradas, antes de arrancar, y dice la llegada de hoy", () => {
    const ids = GUION_NOCHE_DE_MADRID.momentos.map((m) => m.id);
    expect(ids.indexOf("bienvenida")).toBeLessThan(ids.indexOf("puertas"));
    const bienvenida = GUION_NOCHE_DE_MADRID.momentos.find((m) => m.id === "bienvenida")!;
    const conTemporada = (temporada: "verano" | "invierno") =>
      bienvenida.segun!({ largo: { temporada } } as unknown as LecturaDelPasaje, null as never).map((l) => l.clave);
    expect(conTemporada("verano")).toContain("comandante.largo.vueloVerano");
    expect(conTemporada("invierno")).toContain("comandante.largo.vueloInvierno");
    expect(conTemporada("invierno")).toContain("comandante.largo.tresPilotos");
    // Y es megafonía: nada de lo suyo se le dice a Ara en persona.
    for (const l of bienvenida.lineas) if (l.quien === "mama") expect(l.megafonia).toBe(true);
  });

  it("se abre bajo la lámina del embarque, que tiene su receta, y no se duerme nadie", () => {
    expect(GUION_NOCHE_DE_MADRID.apertura).toEqual({ hasta: "ventanilla", laminas: ["embarque"] });
    expect(RECETAS.embarque?.original).toBe("vuelo-largo/embarque.png");
    expect(GUION_NOCHE_DE_MADRID.momentos[0]!.tapa).toBe("embarque");
    expect(GUION_NOCHE_DE_MADRID.siesta.sinSiesta).toBe(true);
  });

  it("la demostración dice las ocho salidas, cuatro por lado, con Ara asomada al pasillo", () => {
    const salidas = GUION_NOCHE_DE_MADRID.momentos.find((m) => m.id === "demoSalidas")!;
    expect(salidas.plano).toBe("pasillo");
    expect(salidas.lineas.map((l) => l.clave)).toEqual(["inicio.tripulacion.pasaje.demo.salidasLargo"]);
    expect(ES_PY["inicio.tripulacion.pasaje.demo.salidasLargo"]).toMatch(/ocho salidas de emergencia, cuatro a cada lado/);
  });

  it("cada frase, con su texto en los dos idiomas y en la lista de grabar; y pocas nuevas", () => {
    const lista = readFileSync("scripts/frases-para-grabar.mjs", "utf8");
    const nuevas = new Set<string>();
    // Los anuncios de siempre los monta el juego al decirlos, con su texto en otro sitio.
    const deLaEscena = [...lasFrases(), ...GUION_NOCHE_DE_MADRID.charlas.flatMap((c) => [...c.lineas])].filter(
      (f) => f.clave.startsWith("inicio.") || f.clave.startsWith("comandante.largo."),
    );
    for (const f of deLaEscena) {
      expect(ES_PY[f.clave as keyof typeof ES_PY], f.clave).toBeTruthy();
      expect(EN[f.clave as keyof typeof EN], f.clave).toBeTruthy();
      if (/largo|salidasLargo/.test(f.clave)) nuevas.add(f.clave);
    }
    for (const c of ["comandante.largo.vueloVerano", "comandante.largo.vueloInvierno"]) nuevas.add(c);
    expect(nuevas.size).toBeLessThanOrEqual(13);
    for (const c of nuevas) expect(lista, c).toContain(`"${c}"`);
  });

  it("sin marcas: ni la aerolínea, ni el número de vuelo, ni el fabricante", () => {
    for (const f of lasFrases()) {
      const texto = String(ES_PY[f.clave as keyof typeof ES_PY]);
      expect(texto, f.clave).not.toMatch(/Air Europa|UX ?0?23|Boeing|787|Airbus/i);
    }
  });
});

/**
 * **Un vuelo a grandes rasgos**: la tripulación hace lo que le dejan los permisos de la
 * escena, con una voz que tarda un segundo por frase. Lo que se mira es el orden de lo que
 * se cuenta y lo que espera a qué; el vuelo de verdad es del banco.
 */
function volarElCapitulo(seVeMadrid: boolean, seVenLasCalles = true): { readonly dichos: readonly string[]; readonly dichas: readonly string[]; readonly arrancaTrasLosToboganes: boolean; readonly terminado: boolean } {
  let t = 0;
  const dichas: string[] = [];
  let acaba: { fin: number; alAcabar: (esperaMas: number) => void } | null = null;
  const voz = {
    decir: (linea: Linea, alAcabar: (esperaMas: number) => void) => {
      dichas.push(linea.clave);
      acaba = { fin: t + 1, alAcabar };
    },
    callar: () => {
      acaba = null;
    },
  };
  const escena = new MotorDelPasaje(voz, GUION_NOCHE_DE_MADRID, { pared: () => t }) as unknown as MotorDelPasaje;
  let tramo = "puerta" as TramoDeLinea;
  let enTramo = 0;
  let altitud = 609;
  let enTierra = true;
  let arrancaTrasLosToboganes = true;
  const cambiar = (a: TramoDeLinea) => {
    tramo = a;
    enTramo = 0;
  };
  const ver = (sitio: SitioDelPaisaje): VistaDelSitio =>
    sitio === "luces-de-madrid" && seVeMadrid && altitud > 1500 ? { como: "ventanilla", lado: "izquierda" } : { como: null, lado: null };
  const DT = 0.1;
  for (; t < 3000 && !escena.estado.terminado; ) {
    t += DT;
    enTramo += DT;
    if (acaba && t >= (acaba as { fin: number }).fin) {
      const a = acaba as { alAcabar: (esperaMas: number) => void };
      acaba = null;
      a.alAcabar(0);
    }
    const volandoYa = !enTierra;
    const l: LecturaDelPasaje = {
      tramo,
      enTramo,
      motor: tramo !== "puerta",
      enTierra,
      porElSuelo: tramo === "rodando" ? 8 : tramo === "carrera" ? 40 + enTramo * 2 : volandoYa ? 120 : 0,
      altura: altitud - 609,
      altitud,
      vertical: volandoYa ? 12 : 0,
      autorizado: tramo === "esperando" && enTramo > 3,
      flaps: 0,
      nubes: null,
      enNube: 0,
      cabina: 0,
      faltaParaTocar: 9_000_000,
      alabeo: volandoYa && altitud > 1000 && altitud < 1600 ? -20 * GRADO : 0,
      ver,
      ...(tramo === "rodando" ? { ejeVerde: seVenLasCalles } : {}),
      largo: { temporada: "invierno" } as LecturaDelPasaje["largo"],
    };
    const p = escena.paso(DT, l);
    if (p.arrancar && tramo === "puerta") {
      if (!dichas.includes("comandante.crosscheck")) arrancaTrasLosToboganes = false;
      cambiar("arrancando");
    } else if (tramo === "arrancando" && enTramo > 5 && p.rodar) cambiar("rodando");
    else if (tramo === "rodando" && enTramo > 150) cambiar("esperando");
    else if (tramo === "esperando" && p.entrar) cambiar("entrando");
    else if (tramo === "entrando" && enTramo > 3 && p.despegar) cambiar("carrera");
    else if (tramo === "carrera" && enTramo > 30) {
      cambiar("subida");
      enTierra = false;
    } else if (!enTierra) altitud += 12 * DT;
  }
  return { dichos: escena.estado.dichos, dichas, arrancaTrasLosToboganes, terminado: escena.estado.terminado || escena.estado.momento === "fin" };
}

describe("el capítulo, de puerta a puerta", () => {
  it("pasa por todo en su orden, y la tripulación no arranca antes de oír los toboganes", () => {
    const v = volarElCapitulo(true);
    expect(v.arrancaTrasLosToboganes).toBe(true);
    const orden = [
      "embarque",
      "ventanilla",
      "cinturon",
      "bienvenida",
      "puertas",
      "motores",
      "demostracion",
      "demoSalidas",
      "demoEquipo",
      "lucesDeLasCalles",
      "espera",
      "despegue",
      "carrera",
      "madrid",
      "arriba",
    ];
    expect(v.dichos.filter((d) => orden.includes(d))).toEqual(orden);
    expect(v.terminado).toBe(true);
  });

  it("Madrid, solo si se ve: si hoy no, Ara no la nombra y el capítulo acaba igual", () => {
    const v = volarElCapitulo(false);
    expect(v.dichos).not.toContain("madrid");
    expect(v.dichas).not.toContain("inicio.ara.pasaje.largo.madrid");
    expect(v.dichos).toContain("arriba");
    expect(v.terminado).toBe(true);
  });

  it("la fila verde de las calles, solo si la calle la lleva; y si no, no hace esperar a nadie en la doble raya", () => {
    const v = volarElCapitulo(true, false);
    expect(v.dichos).not.toContain("lucesDeLasCalles");
    expect(v.dichas).not.toContain("inicio.ara.pasaje.largo.lucesVerdes");
    expect(v.dichos).toContain("despegue");
    expect(v.terminado).toBe(true);
  });

  it("la luz del cinturón se apaga pasados los diez mil pies, que por debajo la comandante solo habla de volar", () => {
    expect(SE_APAGA_EL_CINTURON).toBeGreaterThan(DIEZ_MIL_PIES);
  });
});

// El origen del mundo es el del fichero del aeródromo, que se baja aparte: ver `aerodromoAparte`.
const BARAJAS_ENTERO = await conSuAerodromo(MADRID_BARAJAS);

describe("la salida CCS6L", () => {
  const origen = BARAJAS_ENTERO.aerodrome!.origin;
  const campo = BARAJAS_ENTERO.runway;
  const fin: readonly [number, number] = [campo.x, campo.z - campo.length / 2];
  const camino = caminoDeLaSalida(origen, fin, campo.length, INVIERNO);
  const de = (nombre: string) => camino.find((f) => f.nombre === nombre)!;

  it("sale del final de la 36L, recto al norte hasta SSY, que se sobrevuela", () => {
    expect(camino[0]!.papel).toBe("despegue");
    expect(camino[0]!.carrera).toBe(campo.length);
    const ssy = de("SSY");
    expect(ssy.recta).toBe(true);
    const r = rumbo(camino[0]!, ssy);
    expect(Math.min(r, 360 - r)).toBeLessThan(5);
  });

  it("de SSY, a la izquierda hacia MD039 por el 320, y luego al oeste, hacia AVILA", () => {
    expect(rumbo(de("SSY"), de("MD039"))).toBeCloseTo(320, -1);
    expect(rumbo(de("MD039"), de("AVILA"))).toBeGreaterThan(255);
    expect(rumbo(de("MD039"), de("AVILA"))).toBeLessThan(275);
    expect(camino.map((f) => f.nombre).filter((n) => n)).toEqual(["RW36L", ...SALIDA_DE_BARAJAS.tramos.flatMap((t) => ("fijo" in t ? [t.fijo] : []))]);
  });

  it("y con Madrid a la izquierda, del lado de Ara, yendo hacia AVILA", () => {
    const a = de("MD039");
    const b = de("AVILA");
    const sol = dondeCae(origen, LUCES_DE_MADRID[0]);
    // Con x al este y z al sur, lo que queda a la izquierda tiene el producto cruzado negativo.
    const cruz = (b.x - a.x) * (sol.z - a.z) - (b.z - a.z) * (sol.x - a.x);
    expect(cruz).toBeLessThan(0);
  });

  it("y desde Cáceres, la ortodrómica hacia el suroeste", () => {
    const ccs = camino.findIndex((f) => f.nombre === "CCS");
    const siguiente = camino[ccs + 1]!;
    expect(siguiente.papel).toBe("ruta");
    const r = rumbo(camino[ccs]!, siguiente);
    expect(r).toBeGreaterThan(190);
    expect(r).toBeLessThan(260);
  });
});

describe("el tiempo de la noche de Madrid", () => {
  const pista = MADRID_BARAJAS.runway;
  const dominante = MADRID_BARAJAS.vientoDominante;
  const parte = (vientoDe: number, vientoKt: number) => ({ ...vientoDeCasa(dominante), vientoDe, vientoKt, fuente: "metar" as const });

  it("con el del parte si Barajas sigue en la norte: flojo, de cara o de costado", () => {
    expect(tiempoDeLaNocheDeMadrid(parte(240, 6), pista, dominante).vientoDe).toBe(240);
    expect(tiempoDeLaNocheDeMadrid(parte(360, 25), pista, dominante).vientoKt).toBe(25);
    expect(tiempoDeLaNocheDeMadrid(parte(180, 9), pista, dominante).vientoKt).toBe(9);
  });

  it("y si el sur o el costado la sacarían de la norte, la noche de casi siempre", () => {
    const sur = tiempoDeLaNocheDeMadrid(parte(180, 15), pista, dominante);
    expect(sur.vientoDe).toBe(dominante?.vientoDe);
    expect(sur.fuente).toBe("mano");
    expect(tiempoDeLaNocheDeMadrid(parte(90, 25), pista, dominante).vientoDe).toBe(dominante?.vientoDe);
    expect(tiempoDeLaNocheDeMadrid({ ...parte(170, 8), rachaKt: 14 }, pista, dominante).vientoDe).toBe(dominante?.vientoDe);
  });
});

describe("el paso al segundo capítulo", () => {
  it("el recado vale para una carga y nada más", () => {
    const guardado = new Map<string, string>();
    const almacen = {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => void guardado.set(k, v),
      removeItem: (k: string) => void guardado.delete(k),
    };
    expect(pedirElCapitulo(almacen, 2)).toBe(true);
    expect(leerElCapituloPedido(almacen)).toBe(2);
    expect(leerElCapituloPedido(almacen)).toBeNull();
    expect(leerElCapituloPedido(null)).toBeNull();
  });
});
