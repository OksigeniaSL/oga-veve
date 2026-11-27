/**
 * **La mesa del tráfico con quien juega dando su circuito**, para las pruebas.
 *
 * Se monta lo que monta el juego —la frecuencia, el turno, el tráfico dibujado
 * con sus calles y su circuito sobre el relieve de verdad— y quien juega
 * despega cuando le dejan y vuela su circuito con los virajes de su avión,
 * hasta trescientos metros a un lado u otro de la línea, que nadie la lleva
 * clavada. Es la de H93 (`vuelta-de-espera.test.ts`) y la de H94
 * (`verde-con-uno-en-la-base.test.ts`).
 */
import type { AircraftConfig } from "../flight/aircraft";
import { CircuitoDeLaTorre } from "../flight/circuito-de-la-torre";
import { Frecuencia, PISTA_TUYA } from "../flight/radio";
import { TurnoDePista } from "../flight/turno-de-pista";
import { esAfis, sinTorre, type Aerodrome } from "./aerodrome";
import { cabeceraEnUso } from "./cabecera-en-uso";
import {
  escalaDelCircuitoDe,
  formaDelCircuito,
  loQueQuedaDeCircuito,
  manoPublicada,
  porDondeSigues,
  radioDeViraje,
  verticesDelCircuito,
  type PuntoDeCircuito,
} from "./circuito";
import { TIEMPO_DE_CASA } from "./meteo";
import { SCENARIOS, conViento, type Scenario } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { Terrain } from "./terrain";
import { crearTrafico, tiposDelCampo, type TuSalida } from "./trafico";

/** El paso de la mesa, s. */
const PASO = 0.5;

// El `fs` de Node pedido en marcha, como en `circuito-terreno.test.ts`.
const fs = (
  globalThis as unknown as { process: { getBuiltinModule(nombre: string): unknown } }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

function relieve(id: string): Scenario["relieve"] {
  const ruta = `data/terrain/${id}.bin`;
  if (!fs.existsSync(ruta)) return undefined;
  const b = fs.readFileSync(ruta);
  const datos = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return { datos, resolucion: Math.round(Math.sqrt(datos.length)) };
}

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Los Rodeos con su relieve, en la cabecera que da ese viento. */
export function elCampo(vientoDe: number) {
  const base = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
  const esc = conViento(base, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: 12 });
  const lejos = relieve(`${esc.id}-lejos`);
  const terreno = new Terrain({
    ...esc,
    relieve: relieve(esc.id),
    ...(lejos ? { relieveLejano: lejos } : {}),
  });
  const aero = esc.aerodrome as Aerodrome;
  const pista = { ...esc.runway, senda: (3 * Math.PI) / 180 };
  const suelo = (x: number, z: number) => terreno.sampleHeight(x, z);
  const formas = new Map<string, ReturnType<typeof formaDelCircuito>>();
  return {
    aero,
    pista,
    suelo,
    cota: terreno.runwayElevation,
    calles: sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45),
    forma(escala: number, velocidad?: number) {
      const k = `${escala}/${velocidad}`;
      const ya = formas.get(k);
      if (ya) return ya;
      const f = formaDelCircuito(
        pista,
        terreno.runwayElevation,
        suelo,
        escala,
        { mano: manoPublicada(esc, cabeceraEnUso(esc), escala) },
        velocidad,
      );
      formas.set(k, f);
      return f;
    },
  };
}
export type Campo = ReturnType<typeof elCampo>;

type Punto = { x: number; z: number };

/** La quebrada virada a su radio en cada esquina, en puntos cada veinte metros. */
function virada(v: readonly Punto[], radios: readonly number[]): Punto[] {
  const sale: Punto[] = [v[0]!];
  const hasta = (p: Punto) => {
    const u = sale[sale.length - 1]!;
    const n = Math.max(1, Math.round(Math.hypot(p.x - u.x, p.z - u.z) / 20));
    for (let i = 1; i <= n; i++)
      sale.push({ x: u.x + ((p.x - u.x) * i) / n, z: u.z + ((p.z - u.z) * i) / n });
  };
  for (let i = 1; i < v.length - 1; i++) {
    const [a, b, c] = [v[i - 1]!, v[i]!, v[i + 1]!];
    const la = Math.hypot(b.x - a.x, b.z - a.z);
    const lc = Math.hypot(c.x - b.x, c.z - b.z);
    const cos = ((b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z)) / (la * lc);
    const giro = Math.acos(Math.max(-1, Math.min(1, cos)));
    const t = Math.min(radios[i]! * Math.tan(giro / 2), la / 2, lc / 2);
    // El arco, de la recta de antes a la de después: hacia donde se tuerce.
    const u = { x: (b.x - a.x) / la, z: (b.z - a.z) / la };
    const w = { x: (c.x - b.x) / lc - u.x * cos, z: (c.z - b.z) / lc - u.z * cos };
    const n = Math.hypot(w.x, w.z) || 1;
    const radio = t / Math.max(1e-6, Math.tan(giro / 2));
    const p = { x: b.x - u.x * t, z: b.z - u.z * t };
    hasta(p);
    for (let k = 1; k <= 24; k++) {
      const s = radio * Math.sin((giro * k) / 24);
      const l = radio * (1 - Math.cos((giro * k) / 24));
      hasta({ x: p.x + u.x * s + (w.x / n) * l, z: p.z + u.z * s + (w.z / n) * l });
    }
  }
  hasta(v[v.length - 1]!);
  return sale;
}

export interface Medida {
  /** Los que dieron su vuelta a menos de 300 m de ti y 150 de altura. */
  cerca: string[];
  /** Y los que, sin dar vueltas, pasaron así de cerca de ti en el aire (H94). */
  encima: string[];
  /** Y entre dos del tráfico, uno de ellos en su vuelta. */
  entreEllos: string[];
  vueltas: number;
  /** Lo que esperaron en total, s. */
  esperando: number;
  /** Las que cruzaron el umbral. */
  aterrizaron: number;
  /** Si llegaste a aterrizar. */
  acabo: boolean;
  /** Lo que esperaste la verde, s. */
  roja: number;
  /** Los que se fueron al aire. */
  alAire: number;
}

/** Lo que se le dice a la torre de ti, y lo que tardas de verdad. */
export interface ComoSeVuela {
  /** Si sabe por dónde vuelas. */
  readonly dondeVuelas: boolean;
  /** Si sabe que vas a salir y lo que tardas. */
  readonly queSales: boolean;
  /** Lo que de verdad tardas alineado en dar gas, s; la torre cuenta con veinticinco. */
  readonly alineado?: number;
}

/** Lo que cuenta la torre que tardas alineado en dar gas, s. */
const ALINEADO = 25;

/** Un vuelo: el tráfico vuela su rato, despegas, das tu circuito y aterrizas. */
export function volar(k: Campo, avion: AircraftConfig, semilla: number, como: ComoSeVuela): Medida {
  const { pista, cota, aero } = k;
  const azar = dados(semilla * 7919 + 13);
  for (let i = 0; i < 5; i++) azar();
  const escala = escalaDelCircuitoDe(avion, pista);
  const f = k.forma(escala, avion.velocidadDeCircuito);
  const vs = verticesDelCircuito(pista, cota, f.mano, escala, f.altura);
  const [v0, v1, v2, v3, v4] = vs as [
    PuntoDeCircuito,
    PuntoDeCircuito,
    PuntoDeCircuito,
    PuntoDeCircuito,
    PuntoDeCircuito,
  ];
  const h = (pista.heading * Math.PI) / 180;
  const ancho = Math.hypot(v2.x - v1.x, v2.z - v1.z);
  const aparte = (azar() - 0.5) * 600;
  const alLado = (p: Punto): Punto => ({
    x: p.x + ((v2.x - v1.x) / ancho) * aparte,
    z: p.z + ((v2.z - v1.z) / ancho) * aparte,
  });
  const media = pista.length / 2 - (pista.desplazado ?? 0);
  const umbral = { x: pista.x - Math.sin(h) * media, y: cota, z: pista.z + Math.cos(h) * media };
  const enCola = avion.velocidadDeCircuito;
  const enBase = avion.approachSpeed + 7.7;
  const camino = virada(
    [v0, v1, alLado(v2), alLado(v3), v4, umbral],
    [0, radioDeViraje(enCola), radioDeViraje(enCola), radioDeViraje(enBase), radioDeViraje(enBase), 0],
  );
  const acum = [0];
  for (let i = 1; i < camino.length; i++)
    acum.push(
      acum[i - 1]! + Math.hypot(camino[i]!.x - camino[i - 1]!.x, camino[i]!.z - camino[i - 1]!.z),
    );
  const total = acum[acum.length - 1]!;
  const masCerca = (p: Punto): number => {
    let j = 0;
    camino.forEach((q, i) => {
      if (Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(camino[j]!.x - p.x, camino[j]!.z - p.z)) j = i;
    });
    return acum[j]!;
  };
  const sBase = masCerca(alLado(v3));
  const sFinal = masCerca(v4);
  const sube = avion.approachSpeed > 55 ? 12 : avion.approachSpeed > 40 ? 8 : 4.5;
  const alFinal = v4.y - cota;

  let fase = "rodando";
  let [x, z, rumbo, alto, v, s, vertical] = [v0.x, v0.z, h, 0, 0, 0, 0];
  let enElAire = false;
  let llegada: number | null = null;
  let alUmbral: number | null = null;
  let porElCircuito: number | null = null;
  const visto = new CircuitoDeLaTorre();
  const mira = () => {
    llegada = alUmbral = porElCircuito = null;
    if (!enElAire) return;
    const vel = Math.max(15, v);
    if (s >= sFinal - 200) {
      llegada = alUmbral = Math.hypot(x - umbral.x, z - umbral.z) / vel;
      return;
    }
    const queda =
      alto >= 60 && alto <= 2 * f.altura ? loQueQuedaDeCircuito(vs, x, z, 2 * escala) : null;
    const teCuenta = visto.paso({
      enSuFranja: queda !== null,
      tramo: queda?.tramo ?? null,
      vuelvesAqui: true,
      trasIrse: false,
      vertical,
      aSuAltura: alto >= 60 && alto <= 2 * f.altura,
      reloj,
    });
    if (teCuenta)
      llegada = porElCircuito =
        (queda
          ? queda.metros + Math.hypot(v4.x - umbral.x, v4.z - umbral.z)
          : Math.hypot(x - umbral.x, z - umbral.z)) / vel;
  };
  const vr = avion.approachSpeed * 1.05;
  let reloj = 0;
  let [desde, libre] = [0, 0];
  const tuSalida = (): TuSalida | null => {
    const base = { carrera: (vr * vr) / 4, velocidad: enCola, sube };
    if (fase === "esperando") return { ...base, conLaPista: false, enElAire: 4 + ALINEADO + vr / 2 };
    if (fase === "autorizado")
      return { ...base, conLaPista: true, enElAire: 4 - (reloj - desde) + ALINEADO + vr / 2 };
    if (fase === "alineando")
      return { ...base, conLaPista: true, enElAire: Math.max(5, ALINEADO - (reloj - desde)) + vr / 2 };
    if (fase === "despegando") return { ...base, conLaPista: true, enElAire: Math.max(0, (vr - v) / 2) };
    return null;
  };
  const trafico = crearTrafico(pista, cota, "ala-alta", f.mano, escala, f.altura, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    forma: (e) => k.forma(e),
    tierra: () => (k.calles ? { suelo: k.calles, alto: k.suelo } : null),
    quienJuega: () => ({
      alUmbral,
      llegada,
      porElCircuito,
      enLaPista: !enElAire && ["alineando", "despegando", "aterrizado"].includes(fase),
      velocidad: Math.max(15, v),
      porDondeVuela:
        enElAire && como.dondeVuelas
          ? () => porDondeSigues(vs, umbral, { x, y: cota + alto, z, rumbo }, Math.max(15, v), escala)
          : null,
      sale: como.queSales ? tuSalida() : null,
    }),
  });
  const turno = new TurnoDePista({
    radio: new Frecuencia(dados(semilla), aero.id),
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    afis: () => esAfis(aero),
    calleUnica: () => false,
    alUmbral: () => (alUmbral === null ? Infinity : alUmbral * Math.max(15, v)),
    alto: () => alto,
    enTierra: () => !enElAire,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
    tuLlegada: () =>
      llegada === null
        ? null
        : { segundos: llegada, donde: alUmbral !== null ? "final" : "circuito", alto },
  });
  const m: Medida = {
    cerca: [],
    encima: [],
    entreEllos: [],
    vueltas: 0,
    esperando: 0,
    aterrizaron: 0,
    acabo: false,
    roja: 0,
    alAire: 0,
  };
  const dando = new Set<string>();
  const cerca = new Map<string, string>();
  const encima = new Map<string, string>();
  const entre = new Set<string>();
  let antes = new Map<string, number>();
  const despega = 30 + azar() * 900;
  let faseAntes = "";
  const paso = trafico.paso.bind(trafico);
  trafico.paso = (dt, alLlegar) => {
    const idos = paso(dt, alLlegar);
    m.alAire += idos.length;
    return idos;
  };
  for (let t = 0; t < 4000 && !m.acabo; t += PASO) {
    reloj = t;
    if (fase === "rodando" && t >= despega) fase = "esperando";
    if (fase === "esperando") {
      m.roja += PASO;
      libre = turno.pistaDeOtros ? 0 : libre + PASO;
      if (libre > 2.2) [fase, desde] = ["autorizado", t];
    } else if (fase === "autorizado" && t - desde > 4) [fase, desde] = ["alineando", t];
    else if (fase === "alineando" && t - desde > (como.alineado ?? ALINEADO)) [fase, s, v] = ["despegando", 0, 0];
    else if (fase === "despegando") {
      v += 2 * PASO;
      s += v * PASO;
      if (v >= vr) [enElAire, fase] = [true, "en-vuelo"];
    } else if (enElAire) {
      const quiere = s >= sFinal - 200 ? avion.approachSpeed + 2 : s >= sBase - 600 ? enBase : enCola;
      v += Math.max(-0.8 * PASO, Math.min(0.8 * PASO, quiere - v));
      s += v * PASO;
      const ya = alto;
      if (s > sFinal) alto = alFinal * Math.max(0, (total - s) / Math.max(1, total - sFinal));
      else if (s > sBase) alto = f.altura + (alFinal - f.altura) * ((s - sBase) / Math.max(1, sFinal - sBase));
      else alto = Math.min(f.altura, alto + sube * PASO);
      vertical = (alto - ya) / PASO;
      if (s >= total) [enElAire, fase, desde, alto] = [false, "aterrizado", t, 0];
      else if (s >= sFinal - 200) fase = "final";
    } else if (fase === "aterrizado") {
      v = Math.max(8, v - 2 * PASO);
      m.acabo = t - desde > 45;
    }
    if (s > 0 && s <= total) {
      let i = 1;
      while (i < acum.length - 1 && acum[i]! < s) i++;
      const [a, b] = [camino[i - 1]!, camino[i]!];
      const u = (s - acum[i - 1]!) / Math.max(1e-6, acum[i]! - acum[i - 1]!);
      [x, z] = [a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u];
      rumbo = Math.atan2(b.x - a.x, -(b.z - a.z));
    }
    mira();
    if (PISTA_TUYA.has(fase) && !PISTA_TUYA.has(faseAntes)) turno.alSerTuya(fase);
    if (fase === "final" && faseAntes !== "final") turno.pedirAterrizaje();
    faseAntes = fase;
    turno.oir(PASO, { fase, deDia: true, instructorHablando: false });
    turno.paso(fase);

    const hay = trafico.quienes();
    const ahora = new Map(trafico.secuencia().map((q) => [q.matricula, q.alUmbral]));
    for (const [cual, quedaba] of antes) if (quedaba > 0 && (ahora.get(cual) ?? 1) <= 0) m.aterrizaron++;
    antes = ahora;
    for (const q of hay) {
      const dv = q.y - (cota + alto);
      const d = Math.hypot(q.x - x, q.z - z);
      const pasanCerca = q.esperandoTurno ? cerca : encima;
      if (enElAire && q.y - cota > 20 && Math.abs(dv) < 150 && d < 300 && !pasanCerca.has(q.matricula))
        pasanCerca.set(
          q.matricula,
          `${avion.id}, semilla ${semilla}, ${t} s en «${fase}»: ${q.matricula} (${q.tipo}) a ${d.toFixed(0)} m y ${dv.toFixed(0)}`,
        );
      if (!q.esperandoTurno) {
        dando.delete(q.matricula);
        continue;
      }
      m.esperando += PASO;
      if (!dando.has(q.matricula)) m.vueltas++;
      dando.add(q.matricula);
      for (const w of hay) {
        if (w === q || w.y - cota < 20 || Math.abs(w.y - q.y) >= 150) continue;
        if (Math.hypot(w.x - q.x, w.z - q.z) < 300)
          entre.add([q.matricula, w.matricula].sort().join(" y "));
      }
    }
  }
  m.cerca = [...cerca.values()];
  m.encima = [...encima.values()];
  m.entreEllos = [...entre];
  trafico.dispose();
  return m;
}
