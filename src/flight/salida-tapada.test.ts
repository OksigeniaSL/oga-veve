/**
 * **El que tapa tu salida, visto con tiempo.** Ver `flight/salida-tapada.ts`.
 *
 * El caso que quedó sin arreglar en la ola de tierra: uno de la frecuencia
 * rueda hacia una doble raya de tu salida antes de que la torre te tenga en
 * la secuencia, un tercero le ocupa la pista, y cuando queda libre ya no le
 * da tiempo a irse antes que tú. Medido en El Hierro con el JAZ 20: uno parado
 * en su doble raya seis minutos, a treinta y cinco metros de ti al dejar la
 * pista.
 *
 * Aquí se monta lo que monta el juego —la frecuencia, el turno, el dibujo
 * con sus calles y tus aterrizajes con tu plan de tierra— con dos de la
 * frecuencia que salen a rodar mientras vienes, y un piloto que hace lo que
 * le dicen: da la vuelta que le piden y se va al aire si le mandan. Lo que se
 * pide:
 *
 * - **sin la regla sale el fallo**, o esta prueba no vería nada;
 * - con ella, al dejar la pista no pasas al lado de nadie parado en tu calle,
 *   llegas a tu puesto, y los que salían salen —nadie se queda en su doble
 *   raya para siempre—;
 * - con torre, lo que se pide es una vuelta o irse al aire, y nunca más
 *   vueltas que su red; con un AFIS no se pide nada: se cuenta, y en la final
 *   se propone irse.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia, PISTA_TUYA, type Transmision } from "./radio";
import { TurnoDePista, type DibujoDelTurno } from "./turno-de-pista";
import {
  ALTO_PARA_IRSE,
  ALTO_PARA_LA_VUELTA,
  giradoEntre,
  remedioParaTuSalida,
  seVaAntes,
  VUELTA_DESDE_EN_FINAL,
  VUELTAS_COMO_MUCHO,
  type TuLlegadaALaPista,
} from "./salida-tapada";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { cabeEn, campoDe } from "./cabe";
import { distanciaDeAterrizaje } from "./carrera";
import { esAfis, sinTorre, type Aerodrome } from "../world/aerodrome";
import { PlanDeVuelo, separacionEnTierra } from "../world/plan-de-vuelo";
import { SCENARIOS, conViento, type Scenario } from "../world/scenarios";
import { TIEMPO_DE_CASA } from "../world/meteo";
import { sueloDelTrafico, PASA_A_TU_LADO } from "../world/suelo-del-trafico";
import {
  alRemontar,
  crearTrafico,
  pistaQuePideConSuMargen,
  REMONTA_A,
  RUEDA_A,
  tiempoDeCarrera,
  tiempoDeRemonte,
  tiposDelCampo,
  TIPOS,
  velocidadDeDespegue,
  VIRA_A,
  type EnTierra,
} from "../world/trafico";
import { enEjesDePista } from "../world/rumbo";
import { porDelanteDe } from "../world/tramo-de-frente";

describe("la regla, con números", () => {
  const final = (segundos: number, alto = 300): TuLlegadaALaPista => ({
    segundos,
    donde: "final",
    alto,
  });
  const circuito = (segundos: number): TuLlegadaALaPista => ({
    segundos,
    donde: "circuito",
    alto: 250,
  });
  const tapa = { leHace: 120, espera: 60 };

  it("si le da tiempo a irse antes que tú, nada: se le da la pista", () => {
    expect(seVaAntes(final(200), tapa)).toBe(true);
    expect(remedioParaTuSalida(final(200), tapa, "torre", 0)).toBeNull();
  });

  it("y contando lo que espera a que la pista quede libre", () => {
    expect(seVaAntes(final(150), { leHace: 120, espera: 0 })).toBe(true);
    expect(seVaAntes(final(150), tapa)).toBe(false);
  });

  it("con torre, en el circuito, una vuelta", () => {
    expect(remedioParaTuSalida(circuito(100), tapa, "torre", 0)).toBe("vuelta");
  });

  it("en la final, una vuelta si estás lejos y alto; si no, al aire", () => {
    expect(remedioParaTuSalida(final(VUELTA_DESDE_EN_FINAL + 10), tapa, "torre", 0)).toBe(
      "vuelta",
    );
    expect(remedioParaTuSalida(final(VUELTA_DESDE_EN_FINAL - 10), tapa, "torre", 0)).toBe(
      "alAire",
    );
    expect(
      remedioParaTuSalida(final(VUELTA_DESDE_EN_FINAL + 10, ALTO_PARA_LA_VUELTA - 1), tapa, "torre", 0),
    ).toBe("alAire");
  });

  it("y como mucho las vueltas de la red: después, en la final, al aire", () => {
    expect(remedioParaTuSalida(final(60), tapa, "torre", VUELTAS_COMO_MUCHO)).toBe("alAire");
  });

  it("pero desde el viento en cola no se manda a nadie al aire: no viene a la pista todavía", () => {
    expect(remedioParaTuSalida(circuito(100), tapa, "torre", VUELTAS_COMO_MUCHO)).toBeNull();
  });

  it("pegado al suelo ya no se manda al aire a nadie", () => {
    expect(remedioParaTuSalida(final(10, ALTO_PARA_IRSE - 1), tapa, "torre", 0)).toBeNull();
  });

  it("un AFIS no manda: avisa", () => {
    expect(remedioParaTuSalida(circuito(100), tapa, "afis", 0)).toBe("aviso");
    expect(remedioParaTuSalida(final(30), tapa, "afis", 0)).toBe("aviso");
  });

  it("lo girado se cuenta por el camino corto, sin signo", () => {
    expect(giradoEntre(0.1, 0.3)).toBeCloseTo(0.2);
    expect(giradoEntre(0.3, 0.1)).toBeCloseTo(0.2);
    expect(giradoEntre(2 * Math.PI - 0.1, 0.1)).toBeCloseTo(0.2);
  });
});

const PASO = 0.2;
const SENDA = Math.tan((3 * Math.PI) / 180);
/** Lo que tarda la torre en ser «final» para la frecuencia, s al umbral. */
const FINAL_DE_LA_TORRE = 90;
/** Desde cuántos segundos antes del umbral te ve el tráfico en la secuencia. */
const FINAL_DEL_PLAN = 180;
/** Y desde cuántos te ve la torre en el circuito: el viento en cola. */
const EN_EL_CIRCUITO = 300;
/** Lo que tiene que estar parado uno del tráfico para contarlo como parado, s. */
const PARADO = 3;
/**
 * Lo que se baja por la ruta antes de su tramo final, s: del punto de descenso
 * a la final del plan. De El Hierro a La Gomera con el JAZ 60, unos cuatro
 * minutos. Ver `QuienJuega.deRuta`.
 */
const BAJANDO_POR_LA_RUTA = 240;
/**
 * Por dónde vuelve quien se fue al aire, s al umbral: el circuito entero, en
 * el que la torre le sigue viendo.
 */
const VUELVE_A = EN_EL_CIRCUITO;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Las dos cabeceras, por el viento. */
function cabeceras(esc0: Scenario): Scenario[] {
  const por = new Map<number, Scenario>();
  for (const v of [0, 90, 180, 270]) {
    const e = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 });
    por.set(Math.round(e.runway.heading), e);
  }
  return [...por.values()];
}

/** El más grande que cabe: el que más ocupa en una calle. */
function elMasGrande(esc: Scenario): AircraftConfig {
  const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(esc)).cabe);
  return [...caben].sort((a, b) => b.wingSpan - a.wingSpan)[0] ?? AIRCRAFT[0]!;
}

interface Medida {
  /** El primer paso al lado de uno parado en tu calle, volviendo a tu puesto. */
  alLado: string;
  /** Si llegaste a tu puesto. */
  llego: boolean;
  /** Los que se sacaron a rodar, y los que despegaron. */
  salieron: string[];
  despegaron: string[];
  /** Lo que se te pidió. */
  vueltas: number;
  alAire: number;
  avisos: number;
  propuestas: number;
  /** Si en algún momento hubo dos encima de la pista. */
  dosEnLaPista: string;
  /** Las veces que te fuiste al aire, por lo que fuera, y cuándo tocaste. */
  frustradas: number;
  toco: number | null;
  /** Lo que se oyó, para leerlo si falla. */
  oido: string[];
}

/**
 * Tu llegada con dos de la frecuencia que salen a rodar `salen` segundos
 * antes de tu toma. `regla` falso es el juego de antes: el dibujo sin
 * `tapanTuSalida` y la torre sin verte en el circuito; `obedece` es si te vas
 * al aire cuando la instructora lo propone en un AFIS.
 */
function llegarConDosQueSalen(
  esc: Scenario,
  avion: AircraftConfig,
  salen: readonly number[],
  semilla: number,
  regla = true,
  obedece = false,
  /**
   * Y quién contesta, si no el del campo: un AFIS en un campo con torre deja
   * ver lo que haría quien informa con un conflicto que se sabe que sale.
   */
  contesta?: "torre" | "afis",
  /** Si das la vuelta que te piden; si no, sigues hacia la pista. */
  daLaVuelta = true,
  /**
   * **Y si llegas por la ruta del plan**, desde cuántos segundos antes del
   * umbral te ve la torre: sin circuito que volar, apareces en su secuencia
   * al entrar en el tramo final del plan, y su final empieza ahí. Ver
   * `enLaFinalDelPlan` en `game.ts`.
   */
  deRuta: number | null = null,
): Medida {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const ancho = aero.runways[0]?.widthM ?? 45;
  const plan = new PlanDeVuelo(aero, pista, () => cota, avion);
  plan.reiniciar();
  const suelo = sueloDelTrafico(aero, pista, ancho);
  const separacion = separacionEnTierra(avion.wingSpan);
  const h = (pista.heading * Math.PI) / 180;
  const eje = (al: number) => ({
    x: pista.x + Math.sin(h) * al,
    z: pista.z - Math.cos(h) * al,
  });
  const umbral = -pista.length / 2 + (pista.desplazado ?? 0);
  const vAprox = avion.approachSpeed;
  const afis = contesta ? contesta === "afis" : esAfis(aero);

  let x = 0;
  let z = 0;
  let rumbo = h;
  let v = vAprox;
  let alto = 300;
  let fase = "en-vuelo";
  /** Segundos que te faltan para el umbral, volando; se para dando la vuelta. */
  let restante = Math.max(...salen, EN_EL_CIRCUITO) + 30;
  let enTierra = false;
  let dandoVuelta = false;
  let alAireHasta: number | null = null;
  let sigueLaOrden: (() => boolean) | null = null;
  let fuera = false;

  const alUmbral = (): number | null =>
    !enTierra && alAireHasta === null && restante <= (deRuta ?? FINAL_DEL_PLAN) ? restante : null;
  const viene = (): boolean =>
    !enTierra && alAireHasta === null && restante <= (deRuta ?? EN_EL_CIRCUITO);
  /** Bajando por la ruta, antes de su final: lo que te falta, s. */
  const porLaRuta = (): number | null =>
    deRuta !== null &&
    !enTierra &&
    alAireHasta === null &&
    restante > deRuta &&
    restante <= deRuta + BAJANDO_POR_LA_RUTA
      ? restante
      : null;
  const posado = (): EnTierra => {
    const metros = v < 0.5 ? 0 : Math.max(15, v * 4);
    const porDondeVa = plan.porDondeVas(metros);
    for (let d = 6; d <= metros; d += 6)
      porDondeVa.push({ x: x + Math.sin(rumbo) * d, z: z - Math.cos(rumbo) * d });
    return { x, z, separacion, porDondeVa, esperandoLaPista: false, ruta: plan.rutaReservada() };
  };
  const volviendo = () => ["aterrizado", "abandonando", "a-plataforma"].includes(fase);
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    quienJuega: () =>
      fuera
        ? null
        : {
            alUmbral: alUmbral(),
            /*
             * Y la torre te ve también en el circuito, como en el juego, y
             * yéndote al aire sigues en él: vuelves.
             */
            llegada: !regla
              ? undefined
              : viene()
                ? restante
                : alAireHasta !== null
                  ? VUELVE_A
                  : porLaRuta(),
            // Y por la ruta, la hora prevista que sabe quien contesta.
            deRuta: porLaRuta(),
            enLaPista: enTierra && ["aterrizado", "abandonando"].includes(fase),
            velocidad: Math.max(15, v),
            enTierra: enTierra ? posado() : null,
            // Como el juego: por dónde dejarás la pista, en cuanto vienes.
            saleDeLaPista:
              (regla ? viene() || alAireHasta !== null || porLaRuta() !== null : alUmbral() !== null) ||
              (enTierra && volviendo())
                ? {
                    porDonde: enTierra ? plan.rutaReservada() : [],
                    frenaEn: distanciaDeAterrizaje(avion),
                  }
                : null,
          },
    tierra: () => {
      if (!suelo) return null;
      if (fuera) return { suelo, alto: () => cota };
      const ruta = plan.rutaVisible();
      const raya = ruta.at(-1);
      return {
        suelo,
        alto: () => cota,
        evitar: [{ x, z }, ...(raya ? [{ x: raya[0], z: raya[1] }] : [])],
        porDondeVas: porDelanteDe(
          ruta.map(([a, b]) => ({ x: a, z: b })),
          0,
          Infinity,
          10,
        ),
      };
    },
  });
  const parados = (sale: boolean, soloLosQueHay = false) =>
    trafico
      .dondeParan()
      .filter((p) => p.sale === sale && (p.hay || !soloLosQueHay))
      .map((p) => [p.x, -p.z] as [number, number]);
  plan.ocupados = () => parados(false);
  plan.enCola = () => parados(true);
  plan.colaQueHay = () => parados(true, true);
  plan.tramosDeOtros = () => trafico.tramosQueTienen();
  // Sin la regla, el dibujo de antes: sin quién tapa tu salida.
  const dibujo: DibujoDelTurno = regla
    ? trafico
    : {
        anuncia: (m, c, p) => trafico.anuncia(m, c, p),
        paso: (dt, al) => trafico.paso(dt, al),
        todaviaNo: (m, c) => trafico.todaviaNo(m, c),
        enFinal: (m) => trafico.enFinal(m),
        ocupanLaPista: () => trafico.ocupanLaPista(),
        dibujado: (m) => trafico.dibujado(m),
        esperanPorTi: () => trafico.esperanPorTi(),
        delanteEnLaSalida: () => trafico.delanteEnLaSalida(),
        ultimaSalida: () => trafico.ultimaSalida(),
        quienDejaLaPistaPorSuRaya: (m) => trafico.quienDejaLaPistaPorSuRaya(m),
        quienTapaSuSalida: (m) => trafico.quienTapaSuSalida(m),
        remonta: (m) => trafico.remonta(m),
        enTuSalida: () => trafico.enTuSalida(),
      };
  const medida: Medida = {
    alLado: "",
    llego: false,
    salieron: [],
    despegaron: [],
    vueltas: 0,
    alAire: 0,
    avisos: 0,
    propuestas: 0,
    dosEnLaPista: "",
    frustradas: 0,
    toco: null,
    oido: [],
  };
  let t = 0;
  const apunta = (que: string) =>
    medida.oido.push(`${t.toFixed(0)} [${enTierra ? "suelo" : alAireHasta !== null ? "al aire" : dandoVuelta ? "vuelta" : restante.toFixed(0)}] ${que}`);
  const irseAlAire = (sigue: () => boolean) => {
    medida.frustradas++;
    alAireHasta = t;
    sigueLaOrden = sigue;
  };
  const radio = new Frecuencia(dados(semilla), aero.id);
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => dibujo,
    torre: () => true,
    privado: () => false,
    afis: () => afis,
    calleUnica: () => suelo?.unaSolaCalle() ?? false,
    alUmbral: () => (enTierra ? 0 : (alUmbral() ?? Infinity) * vAprox),
    alto: () => alto,
    enTierra: () => enTierra,
    decirAOtro: (d) => {
      apunta(`torre → ${d.de.matricula}: ${d.clave}`);
      return null;
    },
    autorizarte: () => {},
    mandarteAlAire: (_a, sigue) => {
      apunta("al aire: pista ocupada");
      irseAlAire(sigue);
    },
    mandanFrustrar: () => alAireHasta !== null,
    sabeRetener: () => true,
    tuLlegada: () =>
      viene()
        ? {
            segundos: restante,
            donde: deRuta === null && restante > FINAL_DEL_PLAN ? "circuito" : "final",
            alto,
          }
        : null,
    rumbo: () => rumbo,
    darteUnaVuelta: (por) => {
      const q = trafico.tapanTuSalida().find((x) => x.matricula === por);
      apunta(`vuelta por ${por} [llegas en ${restante.toFixed(0)} s, le hace ${q?.leHace.toFixed(0)} + espera ${q?.espera.toFixed(0)}, remonta ${trafico.remonta(por).toFixed(0)} m]`);
      dandoVuelta = daLaVuelta;
    },
    acabarTuVuelta: (dada) => {
      apunta(`vuelta acabada (${dada ? "dada" : "sin dar"})`);
      dandoVuelta = false;
    },
    mandarteAlAirePorTuSalida: (_a, por, sigue) => {
      apunta(`al aire por ${por}`);
      irseAlAire(sigue);
    },
    contarteTuSalida: (por) => apunta(`afis cuenta ${por}`),
    proponerteIrtePorTuSalida: (por) => {
      apunta(`propone irse por ${por}`);
      // Quien obedece se va; quien no, sigue. Decide quien vuela.
      if (obedece) irseAlAire(() => false);
    },
  });
  const oido = (dice: Transmision | null): void => {
    if (dice) apunta(`${dice.de.matricula}: ${dice.clave}`);
    if (dice?.enSuPuesto) enSuPuesto.add(dice.de.matricula);
    else if (dice) enSuPuesto.delete(dice.de.matricula);
  };
  const enSuPuesto = new Set<string>();

  const estado = () =>
    ({
      position: { x, y: cota + alto, z },
      velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
      heading: rumbo,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: 0,
      yawRate: 0,
      onGround: enTierra,
      onRunway: (() => {
        const e = enEjesDePista(x, z, pista.x, pista.z, pista.heading);
        return (
          enTierra && Math.abs(e.across) < pista.width / 2 && Math.abs(e.along) < pista.length / 2
        );
      })(),
    }) as never;

  const pendientes = [...salen].sort((a, b) => b - a);
  let faseAntes = "";
  const quietoDesde = new Map<string, { x: number; z: number; t: number }>();
  let al = 0;
  let frenando = true;
  let enPuestoDesde: number | null = null;
  for (t = 0; t < 2400; t += PASO) {
    // Los que salen, a su hora: `salen` segundos antes de tu toma prevista.
    while (pendientes.length && restante <= pendientes[0]! && !enTierra) {
      pendientes.shift();
      const m = radio.sacarARodar();
      if (m && !medida.salieron.includes(m)) {
        medida.salieron.push(m);
        apunta(`sale a rodar ${m}`);
      }
    }
    for (const q of trafico.quienes())
      if (medida.salieron.includes(q.matricula) && q.y - cota > 20 && !q.llegando)
        if (!medida.despegaron.includes(q.matricula)) {
          medida.despegaron.push(q.matricula);
          apunta(`despega ${q.matricula}`);
        }
    const encima = trafico.ocupanLaPista();
    if (encima.length > 1 && !medida.dosEnLaPista)
      medida.dosEnLaPista = `${encima.join(" y ")} a la vez, t=${t.toFixed(0)}`;
    if (fuera) {
      oido(turno.oir(PASO, { fase: "apagado", deDia: true, instructorHablando: false }));
      if (medida.salieron.every((m) => medida.despegaron.includes(m))) break;
      if (t - (enPuestoDesde ?? t) > 900) break;
      continue;
    }
    if (!enTierra) {
      if (alAireHasta !== null) {
        // Al aire: se sube, y se vuelve por el circuito cuando se levanta la orden.
        alto = Math.min(300, alto + 4 * PASO);
        const sigue = sigueLaOrden as (() => boolean) | null;
        if (t - alAireHasta > 30 && !sigue?.()) {
          alAireHasta = null;
          sigueLaOrden = null;
          restante = VUELVE_A;
        }
      } else if (dandoVuelta) {
        // Dando la vuelta: tres grados por segundo, sin acercarse.
        rumbo += ((3 * Math.PI) / 180) * PASO;
      } else {
        restante -= PASO;
        rumbo = h;
      }
      const d = vAprox * Math.max(0, restante);
      const p = eje(umbral - d);
      x = p.x;
      z = p.z;
      if (alAireHasta === null) alto = Math.min(300, Math.max(2, d * SENDA));
      if (restante <= 0 && alAireHasta === null) {
        enTierra = true;
        alto = 0;
        v = vAprox;
        rumbo = h;
        medida.toco = t;
        apunta("tocas");
      }
    } else if (frenando) {
      const q = eje(umbral + Math.min(300, pista.length * 0.15) + al);
      x = q.x;
      z = q.z;
      rumbo = h;
      al += v * PASO;
      v = Math.max(6, v - 2.5 * PASO);
      if (fase === "abandonando" || v <= 6) frenando = false;
    }
    const vista = plan.paso(estado(), alto, true, PASO);
    const au = alUmbral();
    fase = !enTierra
      ? au !== null && au <= (deRuta ?? FINAL_DE_LA_TORRE)
        ? "final"
        : "en-vuelo"
      : vista.fase;
    if (PISTA_TUYA.has(fase) && !PISTA_TUYA.has(faseAntes)) turno.alSerTuya(fase);
    if (fase === "final" && faseAntes !== "final") turno.pedirAterrizaje();
    faseAntes = fase;
    turno.paso(fase);
    oido(turno.oir(PASO, { fase, deDia: true, instructorHablando: false }));
    if (vista.fase === "en-puesto" || vista.fase === "apagado") {
      medida.llego = true;
      enPuestoDesde ??= t;
      fuera = true;
      apunta("en tu puesto");
      continue;
    }
    // Lo parado de los del tráfico en el suelo, y si pasas a su lado.
    for (const q of trafico.quienes()) {
      if (q.y - cota > 5 || q.enLaPista || enSuPuesto.has(q.matricula)) {
        quietoDesde.delete(q.matricula);
        continue;
      }
      const antesQ = quietoDesde.get(q.matricula);
      if (!antesQ || Math.hypot(q.x - antesQ.x, q.z - antesQ.z) > 0.3)
        quietoDesde.set(q.matricula, { x: q.x, z: q.z, t });
      const quieto = t - (quietoDesde.get(q.matricula)?.t ?? t);
      const d = Math.hypot(q.x - x, q.z - z);
      const junto = separacionEnTierra(avion.wingSpan) / 2 + TIPOS[q.tipo].envergadura / 2;
      if (
        enTierra &&
        volviendo() &&
        v > 0.5 &&
        quieto > PARADO &&
        d < Math.max(junto + 7.5, PASA_A_TU_LADO * 0.6) &&
        !medida.alLado
      )
        medida.alLado = `${q.matricula} (${q.tipo}) parado ${quieto.toFixed(0)} s a ${d.toFixed(1)} m de ti en «${fase}», t=${t.toFixed(0)} s`;
    }
    if (!enTierra || frenando) continue;
    // El piloto en tierra: hace lo que pide la raya, y parado si pide parar.
    const quiere = vista.velocidadSugerida < 0.05 ? 0 : vista.velocidadSugerida;
    v = v > quiere ? Math.max(quiere, v - 2 * PASO) : Math.min(quiere, v + 1 * PASO);
    const ruta = plan.rutaVisible();
    if (ruta.length < 2) continue;
    const meta = plan.avanceEnLaRuta + v * PASO;
    let anda = 0;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + l >= meta || i === ruta.length - 2) {
        const u = l > 0 ? Math.max(0, Math.min(1, (meta - anda) / l)) : 0;
        x = a[0] + (b[0] - a[0]) * u;
        z = a[1] + (b[1] - a[1]) * u;
        if (l > 0.01) rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        break;
      }
      anda += l;
    }
  }
  Object.assign(medida, turno.porTuSalida);
  trafico.dispose();
  return medida;
}

/** Cuándo salen los dos, s antes de tu toma: antes de que la torre te vea. */
const SALEN: readonly (readonly number[])[] = [
  [600, 560],
  [500, 470],
  [420, 400],
  [360, 330],
];

/** Lo que falla de una medida, o nada. */
function loQueFalla(m: Medida): string[] {
  const mal: string[] = [];
  if (m.alLado) mal.push(m.alLado);
  if (!m.llego) mal.push("no llegaste a tu puesto");
  const quedan = m.salieron.filter((s) => !m.despegaron.includes(s));
  if (quedan.length) mal.push(`no salieron ${quedan.join(", ")}`);
  if (m.dosEnLaPista) mal.push(`dos en la pista: ${m.dosEnLaPista}`);
  return mal;
}

describe("con torre: te retrasa o te manda al aire, y el que sale sale", () => {
  it("El Hierro, el caso medido: sin la regla sale el fallo", () => {
    const esc = cabeceras(SCENARIOS.find((e) => e.id === "el-hierro")!).find(
      (e) => Math.round(e.runway.heading) === 152,
    )!;
    const avion = AIRCRAFT.find((a) => a.id === "jaz-20")!;
    const m = llegarConDosQueSalen(esc, avion, [600, 560], 1, false);
    expect(m.alLado, m.oido.join("\n")).not.toBe("");
  }, 120_000);

  for (const id of ["el-hierro", "encarnacion"])
    it(`${id}: nadie parado en tu calle, llegas, salen, y lo que se pide es real`, () => {
      const mal: string[] = [];
      let pedido = 0;
      for (const esc of cabeceras(SCENARIOS.find((e) => e.id === id)!))
        for (const avion of [AIRCRAFT[0]!, elMasGrande(esc)])
          for (const salen of SALEN)
            for (const semilla of [1, 2, 3]) {
              const m = llegarConDosQueSalen(esc, avion, salen, semilla);
              const donde = `${id} ${Math.round(esc.runway.heading)}° ${avion.id}, salen ${salen.join("/")} s antes, semilla ${semilla}`;
              for (const f of loQueFalla(m)) mal.push(`${donde}: ${f}`);
              if (m.avisos || m.propuestas) mal.push(`${donde}: una torre no avisa como un AFIS`);
              if (m.vueltas > 2 * 2) mal.push(`${donde}: ${m.vueltas} vueltas`);
              pedido += m.vueltas + m.alAire;
            }
      expect(mal).toEqual([]);
      // Y se pidió algo alguna vez: si no, esta prueba no está mirando el caso.
      expect(pedido).toBeGreaterThan(0);
    }, 600_000);
});

describe("y si no das la vuelta", () => {
  it("El Hierro: te vas al aire —por tu salida o con la pista ocupada—, y nunca dos en la pista", () => {
    const mal: string[] = [];
    let frustradas = 0;
    let vueltas = 0;
    for (const esc of cabeceras(SCENARIOS.find((e) => e.id === "el-hierro")!))
      for (const salen of SALEN)
        for (const semilla of [1, 2, 3]) {
          const m = llegarConDosQueSalen(esc, AIRCRAFT[0]!, salen, semilla, true, false, undefined, false);
          const donde = `El Hierro ${Math.round(esc.runway.heading)}°, salen ${salen.join("/")} s antes, semilla ${semilla}`;
          for (const f of loQueFalla(m)) mal.push(`${donde}: ${f}`);
          frustradas += m.frustradas;
          vueltas += m.vueltas;
          // Quien no da la vuelta y sigue, no aterriza con el de su salida delante.
          if (m.vueltas && !m.frustradas) mal.push(`${donde}: sin vuelta y sin irse al aire`);
        }
    expect(mal).toEqual([]);
    // Se pidió la vuelta, no se dio, y la torre te mandó al aire.
    expect(vueltas).toBeGreaterThan(0);
    expect(frustradas).toBeGreaterThan(0);
  }, 600_000);
});

describe("con AFIS: te lo cuenta, y decide quien vuela", () => {
  /*
   * En los campos AFIS de verdad —Pilar, Concepción, Mariscal Estigarribia—
   * con estas salidas el conflicto ya no llega a darse: no se deja rodar
   * hacia tu salida a quien no se iría antes, y al que puede irse se le da la
   * pista. Para ver qué hace quien informa cuando sí se da, El Hierro como si
   * contestara un AFIS: es el caso medido.
   */
  const hierro = cabeceras(SCENARIOS.find((e) => e.id === "el-hierro")!);

  it("El Hierro como AFIS: no te manda nada, te lo cuenta, y en la final te propone irte", () => {
    const mal: string[] = [];
    let avisos = 0;
    let propuestas = 0;
    for (const esc of hierro)
      for (const avion of [AIRCRAFT[0]!, elMasGrande(esc)])
        for (const salen of SALEN)
          for (const semilla of [1, 2, 3]) {
            const m = llegarConDosQueSalen(esc, avion, salen, semilla, true, true, "afis");
            const donde = `El Hierro ${Math.round(esc.runway.heading)}° ${avion.id}, salen ${salen.join("/")} s antes, semilla ${semilla}`;
            if (m.vueltas || m.alAire) mal.push(`${donde}: un AFIS no manda`);
            // Y quien se fue cuando se lo propusieron no pasa al lado de nadie.
            for (const f of loQueFalla(m)) mal.push(`${donde}: ${f}`);
            avisos += m.avisos;
            propuestas += m.propuestas;
          }
    expect(mal).toEqual([]);
    expect(avisos).toBeGreaterThan(0);
    expect(propuestas).toBeGreaterThan(0);
  }, 600_000);

  it("y si sigues, sigues: se ve lo que pasa, pero el que sale sale y nadie se queda colgado", () => {
    const mal: string[] = [];
    for (const esc of hierro)
      for (const salen of SALEN)
        for (const semilla of [1, 2]) {
          const m = llegarConDosQueSalen(esc, AIRCRAFT[0]!, salen, semilla, true, false, "afis");
          const donde = `El Hierro ${Math.round(esc.runway.heading)}°, salen ${salen.join("/")} s antes, semilla ${semilla}`;
          if (!m.llego) mal.push(`${donde}: no llegaste a tu puesto`);
          const quedan = m.salieron.filter((x) => !m.despegaron.includes(x));
          if (quedan.length) mal.push(`${donde}: no salieron ${quedan.join(", ")}`);
        }
    expect(mal).toEqual([]);
  }, 600_000);

  for (const id of ["pilar", "concepcion", "estigarribia"])
    it(`${id}: no te manda nada, nadie parado en tu calle, y el que sale sale`, () => {
      const mal: string[] = [];
      for (const esc of cabeceras(SCENARIOS.find((e) => e.id === id)!))
        for (const avion of [AIRCRAFT[0]!, elMasGrande(esc)])
          for (const salen of SALEN)
            for (const semilla of [1, 2]) {
              const m = llegarConDosQueSalen(esc, avion, salen, semilla, true, true);
              const donde = `${id} ${Math.round(esc.runway.heading)}° ${avion.id}, salen ${salen.join("/")} s antes, semilla ${semilla}`;
              for (const f of loQueFalla(m)) mal.push(`${donde}: ${f}`);
              if (m.vueltas || m.alAire) mal.push(`${donde}: un AFIS no manda`);
            }
      expect(mal).toEqual([]);
    }, 600_000);
});

describe("llegando por la ruta del plan, que la torre ve a diez kilómetros", () => {
  /*
   * El caso del vuelo entero de El Hierro a La Gomera con el JAZ 60. Sin
   * circuito que volar, la torre te mete en su secuencia al entrar en el
   * tramo final del plan, a unos diez kilómetros —cuatro minutos con el JAZ
   * 60, tres con uno más rápido—, y su final empieza ahí. En La Gomera no hay
   * más que una calle, la A, y el turbohélice que sale por la 09 no tiene
   * pista desde ella: remonta mil metros, da la media vuelta y despega. Al de
   * la doble raya de la A se le daba la salida —«runway free for take-off»—
   * en cuanto la pista pasaba a ser tuya, sin mirar cuánto tardaba en irse, y
   * con su remonte eran más de tres minutos de pista ocupada: llegabas a la
   * decisión con él encima y te ibas al aire. Sin el arreglo, seis de estos
   * casos acaban así. Ver `losDeLaCalleQueSeVanAntes` en `turno-de-pista.ts`.
   *
   * Sigues hacia la pista sin hacer caso de lo que se te proponga: lo que se
   * mide es lo que hace el juego, no lo que decides tú.
   */
  const gomera = cabeceras(SCENARIOS.find((e) => e.id === "la-gomera")!);
  const jaz60 = AIRCRAFT.find((a) => a.id === "jaz-60")!;
  /**
   * Lo que se tarda en llegar al umbral desde el tramo final del plan, s: con
   * el JAZ 60, el del banco, y con uno más rápido.
   */
  const TE_VE = [236, 180] as const;
  const SALEN_DE_RUTA: readonly (readonly number[])[] = [
    [460, 420],
    [400, 360],
    [350, 310],
    [310, 270],
    [280, 240],
  ];

  it("La Gomera: nadie te deja la pista ocupada al llegar, llegas a tu puesto y el que sale sale", () => {
    const mal: string[] = [];
    for (const teVe of TE_VE)
      for (const esc of gomera)
        for (const salen of SALEN_DE_RUTA)
          for (const semilla of [1, 2, 3]) {
            const m = llegarConDosQueSalen(
              esc,
              jaz60,
              salen,
              semilla,
              true,
              false,
              undefined,
              true,
              teVe,
            );
            const donde = `La Gomera ${Math.round(esc.runway.heading)}°, te ve a ${teVe} s, salen ${salen.join("/")} s antes, semilla ${semilla}`;
            /*
             * Pasar al lado del que espera, solo con el JAZ 60: con uno más
             * rápido, el que ya esperaba en la doble raya de la A cuando la
             * torre te ve no tiene tiempo de irse ni sitio al que apartarse.
             * Un AFIS te lo cuenta y la instructora te propone irte, y si
             * sigues pasas a su lado, como en El Hierro como AFIS.
             */
            for (const f of loQueFalla(m))
              if (teVe === TE_VE[0] || f !== m.alLado) mal.push(`${donde}: ${f}`);
            if (m.frustradas) mal.push(`${donde}: ${m.frustradas} al aire por la pista ocupada`);
            if (m.vueltas || m.alAire) mal.push(`${donde}: un AFIS no manda`);
          }
    expect(mal).toEqual([]);
  }, 600_000);

  it("y el que remonta ocupa la pista lo que la ocupa uno de verdad: unos tres minutos por la 09", () => {
    const esc = gomera.find((e) => Math.abs(e.runway.heading - 81) < 10)!;
    const aero = esc.aerodrome as Aerodrome;
    const suelo = sueloDelTrafico(aero, esc.runway, aero.runways[0]?.widthM ?? 30)!;
    const tipo = TIPOS.turbohelice;
    const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(tipo))!;
    expect(sale.remonta).toBeGreaterThan(900);
    const { entra, vira } = sale.remonte!;
    // La recta, a veinte nudos y sin pasarse; la media vuelta, despacio.
    const enLaRecta = alRemontar((entra + vira) / 2, sale.remonte!, sale.eje)!;
    expect(enLaRecta).toBeCloseTo(REMONTA_A, 5);
    expect(alRemontar(vira + 1, sale.remonte!, sale.eje)).toBe(VIRA_A);
    // De la doble raya al final de la pista, en el aire: entrar, remontar,
    // dar la vuelta, correr y volar lo que quede.
    const ocupa =
      (entra - sale.espera) / RUEDA_A +
      tiempoDeRemonte(sale.remonte!, sale.eje, sale.espera) +
      tiempoDeCarrera(tipo) +
      Math.max(0, esc.runway.length - tipo.carrera) / velocidadDeDespegue(tipo);
    expect(ocupa).toBeGreaterThan(150);
    expect(ocupa).toBeLessThan(200);
  });
});

/*
 * **Y un caso con su registro, para leerlo**: `VER_CASO=campo,rumbo,avión,
 * sale1,sale2,semilla,regla,obedece,vuelta`, o `VER_CASO=busca:campo:qué`
 * —`propuestas`, `sinSalir`, `frustradas` o lo que falle— para los dos
 * primeros que lo tengan.
 */
const VER_CASO = (globalThis as { process?: { env: Record<string, string | undefined> } }).process
  ?.env.VER_CASO;
describe.skipIf(!VER_CASO)("ver un caso", () => {
  it("log", () => {
    if (VER_CASO!.startsWith("busca:")) {
      // busca:<campo>:<qué> — los dos primeros casos con eso, con su registro.
      const [, id, que] = VER_CASO!.split(":");
      let vistos = 0;
      for (const esc of cabeceras(SCENARIOS.find((e) => e.id === id)!))
        for (const avion of [AIRCRAFT[0]!, elMasGrande(esc)])
          for (const salen of SALEN)
            for (const semilla of [1, 2, 3]) {
              if (vistos >= 2) return;
              const m = llegarConDosQueSalen(esc, avion, salen, semilla, true, true);
              const hay =
                que === "propuestas" ? m.propuestas > 0 : que === "sinSalir" ? m.salieron.some((x) => !m.despegaron.includes(x)) : que === "frustradas" ? m.frustradas > 0 : loQueFalla(m).length > 0;
              if (!hay) continue;
              vistos++;
              console.log(`${id} ${Math.round(esc.runway.heading)} ${avion.id} ${salen.join("/")} s${semilla}\n` + m.oido.join("\n"), loQueFalla(m));
            }
      return;
    }
    const [id, rumbo, avionId, a, b, s, regla, obedece, vuelta] = VER_CASO!.split(",");
    const esc = cabeceras(SCENARIOS.find((e) => e.id === id)!).find(
      (e) => Math.round(e.runway.heading) === Number(rumbo),
    )!;
    const avion = AIRCRAFT.find((x) => x.id === avionId)!;
    const m = llegarConDosQueSalen(
      esc,
      avion,
      [Number(a), Number(b)],
      Number(s),
      regla !== "0",
      obedece === "1",
      undefined,
      vuelta !== "0",
    );
    console.log(m.oido.join("\n"), "\n", loQueFalla(m), m.vueltas, m.alAire, m.avisos, m.propuestas);
  }, 120_000);
});

/*
 * **Antes y después, lado a lado**, para el informe: el mismo piloto y las
 * mismas salidas con el juego de antes y con la regla. `COMPARAR=1`.
 */
const COMPARAR = (globalThis as { process?: { env: Record<string, string | undefined> } }).process
  ?.env.COMPARAR;
describe.skipIf(!COMPARAR)("antes y después", () => {
  for (const id of ["el-hierro", "encarnacion", "pilar", "concepcion", "estigarribia"])
    it(id, () => {
      const filas: string[] = [];
      for (const regla of [false, true]) {
        const n = { casos: 0, alLado: 0, sinSalir: 0, frustradas: 0, vueltas: 0, avisos: 0, propuestas: 0, sinLlegar: 0, toco: 0 };
        for (const esc of cabeceras(SCENARIOS.find((e) => e.id === id)!))
          for (const avion of [AIRCRAFT[0]!, elMasGrande(esc)])
            for (const salen of SALEN)
              for (const semilla of [1, 2, 3]) {
                const m = llegarConDosQueSalen(esc, avion, salen, semilla, regla, true);
                n.casos++;
                if (m.alLado) n.alLado++;
                if (m.salieron.some((x) => !m.despegaron.includes(x))) n.sinSalir++;
                if (!m.llego) n.sinLlegar++;
                n.frustradas += m.frustradas;
                n.vueltas += m.vueltas;
                n.avisos += m.avisos;
                n.propuestas += m.propuestas;
                n.toco = Math.max(n.toco, m.toco ?? 9999);
              }
        filas.push(`${id} ${regla ? "con la regla" : "antes      "}: ${JSON.stringify(n)}`);
      }
      console.log(filas.join("\n"));
    }, 900_000);
});
