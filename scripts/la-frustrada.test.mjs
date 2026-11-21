/**
 * **La frustrada de las hélices, como su manual** (H34e). Ver `la-frustrada.mjs`.
 *
 * Cuando la torre mandaba al aire, el piloto del vuelo entero pedía doce
 * grados de morro de golpe: el JAZ 40 de H45b llegó a 2,04 g con el ala por
 * encima del avisador a sesenta metros, y la avioneta de la ronda c31 subía a
 * 57–59 nudos con la primera muesca y la racha la llevó al avisador a 125 m.
 * La ley nueva lleva el morro a ocho grados a tres por segundo, a la
 * velocidad de la frustrada y lejos del avisador, con el gas a fondo y los
 * flaps de muesca en muesca.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "../src/flight/fdm";
import { aircraftById } from "../src/flight/aircraft";
import { TAGUATO } from "../src/flight/tiers";
import { neutralControls } from "../src/flight/model";
import { aireDelParte, airDensity, SEA_LEVEL_DENSITY } from "../src/flight/atmosphere";
import { mandosPara, memoriaNueva } from "../src/flight/piloto-automatico";
import { mueveLosFlaps, muescasDeLaPalanca, muescaDeAterrizaje } from "../src/flight/flaps";
import { compensadorDeDespegue } from "../src/flight/compensador-de-despegue";
import { maniobraCon } from "../src/flight/velocidades-de-despegue";
import { pitchAngleOf } from "../src/ui/actitud";
import {
  CABECEO_DE_LA_FRUSTRADA,
  MARGEN_AL_AVISADOR,
  RITMO_DE_LA_FRUSTRADA,
  palancaDeLaFrustrada,
} from "./la-frustrada.mjs";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;

describe("la palanca de la frustrada", () => {
  const final = {
    cabeceo: -3 * GRADO,
    ritmo: 0,
    alfa: 2 * GRADO,
    avisador: 12 * GRADO,
    indicada: 44,
    minima: 42,
    referencia: -3 * GRADO,
    acumulado: -0.14,
    palanca: -0.14,
    dt: 0.1,
  };

  it("arranca desde la palanca de la final y no la mueve más deprisa que una mano", () => {
    let p = { ...final };
    for (let i = 0; i < 80; i++) {
      const r = palancaDeLaFrustrada(p);
      expect(Math.abs(r.palanca - p.palanca)).toBeLessThanOrEqual(0.1 + 1e-9);
      // El morro, como si siguiera a la referencia con un segundo de retraso.
      p = { ...p, ...r, cabeceo: p.cabeceo + (r.referencia - p.cabeceo) * 0.1 };
    }
    // Y el primer paso, ni una décima: lo que falta de actitud es nada.
    expect(Math.abs(palancaDeLaFrustrada(final).palanca - final.palanca)).toBeLessThan(0.05);
  });

  it("la actitud pedida sube a tres grados por segundo y se queda en ocho", () => {
    let p = { ...final };
    const subidas = [];
    for (let i = 0; i < 60; i++) {
      const r = palancaDeLaFrustrada(p);
      subidas.push((r.referencia - p.referencia) / p.dt);
      p = { ...p, ...r, cabeceo: r.referencia };
    }
    expect(Math.max(...subidas)).toBeLessThanOrEqual(RITMO_DE_LA_FRUSTRADA + 1e-9);
    expect(p.referencia).toBeCloseTo(CABECEO_DE_LA_FRUSTRADA, 9);
    expect(CABECEO_DE_LA_FRUSTRADA).toBeCloseTo(8 * GRADO, 9);
  });

  it("y si falta velocidad, menos morro: dos grados por cada m/s", () => {
    let p = { ...final, cabeceo: 8 * GRADO, referencia: 8 * GRADO, indicada: 40, minima: 42 };
    for (let i = 0; i < 60; i++) {
      const r = palancaDeLaFrustrada(p);
      p = { ...p, ...r, cabeceo: r.referencia };
    }
    expect(p.referencia).toBeCloseTo(4 * GRADO, 9);
  });

  it("y con el ala cerca del avisador, ni un grado más de morro, y la palanca aflojando", () => {
    const lejos = { ...final, cabeceo: 4 * GRADO, referencia: 4 * GRADO, alfa: 6 * GRADO };
    const cerca = { ...lejos, alfa: lejos.avisador - MARGEN_AL_AVISADOR / 2 };
    const r = palancaDeLaFrustrada(cerca);
    expect(r.referencia).toBeLessThanOrEqual(cerca.cabeceo);
    expect(r.palanca).toBeLessThan(palancaDeLaFrustrada(lejos).palanca);
  });
});

/*
 * **Con el modelo del juego**: la frustrada desde una final estabilizada a la
 * Vref, con los flaps de aterrizar, el compensador donde lo deja el despegue
 * y sesenta metros de ruedas, en Los Rodeos —632 m, 21 °C— y en Taguató. La
 * ley de antes es la del banco hasta H34e: la avioneta, doce grados con la
 * mano a su ritmo y su freno; el bimotor, doce grados pedidos de golpe, el
 * gas de subida y la primera muesca de una vez. Y encima de las dos, el tope
 * de ángulo de `limitarElAngulo` en cada fotograma, como en el banco. Hasta
 * los ciento veinte metros, la altura de aceleración.
 */
const COTA = 632;
const AIRE = aireDelParte(21, COTA);
const raiz = (y) => Math.sqrt(airDensity(y, AIRE) / SEA_LEVEL_DENSITY);

function frustrar(id, ley, racha = null) {
  const a = aircraftById(id);
  const muescas = muescasDeLaPalanca(a);
  const aterrizar = muescas[muescaDeAterrizaje(a)];
  const conElAutomatico = (a.cruiseSpeed ?? 0) > 90;
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => COTA, assist: TAGUATO.assists });
  m.ponerAire(AIRE);
  const y0 = COTA + a.gearHeight + 75;
  m.reset({
    position: new Vector3(0, y0, 0),
    heading: 0,
    airspeed: a.approachSpeed / raiz(y0),
    equilibrado: true,
    flapsDelEquilibrio: aterrizar,
  });
  const s = m.state;
  const ind = () => s.airspeed * raiz(s.position.y);
  const alto = () => s.position.y - COTA - a.gearHeight;
  const c = neutralControls();
  c.engineOn = true;
  c.flaps = aterrizar;
  c.tren = 1;
  c.trim = compensadorDeDespegue(a).marca;
  c.automatico = true;
  const gas = m.gasPara(s.airspeed, { flaps: aterrizar, tren: 1, aerofrenos: 0 }, -3 * GRADO);
  c.throttle = gas;
  const dt = 1 / 60;
  // La final, con el automático en la senda, hasta los sesenta metros.
  const mem = memoriaNueva();
  for (let t = 0; alto() > 60 && t < 30; t += dt) {
    const out = mandosPara(
      {
        heading: s.heading,
        alabeo: 0,
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: ind(),
        gas: c.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
      },
      { rumbo: null, altitud: y0 - s.airspeed * Math.sin(3 * GRADO) * t, ritmo: -s.airspeed * Math.sin(3 * GRADO), velocidad: null },
      dt,
      mem,
    );
    c.elevator = out.elevator;
    c.throttle = Math.max(0, Math.min(1, gas + (a.approachSpeed - ind()) * 0.05));
    m.step(dt, c);
  }
  // La orden.
  const cerca = (f) => muescas.reduce((k, d, i) => (Math.abs(d - f) < Math.abs(muescas[k] - f) ? i : k), 0);
  let quiero =
    ley === "nueva" ? muescas[Math.max(1, cerca(aterrizar) - 1)] : conElAutomatico ? muescas[1] : Math.min(2 / 3, aterrizar);
  let flaps = aterrizar;
  let palanca = c.elevator;
  let referencia = pitchAngleOf(s.orientation);
  let acumulado = c.elevator;
  const md = { carga: 0, margen: Infinity, aviso: 0, indicada: Infinity, bajo: Infinity, salto: 0, alos120: NaN };
  const ritmoDelMorro = () => {
    const { x, y, z, w } = s.orientation;
    const arriba = 1 - 2 * (x * x + z * z);
    const derecha = 2 * (x * y + w * z);
    return (s.pitchRate * arriba + s.yawRate * derecha) / Math.max(0.2, Math.cos(pitchAngleOf(s.orientation)));
  };
  for (let i = 0; i < 60 * 45 && alto() < 120; i++) {
    const t = i * dt;
    if (racha !== null) {
      // Una racha «1−cos» de tres metros por segundo hacia arriba, en dos segundos.
      const u = (t - racha) / 2;
      m.ponerRacha(0, u > 0 && u < 1 ? 1.5 * (1 - Math.cos(2 * Math.PI * u)) : 0, 0);
    }
    // Los flaps, de muesca en muesca: la de antes del bimotor los dejaba en la primera de una vez.
    const k = cerca(quiero);
    if ((ley === "nueva" || !conElAutomatico) && k > 1 && Math.abs(flaps - quiero) < 0.02) {
      if (s.verticalSpeed > 1 && ind() >= maniobraCon(a, muescas[k - 1])) quiero = muescas[k - 1];
    }
    flaps = mueveLosFlaps(flaps, quiero, dt, a.tardanLosFlaps ?? 9);
    c.flaps = flaps;
    if (s.verticalSpeed > 1 && alto() > 30) c.tren = 0;
    // El bucle del banco, a diez por segundo.
    if (i % 6 === 0) {
      const antes = c.elevator;
      const cabeceo = pitchAngleOf(s.orientation);
      if (ley === "nueva") {
        const r = palancaDeLaFrustrada({
          cabeceo,
          ritmo: ritmoDelMorro(),
          alfa: s.alpha,
          avisador: s.stallWarningAlpha,
          indicada: ind(),
          minima: maniobraCon(a, flaps) + 2.5,
          referencia,
          acumulado,
          palanca,
          dt: 0.1,
        });
        referencia = r.referencia;
        acumulado = r.acumulado;
        c.elevator = r.palanca;
        c.throttle = 1;
        c.automatico = true;
      } else {
        c.automatico = false;
        const actitud = Math.max(-0.35, Math.min(0.6, (12 * GRADO - cabeceo) * 4));
        if (conElAutomatico) {
          c.elevator = actitud;
          const subida = Math.max(a.rotationSpeed * 1.15, a.velocidadDeCircuito ?? a.approachSpeed * 1.3);
          c.throttle = Math.max(0, Math.min(1, 0.55 + (subida - s.airspeed) * 0.04));
        } else {
          const aSuRitmo = actitud <= 0 ? actitud : Math.max(0, actitud - 10 * Math.max(0, s.pitchRate - 3 * GRADO));
          const quiere = Math.max(-0.35, Math.min(0.6, aSuRitmo - 1.5 * ritmoDelMorro()));
          c.elevator = palanca + Math.max(-0.1, Math.min(0.1, quiere - palanca));
          c.throttle = 1;
        }
      }
      md.salto = Math.max(md.salto, Math.abs(c.elevator - antes));
    }
    // El tope de ángulo del banco, en cada fotograma: ver `limitarElAngulo`.
    const pedida = c.elevator;
    const tope = (-a.aero.cmAlpha * (s.stallWarningAlpha - 0.035) - a.aero.cm0) / a.aero.cmElevator;
    c.elevator = Math.min(pedida, s.stallWarning ? 0 : Math.max(0, tope));
    m.step(dt, c);
    palanca = c.elevator;
    c.elevator = pedida;
    md.carga = Math.max(md.carga, s.loadFactor);
    md.margen = Math.min(md.margen, (s.stallWarningAlpha - s.alpha) / GRADO);
    if (s.stallWarning) md.aviso += dt;
    md.indicada = Math.min(md.indicada, ind() / NUDO);
    md.bajo = Math.min(md.bajo, alto());
    if (alto() >= 120) md.alos120 = t;
  }
  return md;
}

describe("y con el modelo del juego, la frustrada desde sesenta metros", () => {
  it("el JAZ 40 ya no tira de golpe: de casi 1,9 g y el ala a un grado del avisador, a 1,3 g y lejos", () => {
    const antes = frustrar("jaz-40", "antes");
    const ahora = frustrar("jaz-40", "nueva");
    // Lo de H45b: el tirón, con el ala casi en el avisador.
    expect(antes.carga).toBeGreaterThan(1.7);
    expect(antes.margen).toBeLessThan(2);
    expect(antes.salto).toBeGreaterThan(0.5);
    // Con la ley nueva: suave, lejos del avisador y sin perder más de diez metros.
    expect(ahora.carga).toBeLessThan(1.3);
    expect(ahora.margen).toBeGreaterThan(5);
    expect(ahora.aviso).toBe(0);
    expect(ahora.salto).toBeLessThanOrEqual(0.1 + 1e-9);
    expect(ahora.bajo).toBeGreaterThan(50);
    expect(ahora.alos120).toBeLessThan(25);
  });

  it("la avioneta sube a la velocidad de la frustrada, no a la de casi perder", () => {
    const antes = frustrar("jaz-20", "antes");
    const ahora = frustrar("jaz-20", "nueva");
    // Lo de c31: con doce grados, a 59 nudos a los ciento veinte metros, la primera muesca fuera.
    expect(antes.indicada).toBeLessThan(60);
    // Con ocho y la velocidad mandando, a la de maniobra de la primera muesca o más.
    expect(ahora.indicada).toBeGreaterThan(maniobraCon(aircraftById("jaz-20"), 1 / 3) / NUDO);
    expect(ahora.margen).toBeGreaterThan(antes.margen + 1);
    expect(ahora.aviso).toBe(0);
    expect(ahora.bajo).toBeGreaterThan(50);
  });

  it("y con una racha de tres metros por segundo, a cualquier hora de la subida, el ala lejos del avisador", () => {
    for (const id of ["jaz-20", "jaz-40", "jaz-50", "jaz-60"]) {
      let peorAntes = Infinity;
      let peorAhora = Infinity;
      for (const racha of [1, 4, 8, 12, 16, 20]) {
        peorAntes = Math.min(peorAntes, frustrar(id, "antes", racha).margen);
        const ahora = frustrar(id, "nueva", racha);
        peorAhora = Math.min(peorAhora, ahora.margen);
        expect(ahora.aviso, `${id} con la racha a los ${racha} s`).toBe(0);
      }
      expect(peorAhora, id).toBeGreaterThan(3);
      expect(peorAhora, id).toBeGreaterThan(peorAntes);
    }
  });
});
