/**
 * **La mesa del arco a final**: del viento en cola a la puerta de los
 * quinientos pies, sin navegador (H89).
 *
 * Vuela el circuito del reactor en la 12 de Los Rodeos con el modelo, el
 * automático y las rachas del juego, y con **el mismo texto** de la final que
 * `verificar-vuelo-entero.mjs` mete en la página: la etapa «final» entera hasta
 * la toma, `volarLaSenda`, la altura planeada y el arco hasta el eje se leen
 * del fichero y se montan aquí. Lo de antes de la final —el viento en cola y
 * la base— está copiado con sus números.
 *
 * La usa `la-puerta-del-reactor.test.mjs`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "../src/flight/fdm";
import * as flota from "../src/flight/aircraft";
import * as peldanos from "../src/flight/tiers";
import { alabeoAFondo } from "../src/flight/mano";
import { maniobraCon } from "../src/flight/velocidades-de-despegue";
import { neutralControls } from "../src/flight/model";
import { Rafagas } from "../src/flight/rafagas";
import { airDensity, aireDelParte, indicadaDe } from "../src/flight/atmosphere";
import { autoridadDelTimon, mandosPara, memoriaNueva } from "../src/flight/piloto-automatico";
import { bankAngleOf, pitchAngleOf } from "../src/ui/actitud";
import { alturaDelCircuito, escalaDelCircuitoDe, verticesDelCircuito } from "../src/world/circuito";

const { aircraftById, propulsionDe } = flota;
const { TAGUATO, TUKA } = peldanos;

/** El texto del banco entre dos marcas, la primera incluida. */
function trozo(texto, desde, hasta) {
  const i = texto.indexOf(desde);
  if (i < 0) throw new Error(`el banco ya no dice «${desde}»`);
  const j = texto.indexOf(hasta, i);
  if (j < 0) throw new Error(`el banco ya no dice «${hasta}» después de «${desde}»`);
  return texto.slice(i, j);
}

/** Una constante del banco, con su valor tal cual. */
function constante(texto, nombre) {
  const m = texto.match(new RegExp(`\\n  const ${nombre} =[^;]*;`));
  if (!m) throw new Error(`el banco ya no tiene «${nombre}»`);
  return m[0];
}

/** El banco tal como está en el disco. Desde la raíz, que es desde donde corre vitest. */
export const textoDelBanco = () =>
  readFileSync(resolve(process.cwd(), "scripts/verificar-vuelo-entero.mjs"), "utf8");

/**
 * **El piloto de la final del banco, montado**: una función que recibe lo de
 * fuera —el avión, la sonda, la pista— y devuelve la mano.
 */
export function elPilotoDelBanco(texto, { antesDeH89 = false } = {}) {
  // El de antes de H89 es el mismo texto sin coger la senda antes de que llegue.
  const t = antesDeH89
    ? texto.replace(/(\n  const SEGUNDOS_PARA_COGER_LA_SENDA =)[^;]*;/, "$1 0;")
    : texto;
  const funcion = (desde) => `${trozo(t, desde, "\n  };\n")}\n  };`;
  const laFinal = trozo(
    t,
    "      const r = pistaAhora();\n      const hp = (r.heading * Math.PI) / 180;\n      const fx = Math.sin(hp);",
    "      if (s.onGround && s.onRunway) {",
  );
  return new Function(
    "e",
    `
    const { o, suyas, alto, SENDA, c, avionPorId, LA_FLOTA, propulsionDe, alabeoAFondo, LOS_PELDANOS, TAGUATO, peldano, mandosPara, memoriaNueva, configurar } = e;
    const SENCILLO = false, CON_EL_AUTOMATICO = true, REACTOR_COMPLETO = true, BAJA_POR_EL_ARCO = true;
    const obedienteEnElBanco = false, bamboleo = [], bamboleoAhora = { metros: 0, ritmo: 0 };
    const finalLarga = false, finalALaVista = false, SUBIDA_LIMPIA = 0, SUBE_CON_EL_MORRO = false;
    const PUERTA_BAJA = 500 * 0.3048, PUERTA_ALTA = 1000 * 0.3048;
    const obediente = { nariz: null };
    let recogida = null, palancaMedia = null, empezoLaRecogida = null;
    const LO_QUE_TARDA_EL_MOTOR = 5, RECOGIDA_DE_REACTOR = true;
    // La toma larga a propósito de \`OGA_TOMA_LARGA\` (H109), que aquí no se vuela: sin ella, la final no arranca (H111).
    const forzandoLaLarga = () => false;
    ${constante(t, "TOMA_LARGA_DE_MAS")}
    const pistaAhora = () => o.pistaDeAhora();
    const finalAhora = (d) => o.puntoDeFinalDe(d);
    const velocidadesDeFinal = [], bajadaReciente = [], trazaDeLaFinal = [];
    let ultimoRenglonDeLaFinal = -Infinity, errorDeGasAntes = null, sendaSinPerseguir = null;
    let aLaVista = null, masAltoEnFinal = 0, enLaPuerta = null, manoDeLaFinal = false;
    let senda = null, memoriaDeSenda = null, relojDeSenda = null, gasDeLaSubida = null, picadoEnLaSenda = 0, palancaQueLleva = null;
    let etapa = "subir", fase = "final", t = 0, paso = 0.1, alabeoPedido = null;
    const porElSuelo = (s) => Math.hypot(s.velocity.x, s.velocity.z);
    const enVerdadera = e.enVerdadera;
    ${constante(t, "CAIDA_MAXIMA")}
    ${constante(t, "MIL_PIES_POR_MINUTO")}
    ${constante(t, "CORRECCION_EN_FINAL")}
    ${constante(t, "SE_QUITA_EL_MARGEN_DESDE")}
    ${constante(t, "SIN_PERSEGUIR_LA_SENDA")}
    ${constante(t, "SEGUNDOS_DE_RECOGIDA")}
    ${constante(t, "RITMO_AL_TOCAR")}
    ${constante(t, "ANGULO_DE_CAPTURA_EN_FINAL")}
    ${constante(t, "TOPE_DE_ALERON_EN_VUELO")}
    ${constante(t, "TOPE_DE_INCLINACION_EN_LA_BASE")}
    ${constante(t, "GANANCIA_DE_ALABEO")}
    ${constante(t, "GANANCIA_DE_ALABEO_EN_FINAL")}
    ${constante(t, "margenDeLaFinal")}
    let topeDeInclinacion = TOPE_DE_INCLINACION_EN_LA_BASE;
    const aLaAltura = () => 0, porLaSendaSencilla = () => 0, porLaSendaConLaMano = () => 0;
    ${funcion("  const error = (a, b) => {")}
    ${trozo(t, "  const topeDeAleronEnVuelo = (() => {", "\n  })();\n")}
  })();
    ${trozo(t, "  const gananciaEnLaFinal = (() => {", "\n  })();\n")}
  })();
    ${funcion("  const alRumbo = (s, rumbo) => {")}
    ${funcion("  const aInclinacion = (quiere) => {")}
    ${trozo(t, "  const alPunto = (s, x, z) =>", "\n  /**")}
    ${funcion("  const alPuntoPorElSuelo = (s, x, z) => {")}
    ${funcion("  const desvio = (s) => {")}
    ${funcion("  const alUmbral = (s) => {")}
    ${constante(t, "SEGUNDOS_PARA_COGER_LA_SENDA")}
    ${trozo(t, "  let alturaPlaneada = null;", "  /** A qué vértice del circuito")}
    ${funcion("  const volarLaSenda = (mandos) => {")}
    return {
      mira: (ahora, p, et) => {
        t = ahora; paso = p; etapa = et; manoDeLaFinal = et === "final"; senda = null;
        medirElViraje(o.estado(), p);
      },
      planear: (s, cruda, puedeSubir) => planearLaBajada(s, cruda, paso, puedeSubir),
      get ritmoPlaneado() { return ritmoPlaneado; },
      pon: (x) => { senda = x; },
      llegaAlEje: (s) => llegaAlEjeVirando(s),
      alPunto: (s, x, z) => alPunto(s, x, z),
      volarLaSenda,
      lleva: (x) => { palancaQueLleva = x; },
      laFinal: (s) => {
        ${laFinal}
        return { falta, ruedas, senda: alto(s) - sendaDeVerdad, plan: objetivo - alto(s), arco: arcoDeLaSenda, quiere: pedidaEnIndicada, queda };
      },
      get enLaPuerta() { return enLaPuerta; },
      get pide() { return memoriaDeSenda; },
      get alabeoPedido() { return alabeoPedido; },
      get traza() { return trazaDeLaFinal; },
      desvio: (s) => desvio(s),
    };`,
  );
}

const NUDO = 0.514444;
const SENDA = Math.tan((3 * Math.PI) / 180);
const GRADO = Math.PI / 180;
const DT = 1 / 60;

/**
 * **Un circuito desde el viento en cola hasta pasada la puerta**, en la 12 de
 * Los Rodeos: 628,5 m en el umbral, el alisio de casa (040/12 contra una pista
 * a 111°, o sea a 71° por la izquierda), 21 grados y el circuito por el norte.
 *
 * El mundo va girado: la pista al norte, el umbral en el origen.
 *
 * **Las rachas, σ_w 1,65 m/s**: con ellas, lo que cambian de un segundo al
 * siguiente el variómetro y el anemómetro en la final recta es lo de los
 * registros de los seis vuelos de H89 —0,67 y 0,99 m/s; con 1,25, 0,42 y 0,67—.
 *
 * **Y la velocidad del viento en cola, la de maniobra de sus flaps**: con la de
 * la base desde el principio, el avión entraba en el arco quince metros más
 * alto que en los vuelos. Así entra a 316 m de ruedas, vuelve a subir a 1,7 m/s y
 * pasa la puerta en aire quieto bajando 3,5 m/s, 1,6 m bajo la senda y a 10 m
 * del eje; el vuelo con menos aire dio 3,6, −1,5 y 11,3.
 *
 * @param {object} p
 *   `avion`, su id; `piloto`, el de `elPilotoDelBanco`; `semilla`, la de las
 *   rachas. Y lo que se quiera cambiar: `peldano`, `masa` (kg), `sigma` (σ_w,
 *   m/s), `constancia`, `sinRacha`, `viento` (nudos) y `vientoDe` (grados desde
 *   el eje), `mano`, `altura` y `enLaBase` del circuito; `dx` y `dy`, m, y `rumbo`, grados,
 *   de más en el viento en cola; `cadaCuantos` fotogramas vuela el automático;
 *   `conTraza`, diez veces por segundo.
 */
export function vuelaElArco(p) {
  const a = aircraftById(p.avion);
  const tier = p.peldano === "taguato" ? TAGUATO : TUKA;
  const aire = aireDelParte(21, 628, 1013);
  const CABECERA = 628.5;
  const LARGO = 3168;
  const cae = (628.5 - 611.7) / 3168;
  const cota = (x, z) => CABECERA - cae * Math.max(0, Math.min(LARGO, -z));
  // El monte de debajo: la meseta, y desde la puerta cae hacia el mar.
  const suelo = (x, z) =>
    z <= 0
      ? cota(x, z)
      : CABECERA - Math.min(500, 0.075 * Math.max(0, z - 1700) + 0.02 * Math.max(0, z - 600));
  const tren = a.gearHeight;
  const m = new CoefficientFlightModel({ aircraft: a, ground: suelo, assist: tier.assists });
  m.ponerAire(aire);
  if (p.masa) m.ponerMasa(p.masa);
  const suyas = {
    id: a.id,
    tren,
    envergadura: a.wingSpan,
    aproximacion: a.approachSpeed,
    propulsion: propulsionDe(a),
    motores: a.motores ?? 1,
  };
  const pista = { x: 0, z: -LARGO / 2, heading: 0, length: LARGO, width: 45, desplazado: 0, senda: 3 * GRADO };
  const escala = escalaDelCircuitoDe(a, pista);
  let v = verticesDelCircuito(
    pista,
    CABECERA,
    p.mano ?? "izquierda",
    escala,
    p.altura ?? alturaDelCircuito(escala, pista.senda),
    p.enLaBase,
  );
  const DE_BASE = a.approachSpeed + 15 * NUDO;
  {
    // `alargarElVientoEnCola`.
    const entrada = Math.hypot(v[4].x, v[4].z);
    const radio = (DE_BASE * DE_BASE) / (9.81 * Math.tan(30 * GRADO));
    const mas = Math.max(
      0,
      Math.min(2000, (500 * 0.3048) / SENDA - 250 + 10 * DE_BASE + radio - entrada),
    );
    if (mas > 0)
      v = [
        v[0],
        v[1],
        v[2],
        { ...v[3], z: v[3].z + mas },
        { ...v[4], z: v[4].z + mas, y: v[4].y + mas * SENDA },
      ];
  }
  const enVerdadera = (s, indicada) => {
    const i = indicadaDe(s, aire);
    return i > 10 ? (indicada * s.airspeed) / i : indicada;
  };
  const y0 = v[2].y;
  const v0 =
    Math.max(DE_BASE, maniobraCon(a, 2 / 3)) / Math.sqrt(airDensity(y0, aire) / 1.225);
  m.reset({
    position: new Vector3(v[2].x + (p.dx ?? 0), y0 + (p.dy ?? 0), p.z0 ?? 0),
    heading: Math.PI + (p.rumbo ?? 0) * GRADO,
    airspeed: v0,
    equilibrado: true,
    flapsDelEquilibrio: 2 / 3,
  });
  const kt = (p.viento ?? 12) * NUDO;
  const de = (p.vientoDe ?? -71) * GRADO;
  // Hacia dónde sopla: la x al este, la z al sur.
  m.ponerViento(-Math.sin(de) * kt, Math.cos(de) * kt);
  const rafagas = new Rafagas(p.semilla);
  const c = { throttle: 0.4, aileron: 0, elevator: 0, rudder: 0 };
  const mandos = neutralControls();
  mandos.flaps = 2 / 3;
  mandos.tren = 1;
  mandos.trim = 0.06;
  mandos.automatico = true;
  c.throttle = Math.max(
    0,
    Math.min(1, m.gasPara(v0, { flaps: 2 / 3, tren: 1, aerofrenos: 0 }, 0)),
  );
  let reloj = 0;
  let flapsPedidos = 2 / 3;
  // Lo de `velocidadDelTramo`: la Vref más quince, y no menos que la de
  // maniobra de los flaps que pide la palanca.
  const velocidadDelTramo = (s) =>
    Math.max(
      DE_BASE,
      enVerdadera(s, maniobraCon(p.masa ? { ...a, mass: p.masa } : a, flapsPedidos)),
    );
  let subeElAire = 0;
  const o = {
    estado: () => m.state,
    reloj: () => reloj,
    cotaDePistaDeAhora: cota,
    cotaDePista: cota,
    palancaDelSuelo: () => m.palancaDelSuelo(),
    anguloSinSustentacion: () => m.anguloSinSustentacion(),
    autoridadDelTimon: () =>
      autoridadDelTimon(a, airDensity(m.state.position.y, aire), m.state.airspeed),
    subeElAire: () => subeElAire,
    actitud: () => ({
      cabeceo: pitchAngleOf(m.state.orientation),
      alabeo: bankAngleOf(m.state.orientation),
    }),
    controles: () => mandos,
    velocidadDeCabina: () => indicadaDe(m.state, aire) / NUDO,
    margenDeLaFinal: () => 5,
    meteo: () => ({ vientoKt: p.viento ?? 12, rachaKt: 0 }),
    pistaDeAhora: () => pista,
    puntoDeFinalDe: (d) => ({ x: 0, z: d }),
  };
  const alto = (s) => s.position.y - cota(s.position.x, s.position.z);
  const piloto = p.piloto({
    o,
    suyas,
    alto,
    SENDA,
    c,
    avionPorId: aircraftById,
    LA_FLOTA: flota.AIRCRAFT,
    propulsionDe,
    alabeoAFondo,
    LOS_PELDANOS: peldanos.TIERS,
    TAGUATO,
    peldano: p.peldano ?? "tuka",
    mandosPara,
    memoriaNueva,
    enVerdadera,
    configurar: () => {
      flapsPedidos = 1;
    },
  });
  let etapa = "subir";
  let aDonde = 3;
  let gasQueSostiene = 0;
  let proximo = 0;
  let laFinalEmpieza = null;
  let tPuerta = null;
  const traza = [];
  for (let i = 0; i < 60 * 260; i++) {
    const s = m.state;
    const r = rafagas.paso(DT, {
      sigma: p.sigma ?? 1.65,
      constancia: p.constancia ?? 0.55,
      sobreElSuelo: s.heightAboveGround,
      enTierra: s.onGround,
      velocidad: s.airspeed,
      densidad: airDensity(s.position.y, aire),
      envergadura: a.wingSpan,
      cuerda: a.chord,
      rumbo: Math.atan2(s.velocity.x, -s.velocity.z),
    });
    const sopla = p.sinRacha ? { x: 0, y: 0, z: 0, alabeo: 0 } : r;
    m.ponerRacha(sopla.x, sopla.y, sopla.z, sopla.alabeo);
    subeElAire = sopla.y;
    if (s.onGround || s.crashed) break;
    // El tic del banco, diez veces por segundo.
    if (reloj >= proximo - 1e-9) {
      proximo += 0.1;
      piloto.mira(reloj, 0.1, etapa);
      if (etapa === "subir") {
        const meta = v[aDonde];
        let d = Math.hypot(meta.x - s.position.x, meta.z - s.position.z);
        for (let k = aDonde; k < v.length - 1; k++)
          d += Math.hypot(v[k + 1].x - v[k].x, v[k + 1].z - v[k].z);
        d += Math.hypot(v[4].x, v[4].z) + 250;
        const tope =
          aDonde >= 4
            ? v[3].y
            : Math.min(v[2].y, v[3].y + Math.hypot(v[3].x - s.position.x, v[3].z - s.position.z) * SENDA);
        const altoQueToca = Math.min(tope - CABECERA, d * SENDA + tren);
        const quiereIr = velocidadDelTramo(s);
        gasQueSostiene = Math.max(
          -0.5,
          Math.min(0.45, gasQueSostiene + (quiereIr - s.airspeed) * 0.002 * 0.1),
        );
        c.throttle = Math.max(
          0,
          Math.min(1, 0.55 + (quiereIr - s.airspeed) * 0.04 + gasQueSostiene),
        );
        flapsPedidos = aDonde >= 4 ? 1 : 2 / 3;
        const altoPedido = piloto.planear(s, altoQueToca, aDonde < 4);
        piloto.pon({
          altitud: s.position.y + (altoPedido - alto(s)),
          ritmo: piloto.ritmoPlaneado,
          desde: reloj,
          velocidad: null,
        });
        c.aileron = piloto.alPunto(s, meta.x, meta.z);
        const desde = v[aDonde - 1];
        const dx = meta.x - desde.x;
        const dz = meta.z - desde.z;
        const largo = Math.hypot(dx, dz);
        const cuanto = ((s.position.x - desde.x) * dx + (s.position.z - desde.z) * dz) / largo;
        const margen = Math.max(
          300,
          (s.airspeed * s.airspeed) / (9.81 * Math.tan(30 * GRADO)) + s.airspeed,
        );
        if (cuanto > largo - margen) {
          if (aDonde >= 4) etapa = "final";
          else aDonde++;
        }
        if (aDonde >= 4 && etapa === "subir" && piloto.llegaAlEje(s)) etapa = "final";
        if (etapa === "final")
          laFinalEmpieza = {
            t: reloj,
            u: s.position.z,
            x: s.position.x,
            ruedas: alto(s) - tren,
            vs: s.velocity.y,
            ias: indicadaDe(s, aire) / NUDO,
            rumbo: s.heading / GRADO,
          };
      } else {
        const f = piloto.laFinal(s);
        if (tPuerta === null && piloto.enLaPuerta) tPuerta = reloj;
        if (p.conTraza)
          traza.push({
            t: reloj,
            ...f,
            x: piloto.desvio(s),
            vs: s.velocity.y,
            ias: indicadaDe(s, aire) / NUDO,
            alabeo: bankAngleOf(s.orientation) / GRADO,
            pideAlabeo: (piloto.alabeoPedido ?? 0) / GRADO,
            cab: pitchAngleOf(s.orientation) / GRADO,
            gas: c.throttle,
            ry: sopla.y,
            rx: sopla.x,
            rz: sopla.z,
            pide: piloto.pide?.ritmo,
            flaps: mandos.flaps,
          });
        if (f.ruedas < 60) break;
      }
    }
    mandos.throttle = c.throttle;
    mandos.aileron = c.aileron;
    mandos.rudder = 0;
    mandos.flaps += Math.max(-DT / a.tardanLosFlaps, Math.min(DT / a.tardanLosFlaps, flapsPedidos - mandos.flaps));
    if (i % (p.cadaCuantos ?? 1) === 0) {
      piloto.volarLaSenda(mandos);
      piloto.lleva(mandos.elevator);
    }
    m.step(DT, mandos);
    reloj += DT;
  }
  return { puerta: piloto.enLaPuerta, laFinalEmpieza, tPuerta, traza, vertices: v };
}

/** Muchos circuitos. */
export function mesaDelArco(p, semillas) {
  const r = [];
  for (let k = 1; k <= semillas; k++) r.push(vuelaElArco({ ...p, semilla: k }));
  return r;
}
