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
import { DURO_DE_TRANSPORTE } from "../src/flight/aterrizaje";
import { TAGUATO } from "../src/flight/tiers";
import { neutralControls } from "../src/flight/model";
import { Rafagas } from "../src/flight/rafagas";
import { airDensity, SEA_LEVEL_DENSITY } from "../src/flight/atmosphere";
import { autoridadDelTimon, mandosPara, memoriaNueva } from "../src/flight/piloto-automatico";
import { muescaDeAterrizaje } from "../src/flight/flaps";
import { bankAngleOf, pitchAngleOf } from "../src/ui/actitud";
import {
  flotaElReactor,
  gasDelReactorEnLaRecogida,
  morroQueFaltaAlPunto,
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
function vuelaLaFinal(
  palancaDeLaRecogida,
  semilla,
  deCara = 10.3,
  sigma = 1,
  alPunto = false,
  conVref = undefined,
  gasDeAntes = false,
) {
  const a = aircraftById("jaz-120");
  const vref = conVref ?? a.approachSpeed;
  const aLaQueVa = vref + 8 * NUDO;
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
  const vTas = aLaQueVa / raiz(cota + h0);
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
    /*
     * **Y las alas, sostenidas**, como las sostiene el piloto del banco
     * siguiendo el localizador. Con el alerón suelto, las rachas inclinaban el
     * avión y algunas finales se iban de lado y llegaban ladeadas: en la mesa
     * de H55, con el E170 y rachas fuertes, 13 de 200 no llegaron a la pista,
     * y eso no lo hace el banco del navegador (enmienda H55b del ADR 0027).
     */
    c.aileron = Math.max(-1, Math.min(1, -(1.5 * bankAngleOf(s.orientation) + 0.5 * s.rollRate)));
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
      // Y lo que pica el suelo, sumado y fuera de la media, como el banco (H56).
      c.elevator = Math.max(-1, Math.min(1, out.elevator + m.palancaDelSuelo()));
      // El gas del banco en la velocidad, proporcional y que acumula.
      const err = aLaQueVa / raiz(s.position.y) - s.airspeed;
      // El del banco, con el doble a la tendencia y la mitad a lo acumulado
      // desde que el motor tarda (ADR 0034; `CON_EL_AUTOMATICO`).
      c.throttle = Math.max(0, Math.min(1, c.throttle + (err - (errorAntes ?? err)) * 0.08 + err * 0.005 * DT));
      errorAntes = err;
      // La recogida empieza como en el banco: a tres segundos y pico de senda, por el aire.
      const altura = Math.max(4, Math.min(15, Math.max(s.airspeed * SENDA, -s.velocity.y) * 3.2));
      if (ruedas <= altura && -along < altura / SENDA + 150)
        rec = {
          altura,
          caida: Math.max(1.2, Math.min(6, Math.max(porElSuelo * SENDA, Math.min(-s.velocity.y, porElSuelo * SENDA * 1.1)))),
          palanca: palancaMedia,
          picadoDeLaPalanca: 0,
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
        presion: Math.min(1, (vref / raiz(s.position.y) / Math.max(1, s.airspeed)) ** 2),
        picado: m.palancaDelSuelo(),
        // Y el morro, para que el punto no lo baje de la recogida (H34h).
        cabeceo: pitchAngleOf(s.orientation),
        rec,
        // Y dónde va, si se le dice: para ir a la pista en su punto (H53).
        ...(alPunto ? { pasado: along, porElSuelo } : {}),
      });
      // El gas, al ralentí a los treinta pies o desde que flota (H55c); el de
      // antes, solo a los treinta pies.
      c.throttle = gasDeAntes
        ? ruedas > 30 * 0.3048
          ? rec.gas
          : 0
        : gasDelReactorEnLaRecogida({ gas: rec.gas, ruedas, floto: rec.floto === true });
    }
    m.step(DT, c);
  }
  return { metros: Infinity, caida };
}

/** Cuántas de las finales de las semillas tocan pasados los 600 m, y cuántas a más de 2 m/s. */
function mesa(palancaDeLaRecogida, semillas, alPunto = false, conVref = undefined, gasDeAntes = false) {
  let largas = 0;
  let duras = 0;
  let laMasLarga = 0;
  let laMasDura = 0;
  for (let k = 1; k <= semillas; k++) {
    const r = vuelaLaFinal(palancaDeLaRecogida, k, 10.3, 1, alPunto, conVref, gasDeAntes);
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
    /*
     * Con la de antes, la de las tandas 18 y 19: por un lado o por el otro,
     * cuatro o cinco de cada diez con el 747 que bajaba la final con el morro
     * dos grados por debajo del horizonte (31 de 60). Con la actitud de su
     * manual recoge desde un grado por encima y la de antes falla menos, dos
     * de cada diez (13 de 60: 4 largas y 9 duras); la de ahora, 5 (enmienda
     * H55 del ADR 0027). Con las alas sostenidas y el gas fuera si flota
     * (H55c), la de antes 26 (7 largas y 19 duras) y la de ahora 10 (1 larga
     * y 9 duras). La prueba sigue viendo el fallo y la mejora.
     *
     * Con el motor que tarda (ADR 0034) y el gas de la final del banco con más
     * mano a la tendencia, la de ahora sigue en 10 (ninguna larga y 10 duras)
     * y la de antes baja a 20 (3 largas y 17 duras): el empuje que se va en dos
     * segundos y medio tras el *retard* le suaviza el corte. Así que la mitad
     * justa.
     *
     * Y sosteniendo la actitud y no la palanca (H64), las dos mejoran: la de
     * ahora a 9 (ninguna larga y 9 duras) y la de antes a 14 (2 y 12). Con el
     * tamaño, menos que sin él, y menos duras.
     */
    expect(antes.largas + antes.duras).toBeGreaterThan(10);
    expect(ahora.largas + ahora.duras).toBeLessThan(antes.largas + antes.duras);
    expect(ahora.largas).toBeLessThan(antes.largas);
    expect(ahora.duras).toBeLessThan(antes.duras);
  });

  it("y sostiene lo que pica el suelo (H56): lo suma entero a la palanca de la senda, y a la sostenida lo de más", () => {
    const base = () => ({
      ruedas: 5,
      vertical: -2,
      verdadera: 75,
      ritmoDeCabeceo: 0,
      carga: 1,
      porAngulo: 2,
      envergadura: 59.64,
      dt: 1 / 60,
    });
    const rec = () => ({ altura: 13, caida: 3.5, palanca: 0.1, acumulado: 0, velocidad: 75, picadoDeLaPalanca: 0 });
    const sin = palancaDelReactorEnLaRecogida({ ...base(), rec: rec() });
    const con = palancaDelReactorEnLaRecogida({ ...base(), picado: 0.15, rec: rec() });
    // La palanca de la senda va sin el picado: se suma entero.
    expect(con - sin).toBeCloseTo(0.15, 9);
    // Si no se dice qué lleva la palanca, la de ese instante: solo lo de más.
    const r = { altura: 13, caida: 3.5, palanca: 0.1, acumulado: 0, velocidad: 75 };
    expect(palancaDelReactorEnLaRecogida({ ...base(), picado: 0.15, rec: r })).toBeCloseTo(sin, 9);
    // Y sostenida —sube más de lo que pide—, la de antes con lo que pica de más.
    const sostenida = palancaDelReactorEnLaRecogida({ ...base(), vertical: 1, picado: 0.2, rec: r });
    expect(sostenida).toBeCloseTo(sin + 0.05, 9);
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

  it("y por debajo de los treinta pies, como mucho la senda repartida hasta una toma firme (H34f)", () => {
    const firme = 4 * 0.3048;
    const pies30 = 30 * 0.3048;
    const h = { ...g, pide: -0.8, pasado: PUNTO + 50, altura: 13.4 };
    // A metro y medio, pasado el punto: antes 3 m/s —lo que queda entre medio
    // segundo—; ahora la senda repartida en los treinta pies, 1,6.
    const aMetroYMedio = firme + (3.7 - firme) * (1.5 / pies30);
    expect(pideAlPuntoDeToma({ ...h, ruedas: 1.5 })).toBeCloseTo(-aMetroYMedio, 9);
    expect(pideAlPuntoDeToma({ ...g, pide: -0.8, pasado: PUNTO + 50, ruedas: 1.5 })).toBeCloseTo(-3, 9);
    // Cerca del suelo, poco más que una toma firme; por encima de los treinta pies, la senda.
    expect(pideAlPuntoDeToma({ ...h, ruedas: 0.8 })).toBeCloseTo(-(firme + (3.7 - firme) * (0.8 / pies30)), 9);
    expect(-pideAlPuntoDeToma({ ...h, ruedas: 0.8 })).toBeLessThan(1.5);
    expect(pideAlPuntoDeToma({ ...h, ruedas: 12, pasado: PUNTO + 50 })).toBeCloseTo(-3.7, 9);
    // Y nunca menos que el perfil: si el perfil pide más, el perfil.
    expect(pideAlPuntoDeToma({ ...h, pide: -2.5, ruedas: 1.5 })).toBeNull();
  });

  it("y la página lo recibe como texto: no toca nada de fuera", () => {
    const enLaPagina = new Function(`${pideAlPuntoDeToma.toString()}\nreturn pideAlPuntoDeToma;`)();
    const p = { ...g, pide: -0.8, ruedas: 1, pasado: PUNTO - 28 };
    expect(enLaPagina(p)).toBe(pideAlPuntoDeToma(p));
  });

  it("y con el modelo del juego, el JAZ 120 con veinte nudos de cara y rachas deja de flotar sin tocar más duro", () => {
    /*
     * Con la Vref de las tandas de Gran Canaria que flotaban (H53), 146, y el
     * banco a ella más ocho. Con la del 747 clásico, 142 (H54), cruza a 150 y
     * en estas sesenta ya no flota ninguna sin el punto: la prueba de la regla
     * se queda donde se vio el fallo.
     */
    const deH53 = 146 * NUDO;
    const sinPunto = mesa(palancaDelReactorEnLaRecogida, 60, false, deH53);
    const conPunto = mesa(palancaDelReactorEnLaRecogida, 60, true, deH53);
    expect(sinPunto.largas).toBeGreaterThan(0);
    /*
     * Sosteniendo la actitud (H64), sin el punto flota una (la más larga a
     * 1.222 m) y con él dos, a 670 m como mucho: el punto ya no quita largas
     * en estas sesenta, pero sigue acortando la peor a la mitad.
     */
    expect(conPunto.largas).toBeLessThanOrEqual(sinPunto.largas + 1);
    // Medido, con las alas sostenidas y el gas de H55c: de 5 largas a ninguna, la
    // más larga de 733 a 572 m; las duras, 3 y 2. **Con el motor que tarda**
    // (ADR 0034), de 2 largas a una, la más larga de 1.222 a 670 m; las duras,
    // 4 y 3: lo que empuja todavía tras el *retard* de los treinta pies alarga
    // la que llega rápida, y el punto ya no la deja en 572. Queda apuntado en
    // el ADR 0034.
    expect(conPunto.laMasLarga).toBeLessThan(sinPunto.laMasLarga);
    expect(conPunto.laMasLarga).toBeLessThan(700);
    expect(conPunto.duras).toBeLessThanOrEqual(sinPunto.duras + 2);
    /*
     * Y la regla no pone ninguna más dura que las que ya había: la más dura de
     * estas sesenta, a 146, es la misma final con la regla y sin ella, 2,52
     * m/s con las alas sostenidas (3,22 con el alerón suelto, enmienda H55
     * del ADR 0027).
     */
    expect(conPunto.laMasDura).toBeLessThanOrEqual(sinPunto.laMasDura + 1e-9);
    /*
     * **Y a la Vref del juego, ninguna que la norma llame dura**: los diez pies
     * por segundo de una toma dura de transporte. Se miraba a 146, la de las
     * tandas que flotaban, cuando era la del juego; desde H54 la del juego es
     * 142, y es donde vuela la regla. Ahí la más dura es de 2,94 m/s.
     *
     * **Y lo que flota con energía de sobra, se posa por el gas** (H55c). Con
     * el alerón suelto, ninguna de estas sesenta pasaba de los 600 m; con las
     * alas sostenidas, como las lleva el banco, y el gas de la final hasta los
     * treinta pies aunque flote, dos (814 y 608 m). La de 814 (semilla 13)
     * empezaba a recoger a 12,2 m, una racha la llevaba de 150 a 157 nudos,
     * dejaba de bajar y flotaba medio kilómetro con el gas puesto: con el gas
     * de ahora toca a 529 m y 2,04 m/s. **La de 608 (semilla 56) se queda**: es
     * otra cosa, un avión que se sostiene a diez metros perdiendo velocidad
     * —toca a 133 nudos, por debajo de la Vref menos cinco— y no flota con
     * energía de sobra, así que el gas no se le quita: quitárselo en un globo
     * que ya va despacio es lo que hizo tocar a 9,25 m/s a un JAZ 110 en la mesa
     * (ver `flotaElReactor`). Por eso aquí se pide como mucho una, y ninguna
     * pasada de los 650 m, donde antes se pedía ninguna con el alerón suelto.
     *
     * **Y desde H34f la de la semilla 56 va más lejos**, a 716 m y 130 nudos:
     * por debajo de los treinta pies el punto ya no la empuja al suelo a lo que
     * bajaba la senda, sino a lo más a la senda repartida hasta una toma firme
     * (ver `pideAlPuntoDeToma`). Es el precio de no tirar el avión al suelo con
     * el morro abajo: en estas sesenta, las de más de 2 m/s bajan de 7 a 4, y
     * el morro más bajo al tocar sube de 0,3° a 1,7°. Sigue siendo una sola.
     *
     * **Y desde H34h, dos**: bajo el punto el morro ya no baja de la actitud de
     * recoger más dos grados (ver `morroQueFaltaAlPunto`), y la semilla 14,
     * que el punto ponía en el suelo dentro de la zona, toca a 602 m, dos
     * metros pasada. Las de más de 2 m/s, de 4 a 3. La más larga, la de
     * la semilla 56, de 716 a 722 m.
     */
    const delJuego = mesa(palancaDelReactorEnLaRecogida, 60, true);
    expect(delJuego.laMasDura).toBeLessThan(DURO_DE_TRANSPORTE);
    expect(delJuego.largas).toBeLessThanOrEqual(2);
    expect(delJuego.laMasLarga).toBeLessThan(750);
    const conElGasDeAntes = mesa(palancaDelReactorEnLaRecogida, 60, true, undefined, true);
    /*
     * **Y desde que el motor tarda lo que tarda** (ADR 0034), con el gas de la
     * final del banco más amortiguado, en estas sesenta ya no flota ninguna,
     * con un gas ni con el otro: las dos dan lo mismo, ninguna larga, 10 de
     * más de 2 m/s y la más larga a 471 m. Aquí la prueba ya no ve el fallo
     * de H55c; el gas de ahora no puede ser peor que el de antes.
     */
    expect(delJuego.laMasLarga).toBeLessThanOrEqual(conElGasDeAntes.laMasLarga + 1e-9);
    expect(delJuego.largas).toBeLessThanOrEqual(conElGasDeAntes.largas);
    // Medido: las duras, 7 con el gas de antes y 8 con el de ahora; la peor, igual.
    expect(delJuego.duras).toBeLessThanOrEqual(conElGasDeAntes.duras + 2);
    expect(delJuego.laMasDura).toBeLessThanOrEqual(conElGasDeAntes.laMasDura + 1e-9);
  });

  it("y bajo el punto, el morro no baja de la actitud de recoger más dos grados (H34h)", () => {
    const grado = Math.PI / 180;
    expect(morroQueFaltaAlPunto({ cabeceo: 3 * grado, alEmpezar: 0.5 * grado })).toBe(0);
    expect(morroQueFaltaAlPunto({ cabeceo: 2.5 * grado, alEmpezar: 0.5 * grado })).toBeCloseTo(0, 12);
    expect(morroQueFaltaAlPunto({ cabeceo: 1.3 * grado, alEmpezar: 0.25 * grado })).toBeCloseTo(0.95 * grado, 12);
    // Y la página lo recibe como texto: no toca nada de fuera.
    const enLaPagina = new Function(`${morroQueFaltaAlPunto.toString()}\nreturn morroQueFaltaAlPunto;`)();
    expect(enLaPagina({ cabeceo: 0, alEmpezar: 0 })).toBeCloseTo(2 * grado, 12);
    // En la ley: sin punto no cuenta; con él, suma el morro que falta pasado a palanca.
    const base = { ruedas: 2.5, vertical: -0.2, verdadera: 76, ritmoDeCabeceo: 0, carga: 1, porAngulo: 1.8, envergadura: 59.64, dt: 1 / 60 };
    const rec = () => ({ altura: 13, caida: 3.8, palanca: -0.2, acumulado: 0, velocidad: 78, picadoDeLaPalanca: 0, ultimo: -0.1, morroAlEmpezar: 0.25 * grado });
    const sinPunto = palancaDelReactorEnLaRecogida({ ...base, cabeceo: 1.3 * grado, rec: rec() });
    expect(palancaDelReactorEnLaRecogida({ ...base, rec: rec() })).toBeCloseTo(sinPunto, 12);
    const alPunto = { pasado: 1500 * 0.3048 + 50, porElSuelo: 66 };
    const sinMorro = palancaDelReactorEnLaRecogida({ ...base, ...alPunto, rec: rec() });
    const conMorro = palancaDelReactorEnLaRecogida({ ...base, ...alPunto, cabeceo: 1.3 * grado, rec: rec() });
    expect(conMorro - sinMorro).toBeCloseTo(1.8 * 0.95 * grado, 9);
  });

  it("y el gas del reactor: el de la senda hasta los treinta pies, y fuera desde que flota", () => {
    const pies30 = 30 * 0.3048;
    expect(gasDelReactorEnLaRecogida({ gas: 0.3, ruedas: pies30 + 1, floto: false })).toBe(0.3);
    expect(gasDelReactorEnLaRecogida({ gas: 0.3, ruedas: pies30 - 0.1, floto: false })).toBe(0);
    expect(gasDelReactorEnLaRecogida({ gas: 0.3, ruedas: pies30 + 5, floto: true })).toBe(0);
    // Flotar es bajar menos de la mitad de lo pedido con velocidad de sobra:
    // un metro por segundo menos que la senda, no; un globo que ya va más
    // despacio que al empezar a recoger, tampoco.
    const v = { verdadera: 80, alEmpezar: 78 };
    expect(flotaElReactor({ ...v, vertical: -2.7, pide: -3.7 })).toBe(false);
    expect(flotaElReactor({ ...v, vertical: -1.5, pide: -3.7 })).toBe(true);
    expect(flotaElReactor({ ...v, vertical: 0.2, pide: -0.8 })).toBe(true);
    expect(flotaElReactor({ vertical: 1, pide: -3, verdadera: 74, alEmpezar: 78 })).toBe(false);
    // Y la página los recibe como texto: no tocan nada de fuera.
    const gasEnLaPagina = new Function(`${gasDelReactorEnLaRecogida.toString()}\nreturn gasDelReactorEnLaRecogida;`)();
    const flotaEnLaPagina = new Function(`${flotaElReactor.toString()}\nreturn flotaElReactor;`)();
    expect(gasEnLaPagina({ gas: 0.3, ruedas: 20, floto: false })).toBe(0.3);
    expect(flotaEnLaPagina({ ...v, vertical: -1.5, pide: -3.7 })).toBe(true);
  });
});

