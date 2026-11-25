/**
 * **La mesa de la final con un motor**: la base y la final del piloto de
 * `verificar-emergencias.mjs`, sin navegador (H99).
 *
 * Con el modelo, las ayudas y las rachas del juego, y con **el mismo texto** del
 * piloto que el banco mete en la página: las leyes y la etapa «final» se leen del
 * fichero y se montan aquí. Lo de antes de la final es el mismo `alabear` al
 * mismo punto.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "../src/flight/fdm";
import * as flota from "../src/flight/aircraft";
import * as peldanos from "../src/flight/tiers";
import { neutralControls } from "../src/flight/model";
import { Rafagas } from "../src/flight/rafagas";
import { airDensity, aireDelParte, indicadaDe } from "../src/flight/atmosphere";
import { alabeoAFondo } from "../src/flight/mano";
import { bankAngleOf, pitchAngleOf } from "../src/ui/actitud";
import { causasDe, constanciaDe, cuantoSeMueve } from "../src/flight/turbulencia";

const { aircraftById } = flota;
const NUDO = 0.514444;
const GRADO = Math.PI / 180;

/** El texto del banco entre dos marcas, la primera incluida. */
function trozo(texto, desde, hasta) {
  const i = texto.indexOf(desde);
  if (i < 0) throw new Error(`el banco ya no dice «${desde}»`);
  const j = texto.indexOf(hasta, i);
  if (j < 0) throw new Error(`el banco ya no dice «${hasta}» después de «${desde}»`);
  return texto.slice(i, j);
}

export const textoDelBanco = (ruta = "scripts/verificar-emergencias.mjs") =>
  readFileSync(resolve(process.cwd(), ruta), "utf8");

/** El piloto del banco, montado. */
export function elPiloto(t) {
  const leyes = trozo(t, "      const profundidad = (s, quiereCabeceo, dt) => {", "      const piloto = (c) => {");
  const final = trozo(t, '        if (tramo === "final") {\n', "\n      };\n      /*\n       * **La final, cada medio segundo**");
  return new Function(
    "e",
    `
    const { o, pista, cota, h, vref, vfe, modo, esReactor, enPista, aMundo, error, acota, aircraftById, alabeoAFondo, TIERS, avionId, peldano } = e;
    let lenta = 0, deActitud = 0, dePedal = 0, deGas = 0.5, quiereAlabeo = 0, pedalMaximo = 0;
    let tramo = "final", tocoEn = null, bajo = Infinity, recogida = null, paroEn = null;
    let enTierraDesvio = 0, enTierraPedal = 0, enTierraDonde = "", radioDesvio = 0, narizObjetivo = null, narizDesde = 0, narizSoltando = false, narizSoltadaA = null;
    let desdeElFallo = 0, sinVerdeEnLaFinal = 0, ocupadaPuesta = null, paso = 4, reloj = 0;
    const alto = esReactor ? 600 : 300;
    const sinVerdePor = [], pistaOcupada = false, parar = false, deja = false, rev = {}, tm = {}, av = {};
    ${leyes}
    return {
      base: (s, c, dt, x, z) => {
        const sobre = s.position.y - cota;
        c.aileron = alabear(s, rumboA(s, x, z), (20 * Math.PI) / 180);
        c.rudder = pedal(s, dt);
        c.elevator = porSubida(s, acota((alto - sobre) * 0.12, -4, 3), dt);
        c.throttle = gasPara(s, vref * 1.35, dt);
      },
      final: (c, ahora, dt) => {
        const s = o.estado();
        const ej = o.ejercicio();
        const p = enPista(s.position.x, s.position.z);
        const sobre = s.position.y - cota;
        c.rudder = pedal(s, dt);
        ${final}
      },
      get quiere() { return quiereAlabeo; },
      get dePedal() { return dePedal; },
      get toco() { return tocoEn; },
      get enTierra() { return { desvio: enTierraDesvio, pedal: enTierraPedal, donde: enTierraDonde }; },
    };`,
  );
}

/**
 * Una final. `p.avion`, `p.piloto` (de `elPiloto`), `p.semilla`, `p.motor` el
 * parado (0, 1 o null), `p.viento` nudos y `p.vientoDe` grados desde el eje,
 * `p.dt` el paso del juego, `p.masa`, `p.sinRacha`, `p.conTraza`.
 */
export function vuelaLaFinal(p) {
  const a = aircraftById(p.avion);
  const tier = p.peldano ? peldanos.TIERS.find((t) => t.id === p.peldano) : peldanos.TAGUATO;
  const DT = p.dt ?? 1 / 40;
  const COTA = p.cota ?? 24;
  const aire = aireDelParte(20, COTA, 1013);
  const LARGO = p.largo ?? 3100;
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => COTA, assist: tier.assists });
  m.ponerAire(aire);
  if (p.masa) m.ponerMasa(p.masa);
  const h = 0;
  const pista = { x: 0, z: -LARGO / 2, heading: 0, length: LARGO, width: 45, desplazado: 0 };
  const vref = p.vref ?? a.approachSpeed;
  const esReactor = vref > 60;
  const alto = esReactor ? 600 : 300;
  const tendido = esReactor ? 4500 : vref > 45 ? 2600 : 2200;
  const largoDeFinal = esReactor ? 11000 : vref > 45 ? 6000 : 5000;
  const enPista = (x, z) => ({ a: -z, c: x });
  const aMundo = (al, c) => ({ x: c, z: -al });
  const error = (x, y) => {
    let e = x - y;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    return e;
  };
  const acota = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lado = p.lado ?? 1;
  // En la base, rumbo al punto de la final, donde deja los puntos del circuito.
  const x0 = lado * Math.min(tendido, 1800);
  const z0 = largoDeFinal + (esReactor ? 1100 : 500);
  m.reset({
    position: new Vector3(x0, COTA + alto, z0),
    heading: -lado * 60 * GRADO,
    airspeed: vref * 1.35,
    equilibrado: true,
    flapsDelEquilibrio: p.flaps0 ?? 1 / 3,
  });
  const kt = (p.viento ?? 20) * NUDO;
  const de = (p.vientoDe ?? 3.7) * GRADO;
  m.ponerViento(-Math.sin(de) * kt, Math.cos(de) * kt);
  const rafagas = new Rafagas(p.semilla);
  const c = neutralControls();
  c.engineOn = true;
  c.flaps = p.flaps0 ?? 1 / 3;
  c.throttle = 0.4;
  let pideFlaps = c.flaps;
  let pideTren = p.trenFuera === false ? 0 : 1;
  c.tren = pideTren;
  let reloj = 0;
  const o = {
    estado: () => m.state,
    reloj: () => reloj,
    ejercicio: () => ({ fase: "fallo" }),
    actitud: () => ({ cabeceo: pitchAngleOf(m.state.orientation), alabeo: bankAngleOf(m.state.orientation) }),
    pedirTren: (x) => {
      pideTren = x ? 1 : 0;
    },
    pedirFlaps: (x) => {
      pideFlaps = x;
    },
    indicada: () => indicadaDe(m.state, aire),
    controles: () => c,
    trafico: () => [],
    avion: () => a,
  };
  const piloto = p.piloto({
    o,
    pista,
    cota: COTA,
    h,
    vref,
    vfe: p.vfe ?? 90,
    modo: p.modo ?? "despues",
    esReactor,
    enPista,
    aMundo,
    error,
    acota,
    aircraftById,
    alabeoAFondo,
    TIERS: peldanos.TIERS,
    avionId: p.avion,
    peldano: tier.id,
  });
  if (p.motor !== null && p.motor !== undefined) {
    m.step(DT, c);
    m.pararMotor(p.motor);
    m.asegurarMotor?.(p.motor);
  }
  let enFinal = false;
  const traza = [];
  let sig = 0;
  let toco = null;
  const x = { enLos2000: 0, en500: null, caida: null, betaRms: 0, ktRms: 0, vaivenDelGas: 0 };
  let vsAntes = 0;
  let cuantas = 0;
  let gasMin = 1;
  let gasMax = 0;
  for (let i = 0; i < 700 / DT; i++) {
    const s = m.state;
    const q = enPista(s.position.x, s.position.z);
    const aireAqui = {
      sobreElSuelo: s.heightAboveGround,
      vientoKt: p.viento ?? 20,
      baseDeNubes: null,
      altura: s.position.y,
      rugosidad: p.rugosidad ?? 0.05,
      calor: p.calor ?? 0.45,
    };
    const r = rafagas.paso(DT, {
      sigma: p.sigma ?? cuantoSeMueve(aireAqui) * (p.porSigma ?? 1),
      constancia: p.constancia ?? constanciaDe(causasDe(aireAqui)),
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
    if (s.crashed) return { roto: true, a: q.a, c: q.c, toco, ...x, traza };
    if (!enFinal) {
      const w = aMundo(-largoDeFinal, 0);
      piloto.base(s, c, DT, w.x, w.z);
      if (Math.hypot(s.position.x - w.x, s.position.z - w.z) < 700) enFinal = true;
    } else piloto.final(c, reloj, DT);
    const deFlaps = DT / (a.tardanLosFlaps || 1);
    c.flaps += acota(pideFlaps - c.flaps, -deFlaps, deFlaps);
    c.tren += acota(pideTren - c.tren, -DT / 10, DT / 10);
    if (!s.onGround && enFinal && q.a > -2000) x.enLos2000 = Math.max(x.enLos2000, Math.abs(q.c));
    if (!s.onGround && enFinal && q.a > -4000 && q.a < -200) {
      cuantas++;
      x.betaRms += (s.beta / GRADO) ** 2;
      x.ktRms += ((s.airspeed - vref * 1.1) / NUDO) ** 2;
      gasMin = Math.min(gasMin, m.gasDelMotor());
      gasMax = Math.max(gasMax, m.gasDelMotor());
    }
    if (x.en500 === null && enFinal && s.position.y - COTA < 152) x.en500 = q.c;
    if (enFinal && !toco && s.onGround) x.caida = -vsAntes;
    vsAntes = s.velocity.y;
    if (enFinal && !toco && s.onGround)
      toco = { a: q.a, c: q.c, vs: s.verticalSpeed, kt: s.airspeed / NUDO, cab: pitchAngleOf(s.orientation) / GRADO };
    if (p.conTraza && reloj >= sig) {
      sig += p.cada ?? 0.5;
      traza.push({
        t: reloj,
        f: enFinal ? 1 : 0,
        a: q.a,
        c: q.c,
        alto: s.position.y - COTA,
        traza: Math.atan2(s.velocity.x, -s.velocity.z) / GRADO,
        rumbo: error(s.heading, 0) / GRADO,
        alabeo: bankAngleOf(s.orientation) / GRADO,
        quiere: piloto.quiere / GRADO,
        al: c.aileron,
        p: s.rollRate / GRADO,
        r: s.yawRate / GRADO,
        beta: s.beta / GRADO,
        pedal: c.rudder,
        dePedal: piloto.dePedal,
        gas: c.throttle,
        da: m.gasDelMotor(),
        ias: indicadaDe(s, aire) / NUDO,
        vs: s.verticalSpeed,
        cab: pitchAngleOf(s.orientation) / GRADO,
        elev: c.elevator,
        rx: sopla.x,
        ra: -sopla.z,
        ry: sopla.y,
        ral: sopla.alabeo / GRADO,
        flaps: c.flaps,
        suelo: s.onGround ? 1 : 0,
      });
    }
    m.step(DT, c);
    reloj += DT;
    if (s.onGround && s.groundSpeed < 3) break;
    if (q.a > 3500) break;
  }
  x.betaRms = Math.sqrt(x.betaRms / Math.max(1, cuantas));
  x.ktRms = Math.sqrt(x.ktRms / Math.max(1, cuantas));
  x.vaivenDelGas = gasMax - gasMin;
  return { toco, ...x, enTierra: piloto.enTierra, traza };
}
