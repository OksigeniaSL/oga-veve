/**
 * **La final del JAZ 120 en Guyrami, volada como la vuela una persona**, de
 * cinco millas y media al umbral de Tenerife Sur, cien veces.
 *
 * Existe por la queja de Enrique, que llegaba a Tenerife Sur y le mandaban al
 * aire en casi todas las aproximaciones: «esto es una mierda; la frustrada muy
 * guay que sea tan chachi, pero tener que hacer frustradas todos los vuelos es
 * una basura». El banco del vuelo entero vuela la senda clavada y con eso no
 * se ve; aquí la altura va y viene como la lleva una mano con el teclado —o
 * como la lleva sola el JAZ 120 con flaps, que sube y baja unos cinco metros
 * por segundo con un periodo de veinte a cincuenta—, la mitad de las veces se
 * espera la senda nivelado, como pide la cadena del «¿y ahora qué?», la
 * velocidad anda por encima de la de referencia, se llega algo descolocado y
 * se corrige, y la boca tarda en dar el permiso lo que tarde.
 *
 * Por el mismo cableado que el juego: la fase «final» del plan con su regla de
 * los veinte metros, la final de la torre, el turno de pista, la aproximación
 * con sus mínimos y su sorteo, y la lámpara que no repite el permiso mientras
 * sigue verde. Sin pista ocupada: todo lo que mande al aire aquí lo manda por
 * nada. Apunta cada orden con su porqué, la altura, el desvío de la senda y en
 * qué estaba el permiso.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { Boca } from "../audio/boca";
import { Reparto } from "../hechos";
import type { Vaca } from "../world/vaca";
import { TENERIFE_SUR } from "../world/scenarios";
import {
  campoDeCasa,
  distanciaAlUmbral,
  enLaPistaDe,
  umbralEnUso,
} from "../world/campo-del-vuelo";
import { hastaElUmbralDeToma } from "../world/umbral-desplazado";
import { alUmbralEnLaAproximacion, SENDA_DESDE } from "../world/runway-guide";
import { YVAGA } from "./aircraft";
import { FinalDeLaTorre } from "./final-de-la-torre";
import { LaAproximacion } from "./la-aproximacion";
import type { FlightState } from "./model";
import { desvioEnLaFinal } from "./perfil-vertical";
import { Frecuencia } from "./radio";
import { TurnoDePista, type AlrededorDelTurno } from "./turno-de-pista";

const CAMPO = campoDeCasa(TENERIFE_SUR);
const PISTA = CAMPO.pista;
const RUMBO = (PISTA.heading * Math.PI) / 180;
const [UX, UZ] = umbralEnUso(CAMPO);
const PAPI = enLaPistaDe(CAMPO, hastaElUmbralDeToma(PISTA) - SENDA_DESDE);
const PIE = 0.3048;
const NUDO = 0.514444;
const TRES_GRADOS = Math.tan((3 * Math.PI) / 180);

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Lo que pasó en una final. */
interface Final {
  ordenes: {
    porque: string;
    pies: number;
    puntos: number;
    permiso: string;
  }[];
  /** Cuántas veces sonó tu «cleared to land». */
  permisosOidos: number;
  /** Cuántas veces se salió de la final de la torre en el aire. */
  salidas: number;
  propuestas: string[];
}

/** Una final, con la mano que le toque. */
function unaFinal(azar: () => number): Final {
  const r = (a: number, b: number) => a + (b - a) * azar();
  // La mano: cuánto se aparta de la senda, con qué periodo y desde dónde.
  const periodo = r(20, 50);
  // Hasta seis metros por segundo de variómetro: el del JAZ 120 con flaps.
  const amplitud = Math.min(r(5, 30), (6 * periodo) / (2 * Math.PI));
  const fase = r(0, 2 * Math.PI);
  const nivel = azar() < 0.5 ? 1500 * PIE : Infinity;
  const sobra = r(-3, 20) * NUDO;
  const deLado = r(-250, 250);
  /*
   * **Y una de cada tres, alineada tarde**: la final cogida de lado —con el
   * alabeo que no respondía, como le pasó a Enrique en la primera de un
   * vuelo— que no se endereza hasta la milla y pico.
   */
  const alineaEn = azar() < 1 / 3 ? r(1.2, 2.5) * 1852 : Infinity;
  const tardaLaBoca = () => r(0, 25);

  const hechos = new Reparto();
  const salida: Final = { ordenes: [], permisosOidos: 0, salidas: 0, propuestas: [] };
  let alto = 0;
  let puntos = 0;
  /*
   * Tu permiso como lo lleva el juego: pedido, esperando su voz, oído. La
   * lámpara sigue verde seis segundos después de oírse, y mientras lo está,
   * pedirlo otra vez no lo vuelve a decir. Ver `autorizarElAterrizaje`.
   */
  let permiso = null as "esperando" | "oido" | null;
  let suenaEn = 0;
  let verdeHasta = -Infinity;
  let t = 0;
  hechos.on("mandaronIrseAlAire", (d) =>
    salida.ordenes.push({
      porque: d.porque + (d.motivo ? `:${d.motivo}` : ""),
      pies: Math.round(alto / PIE),
      puntos: +puntos.toFixed(1),
      permiso: permiso ?? "ninguno",
    }),
  );
  hechos.on("proponenIrseAlAire", (d) => salida.propuestas.push(d.motivo));
  let estado!: FlightState;
  const aproximacion = new LaAproximacion({
    avion: () => YVAGA,
    hechos,
    vaca: { quitar: () => {} } as unknown as Vaca,
    campoDeAhora: () => ({
      pista: PISTA,
      cota: 0,
      alUmbral: distanciaAlUmbral(CAMPO, estado.position.x, estado.position.z),
      senda: PAPI,
      sinTorre: false,
    }),
  });
  aproximacion.ordenes = "auto";
  const mandarteAlAire = (a: number, sigue: () => boolean, porque?: string) => {
    const vieja = aproximacion as unknown as {
      mandarIrseSinPermiso?: (a: number) => void;
    };
    if (porque === "sinPermiso" && vieja.mandarIrseSinPermiso) vieja.mandarIrseSinPermiso(a);
    else aproximacion.mandarIrsePorLaPistaOcupada(a, sigue);
  };
  const turno = new TurnoDePista({
    radio: new Frecuencia(dados(7), "GCTS"),
    boca: new Boca({ ahora: () => t * 1000, cancelar: () => {} }),
    trafico: () => null,
    torre: () => true,
    privado: () => false,
    alUmbral: () => distanciaAlUmbral(CAMPO, estado.position.x, estado.position.z),
    alto: () => alto,
    decirAOtro: () => null,
    autorizarte: () => {
      if (t < verdeHasta) {
        permiso = "oido";
        return;
      }
      permiso = "esperando";
      suenaEn = t + tardaLaBoca();
    },
    retirarteElPermiso: () => {
      permiso = null;
    },
    permisoSinOir: () => permiso === "esperando",
    darteElPermisoYa: () => {
      permiso = "oido";
      verdeHasta = t + 6;
    },
    mandarteAlAire: mandarteAlAire as AlrededorDelTurno["mandarteAlAire"],
    mandanFrustrar: () => aproximacion.mandanFrustrar,
  });
  const final = new FinalDeLaTorre();

  // La fase «final» del plan, con su regla: ver `deducir` en `flight/vuelo.ts`.
  let faseDelPlan = "en-vuelo";
  let pideFinal = 0;
  let subidoEnFinal = 0;
  let faseDeLaTorre = "en-vuelo";
  let dentroAntes = false;
  let bajadaSostenida = -3.7;

  const dt = 0.1;
  const porElSuelo = 70;
  const altoEn = (tt: number, d: number) => {
    const senda = (d + SENDA_DESDE) * TRES_GRADOS;
    const base = Math.min(nivel, senda);
    // Más fina cerca del suelo: la mitad de la mano por debajo de 150 m.
    const cuidado = base < 150 ? 0.5 + (0.5 * base) / 150 : 1;
    return base + amplitud * cuidado * Math.sin((2 * Math.PI * tt) / periodo + fase);
  };
  const deLadoEn = (d: number) =>
    alineaEn < Infinity
      ? 300 * Math.sign(deLado || 1) * Math.max(0, Math.min(1, (d - alineaEn + 1500) / 1500)) +
        8 * Math.sin(d / 900)
      : deLado * Math.max(0, Math.min(1, (d - 3700) / 6000)) + 8 * Math.sin(d / 900);

  for (let d = 5.5 * 1852; d > 200; d -= porElSuelo * dt, t += dt) {
    alto = altoEn(t, d);
    const vertical = (alto - altoEn(t - dt, d + porElSuelo * dt)) / dt;
    const y = deLadoEn(d);
    const torcido =
      d > alineaEn
        ? 70 * Math.sign(deLado || 1)
        : (Math.atan2(-(deLadoEn(d - 10) - y) / 10, 1) * 180) / Math.PI;
    const x = UX - Math.sin(RUMBO) * d + Math.cos(RUMBO) * y;
    const z = UZ + Math.cos(RUMBO) * d + Math.sin(RUMBO) * y;
    const kt = (YVAGA.approachSpeed + sobra) / NUDO + 4 * Math.sin(t / 7);
    estado = {
      position: new Vector3(x, alto, z),
      heading: RUMBO + (torcido * Math.PI) / 180,
      airspeed: kt * NUDO,
      verticalSpeed: vertical,
      onGround: false,
    } as unknown as FlightState;
    puntos = desvioEnLaFinal(alto, Math.hypot(x - PAPI[0], z - PAPI[1]), porElSuelo).puntos;
    bajadaSostenida += (vertical - bajadaSostenida) * (dt / 5);

    // La voz del permiso, cuando le toca a la boca.
    if (permiso === "esperando" && t >= suenaEn) {
      permiso = "oido";
      salida.permisosOidos++;
      verdeHasta = t + 6;
    }

    // La fase del plan: se entra bajando, y se sale subiendo veinte metros.
    const pide =
      alto < 300 &&
      Math.abs(y) < 400 &&
      Math.abs(torcido) < 30 &&
      (faseDelPlan === "final" ? subidoEnFinal < 20 : vertical < 0)
        ? "final"
        : "en-vuelo";
    pideFinal = pide === "final" ? pideFinal + dt : 0;
    if (pide === "en-vuelo") faseDelPlan = "en-vuelo";
    else if (pideFinal >= 0.5) faseDelPlan = "final";
    subidoEnFinal = faseDelPlan === "final" ? Math.max(0, subidoEnFinal + vertical * dt) : 0;

    const dentro = final.paso({
      enElAire: true,
      faseDelPlan,
      enLaFinalDelPlan: false,
      alUmbral: alUmbralEnLaAproximacion(PISTA, x, z),
      torcido,
      sobreLaPista: alto,
      vertical,
      gas: 0.6,
      ordenDeIrse: aproximacion.mandanFrustrar,
    });
    if (dentroAntes && !dentro) salida.salidas++;
    dentroAntes = dentro;
    const antes = faseDeLaTorre;
    faseDeLaTorre = faseDelPlan === "final" || dentro ? "final" : "en-vuelo";
    if (faseDeLaTorre === "final" && antes !== "final") turno.pedirAterrizaje();
    turno.paso(faseDeLaTorre);
    aproximacion.paso({
      estado,
      acercandose: true,
      circuito: null,
      faseDeAhora: faseDelPlan,
      techoDeNubes: null,
      terrenoDicho: null,
      vueloTerminado: false,
      enLaFinalDeLaTorre: dentro,
      enLaPuerta: { kt, puntos, configurado: true, vertical: bajadaSostenida },
    });
    // Mandado al aire, se va: esa final se acabó.
    if (aproximacion.mandanFrustrar) break;
  }
  return salida;
}

describe("la final del JAZ 120 en Guyrami, volada como la vuela una persona", () => {
  const VECES = 100;
  const finales: Final[] = [];
  const azar = dados(2026);
  const delJuego = Math.random;
  Math.random = azar;
  try {
    for (let i = 0; i < VECES; i++) finales.push(unaFinal(azar));
  } finally {
    Math.random = delJuego;
  }
  const ordenes = finales.flatMap((f) => f.ordenes);
  const porque = new Map<string, number>();
  for (const o of ordenes) porque.set(o.porque, (porque.get(o.porque) ?? 0) + 1);
  const conDos = finales.filter((f) => f.permisosOidos > 1).length;
  const propuestas = new Map<string, number>();
  for (const p of finales.flatMap((f) => f.propuestas))
    propuestas.set(p, (propuestas.get(p) ?? 0) + 1);
  // El parte, para leerlo: es lo que se cuenta en el informe.
  console.info(
    [
      `finales: ${VECES} · mandadas al aire: ${finales.filter((f) => f.ordenes.length).length}`,
      `  por qué: ${JSON.stringify(Object.fromEntries(porque))}`,
      `  órdenes (las diez primeras): ${JSON.stringify(ordenes.slice(0, 10))}`,
      `  finales con dos permisos oídos o más: ${conDos} · salidas de la final de la torre: ${finales.reduce((n, f) => n + f.salidas, 0)}`,
      `  propuestas de la instructora: ${JSON.stringify(Object.fromEntries(propuestas))}`,
    ].join("\n"),
  );

  it("con la pista libre, la torre no manda a nadie al aire", () => {
    expect(ordenes).toEqual([]);
  });

  it("y el permiso suena una vez por final, como mucho", () => {
    expect(conDos).toBe(0);
  });

  it("y nadie se sale de la final de la torre por el bamboleo", () => {
    expect(finales.reduce((n, f) => n + f.salidas, 0)).toBe(0);
  });
});
