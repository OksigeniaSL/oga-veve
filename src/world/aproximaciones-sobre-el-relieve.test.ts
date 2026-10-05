/**
 * **Las llegadas, las aproximaciones y las frustradas, sobre el relieve de
 * verdad**: en todos los campos de Canarias y de Paraguay —y en Cuatro
 * Vientos, que también tiene el suyo medido—, cada tramo con el margen que le
 * toca.
 *
 * Lo pidió quien voló a La Palma por la 18: alineado con la pista, a mil
 * ochocientos pies y sobre la ladera de Barlovento. «Es peligroso, se puede
 * entrar antes desde el mar, esto está mal calculado.» La prueba que había,
 * `rutas-de-canarias.test.ts`, mira la ruta con la regla del aire —seiscientos
 * metros en la montaña, ENR 1.3— y no miraba la aproximación, que es justo
 * donde se vuela bajo y donde estaba el monte. Ésta mira lo que viene
 * después de la ruta, como lo planea y lo vuela el juego, con el relieve de
 * los mismos ficheros que carga el juego:
 *
 * - **Aproximación inicial** —del punto de inicio al intermedio—: trescientos
 *   metros sobre lo más alto de su área primaria, a la altitud que pide el
 *   plan. Es el margen de PANS-OPS (Doc 8168, vol. II, parte I, sección 4,
 *   cap. 3), y el área primaria de una RNP APCH llega a una milla y cuarto a
 *   cada lado (parte III, sección 1, cap. 2).
 * - **Intermedia** —del intermedio al de final—: ciento cincuenta metros, con
 *   el área cerrándose a la de la final en las dos últimas millas.
 * - **La final y la entrada a la vista**, hasta la pista: que el avisador de
 *   terreno que mira hacia delante no salte volándolas como se vuelan, con sus
 *   virajes. Por debajo de la altura de decisión una final se vuela mirando, y
 *   el margen de ahí es el de ese avisador, que es el que la norma de los
 *   equipos fija para cada fase. Ver `flight/terreno-delante.ts`.
 * - **La frustrada** del juego, que es subir recto por el eje hasta el final
 *   de la subida del circuito y girar hacia su lado: treinta metros sobre el
 *   área de frustrada, que se abre quince grados a cada lado (PANS-OPS, parte
 *   I, sección 4, cap. 6), con la subida que dibuja el circuito de cada avión.
 *   El circuito a nivel ya lo mira `circuito-terreno.test.ts`.
 * - **La llegada**, la ruta hasta el punto de inicio, con la regla del aire:
 *   la de Canarias está en `rutas-de-canarias.test.ts`; aquí, la de Paraguay.
 *
 * Y las excepciones, cada una con su porqué. Una que sobre, se quita.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import {
  MILLA,
  PIE,
  alturaDeLaSenda,
  finalDeLaRuta,
  libra,
  perfilDeLaBajada,
  rutaDe,
  velocidadesDeLaBajada,
  type Fijo,
  type PerfilDeLaBajada,
  type Ruta,
} from "../flight/ruta";
import { FINAL_DESDE } from "../flight/escalera-de-velocidades";
import { sendaDeLaCabecera } from "./sendas-publicadas";
import { mirarDelante, type PistaConocida } from "../flight/terreno-delante";
import { campoDeCasa, campoVecino } from "./campo-del-vuelo";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import {
  escalaDeCircuito,
  formaDelCircuito,
  manoPublicada,
  verticesDelCircuito,
} from "./circuito";
import { dondeCae } from "./entre-aerodromos";
import { procedimientosDe, ramasDeLlegada, type Publicado } from "./procedimientos";
import { relieveDe } from "./relieve-en-disco";
import { rutaDelTramo, type DelJuego } from "./ruta-del-tramo";
import { SCENARIOS, destinosDe, oaciDe, type Scenario } from "./scenarios";
import { cabeceraEnUso } from "./terrain";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as { existsSync(ruta: string): boolean };

/** Los campos de verdad con relieve medido: Canarias, Paraguay y Cuatro Vientos. */
const CAMPOS = SCENARIOS.filter(
  (e) =>
    e.aerodrome &&
    (e.pais === "es" || e.pais === "py") &&
    fs.existsSync(`data/terrain/${e.id}.bin`),
);

/** El reactor más grande de la flota, el que vuela el perfil con tramos para frenar. */
const JAZ_120 = AIRCRAFT.find((a) => a.id === "jaz-120")!;

/** Desde qué largo de pista se mira el perfil de un reactor, m. */
const PISTA_DE_REACTOR = 1800;

/** El nombre de un campo en los mensajes: su indicativo. */
const nombre = (e: Scenario) => oaciDe(e) ?? e.id;

/** El relieve alrededor de un campo, con el de todos los de su país. */
function relieve(e: Scenario): (x: number, z: number) => number | null {
  const mismos = CAMPOS.filter((o) => o.pais === e.pais).map((o) => o.id);
  return relieveDe(mismos, e.aerodrome!.origin);
}

interface Cabecera {
  readonly nombre: string;
  /** El umbral, en el mundo del propio campo. */
  readonly x: number;
  readonly z: number;
  /** Rumbo de aterrizaje, grados verdaderos. */
  readonly rumbo: number;
  readonly largo: number;
  readonly cota: number;
}

/** Las cabeceras de un campo, en su propio mundo: el origen es él. */
function cabeceras(e: Scenario): Cabecera[] {
  const u = e.aerodrome!.runways[0]!.thresholds;
  const lista = Object.entries(u).filter(([, v]) => v?.xy);
  return lista.map(([n, v]) => {
    const otro = lista.find(([m]) => m !== n)![1]!;
    const x = v!.xy![0];
    const z = -v!.xy![1];
    const ox = otro.xy![0];
    const oz = -otro.xy![1];
    return {
      nombre: n,
      x,
      z,
      rumbo: ((Math.atan2(ox - x, -(oz - z)) * 180) / Math.PI + 360) % 360,
      largo: Math.hypot(ox - x, oz - z),
      cota: v!.elevM ?? e.aerodrome!.elevationM ?? 0,
    };
  });
}

/** La pista del campo como la conoce el avisador de terreno. */
function pistaConocida(e: Scenario, c: Cabecera): PistaConocida {
  const h = (c.rumbo * Math.PI) / 180;
  return {
    x: c.x + (Math.sin(h) * c.largo) / 2,
    z: c.z - (Math.cos(h) * c.largo) / 2,
    heading: c.rumbo,
    length: c.largo,
    width: e.aerodrome!.runways[0]!.widthM ?? 45,
    cota: c.cota,
  };
}

/** Las ramas de llegada a esta cabecera, como las traza el juego. */
function ramas(e: Scenario, c: Cabecera): Fijo[][] {
  const origen = e.aerodrome!.origin;
  const aMundo = (p: Publicado): Fijo => ({
    ...dondeCae(origen, p),
    nombre: p.nombre,
    papel: p.papel,
    minima: p.minimaPies === null ? null : p.minimaPies * PIE,
  });
  const umbral = { x: c.x, z: c.z };
  return ramasDeLlegada(oaciDe(e), c.nombre, umbral, c.rumbo, aMundo);
}

/** La rama con su umbral, hecha ruta: así la baja el plan. Ver `alturaDeLaSenda`. */
function rutaDeLaRama(rama: readonly Fijo[], c: Cabecera): Ruta {
  const umbral: Fijo = { x: c.x, z: c.z, nombre: `RW${c.nombre}`, papel: "umbral", minima: null };
  return rutaDe([...rama, umbral], c.cota);
}

/** Lo más bajo que queda sobre lo más alto de una franja a lo ancho de la ruta. */
interface Peor {
  readonly margen: number;
  readonly donde: string;
}

/**
 * Lo que se queda por encima del relieve en un tramo, m, con el área primaria
 * de `ancho(t)` metros a cada lado y la altitud del plan.
 */
function sobreElRelieve(
  r: Ruta,
  i: number,
  cota: (x: number, z: number) => number | null,
  ancho: (hecho: number, largo: number) => number,
  /** El perfil de un reactor, con sus tramos para frenar. Ver `perfilDeLaBajada`. */
  perfil: PerfilDeLaBajada | null = null,
): Peor {
  const a = r.fijos[i - 1]!;
  const b = r.fijos[i]!;
  const largo = r.acumulado[i]! - r.acumulado[i - 1]!;
  const ux = (b.x - a.x) / largo;
  const uz = (b.z - a.z) / largo;
  let peor: Peor = { margen: Infinity, donde: "" };
  for (let t = 0; t <= largo; t += 0.25 * MILLA) {
    const falta = r.total - r.acumulado[i - 1]! - t;
    const altitud = alturaDeLaSenda(r, i, falta, 1, true, perfil);
    const w = ancho(t, largo);
    let alto = -Infinity;
    for (let k = -4; k <= 4; k++) {
      const h = cota(a.x + ux * t - uz * (k / 4) * w, a.z + uz * t + ux * (k / 4) * w);
      if (h !== null) alto = Math.max(alto, h);
    }
    if (altitud - alto < peor.margen)
      peor = {
        margen: altitud - alto,
        donde: `${a.nombre}→${b.nombre} a ${(falta / MILLA).toFixed(1)} NM: ${Math.round(altitud)} m sobre ${Math.round(alto)}`,
      };
  }
  return peor;
}

/**
 * La aproximación inicial y la intermedia de una rama, con su margen cada una.
 *
 * La intermedia acaba en el punto de final **de la carta**: en una que acaba
 * en circuito, lo que viene después se vuela a la vista y lo mira el avisador
 * de terreno. Ver `Aproximacion.aLaVista`.
 */
function inicialEIntermedia(
  r: Ruta,
  cota: (x: number, z: number) => number | null,
  fafDeLaCarta: string | null,
  perfil: PerfilDeLaBajada | null = null,
): { inicial: Peor | null; intermedia: Peor | null } {
  const iIF = r.fijos.findIndex((f) => f.papel === "if");
  const deLaCarta = r.fijos.findIndex((f) => f.nombre === fafDeLaCarta);
  const iFAF = deLaCarta > 0 ? deLaCarta : r.fijos.findIndex((f) => f.papel === "faf");
  let inicial: Peor | null = null;
  let intermedia: Peor | null = null;
  const peorDe = (a: Peor | null, b: Peor) => (a && a.margen <= b.margen ? a : b);
  for (let i = 1; i < r.fijos.length; i++) {
    if (iIF > 0 && i <= iIF)
      inicial = peorDe(inicial, sobreElRelieve(r, i, cota, () => 1.25 * MILLA, perfil));
    else if (iIF >= 0 && iFAF > 0 && i > iIF && i <= iFAF) {
      const hastaElFAF = r.acumulado[iFAF]!;
      const desde = r.acumulado[i - 1]!;
      intermedia = peorDe(
        intermedia,
        sobreElRelieve(r, i, cota, (t) => {
          // Del área de la intermedia a la de la final, en las dos últimas millas.
          const queda = hastaElFAF - desde - t;
          const f = Math.max(0, Math.min(1, queda / (2 * MILLA)));
          return (0.475 + (1.25 - 0.475) * f) * MILLA;
        }, perfil),
      );
    }
  }
  return { inicial, intermedia };
}

/** Un instante del vuelo de prueba por la rama. */
interface Instante {
  readonly x: number;
  readonly z: number;
  readonly altitud: number;
  readonly vx: number;
  readonly vz: number;
  readonly vertical: number;
  readonly giro: number;
  readonly falta: number;
}

/** A qué se vuela la aproximación de prueba, m/s: unos 140 nudos, la de un reactor. */
const DE_APROXIMACION = 72;

/**
 * **La rama volada como se vuela**: a velocidad de reactor, por sus puntos de
 * pasada —el viraje empieza antes, con veinticinco grados de alabeo, como el
 * de un ordenador de vuelo— y bajando por la senda del plan, o a la altitud
 * que se le diga.
 */
function volar(
  r: Ruta,
  altitudDelPlan: (falta: number, activo: number) => number = (falta, activo) =>
    alturaDeLaSenda(r, Math.min(r.fijos.length - 1, activo), Math.max(0, falta)),
  v = DE_APROXIMACION,
): Instante[] {
  const radio = (v * v) / (9.81 * Math.tan((25 * Math.PI) / 180));
  const f = r.fijos;
  const n = f.length;
  const rumbo = (a: Fijo, b: Fijo) => Math.atan2(b.x - a.x, -(b.z - a.z));
  const giro = (i: number) => {
    let d = rumbo(f[i]!, f[i + 1]!) - rumbo(f[i - 1]!, f[i]!);
    d = ((d + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return d;
  };
  // Lo que se anticipa cada viraje, sin comerse más de media pata.
  const antes: number[] = new Array<number>(n).fill(0);
  const radios: number[] = new Array<number>(n).fill(radio);
  for (let i = 1; i < n - 1; i++) {
    const d = Math.abs(giro(i));
    if (d < 1e-3) continue;
    const patas = Math.min(r.acumulado[i]! - r.acumulado[i - 1]!, r.acumulado[i + 1]! - r.acumulado[i]!);
    antes[i] = Math.min(radio * Math.tan(d / 2), 0.45 * patas);
    radios[i] = antes[i]! / Math.tan(d / 2);
  }
  const paso = v * 2;
  const vuelo: Instante[] = [];
  const altitudEn = altitudDelPlan;
  const poner = (x: number, z: number, h: number, falta: number, activo: number, g: number) => {
    const alt = altitudEn(falta, activo);
    const luego = altitudEn(falta - paso, activo);
    vuelo.push({
      x,
      z,
      altitud: alt,
      vx: Math.sin(h) * v,
      vz: -Math.cos(h) * v,
      vertical: ((luego - alt) / paso) * v,
      giro: g,
      falta,
    });
  };
  for (let k = 0; k < n - 1; k++) {
    const a = f[k]!;
    const b = f[k + 1]!;
    const h = rumbo(a, b);
    const largo = r.acumulado[k + 1]! - r.acumulado[k]!;
    for (let s = antes[k]!; s <= largo - antes[k + 1]!; s += paso)
      poner(
        a.x + Math.sin(h) * s,
        a.z - Math.cos(h) * s,
        h,
        r.total - r.acumulado[k]! - s,
        k + 1,
        0,
      );
    if (k + 1 >= n - 1 || antes[k + 1]! <= 0) continue;
    // El viraje en el punto siguiente: un arco de su radio.
    const d = giro(k + 1);
    const rr = radios[k + 1]!;
    const lado = Math.sign(d);
    const x0 = b.x - Math.sin(h) * antes[k + 1]!;
    const z0 = b.z + Math.cos(h) * antes[k + 1]!;
    // El centro, a la derecha o a la izquierda de la trayectoria.
    const cx = x0 + Math.cos(h) * rr * lado;
    const cz = z0 + Math.sin(h) * rr * lado;
    const arco = Math.abs(d) * rr;
    for (let s = 0; s < arco; s += paso) {
      const ang = h + (s / rr) * lado;
      const x = cx - Math.cos(ang) * rr * lado;
      const z = cz - Math.sin(ang) * rr * lado;
      const falta = r.total - r.acumulado[k + 1]! + antes[k + 1]! - (2 * antes[k + 1]! * s) / arco;
      poner(x, z, ang, falta, s < arco / 2 ? k + 1 : k + 2, (v / rr) * lado);
    }
  }
  return vuelo;
}

/** El primer aviso de terreno volando la rama, o `null` si no salta ninguno. */
function primerAviso(
  r: Ruta,
  cota: (x: number, z: number) => number | null,
  pista: PistaConocida,
  perfil: PerfilDeLaBajada | null = null,
): string | null {
  const altitud = (falta: number, activo: number) =>
    alturaDeLaSenda(r, Math.min(r.fijos.length - 1, activo), Math.max(0, falta), 1, true, perfil);
  for (const p of volar(r, altitud)) {
    const d = mirarDelante(p, cota, [pista]);
    if (d.aviso)
      return `${d.aviso} a ${(p.falta / MILLA).toFixed(1)} NM del umbral, ${Math.round(p.altitud)} m, ${d.segundos} s por delante`;
  }
  return null;
}

/**
 * **La frustrada y la vuelta por el circuito, voladas**, en cada avión que
 * lleva el avisador de terreno: desde la altura de decisión sobre el umbral,
 * recto hasta el final de la subida, por sus esquinas a la altura del
 * circuito y bajando por la base a la final. El primer aviso que salte, o
 * `null`. Es lo que vuela quien se va al aire en La Gomera.
 */
function avisoEnElCircuito(
  e: Scenario,
  c: Cabecera,
  cota: (x: number, z: number) => number | null,
): string | null {
  const h = (c.rumbo * Math.PI) / 180;
  const pista = {
    x: c.x + (Math.sin(h) * c.largo) / 2,
    z: c.z - (Math.cos(h) * c.largo) / 2,
    heading: c.rumbo,
    length: c.largo,
  };
  const suelo = (x: number, z: number) => cota(x, z) ?? 0;
  for (const avion of AIRCRAFT.filter((a) => a.avisosHablados)) {
    const escala = escalaDeCircuito(avion.approachSpeed);
    const forma = formaDelCircuito(
      pista,
      c.cota,
      suelo,
      escala,
      manoPublicada(e, c.nombre, escala),
      avion.velocidadDeCircuito,
    );
    const v = verticesDelCircuito(pista, c.cota, forma.mano, escala, forma.altura);
    const puntos = [{ ...v[0]!, y: c.cota + 60 }, ...v.slice(1), { x: c.x, y: c.cota, z: c.z }];
    const fijos = puntos.map(
      (p, i): Fijo => ({ x: p.x, z: p.z, nombre: `C${i}`, papel: "ruta", minima: null }),
    );
    const r = rutaDe(fijos, c.cota);
    // La altitud, la del dibujo del circuito: recta entre sus vértices.
    const altitud = (falta: number) => {
      const hecho = r.total - falta;
      for (let i = 1; i < puntos.length; i++) {
        if (r.acumulado[i]! < hecho) continue;
        const l = r.acumulado[i]! - r.acumulado[i - 1]! || 1;
        const t = Math.max(0, Math.min(1, (hecho - r.acumulado[i - 1]!) / l));
        return puntos[i - 1]!.y + (puntos[i]!.y - puntos[i - 1]!.y) * t;
      }
      return c.cota;
    };
    for (const p of volar(r, altitud, avion.velocidadDeCircuito)) {
      const d = mirarDelante(p, cota, [pistaConocida(e, c)]);
      if (d.aviso)
        return `${avion.id} ${d.aviso}, ${Math.round(p.falta)} m antes del umbral, ${Math.round(p.altitud)} m, ${d.segundos} s`;
    }
  }
  return null;
}

/**
 * **La subida de la frustrada que enseña el juego**: recto por el eje, del
 * umbral al final de la subida del circuito de cada avión, desde la altura de
 * decisión hasta la del circuito. Lo que queda, m, sobre lo más alto del área
 * de frustrada, que se abre quince grados a cada lado desde ciento cincuenta
 * metros.
 */
function frustrada(
  e: Scenario,
  c: Cabecera,
  cota: (x: number, z: number) => number | null,
  /** Si se mira solo el pasillo de la subida, ciento cincuenta metros a cada lado. */
  soloElPasillo = false,
): Peor {
  const h = (c.rumbo * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const pista = {
    x: c.x + (fx * c.largo) / 2,
    z: c.z + (fz * c.largo) / 2,
    heading: c.rumbo,
    length: c.largo,
  };
  const suelo = (x: number, z: number) => cota(x, z) ?? 0;
  let peor: Peor = { margen: Infinity, donde: "" };
  for (const avion of AIRCRAFT) {
    const escala = escalaDeCircuito(avion.approachSpeed);
    const forma = formaDelCircuito(
      pista,
      c.cota,
      suelo,
      escala,
      manoPublicada(e, c.nombre, escala),
      avion.velocidadDeCircuito,
    );
    const v = verticesDelCircuito(pista, c.cota, forma.mano, escala, forma.altura);
    const fin = v[1]!;
    const hasta = Math.hypot(fin.x - c.x, fin.z - c.z);
    const decision = c.cota + 60;
    for (let d = 0; d <= hasta; d += 100) {
      const altitud = decision + ((fin.y - decision) * d) / hasta;
      const w = soloElPasillo ? 150 : 150 + d * Math.tan((15 * Math.PI) / 180);
      let alto = -Infinity;
      for (let k = -4; k <= 4; k++) {
        const s = cota(c.x + fx * d - fz * (k / 4) * w, c.z + fz * d + fx * (k / 4) * w);
        if (s !== null) alto = Math.max(alto, s);
      }
      if (altitud - alto < peor.margen)
        peor = {
          margen: altitud - alto,
          donde: `${avion.id} a ${d} m del umbral: ${Math.round(altitud)} m sobre ${Math.round(alto)}`,
        };
    }
  }
  return peor;
}

/** Los márgenes de PANS-OPS de cada tramo, m. */
const INICIAL = 300;
const INTERMEDIA = 150;
const DE_FRUSTRADA = 30;

/**
 * **Las excepciones de la frustrada**, con su porqué.
 *
 * Son pistas al pie de una isla con la ladera dentro del área de frustrada,
 * que se abre quince grados por los dos lados aunque el circuito gire hacia
 * el mar: el juego sube recto y gira hacia el lado publicado, que es el del
 * mar, y la ladera queda del otro. Lo que se les mide es lo que vuela el
 * avión: el pasillo de la subida, a ciento cincuenta metros del eje, con sus
 * treinta metros de margen. Y lo que hacen las cartas de verdad en esos
 * sitios es lo mismo: girar pronto hacia el mar.
 */
const FRUSTRADA_JUNTO_AL_MONTE: Readonly<Record<string, string>> = {
  "GCLA 18":
    "La ladera de Mazo está a un kilómetro a la derecha de la subida, que gira a la izquierda, al mar. La frustrada publicada de la RNP A también: «virar a la izquierda directo a LA520».",
  "GCHI 34":
    "La ladera de la isla está a ochocientos metros a la izquierda de la subida, que gira a la derecha, al mar, por el circuito publicado.",
};

/**
 * **Las finales del circuito en las que el avisador de terreno habla**, con
 * su porqué.
 *
 * Una: la 21 de Lanzarote, que por tres grados pasa a treinta y cinco metros
 * de la loma que hay a una milla del umbral. Su PAPI de verdad está a 3,7°
 * (AD 2-GCRR, 2.14) por eso mismo, y la aproximación ya baja por él: ver
 * `sendas-publicadas.ts`, y volándola el avisador ya no dice nada. Lo que
 * queda es el circuito dibujado, que entra en final a los tres grados de
 * siempre: ahí se le pide que sea solo la precaución, sin el «pull up», y en
 * la última parte.
 */
const AVISA_EN_LA_FINAL: Readonly<Record<string, string>> = {
  "GCRR 21":
    "El circuito entra en final a tres grados y pasa a treinta y cinco metros de la loma de antes del umbral; su PAPI está a 3,7°.",
};

describe("las aproximaciones de cada campo, sobre el relieve", () => {
  it("se miran los campos de Canarias y de Paraguay", () => {
    const paises = new Set(CAMPOS.map((e) => e.pais));
    expect(paises).toEqual(new Set(["es", "py"]));
    expect(CAMPOS.filter((e) => e.pais === "es").length).toBeGreaterThanOrEqual(8);
    expect(CAMPOS.filter((e) => e.pais === "py").length).toBeGreaterThanOrEqual(8);
  });

  for (const e of CAMPOS) {
    const cota = relieve(e);
    for (const c of cabeceras(e)) {
      const dicho = `${nombre(e)} ${c.nombre}`;
      it(`${dicho}: la inicial y la intermedia libran con el margen de PANS-OPS`, () => {
        const deLaCarta =
          procedimientosDe(oaciDe(e))
            ?.aproximaciones[c.nombre]?.ramas[0]?.find((p) => p.papel === "faf")?.nombre ?? null;
        for (const rama of ramas(e, c)) {
          const r = rutaDeLaRama(rama, c);
          const { inicial, intermedia } = inicialEIntermedia(r, cota, deLaCarta);
          if (inicial) expect(inicial.margen, `${dicho}, inicial: ${inicial.donde}`).toBeGreaterThanOrEqual(INICIAL);
          if (intermedia)
            expect(intermedia.margen, `${dicho}, intermedia: ${intermedia.donde}`).toBeGreaterThanOrEqual(INTERMEDIA);
        }
      });

      it(`${dicho}: volando la aproximación, el aviso de terreno no salta`, () => {
        for (const rama of ramas(e, c)) {
          const r = rutaDeLaRama(rama, c);
          // La final con la senda de su PAPI, como la vuela el juego. Ver
          // `sendas-publicadas.ts`.
          const perfil = perfilDeLaBajada(
            c.cota,
            null,
            finalDeLaRuta(r),
            sendaDeLaCabecera(oaciDe(e), c.nombre),
          );
          const aviso = primerAviso(r, cota, pistaConocida(e, c), perfil);
          const por = `${dicho} por ${rama.map((f) => f.nombre).join(" ")}`;
          expect(aviso, por).toBeNull();
        }
      });

      /*
       * **Y con los tramos para frenar de un reactor**, que bajan antes a la
       * altura del circuito y van nivelados hasta el punto de final: el perfil
       * que sigue el automático del JAZ 90 y del JAZ 120. Ver
       * `perfilDeLaBajada` en `flight/ruta.ts`.
       */
      if (c.largo >= PISTA_DE_REACTOR)
        it(`${dicho}: con los tramos para frenar de un reactor, libra y no avisa`, () => {
          const deLaCarta =
            procedimientosDe(oaciDe(e))
              ?.aproximaciones[c.nombre]?.ramas[0]?.find((p) => p.papel === "faf")?.nombre ?? null;
          for (const rama of ramas(e, c)) {
            const r = rutaDeLaRama(rama, c);
            const faf = r.fijos.findIndex((f) => f.papel === "faf");
            const perfil = perfilDeLaBajada(
              c.cota,
              velocidadesDeLaBajada(JAZ_120),
              faf > 0 ? r.total - r.acumulado[faf]! : FINAL_DESDE,
              sendaDeLaCabecera(oaciDe(e), c.nombre),
            );
            const { inicial, intermedia } = inicialEIntermedia(r, cota, deLaCarta, perfil);
            if (inicial)
              expect(inicial.margen, `${dicho}, inicial: ${inicial.donde}`).toBeGreaterThanOrEqual(INICIAL);
            if (intermedia)
              expect(intermedia.margen, `${dicho}, intermedia: ${intermedia.donde}`).toBeGreaterThanOrEqual(
                INTERMEDIA,
              );
            const aviso = primerAviso(r, cota, pistaConocida(e, c), perfil);
            const por = `${dicho} por ${rama.map((f) => f.nombre).join(" ")}`;
            expect(aviso, por).toBeNull();
          }
        });

      it(`${dicho}: la frustrada sube por encima de su área`, () => {
        const peor = frustrada(e, c, cota);
        if (dicho in FRUSTRADA_JUNTO_AL_MONTE) {
          expect(peor.margen, `${dicho}: ${peor.donde}`).toBeLessThan(DE_FRUSTRADA);
          // Y el pasillo de la subida, que es lo que vuela el avión, libra.
          const pasillo = frustrada(e, c, cota, true);
          expect(pasillo.margen, `${dicho}, el pasillo: ${pasillo.donde}`).toBeGreaterThanOrEqual(DE_FRUSTRADA);
          return;
        }
        expect(peor.margen, `${dicho}: ${peor.donde}`).toBeGreaterThanOrEqual(DE_FRUSTRADA);
      });

      it(`${dicho}: volando la frustrada y el circuito, el aviso de terreno no salta`, () => {
        const aviso = avisoEnElCircuito(e, c, cota);
        if (dicho in AVISA_EN_LA_FINAL) {
          // La misma final que la de la aproximación: la precaución, en ella.
          const antes = Number(/precaucion, (\d+) m antes del umbral/.exec(aviso ?? "")?.[1]);
          expect(antes, `${dicho}: ${aviso}`).toBeLessThan(2.5 * MILLA);
          return;
        }
        expect(aviso, dicho).toBeNull();
      });
    }
  }

  it("y las excepciones siguen haciendo falta", () => {
    for (const dicho of [...Object.keys(FRUSTRADA_JUNTO_AL_MONTE), ...Object.keys(AVISA_EN_LA_FINAL)]) {
      const [oaci, cab] = dicho.split(" ");
      expect(CAMPOS.some((e) => nombre(e) === oaci && cabeceras(e).some((c) => c.nombre === cab))).toBe(true);
    }
  });
});

/**
 * **Y la llegada en Paraguay**, con la regla del aire: la de Canarias la mira
 * `rutas-de-canarias.test.ts`. Llano casi entero, salvo los cerros de
 * Paraguarí y de la cordillera de Amambay, que es justo lo que se mira.
 */
describe("las llegadas de Paraguay, con la regla del aire", () => {
  const paraguay = CAMPOS.filter((e) => e.pais === "py");
  const JAZ_90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
  for (const sal of paraguay)
    for (const id of destinosDe(sal)) {
      const lle = paraguay.find((x) => x.id === id);
      if (!lle) continue;
      it(`${nombre(sal)} → ${nombre(lle)}: libra el relieve en ruta`, () => {
        const origen = sal.aerodrome!.origin;
        const cota = relieveDe(paraguay.map((x) => x.id), origen);
        const salida = campoDeCasa(sal);
        const d = dondeCae(origen, lle.aerodrome!.origin);
        const llegada = campoVecino(lle, d, desplazarAerodromo(lle.aerodrome!, d.x, d.z), null);
        expect(cabeceraEnUso(llegada.escenario)).not.toBeNull();
        const juego: DelJuego = {
          origen,
          enElAire: null,
          cotaDePista: (campo) => campo.escenario.aerodrome?.elevationM ?? 0,
          cota,
          techo: JAZ_90.alturaDeCrucero,
        };
        const ruta = rutaDelTramo(salida, llegada, juego);
        const terreno = { cota, techo: juego.techo, cotaDeSalida: juego.cotaDePista(salida, 0, 0) };
        expect(
          libra(ruta.fijos, terreno, juego.cotaDePista(llegada, 0, 0), new Map(), true),
          ruta.fijos.map((f) => f.nombre).join(" "),
        ).toBe(true);
      });
    }
});
