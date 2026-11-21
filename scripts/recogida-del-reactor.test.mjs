/**
 * **La recogida de un reactor grande nota la racha con su tamaño** (H46). Ver
 * `recogida-del-reactor.mjs`.
 *
 * El JAZ 120 del vuelo entero de Gran Canaria, con veinte nudos de cara,
 * recogía igual y fallaba por un lado o por el otro según llegara: en la tanda
 * 18 tocó a 319 m pero a 2,35 m/s, y en la 19 a 1,97 m/s pero a 651 m, pasada
 * la zona. El término de lo que se nota en el asiento se afinó con el JAZ 90, y
 * un ala de sesenta metros tarda el doble en dar lo que se le pide: la racha
 * que hunde le llegaba tarde al lazo, y la que sube lo hacía pasarse y flotar.
 *
 * Aquí se vuela la recogida del banco —la de `recoger` para una pista llana,
 * desde su módulo— con el modelo del juego, su automático en la senda, el gas
 * del banco y las rachas del juego, como en la mesa de H46.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "../src/flight/fdm";
import { aircraftById } from "../src/flight/aircraft";
import { TAGUATO } from "../src/flight/tiers";
import { neutralControls } from "../src/flight/model";
import { Rafagas } from "../src/flight/rafagas";
import { airDensity, SEA_LEVEL_DENSITY } from "../src/flight/atmosphere";
import { autoridadDelTimon, mandosPara, memoriaNueva } from "../src/flight/piloto-automatico";
import { muescaDeAterrizaje } from "../src/flight/flaps";
import { pitchAngleOf } from "../src/ui/actitud";
import {
  palancaDelReactorEnLaRecogida,
  pideAlPuntoDeToma,
  porLoQueAceleraElReactor,
} from "./recogida-del-reactor.mjs";

const NUDO = 0.514444;
const SENDA = Math.tan((3 * Math.PI) / 180);
const DT = 1 / 60;

/**
 * **La de antes**: la misma recogida, con el término de la carga sin el
 * tamaño, que es como era hasta H46. Se construye desde el texto del módulo
 * —que es como lo recibe la página del banco— quitándole solo eso.
 */
const textoDeAhora = `${porLoQueAceleraElReactor.toString()}\n${palancaDelReactorEnLaRecogida.toString()}`;
const SIN_TAMANO = textoDeAhora.replace(
  "const porSuTamano = Math.max(1, p.envergadura / 30);",
  "const porSuTamano = 1;",
);
const palancaDeAntes = new Function(`${SIN_TAMANO}\nreturn palancaDelReactorEnLaRecogida;`)();

/**
 * Una final del JAZ 120 sobre una pista llana a 24 m, con el viento de cara y
 * las rachas de la semilla, hasta tocar. Devuelve a cuántos metros del umbral
 * toca y a cuánto baja.
 */
function vuelaLaFinal(palancaDeLaRecogida, semilla, deCara = 10.3, sigma = 1, alPunto = false) {
  const a = aircraftById("jaz-120");
  const cota = 24;
  const tren = a.gearHeight;
  const porAngulo = Math.abs(a.aero.cmAlpha / a.aero.cmElevator);
  const raiz = (y) => Math.sqrt(airDensity(y) / SEA_LEVEL_DENSITY);
  const flaps = muescaDeAterrizaje(a);
  // Apunta a 150 m del umbral: así empieza a recoger donde en Gran Canaria, a −14 m.
  const apunta = 150;
  const x0 = -3000;
  const h0 = (apunta - x0) * SENDA + tren;
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => cota, assist: TAGUATO.assists });
  // A la Vref más ocho, la de la tanda 18 con veinte nudos de cara.
  const vTas = (a.approachSpeed + 8 * NUDO) / raiz(cota + h0);
  m.reset({
    position: new Vector3(0, cota + h0, -x0),
    heading: 0,
    airspeed: vTas,
    equilibrado: true,
    flapsDelEquilibrio: flaps,
  });
  m.ponerViento(0, deCara);
  const rafagas = new Rafagas(semilla);
  const c = neutralControls();
  c.flaps = flaps;
  c.tren = 1;
  c.trim = m.timonDeEquilibrio(flaps);
  c.throttle = Math.max(0, Math.min(1, m.gasPara(vTas)));
  c.automatico = true;
  const mem = memoriaNueva();
  let errorAntes = null;
  let palancaMedia = null;
  let rec = null;
  let sinPerseguir = null;
  let caida = 0;
  for (let i = 0, t = 0; i < 60 * 200; i++, t += DT) {
    const s = m.state;
    const along = -s.position.z;
    const ruedas = s.position.y - cota - tren;
    const r = rafagas.paso(DT, {
      sigma,
      constancia: 0.6,
      sobreElSuelo: Math.max(0, ruedas + tren),
      enTierra: s.onGround,
      velocidad: s.airspeed,
      densidad: airDensity(s.position.y),
      envergadura: a.wingSpan,
      cuerda: a.chord,
      rumbo: Math.atan2(s.velocity.x, -s.velocity.z),
    });
    m.ponerRacha(r.x, r.y, r.z, r.alabeo);
    if (s.onGround) return { metros: along, caida };
    caida = -s.velocity.y;
    const porElSuelo = Math.hypot(s.velocity.x, s.velocity.z);
    if (!rec) {
      // La senda con el automático del juego, y en los últimos treinta metros, la recta que lleva.
      let pedida = (apunta - along) * SENDA + tren + cota;
      if (ruedas < 30) {
        sinPerseguir ??= { y: s.position.y, t };
        pedida = sinPerseguir.y - porElSuelo * SENDA * (t - sinPerseguir.t);
      }
      const out = mandosPara(
        {
          heading: s.heading,
          alabeo: 0,
          cabeceo: pitchAngleOf(s.orientation),
          altitud: s.position.y,
          vertical: s.velocity.y,
          velocidad: s.airspeed * raiz(s.position.y),
          gas: c.throttle,
          verdadera: s.airspeed,
          ritmoDeCabeceo: s.pitchRate,
          timon: i === 0 ? c.elevator : undefined,
          autoridadDelTimon: autoridadDelTimon(a, airDensity(s.position.y), s.airspeed),
          subeElAire: r.y,
        },
        { rumbo: null, altitud: pedida, ritmo: -porElSuelo * SENDA, velocidad: null },
        DT,
        mem,
      );
      c.elevator = out.elevator;
      palancaMedia =
        palancaMedia === null ? c.elevator : palancaMedia + (c.elevator - palancaMedia) * DT / 2;
      // El gas del banco en la velocidad, proporcional y que acumula.
      const err = (a.approachSpeed + 8 * NUDO) / raiz(s.position.y) - s.airspeed;
      c.throttle = Math.max(0, Math.min(1, c.throttle + (err - (errorAntes ?? err)) * 0.04 + err * 0.01 * DT));
      errorAntes = err;
      // La recogida empieza como en el banco: a tres segundos y pico de senda, por el aire.
      const altura = Math.max(4, Math.min(15, Math.max(s.airspeed * SENDA, -s.velocity.y) * 3.2));
      if (ruedas <= altura && -along < altura / SENDA + 150)
        rec = {
          altura,
          caida: Math.max(1.2, Math.min(6, Math.max(porElSuelo * SENDA, Math.min(-s.velocity.y, porElSuelo * SENDA * 1.1)))),
          palanca: palancaMedia,
          acumulado: 0,
          velocidad: s.airspeed,
          gas: c.throttle,
        };
    }
    if (rec) {
      c.elevator = palancaDeLaRecogida({
        ruedas,
        vertical: s.verticalSpeed,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        carga: s.loadFactor,
        porAngulo,
        envergadura: a.wingSpan,
        dt: DT,
        presion: Math.min(1, (a.approachSpeed / raiz(s.position.y) / Math.max(1, s.airspeed)) ** 2),
        rec,
        // Y dónde va, si se le dice: para ir a la pista en su punto (H53).
        ...(alPunto ? { pasado: along, porElSuelo } : {}),
      });
      // El gas, al ralentí a los treinta pies.
      c.throttle = ruedas > 30 * 0.3048 ? rec.gas : 0;
    }
    m.step(DT, c);
  }
  return { metros: Infinity, caida };
}

/** Cuántas de las finales de las semillas tocan pasados los 600 m, y cuántas a más de 2 m/s. */
function mesa(palancaDeLaRecogida, semillas, alPunto = false) {
  let largas = 0;
  let duras = 0;
  let laMasLarga = 0;
  let laMasDura = 0;
  for (let k = 1; k <= semillas; k++) {
    const r = vuelaLaFinal(palancaDeLaRecogida, k, 10.3, 1, alPunto);
    if (r.metros > 600) largas++;
    if (r.caida > 2) duras++;
    laMasLarga = Math.max(laMasLarga, r.metros);
    laMasDura = Math.max(laMasDura, r.caida);
  }
  return { largas, duras, laMasLarga, laMasDura };
}

describe("la recogida de un reactor", () => {
  it("nota la carga con su tamaño: el JAZ 120 el doble que el JAZ 90, y el JAZ 90 como antes", () => {
    const p = { porAngulo: 2, acelera: 0.5, carga: 0.9 };
    const deAntes = (q) => q.porAngulo * 0.04 * (q.acelera - (q.carga - 1) * 9.81);
    expect(porLoQueAceleraElReactor({ ...p, envergadura: 26 })).toBeCloseTo(deAntes(p), 9);
    expect(porLoQueAceleraElReactor({ ...p, envergadura: 59.64 })).toBeCloseTo(deAntes(p) * (59.64 / 30), 9);
    // La de antes de la prueba de abajo es de verdad la de antes, y no la misma.
    expect(SIN_TAMANO).not.toBe(textoDeAhora);
  });

  it("y con el modelo del juego, el JAZ 120 con veinte nudos de cara y rachas toca en la zona y sin golpe", () => {
    const antes = mesa(palancaDeAntes, 60);
    const ahora = mesa(palancaDelReactorEnLaRecogida, 60);
    // Con la de antes, la de las tandas 18 y 19: por un lado o por el otro, cuatro o cinco de cada diez.
    expect(antes.largas + antes.duras).toBeGreaterThan(18);
    // Con el tamaño, menos de la mitad.
    expect(ahora.largas + ahora.duras).toBeLessThan((antes.largas + antes.duras) / 2);
    expect(ahora.largas).toBeLessThan(antes.largas);
    expect(ahora.duras).toBeLessThan(antes.duras);
  });

  it("y en aire quieto toca en la zona, recogido", () => {
    const r = vuelaLaFinal(palancaDelReactorEnLaRecogida, 1, 10.3, 0);
    expect(r.metros).toBeGreaterThan(150);
    expect(r.metros).toBeLessThan(600);
    expect(r.caida).toBeLessThan(2);
  });
});

/**
 * **Y a la pista en su punto, sin aguantarlo en el aire** (H53). Ver
 * `pideAlPuntoDeToma`.
 *
 * El JAZ 120 del vuelo entero de Gran Canaria tocó a 319, 651, 572 y 728 m en
 * las rondas 29 a 32, con la zona acabando en 600. En la mesa de H53 (la de
 * H46, sobre la de H45b) las largas no son globos: son recogidas de doce
 * segundos a medio metro del suelo, con la palanca sostenida mientras la
 * velocidad se va por debajo de la Vref menos cinco, que es aguantar el avión
 * en el aire. El manual: «Fly the airplane onto the runway at the desired
 * touchdown point».
 */
describe("la recogida de un reactor va a la pista en su punto", () => {
  const PUNTO = 1500 * 0.3048;
  const g = { porElSuelo: 70, caida: 3.7 };

  it("mientras va a llegar antes del punto, manda el perfil", () => {
    expect(pideAlPuntoDeToma({ ...g, pide: -0.8, ruedas: 1, pasado: 100 })).toBeNull();
    expect(pideAlPuntoDeToma({ ...g, pide: -3, ruedas: 10, pasado: -50 })).toBeNull();
  });

  it("si no, pide lo que lo pone en el suelo en el punto, y nunca más que la senda", () => {
    // A un metro, con 0,4 s hasta el punto: el medio segundo de suelo, 2 m/s.
    expect(pideAlPuntoDeToma({ ...g, pide: -0.8, ruedas: 1, pasado: PUNTO - 28 })).toBeCloseTo(-2, 9);
    // Pasado, a cuatro metros: lo que bajaba la senda, no más.
    expect(pideAlPuntoDeToma({ ...g, pide: -0.8, ruedas: 4, pasado: PUNTO + 50 })).toBeCloseTo(-3.7, 9);
    // Y con un perfil que pide más que la senda, el perfil.
    expect(pideAlPuntoDeToma({ ...g, pide: -4, ruedas: 4, pasado: PUNTO + 50 })).toBeNull();
  });

  it("y la página lo recibe como texto: no toca nada de fuera", () => {
    const enLaPagina = new Function(`${pideAlPuntoDeToma.toString()}\nreturn pideAlPuntoDeToma;`)();
    const p = { ...g, pide: -0.8, ruedas: 1, pasado: PUNTO - 28 };
    expect(enLaPagina(p)).toBe(pideAlPuntoDeToma(p));
  });

  it("y con el modelo del juego, el JAZ 120 con veinte nudos de cara y rachas deja de flotar sin tocar más duro", () => {
    const sinPunto = mesa(palancaDelReactorEnLaRecogida, 60);
    const conPunto = mesa(palancaDelReactorEnLaRecogida, 60, true);
    expect(sinPunto.largas).toBeGreaterThan(0);
    expect(conPunto.largas).toBeLessThan(sinPunto.largas);
    // Medido: de 5 largas a ninguna, la más larga de 855 a 560 m; las duras, 6 y 6.
    expect(conPunto.laMasLarga).toBeLessThan(sinPunto.laMasLarga);
    expect(conPunto.laMasLarga).toBeLessThan(650);
    expect(conPunto.duras).toBeLessThanOrEqual(sinPunto.duras + 2);
    expect(conPunto.laMasDura).toBeLessThan(3);
  });
});
