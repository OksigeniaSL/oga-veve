/**
 * **La mesa de la recogida**: la del piloto del vuelo entero, sin navegador
 * (H72).
 *
 * Vuela finales con el modelo, el automático, las rachas y el suelo del juego,
 * y con **el mismo texto** de la recogida que `verificar-vuelo-entero.mjs` mete
 * en la página: `recoger`, `limitarElAngulo`, el trozo que la empieza y sus
 * constantes se leen del fichero y se montan aquí. Lo de antes de la recogida
 * —el gas de la final, la senda con el automático, el eje— está copiado con sus
 * números, porque en la página va mezclado con el resto del vuelo.
 *
 * La usa `recogida-del-turbohelice.test.mjs`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "../src/flight/fdm";
import { AIRCRAFT, aircraftById, propulsionDe } from "../src/flight/aircraft";
import { TAGUATO, TIERS } from "../src/flight/tiers";
import { alabeoAFondo } from "../src/flight/mano";
import { finDeLaZonaDeToma } from "../src/flight/toma-larga";
import { neutralControls } from "../src/flight/model";
import { Rafagas } from "../src/flight/rafagas";
import { airDensity, aireDelParte, indicadaDe } from "../src/flight/atmosphere";
import { autoridadDelTimon, mandosPara, memoriaNueva } from "../src/flight/piloto-automatico";
import { muescaDeAterrizaje } from "../src/flight/flaps";
import { bankAngleOf, pitchAngleOf } from "../src/ui/actitud";
import { gasDelBimotorEnLaRecogida } from "./gas-de-la-recogida.mjs";
import * as reactor from "./recogida-del-reactor.mjs";
import * as turbohelice from "./recogida-del-turbohelice.mjs";

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
 * **La recogida del banco, montada**: una función que recibe lo de fuera —el
 * avión, la sonda, la pista— y devuelve la mano.
 */
export function laRecogidaDelBanco(texto, { antesDeH72 = false } = {}) {
  // La de antes de H72 es el mismo texto sin la mano del turbohélice.
  const t = antesDeH72
    ? texto.replace(/(\n  const TURBOHELICE_EN_LA_RECOGIDA =)[^;]*;/, "$1 false;")
    : texto;
  const recoger = `${trozo(t, "  const recoger = (mandos) => {", "\n  };\n")}\n  };`;
  const limitar = `${trozo(t, "  const limitarElAngulo = (mandos) => {", "\n  };\n")}\n  };`;
  const empezar = `${trozo(t, "      const caidaDeSenda = Math.max(", "        empezoLaRecogida = {")}      }`;
  return new Function(
    "e",
    `
    const { o, suyas, alto, alUmbral, porElSuelo, enVerdadera, SENDA, c, avionPorId, zonaDeTomaDeAhora } = e;
    const SENCILLO = false, CON_EL_AUTOMATICO = true, obedienteEnElBanco = false, vref = 0;
    /*
     * **Y lo que la recogida mira de fuera de su trozo** (H111): la toma larga
     * a propósito de \`OGA_TOMA_LARGA\` (H109), que aquí no se vuela. Sin esto, el
     * punto de toma del reactor lanzaba un ReferenceError que el \`catch\` de la
     * recogida se tragaba —el que es para cuando no hay pista a la que medir—,
     * y la mesa volaba sin punto: 31 largas de cien en La Palma, las de antes de
     * H108, sin que nada lo dijera. Ver \`conElPunto\`.
     */
    const forzandoLaLarga = () => false;
    ${constante(t, "TOMA_LARGA_DE_MAS")}
    ${constante(t, "RITMO_AL_TOCAR")}
    ${constante(t, "SEGUNDOS_DE_RECOGIDA")}
    ${constante(t, "RECOGIDA_DE_REACTOR")}
    ${constante(t, "BIMOTOR_EN_LA_RECOGIDA")}
    ${constante(t, "LO_QUE_TARDA_EL_MOTOR")}
    ${constante(t, "TURBOHELICE_EN_LA_RECOGIDA")}
    ${constante(t, "ritmoAlTocar")}
    let recogida = null, palancaMedia = null;
    ${recoger}
    ${limitar}
    const empezar = (s, ruedas, falta) => {
      ${empezar}
    };
    return {
      empezar, recoger, limitar: limitarElAngulo,
      media: (v) => { palancaMedia = v; },
      get recogida() { return recogida; },
    };`,
  );
}

/**
 * **La mano del alerón en la final, la del banco** (H108): el tope del alerón
 * de cada avión (`topeDeAleronEnVuelo`, H34f) y la ganancia de la final
 * (`gananciaEnLaFinal`, H34g), leídos del banco como lo demás. La mesa llevaba
 * los de la avioneta —0,35 y 4— para todos, y el JAZ 110 del banco va con 0,64:
 * con ellos la mesa abría del eje al 787 lo que el banco no —en La Palma, a
 * 15,3 m como mucho en cuarenta finales, y con la del banco a 9,6—. Y la
 * mirada corta de la recogida, `MIRADA_AL_RECOGER`.
 */
export function laManoDelBanco(texto, id, peldano = "taguato") {
  const tope = `${trozo(texto, "  const topeDeAleronEnVuelo = (() => {", "\n  })();\n")}\n  })();`;
  const ganancia = `${trozo(texto, "  const gananciaEnLaFinal = (() => {", "\n  })();\n")}\n  })();`;
  return new Function(
    "e",
    `
    const { suyas, avionPorId, LA_FLOTA, propulsionDe, alabeoAFondo, LOS_PELDANOS, TAGUATO, peldano } = e;
    ${constante(texto, "TOPE_DE_ALERON_EN_VUELO")}
    ${constante(texto, "GANANCIA_DE_ALABEO_EN_FINAL")}
    ${constante(texto, "MIRADA_AL_RECOGER")}
    ${tope}
    ${ganancia}
    return { tope: topeDeAleronEnVuelo, ganancia: gananciaEnLaFinal, miradaAlRecoger: MIRADA_AL_RECOGER };`,
  )({
    suyas: { id },
    avionPorId: aircraftById,
    LA_FLOTA: AIRCRAFT,
    propulsionDe,
    alabeoAFondo,
    LOS_PELDANOS: TIERS,
    TAGUATO,
    peldano,
  });
}

/** La 12 de Los Rodeos, que es la que vuela la mesa si no se dice otra: m y °C. */
const LOS_RODEOS = { cabecera: 628.5, otraPunta: 611.7, largo: 3168, grados: 21 };

const NUDO = 0.514444;
const SENDA = Math.tan((3 * Math.PI) / 180);
const GRADO = Math.PI / 180;

/**
 * **Una final hasta tocar**, en la 12 de Los Rodeos: 628,5 m en el umbral y
 * 611,7 en la otra punta, a 3.168, el alisio de casa (040/12 contra una pista
 * a 111°) y 21 grados, que es lo que vuela el banco.
 *
 * @param {object} p
 *   `avion`, su id; `recogida`, la de `laRecogidaDelBanco`; `semilla`, la de las
 *   rachas. Y lo que se quiera cambiar: `masa`, kg; `ficha`, lo que se le pone
 *   encima a la del avión (el motor, para separar causas); `sigma`, σ_w en m/s;
 *   `viento`, nudos; `sinRacha(recogiendo)`, si se le quita; `llana`, la pista
 *   sin cuesta; `gas`, otro del turbohélice; `gasDeLaFinal`, su `kp` y su
 *   `ki`; `conTraza`, fotograma a fotograma; `campo`, otra pista
 *   —`{ cabecera, otraPunta, largo, grados }`, m y °C— y `vientoDesde`, de
 *   dónde sopla en grados a la derecha de su rumbo; `mano`, la del alerón
 *   del banco en la final, de `laManoDelBanco` (H108); `paso`, s, lo que dura
 *   un fotograma (H111).
 */
export function vuelaLaFinal(p) {
  /*
   * **Un fotograma**, s: un sesentavo si no se dice otro. En el navegador del
   * banco, con la tarjeta emulada, son de cuatro a diez centésimas, y los
   * mandos se mueven una vez por fotograma (H111).
   */
  const DT = p.paso ?? 1 / 60;
  const ficha = aircraftById(p.avion);
  const a = p.ficha ? { ...ficha, ...p.ficha } : ficha;
  // El campo: la 12 de Los Rodeos si no se dice otro (H108).
  const campo = p.campo ?? LOS_RODEOS;
  const aire = aireDelParte(campo.grados, Math.round(campo.cabecera), 1013);
  const CABECERA = campo.cabecera;
  const LARGO = campo.largo;
  const cae = p.llana ? 0 : (campo.cabecera - campo.otraPunta) / LARGO;
  const cota = (x, z) => CABECERA - cae * Math.max(0, Math.min(LARGO, -z));
  const tren = a.gearHeight;
  const flaps = muescaDeAterrizaje(a);
  const suyas = {
    id: a.id,
    tren,
    envergadura: a.wingSpan,
    aproximacion: a.approachSpeed,
    propulsion: propulsionDe(a),
    motores: a.motores ?? 1,
  };
  const m = new CoefficientFlightModel({ aircraft: a, ground: cota, assist: TAGUATO.assists });
  m.ponerAire(aire);
  if (p.masa) m.ponerMasa(p.masa);
  const puntoDeToma = 250;
  const x0 = p.desde ?? -3500;
  const enVerdadera = (s, indicada) => {
    const i = indicadaDe(s, aire);
    return i > 10 ? (indicada * s.airspeed) / i : indicada;
  };
  const y0 = CABECERA + (puntoDeToma - x0) * SENDA + tren;
  const v0 = (a.approachSpeed + 5 * NUDO) / Math.sqrt(airDensity(y0, aire) / 1.225);
  m.reset({
    position: new Vector3(0, y0, -x0),
    heading: 0,
    airspeed: v0,
    equilibrado: true,
    flapsDelEquilibrio: flaps,
  });
  const kt = (p.viento ?? 12) * NUDO;
  // De dónde sopla, en grados a la derecha del rumbo de la pista: el 040 contra la 12, si no.
  const desde = p.vientoDesde ?? 71;
  m.ponerViento(Math.sin(desde * GRADO) * kt, Math.cos(desde * GRADO) * kt);
  const rafagas = new Rafagas(p.semilla);
  const c = { throttle: 0, aileron: 0, elevator: 0, rudder: 0 };
  const mandos = neutralControls();
  mandos.flaps = flaps;
  mandos.tren = 1;
  // El compensador del despegue, que el banco deja puesto: 0,10 en las trazas.
  mandos.trim = p.trim ?? 0.1;
  mandos.automatico = true;
  c.throttle = Math.max(
    0,
    Math.min(1, m.gasPara(v0, { flaps, tren: 1, aerofrenos: 0 }, -Math.atan(SENDA))),
  );
  let reloj = 0;
  const o = {
    estado: () => m.state,
    reloj: () => reloj,
    cotaDePistaDeAhora: cota,
    cotaDePista: cota,
    palancaDelSuelo: () => m.palancaDelSuelo(),
    actitud: () => ({
      cabeceo: pitchAngleOf(m.state.orientation),
      alabeo: bankAngleOf(m.state.orientation),
    }),
    avion: () => ({
      cabeceo: { cmAlpha: a.aero.cmAlpha, cmElevator: a.aero.cmElevator, cm0: a.aero.cm0 },
    }),
    controles: () => mandos,
    velocidadDeCabina: () => indicadaDe(m.state, aire) / NUDO,
  };
  // La ficha que se vuela, con lo que se le haya cambiado.
  const avionPorId = () => a;
  const alto = (s) => s.position.y - cota(s.position.x, s.position.z);
  const alUmbral = (s) => s.position.z;
  const porElSuelo = (s) => Math.hypot(s.velocity.x, s.velocity.z);
  Object.assign(globalThis, {
    __gasDelBimotorEnLaRecogida: gasDelBimotorEnLaRecogida,
    __porLoQueAceleraElTurbohelice: turbohelice.porLoQueAceleraElTurbohelice,
    __palancaDeLaActitudDelTurbohelice: turbohelice.palancaDeLaActitudDelTurbohelice,
    __gasDelTurboheliceEnLaRecogida: p.gas ?? turbohelice.gasDelTurboheliceEnLaRecogida,
    __gasDelReactorEnLaRecogida: reactor.gasDelReactorEnLaRecogida,
    __porLoQueAceleraElReactor: reactor.porLoQueAceleraElReactor,
    __pideAlPuntoDeToma: reactor.pideAlPuntoDeToma,
    __flotaElReactor: reactor.flotaElReactor,
    __morroQueFaltaAlPunto: reactor.morroQueFaltaAlPunto,
  });
  // Dónde acaba la zona de toma, la del juego con lo que mide esta pista (H108).
  const zonaDeTomaDeAhora = () => finDeLaZonaDeToma(LARGO);
  const mano = p.recogida({ o, suyas, alto, alUmbral, porElSuelo, enVerdadera, SENDA, c, avionPorId, zonaDeTomaDeAhora });
  const mem = memoriaNueva();
  const giro = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  let errorAntes = null;
  let palancaMedia = null;
  let sinPerseguir = null;
  let senda = null;
  let proximo = 0;
  let empezo = null;
  let caida = 0;
  const traza = [];
  // Y si el punto de toma del reactor llegó a mandar (H111): ver `laRecogidaDelBanco`.
  let conElPunto = false;
  for (let i = 0; i < 240 / DT; i++) {
    const s = m.state;
    const ruedas = alto(s) - tren;
    const r = rafagas.paso(DT, {
      sigma: p.sigma ?? 1.05,
      constancia: 0.6,
      sobreElSuelo: s.heightAboveGround,
      enTierra: s.onGround,
      velocidad: s.airspeed,
      densidad: airDensity(s.position.y, aire),
      envergadura: a.wingSpan,
      cuerda: a.chord,
      rumbo: Math.atan2(s.velocity.x, -s.velocity.z),
    });
    const sopla = p.sinRacha?.(mano.recogida !== null) ? { x: 0, y: 0, z: 0, alabeo: 0 } : r;
    m.ponerRacha(sopla.x, sopla.y, sopla.z, sopla.alabeo);
    if (s.onGround || s.crashed)
      return {
        metros: -s.position.z,
        // La del juego al tocar: contra la pista (H63).
        caida: s.touchdownSinkRate > 0 ? s.touchdownSinkRate : caida,
        ultima: caida,
        empezo,
        segundos: reloj - (empezo?.t ?? reloj),
        nudos: indicadaDe(s, aire) / NUDO,
        eje: s.position.x,
        conElPunto,
        traza,
      };
    caida = -(s.velocity.y + cae * porElSuelo(s));
    // El tic del banco, diez veces por segundo.
    if (reloj >= proximo) {
      proximo += 0.1;
      const falta = s.position.z;
      const margen = 5 * NUDO;
      const deCara = Math.max(0, s.airspeed - porElSuelo(s));
      const enElUmbral = Math.min(margen, deCara / 2);
      const queda = Math.max(0, Math.min(1, falta / 1500));
      const quiere = enVerdadera(s, a.approachSpeed + enElUmbral + (margen - enElUmbral) * queda);
      const err = quiere - s.airspeed;
      const deHelice = suyas.propulsion === "helice";
      const tarda = deHelice && a.respuestaDelMotor.subida > 0;
      const { kp, ki } = p.gasDeLaFinal ?? {
        kp: tarda ? 0.12 : 0.08,
        ki: deHelice ? (tarda ? 0.01 : 0.03) : 0.005,
      };
      c.throttle = Math.max(
        0,
        Math.min(1, c.throttle + (err - (errorAntes ?? err)) * kp + err * ki * 0.1),
      );
      errorAntes = err;
      mano.media(palancaMedia);
      const antes = mano.recogida;
      mano.empezar(s, ruedas, falta);
      if (!antes && mano.recogida)
        empezo = {
          t: reloj,
          ruedas,
          umbral: -falta,
          caida: -s.verticalSpeed,
          nudos: indicadaDe(s, aire) / NUDO,
          gas: c.throttle,
          eje: s.position.x,
        };
      if (!mano.recogida) {
        if (!sinPerseguir && ruedas < 30 && falta > 0 && falta < 1000)
          sinPerseguir = { altitud: s.position.y, ritmo: -porElSuelo(s) * SENDA, desde: reloj };
        senda = sinPerseguir ?? {
          altitud: s.position.y + ((puntoDeToma + falta) * SENDA + tren - alto(s)),
          ritmo: -porElSuelo(s) * SENDA,
          desde: reloj,
        };
      }
      // El eje: hacia un punto suyo, por el suelo, con la mano de la final.
      const radio = (s.airspeed * s.airspeed) / (9.81 * Math.tan(30 * GRADO));
      // Y recogiendo, con la mano del banco, la mirada corta (H108): ver `MIRADA_AL_RECOGER`.
      const alRecoger = p.mano && mano.recogida ? p.mano.miradaAlRecoger : 0;
      const mirada = alRecoger > 0 ? Math.max(alRecoger, Math.abs(s.position.x) / Math.tan(30 * GRADO)) : Math.max(
        Math.max(120, Math.min(300, falta * 0.4)) * Math.max(1, s.airspeed / 33),
        Math.min(0.7 * radio, falta * 0.6),
        Math.abs(s.position.x) / Math.tan(30 * GRADO),
      );
      const trayectoria = Math.atan2(s.velocity.x, -s.velocity.z);
      const rumbo = Math.atan2(-s.position.x, mirada) - giro(trayectoria - s.heading);
      // Con la mano del banco si se da (H108): los treinta grados de la final, su tope y su ganancia.
      const inclinacion = (p.mano ? 30 : 25) * GRADO;
      const alabeo = Math.max(-inclinacion, Math.min(inclinacion, giro(rumbo - s.heading) * 1.5));
      const tope = p.mano?.tope ?? 0.35;
      const ganancia = p.mano ? p.mano.ganancia(s.airspeed) : 4;
      c.aileron = Math.max(-tope, Math.min(tope, (alabeo - bankAngleOf(s.orientation)) * ganancia));
    }
    mandos.throttle = c.throttle;
    mandos.aileron = c.aileron;
    mandos.rudder = 0;
    if (!mano.recogida) {
      let pedida = senda.altitud + senda.ritmo * (reloj - senda.desde);
      const caidaQueSePide = Math.max(porElSuelo(s) * SENDA + 1, 0.9 * 5.08);
      pedida = Math.max(pedida, s.position.y + (-caidaQueSePide - senda.ritmo) * 10);
      const out = mandosPara(
        {
          heading: s.heading,
          alabeo: bankAngleOf(s.orientation),
          cabeceo: pitchAngleOf(s.orientation),
          altitud: s.position.y,
          vertical: s.velocity.y,
          velocidad: indicadaDe(s, aire),
          gas: mandos.throttle,
          verdadera: s.airspeed,
          ritmoDeCabeceo: s.pitchRate,
          timon: i === 0 ? m.timonDeEquilibrio(flaps) - mandos.trim : undefined,
          autoridadDelTimon: autoridadDelTimon(a, airDensity(s.position.y, aire), s.airspeed),
          subeElAire: sopla.y,
        },
        { rumbo: null, altitud: pedida, ritmo: senda.ritmo, velocidad: null },
        DT,
        mem,
      );
      // Lo que pica el suelo, sumado y fuera de la media (H56).
      mandos.elevator = Math.max(-1, Math.min(1, out.elevator + m.palancaDelSuelo()));
      const sinElSuelo = mandos.elevator - m.palancaDelSuelo();
      palancaMedia =
        palancaMedia === null ? sinElSuelo : palancaMedia + ((sinElSuelo - palancaMedia) * DT) / 2;
    }
    mano.recoger(mandos);
    conElPunto ||= !!mano.recogida?.alPunto;
    const pedida = mandos.elevator;
    mano.limitar(mandos);
    if (p.conTraza)
      traza.push({
        t: reloj,
        u: -s.position.z,
        ruedas,
        vs: s.velocity.y,
        ias: indicadaDe(s, aire) / NUDO,
        gas: mandos.throttle,
        da: m.gasDelMotor(),
        el: mandos.elevator,
        pedida,
        al: s.alpha / GRADO,
        cab: pitchAngleOf(s.orientation) / GRADO,
        n: s.loadFactor,
        ry: sopla.y,
        rz: sopla.z,
        pide: mano.recogida?.pide,
        falta: mano.recogida?.falta,
        sost: mano.recogida?.sostiene,
        floto: mano.recogida?.floto,
        alPunto: mano.recogida?.alPunto,
        mqf: mano.recogida?.morroQueFalta,
        beta: (s.beta ?? 0) / GRADO,
        ra: sopla.alabeo,
        rx: sopla.x,
        rumbo: giro(Math.atan2(s.velocity.x, -s.velocity.z) - s.heading) / GRADO,
        x: s.position.x,
        alab: bankAngleOf(s.orientation) / GRADO,
        ail: mandos.aileron,
      });
    m.step(DT, mandos);
    reloj += DT;
  }
  return { metros: Infinity, caida, ultima: caida, empezo, segundos: Infinity, conElPunto, traza };
}

/** Muchas finales, y su cuenta. */
export function mesa(p, semillas) {
  const r = [];
  for (let k = 1; k <= semillas; k++) r.push(vuelaLaFinal({ ...p, semilla: k }));
  const orden = (f) => r.map(f).sort((x, y) => x - y);
  const q = (v, f) => v[Math.min(v.length - 1, Math.floor(v.length * f))];
  const caidas = orden((x) => x.caida);
  const metros = orden((x) => x.metros);
  const segundos = orden((x) => x.segundos);
  return {
    finales: r.length,
    duras: r.filter((x) => x.caida > 2).length,
    laMasDura: caidas[caidas.length - 1],
    caidaMediana: q(caidas, 0.5),
    caida90: q(caidas, 0.9),
    // Pasadas de la zona de toma, la del juego en esa pista (H108); era seiscientos metros en todas.
    largas: r.filter((x) => x.metros > finDeLaZonaDeToma((p.campo ?? LOS_RODEOS).largo)).length,
    // Las que recogieron sin que el punto de toma llegara a mandar (H111).
    sinElPunto: r.filter((x) => !x.conElPunto).length,
    cortas: r.filter((x) => x.metros < 150).length,
    metrosMediana: q(metros, 0.5),
    laMasLarga: metros[metros.length - 1],
    segundosMediana: q(segundos, 0.5),
    r,
  };
}
